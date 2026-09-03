import { getDbInstance, runDb, getDb as getDbRow, allDb } from '../database/connection';
import { runSerializedTransaction } from '../database/transaction';

export interface QuickCommandTag {
    id: number;
    name: string;
    sort_order: number;
    created_at: number;
    updated_at: number;
}

interface CommandTagAssociationRow {
    tag_id: number;
    sort_order: number;
}

const getNextTagSortOrder = async (db: Awaited<ReturnType<typeof getDbInstance>>): Promise<number> => {
    const row = await getDbRow<{ nextSortOrder?: number }>(
        db,
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM quick_command_tags'
    );
    return row?.nextSortOrder ?? 1;
};

const getNextAssociationSortOrder = async (
    db: Awaited<ReturnType<typeof getDbInstance>>,
    tagId: number,
): Promise<number> => {
    const row = await getDbRow<{ nextSortOrder?: number }>(
        db,
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM quick_command_tag_associations WHERE tag_id = ?',
        [tagId],
    );
    return row?.nextSortOrder ?? 1;
};

export const findAllQuickCommandTags = async (): Promise<QuickCommandTag[]> => {
    try {
        const db = await getDbInstance();
        return await allDb<QuickCommandTag>(
            db,
            'SELECT * FROM quick_command_tags ORDER BY sort_order ASC, name ASC',
        );
    } catch (err: any) {
        console.error('[QuickCommandTagRepository] 查询快捷指令标签列表失败:', err.message);
        throw new Error('获取快捷指令标签列表失败');
    }
};

export const findQuickCommandTagById = async (id: number): Promise<QuickCommandTag | null> => {
    try {
        const db = await getDbInstance();
        const row = await getDbRow<QuickCommandTag>(db, 'SELECT * FROM quick_command_tags WHERE id = ?', [id]);
        return row ?? null;
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 查询快捷指令标签 ${id} 失败:`, err.message);
        throw new Error('获取快捷指令标签信息失败');
    }
};

export const createQuickCommandTag = async (name: string): Promise<number> => {
    try {
        const db = await getDbInstance();
        const now = Math.floor(Date.now() / 1000);
        const sortOrder = await getNextTagSortOrder(db);
        const result = await runDb(
            db,
            'INSERT INTO quick_command_tags (name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [name, sortOrder, now, now],
        );

        if (typeof result.lastID !== 'number' || result.lastID <= 0) {
            throw new Error('创建快捷指令标签后未能获取有效的 lastID');
        }

        return result.lastID;
    } catch (err: any) {
        console.error('[QuickCommandTagRepository] 创建快捷指令标签失败:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error(`快捷指令标签名称 "${name}" 已存在。`);
        }
        throw new Error(`创建快捷指令标签失败: ${err.message}`);
    }
};

export const updateQuickCommandTag = async (id: number, name: string): Promise<boolean> => {
    try {
        const db = await getDbInstance();
        const now = Math.floor(Date.now() / 1000);
        const result = await runDb(
            db,
            'UPDATE quick_command_tags SET name = ?, updated_at = ? WHERE id = ?',
            [name, now, id],
        );
        return result.changes > 0;
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 更新快捷指令标签 ${id} 失败:`, err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
            throw new Error(`快捷指令标签名称 "${name}" 已存在。`);
        }
        throw new Error(`更新快捷指令标签失败: ${err.message}`);
    }
};

export const deleteQuickCommandTag = async (id: number): Promise<boolean> => {
    try {
        const db = await getDbInstance();
        const result = await runDb(db, 'DELETE FROM quick_command_tags WHERE id = ?', [id]);
        return result.changes > 0;
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 删除快捷指令标签 ${id} 失败:`, err.message);
        throw new Error('删除快捷指令标签失败');
    }
};

export const reorderQuickCommandTags = async (tagIds: number[]): Promise<void> => {
    const normalizedTagIds = Array.from(new Set(tagIds.filter((tagId) => Number.isInteger(tagId) && tagId > 0)));
    if (normalizedTagIds.length === 0) {
        return;
    }

    try {
        await runSerializedTransaction(async (db) => {
            for (let index = 0; index < normalizedTagIds.length; index += 1) {
                await runDb(
                    db,
                    'UPDATE quick_command_tags SET sort_order = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
                    [index + 1, normalizedTagIds[index]],
                );
            }
        });
    } catch (err: any) {
        console.error('[QuickCommandTagRepository] 重排快捷指令标签失败:', err.message);
        throw new Error('无法更新快捷指令标签顺序');
    }
};

export const setCommandTagAssociations = async (commandId: number, tagIds: number[]): Promise<void> => {
    const normalizedTagIds = Array.from(new Set(tagIds.filter((tagId) => Number.isInteger(tagId) && tagId > 0)));

    try {
        await runSerializedTransaction(async (db) => {
            const existingAssociations = await allDb<CommandTagAssociationRow>(
                db,
                'SELECT tag_id, sort_order FROM quick_command_tag_associations WHERE quick_command_id = ?',
                [commandId],
            );
            const existingTagIds = new Set(existingAssociations.map((association) => association.tag_id));

            if (normalizedTagIds.length === 0) {
                await runDb(db, 'DELETE FROM quick_command_tag_associations WHERE quick_command_id = ?', [commandId]);
            } else {
                const placeholders = normalizedTagIds.map(() => '?').join(', ');
                await runDb(
                    db,
                    `DELETE FROM quick_command_tag_associations WHERE quick_command_id = ? AND tag_id NOT IN (${placeholders})`,
                    [commandId, ...normalizedTagIds],
                );

                for (const tagId of normalizedTagIds) {
                    if (existingTagIds.has(tagId)) {
                        continue;
                    }

                    const nextSortOrder = await getNextAssociationSortOrder(db, tagId);
                    await runDb(
                        db,
                        'INSERT INTO quick_command_tag_associations (quick_command_id, tag_id, sort_order) VALUES (?, ?, ?)',
                        [commandId, tagId, nextSortOrder],
                    );
                }
            }
        });
    } catch (err: any) {
        console.error('[QuickCommandTagRepository] 设置快捷指令标签关联失败:', err.message);
        throw new Error('无法设置快捷指令标签关联');
    }
};

export const addTagToCommands = async (commandIds: number[], tagId: number): Promise<void> => {
    const normalizedCommandIds = Array.from(
        new Set(commandIds.filter((commandId) => Number.isInteger(commandId) && commandId > 0)),
    );

    if (normalizedCommandIds.length === 0 || !Number.isInteger(tagId) || tagId <= 0) {
        return;
    }

    try {
        await runSerializedTransaction(async (db) => {
            for (const commandId of normalizedCommandIds) {
                const existingAssociation = await getDbRow<{ quick_command_id: number }>(
                    db,
                    'SELECT quick_command_id FROM quick_command_tag_associations WHERE quick_command_id = ? AND tag_id = ?',
                    [commandId, tagId],
                );

                if (existingAssociation) {
                    continue;
                }

                const nextSortOrder = await getNextAssociationSortOrder(db, tagId);
                await runDb(
                    db,
                    'INSERT INTO quick_command_tag_associations (quick_command_id, tag_id, sort_order) VALUES (?, ?, ?)',
                    [commandId, tagId, nextSortOrder],
                );
            }
        });
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 批量关联标签 ${tagId} 失败:`, err.message);
        throw new Error('无法批量关联标签到快捷指令');
    }
};

export const reorderCommandsInTag = async (tagId: number, commandIds: number[]): Promise<void> => {
    const normalizedCommandIds = Array.from(
        new Set(commandIds.filter((commandId) => Number.isInteger(commandId) && commandId > 0)),
    );

    if (!Number.isInteger(tagId) || tagId <= 0 || normalizedCommandIds.length === 0) {
        return;
    }

    try {
        await runSerializedTransaction(async (db) => {
            for (let index = 0; index < normalizedCommandIds.length; index += 1) {
                await runDb(
                    db,
                    'UPDATE quick_command_tag_associations SET sort_order = ? WHERE tag_id = ? AND quick_command_id = ?',
                    [index + 1, tagId, normalizedCommandIds[index]],
                );
            }
        });
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 重排标签 ${tagId} 内命令失败:`, err.message);
        throw new Error('无法更新标签内快捷指令顺序');
    }
};

export const findTagsByCommandId = async (commandId: number): Promise<QuickCommandTag[]> => {
    const sql = `
        SELECT t.id, t.name, t.sort_order, t.created_at, t.updated_at
        FROM quick_command_tags t
        JOIN quick_command_tag_associations ta ON t.id = ta.tag_id
        WHERE ta.quick_command_id = ?
        ORDER BY ta.sort_order ASC, t.name ASC`;

    try {
        const db = await getDbInstance();
        return await allDb<QuickCommandTag>(db, sql, [commandId]);
    } catch (err: any) {
        console.error(`[QuickCommandTagRepository] 查询快捷指令 ${commandId} 的标签失败:`, err.message);
        throw new Error('获取快捷指令标签失败');
    }
};
