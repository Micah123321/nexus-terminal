import { encrypt, decrypt } from '../utils/crypto';
import * as LoginCredentialRepository from './login-credential.repository';
import * as SshKeyService from '../ssh_keys/ssh_key.service';
import {
    CreateLoginCredentialInput,
    UpdateLoginCredentialInput,
    LoginCredentialBase,
    FullLoginCredentialData,
    DecryptedLoginCredentialDetails,
} from '../types/login-credential.types';

export type {
    CreateLoginCredentialInput,
    UpdateLoginCredentialInput,
    LoginCredentialBase,
    FullLoginCredentialData,
    DecryptedLoginCredentialDetails,
};

const buildCredentialPayload = async (
    input: CreateLoginCredentialInput | UpdateLoginCredentialInput,
    existing?: LoginCredentialRepository.LoginCredentialDbRow
): Promise<Omit<FullLoginCredentialData, 'id' | 'created_at' | 'updated_at'>> => {
    const credentialType = (input.type ?? existing?.type)?.toUpperCase() as 'SSH' | 'RDP' | 'VNC' | undefined;
    if (!credentialType || !['SSH', 'RDP', 'VNC'].includes(credentialType)) {
        throw new Error('必须提供有效的登录凭证类型 (SSH, RDP 或 VNC)。');
    }

    const username = input.username ?? existing?.username;
    if (!username) {
        throw new Error('登录凭证必须提供用户名。');
    }

    let authMethod: 'password' | 'key' = credentialType === 'SSH'
        ? ((input.auth_method ?? existing?.auth_method) as 'password' | 'key' | undefined) || 'password'
        : 'password';

    if (credentialType === 'SSH' && !['password', 'key'].includes(authMethod)) {
        throw new Error('SSH 登录凭证必须提供有效的认证方式 (password 或 key)。');
    }

    let encryptedPassword = existing?.encrypted_password ?? null;
    let encryptedPrivateKey = existing?.encrypted_private_key ?? null;
    let encryptedPassphrase = existing?.encrypted_passphrase ?? null;
    let sshKeyId = existing?.ssh_key_id ?? null;

    if (credentialType === 'SSH') {
        if (authMethod === 'password') {
            if (input.password !== undefined) {
                encryptedPassword = input.password ? encrypt(input.password) : null;
            }
            if (!encryptedPassword) {
                throw new Error('SSH 密码认证方式需要提供 password。');
            }
            encryptedPrivateKey = null;
            encryptedPassphrase = null;
            sshKeyId = null;
        } else {
            if (input.ssh_key_id !== undefined) {
                sshKeyId = input.ssh_key_id;
            }

            if (sshKeyId) {
                const keyExists = await SshKeyService.getSshKeyDbRowById(sshKeyId);
                if (!keyExists) {
                    throw new Error(`提供的 SSH 密钥 ID ${sshKeyId} 无效或不存在。`);
                }
                encryptedPassword = null;
                encryptedPrivateKey = null;
                encryptedPassphrase = null;
            } else if (input.private_key !== undefined) {
                encryptedPrivateKey = input.private_key ? encrypt(input.private_key) : null;
                encryptedPassphrase = input.passphrase ? encrypt(input.passphrase) : null;
                encryptedPassword = null;
            }

            if (!sshKeyId && !encryptedPrivateKey) {
                throw new Error('SSH 密钥认证方式需要提供 private_key 或 ssh_key_id。');
            }
        }
    } else {
        authMethod = 'password';
        if (input.password !== undefined) {
            encryptedPassword = input.password ? encrypt(input.password) : null;
        }
        if (!encryptedPassword) {
            throw new Error(`${credentialType} 登录凭证需要提供 password。`);
        }
        encryptedPrivateKey = null;
        encryptedPassphrase = null;
        sshKeyId = null;
    }

    return {
        name: input.name ?? existing?.name ?? '',
        type: credentialType,
        username,
        auth_method: authMethod,
        encrypted_password: encryptedPassword,
        encrypted_private_key: encryptedPrivateKey,
        encrypted_passphrase: encryptedPassphrase,
        ssh_key_id: sshKeyId,
        notes: input.notes ?? existing?.notes ?? null,
    };
};

export const getAllLoginCredentials = async (): Promise<LoginCredentialBase[]> => {
    return LoginCredentialRepository.findAllLoginCredentials();
};

export const getLoginCredentialById = async (id: number): Promise<LoginCredentialRepository.LoginCredentialDbRow | null> => {
    return LoginCredentialRepository.findLoginCredentialById(id);
};

export const getDecryptedLoginCredentialById = async (id: number): Promise<DecryptedLoginCredentialDetails | null> => {
    const credential = await LoginCredentialRepository.findLoginCredentialById(id);
    if (!credential) {
        return null;
    }

    return {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        username: credential.username,
        auth_method: credential.auth_method,
        ssh_key_id: credential.ssh_key_id ?? null,
        notes: credential.notes ?? null,
        created_at: credential.created_at,
        updated_at: credential.updated_at,
        password: credential.encrypted_password ? decrypt(credential.encrypted_password) : undefined,
        privateKey: credential.encrypted_private_key ? decrypt(credential.encrypted_private_key) : undefined,
        passphrase: credential.encrypted_passphrase ? decrypt(credential.encrypted_passphrase) : undefined,
    };
};

export const createLoginCredential = async (input: CreateLoginCredentialInput): Promise<LoginCredentialBase> => {
    if (!input.name) {
        throw new Error('必须提供登录凭证名称。');
    }

    const payload = await buildCredentialPayload(input);
    const credentialId = await LoginCredentialRepository.createLoginCredential(payload);
    return {
        id: credentialId,
        name: payload.name,
        type: payload.type,
        username: payload.username,
        auth_method: payload.auth_method,
        ssh_key_id: payload.ssh_key_id ?? null,
        notes: payload.notes ?? null,
        created_at: 0,
        updated_at: 0,
    };
};

export const updateLoginCredential = async (
    id: number,
    input: UpdateLoginCredentialInput
): Promise<LoginCredentialBase | null> => {
    const existing = await LoginCredentialRepository.findLoginCredentialById(id);
    if (!existing) {
        return null;
    }

    const payload = await buildCredentialPayload(input, existing);
    const updated = await LoginCredentialRepository.updateLoginCredential(id, payload);
    if (!updated) {
        throw new Error('更新登录凭证失败。');
    }

    return {
        id,
        name: payload.name,
        type: payload.type,
        username: payload.username,
        auth_method: payload.auth_method,
        ssh_key_id: payload.ssh_key_id ?? null,
        notes: payload.notes ?? null,
        created_at: existing.created_at,
        updated_at: Math.floor(Date.now() / 1000),
    };
};

export const deleteLoginCredential = async (id: number): Promise<boolean> => {
    return LoginCredentialRepository.deleteLoginCredential(id);
};
