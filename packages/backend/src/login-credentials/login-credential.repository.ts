import { getDbInstance, runDb, getDb as getDbRow, allDb } from '../database/connection';
import {
    LoginCredentialBase,
    FullLoginCredentialData,
} from '../types/login-credential.types';

export interface LoginCredentialDbRow extends FullLoginCredentialData {}

export const findAllLoginCredentials = async (): Promise<LoginCredentialBase[]> => {
    const sql = `
        SELECT
            id, name, type, username, auth_method, ssh_key_id, notes, created_at, updated_at
        FROM login_credentials
        ORDER BY updated_at DESC, name ASC
    `;

    const db = await getDbInstance();
    return allDb<LoginCredentialBase>(db, sql);
};

export const findLoginCredentialById = async (id: number): Promise<LoginCredentialDbRow | null> => {
    const sql = `
        SELECT
            id, name, type, username, auth_method,
            encrypted_password, encrypted_private_key, encrypted_passphrase,
            ssh_key_id, notes, created_at, updated_at
        FROM login_credentials
        WHERE id = ?
    `;

    const db = await getDbInstance();
    const row = await getDbRow<LoginCredentialDbRow>(db, sql, [id]);
    return row || null;
};

export const createLoginCredential = async (
    data: Omit<FullLoginCredentialData, 'id' | 'created_at' | 'updated_at'>
): Promise<number> => {
    const now = Math.floor(Date.now() / 1000);
    const sql = `
        INSERT INTO login_credentials (
            name, type, username, auth_method,
            encrypted_password, encrypted_private_key, encrypted_passphrase,
            ssh_key_id, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const db = await getDbInstance();
    const result = await runDb(db, sql, [
        data.name,
        data.type,
        data.username,
        data.auth_method,
        data.encrypted_password ?? null,
        data.encrypted_private_key ?? null,
        data.encrypted_passphrase ?? null,
        data.ssh_key_id ?? null,
        data.notes ?? null,
        now,
        now,
    ]);

    if (typeof result.lastID !== 'number' || result.lastID <= 0) {
        throw new Error('创建登录凭证后未能获取有效 ID。');
    }

    return result.lastID;
};

export const updateLoginCredential = async (
    id: number,
    data: Partial<Omit<FullLoginCredentialData, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
    const fieldsToUpdate: Record<string, any> = { ...data };
    delete fieldsToUpdate.id;
    delete fieldsToUpdate.created_at;
    delete fieldsToUpdate.updated_at;

    fieldsToUpdate.updated_at = Math.floor(Date.now() / 1000);

    const setClauses = Object.keys(fieldsToUpdate).map((key) => `${key} = ?`).join(', ');
    if (!setClauses) {
        return false;
    }

    const params = Object.keys(fieldsToUpdate).map((key) => fieldsToUpdate[key] ?? null);
    params.push(id);

    const sql = `UPDATE login_credentials SET ${setClauses} WHERE id = ?`;
    const db = await getDbInstance();
    const result = await runDb(db, sql, params);
    return result.changes > 0;
};

export const deleteLoginCredential = async (id: number): Promise<boolean> => {
    const sql = `DELETE FROM login_credentials WHERE id = ?`;
    const db = await getDbInstance();
    const result = await runDb(db, sql, [id]);
    return result.changes > 0;
};
