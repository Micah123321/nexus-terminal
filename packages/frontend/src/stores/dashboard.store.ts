import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../utils/apiClient';
import type { DashboardSummary } from '../types/server.types';

export const useDashboardStore = defineStore('dashboard', () => {
    const summary = ref<DashboardSummary | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    async function fetchSummary(): Promise<boolean> {
        const cacheKey = 'dashboardSummaryCache';
        error.value = null;

        try {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                summary.value = JSON.parse(cachedData) as DashboardSummary;
                isLoading.value = false;
            } else {
                isLoading.value = true;
            }
        } catch (cacheError) {
            console.error('[DashboardStore] Failed to load dashboard cache:', cacheError);
            localStorage.removeItem(cacheKey);
            isLoading.value = true;
        }

        isLoading.value = true;

        try {
            const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
            const freshData = response.data;
            const freshDataString = JSON.stringify(freshData);
            const currentDataString = JSON.stringify(summary.value);

            if (freshDataString !== currentDataString) {
                summary.value = freshData;
                localStorage.setItem(cacheKey, freshDataString);
            }

            error.value = null;
            return true;
        } catch (err: any) {
            console.error('[DashboardStore] Failed to fetch dashboard summary:', err);
            error.value = err.response?.data?.message || err.message || '获取仪表盘统计失败';
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        summary,
        isLoading,
        error,
        fetchSummary,
    };
});
