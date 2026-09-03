import { getDbInstance, runDb, getDb as getDbRow, allDb } from '../database/connection';
import { runSerializedTransaction } from '../database/transaction';

export interface QuickCommand {
    id: number;
    name: string | null;
    command: string;
    usage_count: number;
    sort_order: number;
    variables?: string | null;
    created_at: number;
    updated_at: number;
}

export type QuickCommandWithTags = Omit<QuickCommand, 'variables'> & {
    tagIds: number[];
    tagOrders: Record<number, number>;
    variables: Record<string, string> | null;
};

interface QuickCommandTagOrderRow {
    quick_command_id: number;
    tag_id: number;
    sort_order: number;
}

type QuickCommandSortBy = 'manual' | 'name' | 'usage_count';

const parseVariables = (variables: string | null | undefined, commandId: number): Record<string, string> | null => {
    if (!variables) {
        return null;
    }

    try {
        return JSON.parse(variables);
    } catch (error) {
        console.error(`[QuickCommandsRepository] 解析快捷指令 ${commandId} 的 variables 失败:`, error);
        return null;
    }
};

const getNextQuickCommandSortOrder = async (db: Awaited<ReturnType<typeof getDbInstance>>): Promise<number> => {
    const row = await getDbRow<{ nextSortOrder?: number }>(
        db,
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder FROM quick_commands',
    );
    return row?.nextSortOrder ?? 1;
};

const getTagOrderMap = async (
    db: Awaited<ReturnType<typeof getDbInstance>>,
    commandIds: number[],
): Promise<Map<number, { tagIds: number[]; tagOrders: Record<number, number> }>> => {
    const tagState = new Map<number, { tagIds: number[]; tagOrders: Record<number, number> }>();

    if (commandIds.length === 0) {
        return tagState;
    }

    const placeholders = commandIds.map(() => '?').join(', ');
    const rows = await allDb<QuickCommandTagOrderRow>(
        db,
        `SELECT quick_command_id, tag_id, sort_order
         FROM quick_command_tag_associations
         WHERE quick_command_id IN (${placeholders})
         ORDER BY quick_command_id ASC, sort_order ASC, tag_id ASC`,
        commandIds,
    );

    for (const row of rows) {
        if (!tagState.has(row.quick_command_id)) {
            tagState.set(row.quick_command_id, { tagIds: [], tagOrders: {} });
        }

        const currentState = tagState.get(row.quick_command_id)!;
        currentState.tagIds.push(row.tag_id);
        currentState.tagOrders[row.tag_id] = row.sort_order;
    }

    return tagState;
};

const buildQuickCommandsWithTags = async (
    db: Awaited<ReturnType<typeof getDbInstance>>,
    rows: QuickCommand[],
): Promise<QuickCommandWithTags[]> => {
    const commandIds = rows.map((row) => row.id);
    const tagState = await getTagOrderMap(db, commandIds);

    return rows.map((row) => {
        const { variables, ...rest } = row;
        const currentTagState = tagState.get(row.id);

        return {
            ...rest,
            variables: parseVariables(variables, row.id),
            tagIds: currentTagState?.tagIds ?? [],
            tagOrders: currentTagState?.tagOrders ?? {},
        };
    });
};

export const addQuickCommand = async (
    name: string | null,
    command: string,
    variables?: Record<string, string>,
): Promise<number> => {
    try {
        const db = await getDbInstance();
        const variablesJson = variables ? JSON.stringify(variables) : null;
        const sortOrder = await getNextQuickCommandSortOrder(db);
        const result = await runDb(
            db,
            `INSERT INTO quick_commands (name, command, usage_count, variables, sort_order, created_at, updated_at)
             VALUES (?, ?, 0, ?, ?, strftime('%s', 'now'), strftime('%s', 'now'))`,
            [name, command, variablesJson, sortOrder],
        );

        if (typeof result.lastID !== 'number' || result.lastID <= 0) {
            throw new Error('添加快捷指令后未能获取有效的 lastID');
        }

        return result.lastID;
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 添加快捷指令失败:', err.message);
        throw new Error('无法添加快捷指令');
    }
};

export const updateQuickCommand = async (
    id: number,
    name: string | null,
    command: string,
    variables?: Record<string, string>,
): Promise<boolean> => {
    try {
        const db = await getDbInstance();
        const variablesJson = variables ? JSON.stringify(variables) : null;
        const result = await runDb(
            db,
            'UPDATE quick_commands SET name = ?, command = ?, variables = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
            [name, command, variablesJson, id],
        );
        return result.changes > 0;
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 更新快捷指令失败:', err.message);
        throw new Error('无法更新快捷指令');
    }
};

export const deleteQuickCommand = async (id: number): Promise<boolean> => {
    try {
        const db = await getDbInstance();
        const result = await runDb(db, 'DELETE FROM quick_commands WHERE id = ?', [id]);
        return result.changes > 0;
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 删除快捷指令失败:', err.message);
        throw new Error('无法删除快捷指令');
    }
};

export const getAllQuickCommands = async (sortBy: QuickCommandSortBy = 'manual'): Promise<QuickCommandWithTags[]> => {
    let orderByClause = 'ORDER BY sort_order ASC, id ASC';
    if (sortBy === 'usage_count') {
        orderByClause = 'ORDER BY usage_count DESC, name ASC, id ASC';
    } else if (sortBy === 'name') {
        orderByClause = 'ORDER BY name ASC, id ASC';
    }

    try {
        const db = await getDbInstance();
        const rows = await allDb<QuickCommand>(
            db,
            `SELECT id, name, command, usage_count, sort_order, variables, created_at, updated_at
             FROM quick_commands
             ${orderByClause}`,
        );
        return await buildQuickCommandsWithTags(db, rows);
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 获取快捷指令失败:', err.message);
        throw new Error('无法获取快捷指令');
    }
};

export const incrementUsageCount = async (id: number): Promise<boolean> => {
    try {
        const db = await getDbInstance();
        const result = await runDb(
            db,
            'UPDATE quick_commands SET usage_count = usage_count + 1, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
            [id],
        );
        return result.changes > 0;
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 增加快捷指令使用次数失败:', err.message);
        throw new Error('无法增加快捷指令使用次数');
    }
};

export const findQuickCommandById = async (id: number): Promise<QuickCommandWithTags | undefined> => {
    try {
        const db = await getDbInstance();
        const row = await getDbRow<QuickCommand>(
            db,
            `SELECT id, name, command, usage_count, sort_order, variables, created_at, updated_at
             FROM quick_commands
             WHERE id = ?`,
            [id],
        );

        if (!row) {
            return undefined;
        }

        const [hydratedRow] = await buildQuickCommandsWithTags(db, [row]);
        return hydratedRow;
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 查询快捷指令失败:', err.message);
        throw new Error('无法查询快捷指令');
    }
};

export const reorderQuickCommands = async (commandIds: number[]): Promise<void> => {
    const normalizedCommandIds = Array.from(
        new Set(commandIds.filter((commandId) => Number.isInteger(commandId) && commandId > 0)),
    );

    if (normalizedCommandIds.length === 0) {
        return;
    }

    try {
        await runSerializedTransaction(async (db) => {
            for (let index = 0; index < normalizedCommandIds.length; index += 1) {
                await runDb(
                    db,
                    'UPDATE quick_commands SET sort_order = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?',
                    [index + 1, normalizedCommandIds[index]],
                );
            }
        });
    } catch (err: any) {
        console.error('[QuickCommandsRepository] 重排快捷指令失败:', err.message);
        throw new Error('无法更新快捷指令顺序');
    }
};
