import { getDbInstance, runDb } from './connection';
import type { Database } from 'sqlite3';

// ha-min: 单连接上的 BEGIN/COMMIT 串行队列；上限为进程内存内排队的事务数。
// 若未来引入连接池或多进程写入，应改为 SQLite WAL + busy_timeout 重试或专用写连接。
let transactionTail: Promise<void> = Promise.resolve();

/**
 * 在同一个 SQLite 连接上串行执行事务。
 * 事务体的错误会在尽力 ROLLBACK 后重新抛出；排队阶段不执行任何 SQL。
 */
export const runSerializedTransaction = async <T>(work: (db: Database) => Promise<T>): Promise<T> => {
    const run: Promise<T> = transactionTail.then(async () => {
        const db = await getDbInstance();
        await runDb(db, 'BEGIN TRANSACTION');
        try {
            const result = await work(db);
            await runDb(db, 'COMMIT');
            return result;
        } catch (error) {
            try {
                await runDb(db, 'ROLLBACK');
            } catch (rollbackError: any) {
                console.error('[事务] 回滚失败:', rollbackError.message);
            }
            throw error;
        }
    });
    transactionTail = run.then(() => undefined, () => undefined);
    return run;
};
