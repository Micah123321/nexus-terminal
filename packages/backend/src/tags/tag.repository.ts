import { Database, Statement } from 'sqlite3';
import { getDbInstance, runDb, getDb as getDbRow, allDb } from '../database/connection';
import { runSerializedTransaction } from '../database/transaction';


// 定义 Tag 类型 (可以共享到 types 文件)
export interface TagData {
    id: number;
    name: string;
    created_at: number;
    updated_at: number;
}

export interface BatchDeleteTagsSummary {
    deleted_tag_ids: number[];
    deleted_tags_count: number;
    affected_connection_ids: number[];
    affected_connections_count: number;
    deleted_connections_count: number;
    delete_connections: boolean;
}

const buildInClause = (count: number): string => {
    return new Array(count).fill('?').join(', ');
};

/**
 * 获取所有标签
 */
export const findAllTags = async (): Promise<TagData[]> => {
    try {
        const db = await getDbInstance();
        const rows = await allDb<TagData>(db, `SELECT * FROM tags ORDER BY name ASC`);
        return rows;
    } catch (err: any) {
        console.error('[仓库] 查询标签列表时出错:', err.message);
        throw new Error('获取标签列表失败');
    }
};

/**
 * 根据 ID 获取单个标签
 */
export const findTagById = async (id: number): Promise<TagData | null> => {
     try {
        const db = await getDbInstance();
        const row = await getDbRow<TagData>(db, `SELECT * FROM tags WHERE id = ?`, [id]);
        return row || null;
     } catch (err: any) {
        console.error(`[仓库] 查询标签 ${id} 时出错:`, err.message);
        throw new Error('获取标签信息失败');
     }
 };


/**
 * 创建新标签
 */
export const createTag = async (name: string): Promise<number> => {
    const now = Math.floor(Date.now() / 1000);
    const sql = `INSERT INTO tags (name, created_at, updated_at) VALUES (?, ?, ?)`;
    try {
        const db = await getDbInstance();
        const result = await runDb(db, sql, [name, now, now]);
        if (typeof result.lastID !== 'number' || result.lastID <= 0) {
             throw new Error('创建标签后未能获取有效的 lastID');
        }
        return result.lastID;
    } catch (err: any) {
        console.error('[仓库] 创建标签时出错:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
             throw new Error(`标签名称 "${name}" 已存在。`);
        }
        throw new Error(`创建标签失败: ${err.message}`);
    }
};

/**
 * 更新标签名称
 */
export const updateTag = async (id: number, name: string): Promise<boolean> => {
    const now = Math.floor(Date.now() / 1000);
    const sql = `UPDATE tags SET name = ?, updated_at = ? WHERE id = ?`;
    try {
        const db = await getDbInstance();
        const result = await runDb(db, sql, [name, now, id]);
        return result.changes > 0;
    } catch (err: any) {
         console.error(`[仓库] 更新标签 ${id} 时出错:`, err.message);
         if (err.message.includes('UNIQUE constraint failed')) {
             throw new Error(`标签名称 "${name}" 已存在。`);
         }
         throw new Error(`更新标签失败: ${err.message}`);
    }
};

/**
 * 删除标签
 */
export const deleteTag = async (id: number): Promise<boolean> => {
    const summary = await deleteTagsBatch([id], false);
    return summary.deleted_tags_count > 0;
};

/**
 * 批量删除标签，并根据策略可选地同时删除关联连接。
 */
export const deleteTagsBatch = async (tagIds: number[], deleteConnections: boolean): Promise<BatchDeleteTagsSummary> => {
    const normalizedTagIds = Array.from(new Set(tagIds.filter((tagId) => Number.isInteger(tagId) && tagId > 0)));
    if (normalizedTagIds.length === 0) {
        return {
            deleted_tag_ids: [],
            deleted_tags_count: 0,
            affected_connection_ids: [],
            affected_connections_count: 0,
            deleted_connections_count: 0,
            delete_connections: Boolean(deleteConnections),
        };
    }

    try {
        return await runSerializedTransaction(async (db) => {
            const tagPlaceholders = buildInClause(normalizedTagIds.length);
            const existingTags = await allDb<{ id: number }>(
                db,
                `SELECT id FROM tags WHERE id IN (${tagPlaceholders}) ORDER BY id ASC`,
                normalizedTagIds,
            );
            const existingTagIds = existingTags.map((row) => row.id);

            if (existingTagIds.length === 0) {
                return {
                    deleted_tag_ids: [],
                    deleted_tags_count: 0,
                    affected_connection_ids: [],
                    affected_connections_count: 0,
                    deleted_connections_count: 0,
                    delete_connections: Boolean(deleteConnections),
                };
            }

            const existingTagPlaceholders = buildInClause(existingTagIds.length);
            const affectedConnections = await allDb<{ connection_id: number }>(
                db,
                `SELECT DISTINCT connection_id FROM connection_tags WHERE tag_id IN (${existingTagPlaceholders}) ORDER BY connection_id ASC`,
                existingTagIds,
            );
            const affectedConnectionIds = affectedConnections.map((row) => row.connection_id);

            let deletedConnectionsCount = 0;
            if (deleteConnections && affectedConnectionIds.length > 0) {
                const connectionPlaceholders = buildInClause(affectedConnectionIds.length);
                const deleteConnectionsResult = await runDb(
                    db,
                    `DELETE FROM connections WHERE id IN (${connectionPlaceholders})`,
                    affectedConnectionIds,
                );
                deletedConnectionsCount = deleteConnectionsResult.changes ?? 0;
            }

            const deleteTagsResult = await runDb(
                db,
                `DELETE FROM tags WHERE id IN (${existingTagPlaceholders})`,
                existingTagIds,
            );

            return {
                deleted_tag_ids: existingTagIds,
                deleted_tags_count: deleteTagsResult.changes ?? 0,
                affected_connection_ids: affectedConnectionIds,
                affected_connections_count: affectedConnectionIds.length,
                deleted_connections_count: deletedConnectionsCount,
                delete_connections: Boolean(deleteConnections),
            };
        });
    } catch (err: any) {
        console.error(`[仓库] 批量删除标签时出错:`, err.message);
        throw new Error(`批量删除标签失败: ${err.message}`);
    }
};

/**
 * 更新标签与连接的关联关系
 */
export const updateTagConnections = async (tagId: number, connectionIds: number[]): Promise<void> => {
    try {
        await runSerializedTransaction(async (db) => {
            // 1. 删除该标签旧的连接关联
            const deleteSql = `DELETE FROM connection_tags WHERE tag_id = ?`;
            await runDb(db, deleteSql, [tagId]);

            // 2. 如果有新的连接 ID，则插入新的关联
            if (connectionIds && connectionIds.length > 0) {
                const insertSql = `INSERT INTO connection_tags (tag_id, connection_id) VALUES (?, ?)`;
                for (const connectionId of connectionIds) {
                    await runDb(db, insertSql, [tagId, connectionId]);
                }
            }
        });
    } catch (err: any) {
        console.error(`[仓库] 更新标签 ${tagId} 的连接关联时出错:`, err.message);
        throw new Error(`更新标签连接关联失败: ${err.message}`);
    }
};
