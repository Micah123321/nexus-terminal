import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../utils/apiClient'; // 使用统一的 apiClient
import { useConnectionsStore } from './connections.store';

// 定义标签信息接口
export interface TagInfo {
    id: number;
    name: string;
    created_at: number;
    updated_at: number;
}

export interface TagBatchDeleteSummary {
    deleted_tag_ids: number[];
    deleted_tags_count: number;
    affected_connection_ids: number[];
    affected_connections_count: number;
    deleted_connections_count: number;
    delete_connections: boolean;
}

const TAGS_CACHE_KEY = 'tagsCache';

interface AddTagOptions {
    refresh?: boolean;
}

export const useTagsStore = defineStore('tags', () => {
    const tags = ref<TagInfo[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const connectionsStore = useConnectionsStore();

    // 获取标签列表 (带缓存)
    async function fetchTags() {
        const cacheKey = 'tagsCache';
        error.value = null; // 重置错误

        // 1. 尝试从 localStorage 加载缓存
        try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                tags.value = JSON.parse(cachedData);
                isLoading.value = false; // 先显示缓存
            } else {
                isLoading.value = true; // 无缓存，初始加载
            }
        } catch (e) {
            console.error('[TagsStore] Failed to load or parse tags cache:', e);
            localStorage.removeItem(cacheKey); // 解析失败则移除缓存
            isLoading.value = true; // 缓存无效，需要加载
        }

        // 2. 后台获取最新数据
        isLoading.value = true; // 标记正在后台获取
        try {
            const response = await apiClient.get<TagInfo[]>('/tags');
            const freshData = response.data;
            const freshDataString = JSON.stringify(freshData);

            // 3. 对比并更新
            const currentDataString = JSON.stringify(tags.value);
            if (currentDataString !== freshDataString) {
                tags.value = freshData;
                localStorage.setItem(cacheKey, freshDataString); // 更新缓存
            } else {
                console.log('[TagsStore] Tags data is up-to-date.');
            }
            error.value = null; // 清除错误
            return true; // 表示获取成功（即使数据未变）
        } catch (err: any) {
            console.error('[TagsStore] Failed to fetch tags:', err);
            error.value = err.response?.data?.message || err.message || '获取标签列表失败';
            // 保留缓存数据，仅设置错误状态
            return false; // 表示获取失败
        } finally {
            isLoading.value = false; // 加载完成
        }
    }

    async function refreshRelatedConnectionData() {
        localStorage.removeItem('tagsCache');
        localStorage.removeItem('connectionsCache');
        await Promise.all([
            fetchTags(),
            connectionsStore.fetchConnections(),
        ]);
    }

    // 添加新标签 (添加后清除缓存)
    async function addTag(name: string, options: AddTagOptions = {}): Promise<TagInfo | null> { // 修改返回类型
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post<{ message: string, tag: TagInfo }>('/tags', { name }); // 假设后端返回新标签信息
            const newTag = response.data.tag;
            localStorage.removeItem(TAGS_CACHE_KEY);
            if (options.refresh === false) {
                const existingIndex = tags.value.findIndex((tag) => tag.id === newTag.id);
                if (existingIndex >= 0) {
                    tags.value[existingIndex] = newTag;
                } else {
                    tags.value = [...tags.value, newTag];
                }
                try {
                    localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(tags.value));
                } catch (cacheError) {
                    console.error('[TagsStore] Failed to update tags cache:', cacheError);
                }
            } else {
                await fetchTags(); // fetchTags 会处理获取和缓存更新
            }
            return newTag; // 返回新标签信息
        } catch (err: any) {
            console.error('Failed to add tag:', err);
            error.value = err.response?.data?.message || err.message || '添加标签失败';
            return null; // 返回 null 表示失败
        } finally {
            isLoading.value = false;
        }
    }

    // 更新标签
    async function updateTag(id: number, name: string): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.put(`/tags/${id}`, { name }); // 使用 apiClient 并移除 base URL
            // 更新成功后，清除缓存并重新获取
            localStorage.removeItem('tagsCache');
            await fetchTags();
            return true;
        } catch (err: any) {
            console.error('Failed to update tag:', err);
            error.value = err.response?.data?.message || err.message || '更新标签失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    // 删除标签
    async function deleteTag(id: number): Promise<boolean> {
        const summary = await deleteTagsBatch([id], false);
        return Boolean(summary && summary.deleted_tags_count > 0);
    }

    async function deleteTagsBatch(tagIds: number[], deleteConnections: boolean): Promise<TagBatchDeleteSummary | null> {
        const normalizedTagIds = Array.from(new Set(tagIds.filter((tagId) => Number.isInteger(tagId) && tagId > 0)));
        if (normalizedTagIds.length === 0) {
            error.value = '至少需要选择一个标签';
            return null;
        }

        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post<{ message: string; summary: TagBatchDeleteSummary }>('/tags/bulk-delete', {
                tag_ids: normalizedTagIds,
                delete_connections: deleteConnections,
            });
            await refreshRelatedConnectionData();
            return response.data.summary;
        } catch (err: any) {
            console.error('Failed to batch delete tags:', err);
            error.value = err.response?.data?.message || err.message || '批量删除标签失败';
            return null;
        } finally {
            isLoading.value = false;
        }
    }

    // 更新标签关联的连接
    async function updateTagConnections(tagId: number, connectionIds: number[]): Promise<boolean> {
        isLoading.value = true;
        error.value = null;
        try {
            // 假设后端 API 端点是 PUT /api/tags/:tagId/connections
            await apiClient.put(`/tags/${tagId}/connections`, { connection_ids: connectionIds });
            // 更新成功后，清除相关缓存并重新获取数据以确保一致性
            await refreshRelatedConnectionData();
            return true;
        } catch (err: any) {
            console.error(`Failed to update connections for tag ${tagId}:`, err);
            error.value = err.response?.data?.message || err.message || '更新标签连接失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        tags,
        isLoading,
        error,
        fetchTags,
        addTag,
        updateTag,
        deleteTag,
        deleteTagsBatch,
        updateTagConnections, // 暴露新的 action
    };
});
