import * as ConnectionRepository from './connection.repository';
import { encrypt, decrypt } from '../utils/crypto';
import { AuditLogService } from '../audit/audit.service';
import * as SshKeyService from '../ssh_keys/ssh_key.service'; 
import * as LoginCredentialService from '../login-credentials/login-credential.service';
import {
    ConnectionBase,
    ConnectionWithTags,
    CreateConnectionInput,
    UpdateConnectionInput,
    FullConnectionData,
    ConnectionWithTags as ConnectionWithTagsType // Alias to avoid conflict with variable name
} from '../types/connection.types';

export type { ConnectionBase, ConnectionWithTags, CreateConnectionInput, UpdateConnectionInput };

/**
 * 辅助函数：验证 jump_chain 并处理与 proxy_id 的互斥关系
 * @param jumpChain 输入的 jump_chain
 * @param proxyId 输入的 proxy_id
 * @param connectionId 当前正在操作的连接ID (仅在更新时提供)
 * @returns 处理过的 jump_chain (null 如果无效或应被忽略)
 * @throws Error 如果验证失败
 */
const _validateAndProcessJumpChain = async (
    jumpChain: number[] | null | undefined,
    proxyId: number | null | undefined,
    connectionId?: number
): Promise<number[] | null> => {

    if (!jumpChain || jumpChain.length === 0) {
        return null;
    }

    const validatedChain: number[] = [];
    for (const id of jumpChain) {
        if (typeof id !== 'number') {
            throw new Error('jump_chain 中的 ID 必须是数字。');
        }
        if (connectionId && id === connectionId) {
            throw new Error(`jump_chain 不能包含当前连接自身的 ID (${connectionId})。`);
        }
        const existingConnection = await ConnectionRepository.findConnectionByIdWithTags(id);
        if (!existingConnection) {
            throw new Error(`jump_chain 中的连接 ID ${id} 未找到。`);
        }
        if (existingConnection.type !== 'SSH') {
            throw new Error(`jump_chain 中的连接 ID ${id} (${existingConnection.name}) 不是 SSH 类型。`);
        }
        validatedChain.push(id);
    }
    return validatedChain.length > 0 ? validatedChain : null;
};


const auditLogService = new AuditLogService(); 

const _getSavedCredentialSnapshot = async (
    loginCredentialId: number,
    connectionType: 'SSH' | 'RDP' | 'VNC'
) => {
    const credential = await LoginCredentialService.getLoginCredentialById(loginCredentialId);
    if (!credential) {
        throw new Error(`登录凭证 ID ${loginCredentialId} 不存在。`);
    }
    if (credential.type !== connectionType) {
        throw new Error(`登录凭证类型 ${credential.type} 与连接类型 ${connectionType} 不匹配。`);
    }
    return credential;
};

/**
 * 获取所有连接（包含标签）
 */
export const getAllConnections = async (): Promise<ConnectionWithTags[]> => {
    // Repository now returns ConnectionWithTags including 'type'
    // Explicit type assertion to ensure compatibility
    return ConnectionRepository.findAllConnectionsWithTags() as Promise<ConnectionWithTags[]>;
};

/**
 * 根据 ID 获取单个连接（包含标签）
 */
export const getConnectionById = async (id: number): Promise<ConnectionWithTags | null> => {
    // Repository now returns ConnectionWithTags including 'type'
    // Explicit type assertion to ensure compatibility
    return ConnectionRepository.findConnectionByIdWithTags(id) as Promise<ConnectionWithTags | null>;
};

/**
 * 创建新连接
 */
export const createConnection = async (input: CreateConnectionInput): Promise<ConnectionWithTags> => {
    type ConnectionDataForRepo = Omit<FullConnectionData, 'id' | 'created_at' | 'updated_at' | 'last_connected_at' | 'tag_ids'> & { jump_chain?: number[] | null; proxy_type?: 'proxy' | 'jump' | null };

    console.log('[Service:createConnection] Received input:', JSON.stringify(input, null, 2)); // Log input

    const processedJumpChain = await _validateAndProcessJumpChain(input.jump_chain, input.proxy_id);
    const connectionType = input.type?.toUpperCase() as 'SSH' | 'RDP' | 'VNC' | undefined;
    if (!connectionType || !['SSH', 'RDP', 'VNC'].includes(connectionType)) {
        throw new Error('必须提供有效的连接类型 (SSH, RDP 或 VNC)。');
    }
    if (!input.host) {
        throw new Error('缺少必要的连接信息 (host)。');
    }

    const savedCredential = typeof input.login_credential_id === 'number'
        ? await _getSavedCredentialSnapshot(input.login_credential_id, connectionType)
        : null;

    let encryptedPassword = null;
    let encryptedPrivateKey = null;
    let encryptedPassphrase = null;
    let sshKeyIdToSave: number | null = null;
    let authMethodForDb: 'password' | 'key' = 'password';
    let usernameToSave = input.username ?? savedCredential?.username ?? '';
    let loginCredentialIdToSave: number | null = savedCredential?.id ?? null;

    if (!usernameToSave) {
        throw new Error('缺少必要的连接信息 (username)。');
    }

    if (savedCredential) {
        usernameToSave = savedCredential.username;
        authMethodForDb = savedCredential.auth_method;
        encryptedPassword = savedCredential.encrypted_password ?? null;
        encryptedPrivateKey = savedCredential.encrypted_private_key ?? null;
        encryptedPassphrase = savedCredential.encrypted_passphrase ?? null;
        sshKeyIdToSave = savedCredential.ssh_key_id ?? null;
    } else if (connectionType === 'SSH') {
        if (!input.auth_method || !['password', 'key'].includes(input.auth_method)) {
             throw new Error('SSH 连接必须提供有效的认证方式 (password 或 key)。');
        }
        authMethodForDb = input.auth_method;
        if (input.auth_method === 'password') {
            if (!input.password) {
                throw new Error('SSH 密码认证方式需要提供 password。');
            }
            encryptedPassword = encrypt(input.password!);
            sshKeyIdToSave = null;
        } else {
            if (input.ssh_key_id) {
                const keyExists = await SshKeyService.getSshKeyDbRowById(input.ssh_key_id);
                if (!keyExists) {
                    throw new Error(`提供的 SSH 密钥 ID ${input.ssh_key_id} 无效或不存在。`);
                }
                sshKeyIdToSave = input.ssh_key_id;
                encryptedPrivateKey = null;
                encryptedPassphrase = null;
            } else if (input.private_key) {
                encryptedPrivateKey = encrypt(input.private_key!);
                if (input.passphrase) {
                    encryptedPassphrase = encrypt(input.passphrase);
                }
                sshKeyIdToSave = null;
            } else {
                 throw new Error('SSH 密钥认证方式内部错误：未提供 private_key 或 ssh_key_id。');
            }
        }
    } else if (connectionType === 'RDP') {
        if (!input.password) {
             throw new Error('RDP 连接需要提供 password。');
        }
        encryptedPassword = encrypt(input.password!);
        encryptedPrivateKey = null;
        encryptedPassphrase = null;
        sshKeyIdToSave = null;
    } else {
        if (!input.password) {
            throw new Error('VNC 连接需要提供 password。');
        }
        encryptedPassword = encrypt(input.password!);
        authMethodForDb = 'password';
        encryptedPrivateKey = null;
        encryptedPassphrase = null;
        sshKeyIdToSave = null;
    }

    let defaultPort = 22; // Default for SSH
    if (connectionType === 'RDP') {
        defaultPort = 3389;
    } else if (connectionType === 'VNC') {
        defaultPort = 5900; // Default VNC port
    }
    const connectionData: ConnectionDataForRepo = {
        name: input.name || '',
        type: connectionType,
        host: input.host,
        port: input.port ?? defaultPort,
        username: usernameToSave,
        auth_method: authMethodForDb,
        encrypted_password: encryptedPassword,
        encrypted_private_key: encryptedPrivateKey,
        encrypted_passphrase: encryptedPassphrase,
        ssh_key_id: sshKeyIdToSave,
        login_credential_id: loginCredentialIdToSave,
notes: input.notes ?? null,
        proxy_id: input.proxy_id ?? null,
        proxy_type: input.proxy_type ?? null,
        jump_chain: processedJumpChain,
    };
    console.log('[Service:createConnection] Data being passed to ConnectionRepository.createConnection:', JSON.stringify(connectionData, null, 2));

    const newConnectionId = await ConnectionRepository.createConnection(connectionData as Omit<ConnectionRepository.FullConnectionData, 'id' | 'created_at' | 'updated_at' | 'last_connected_at' | 'tag_ids'>);

    const tagIds = input.tag_ids?.filter(id => typeof id === 'number' && id > 0) ?? [];
    if (tagIds.length > 0) {
        await ConnectionRepository.updateConnectionTags(newConnectionId, tagIds);
    }

    const newConnection = await getConnectionById(newConnectionId);
    if (!newConnection) {
        console.error(`[Audit Log Error] Failed to retrieve connection ${newConnectionId} after creation.`);
        throw new Error('创建连接后无法检索到该连接。');
    }
    auditLogService.logAction('CONNECTION_CREATED', { connectionId: newConnection.id, type: newConnection.type, name: newConnection.name, host: newConnection.host });

    return newConnection;
};

/**
 * 更新连接信息
 */
export const updateConnection = async (id: number, input: UpdateConnectionInput): Promise<ConnectionWithTags | null> => {
    const currentFullConnection = await ConnectionRepository.findFullConnectionById(id);
    if (!currentFullConnection) {
        return null;
    }

    const dataToUpdate: Partial<Omit<ConnectionRepository.FullConnectionData & { ssh_key_id?: number | null; jump_chain?: number[] | null; proxy_type?: 'proxy' | 'jump' | null; login_credential_id?: number | null }, 'id' | 'created_at' | 'last_connected_at' | 'tag_ids'>> = {};
    let needsCredentialUpdate = false;
    const targetType = input.type?.toUpperCase() as 'SSH' | 'RDP' | 'VNC' | undefined || currentFullConnection.type;
    if (currentFullConnection.login_credential_id && input.login_credential_id === undefined && targetType !== currentFullConnection.type) {
        throw new Error('当前连接正在使用已保存登录凭证，切换连接类型前请先改为直填或重新选择匹配类型的登录凭证。');
    }

    if (input.jump_chain !== undefined || input.proxy_id !== undefined) {
        const currentProxyId = input.proxy_id !== undefined ? input.proxy_id : currentFullConnection.proxy_id;
        
        let jumpChainFromDb: number[] | null = null;
        if (currentFullConnection.jump_chain) { // currentFullConnection.jump_chain is string | null
            try {
                jumpChainFromDb = JSON.parse(currentFullConnection.jump_chain) as number[];
            } catch (e) {
                console.error(`[Service:updateConnection] Failed to parse jump_chain from DB for connection ${id}: ${currentFullConnection.jump_chain}`, e);
                // Treat as null if parsing fails, or consider throwing an error
                jumpChainFromDb = null;
            }
        }
        const currentJumpChainForValidation: number[] | null | undefined = input.jump_chain !== undefined ? input.jump_chain : jumpChainFromDb;
        
        const processedJumpChain = await _validateAndProcessJumpChain(currentJumpChainForValidation, currentProxyId, id);
        
        dataToUpdate.jump_chain = processedJumpChain;
        dataToUpdate.proxy_id = currentProxyId;
    }


    if (input.name !== undefined) dataToUpdate.name = input.name || '';
    if (input.type !== undefined && targetType !== currentFullConnection.type) dataToUpdate.type = targetType;
    if (input.host !== undefined) dataToUpdate.host = input.host;
    if (input.port !== undefined) dataToUpdate.port = input.port;
    if (input.username !== undefined) dataToUpdate.username = input.username;
    if (input.notes !== undefined) dataToUpdate.notes = input.notes;
    if (input.proxy_type !== undefined) dataToUpdate.proxy_type = input.proxy_type;

    if (input.login_credential_id !== undefined) {
        if (input.login_credential_id === null) {
            dataToUpdate.login_credential_id = null;
        } else {
            const savedCredential = await _getSavedCredentialSnapshot(input.login_credential_id, targetType);
            dataToUpdate.login_credential_id = savedCredential.id;
            dataToUpdate.username = savedCredential.username;
            dataToUpdate.auth_method = savedCredential.auth_method;
            dataToUpdate.encrypted_password = savedCredential.encrypted_password ?? null;
            dataToUpdate.encrypted_private_key = savedCredential.encrypted_private_key ?? null;
            dataToUpdate.encrypted_passphrase = savedCredential.encrypted_passphrase ?? null;
            dataToUpdate.ssh_key_id = savedCredential.ssh_key_id ?? null;
            needsCredentialUpdate = true;
        }
    }

    const allowDirectCredentialEdit =
        input.login_credential_id === null ||
        (!currentFullConnection.login_credential_id && input.login_credential_id === undefined);

    if (allowDirectCredentialEdit && targetType === 'SSH') {
        const currentAuthMethod = currentFullConnection.auth_method;
        const inputAuthMethod = input.auth_method;

        const finalAuthMethod = inputAuthMethod || currentAuthMethod;
        if (finalAuthMethod !== currentAuthMethod) {
             dataToUpdate.auth_method = finalAuthMethod;
        }

        if (finalAuthMethod === 'password') {
            if (input.password !== undefined) {
                 if (!input.password && finalAuthMethod !== currentAuthMethod) {
                     throw new Error('切换到密码认证时需要提供 password。');
                 }
                 dataToUpdate.encrypted_password = input.password ? encrypt(input.password) : null;
                 needsCredentialUpdate = true;
            }
            if (finalAuthMethod !== currentAuthMethod) {
                dataToUpdate.encrypted_private_key = null;
                dataToUpdate.encrypted_passphrase = null;
                dataToUpdate.ssh_key_id = null;
            }
        } else {
            if (input.ssh_key_id !== undefined) {
                if (input.ssh_key_id === null) {
                    dataToUpdate.ssh_key_id = null;
                    if (input.private_key === undefined) {
                        dataToUpdate.encrypted_private_key = null;
                        dataToUpdate.encrypted_passphrase = null;
                    } else {
                        dataToUpdate.encrypted_private_key = input.private_key ? encrypt(input.private_key) : null;
                        dataToUpdate.encrypted_passphrase = input.passphrase ? encrypt(input.passphrase) : null;
                    }
                } else {
                    const keyExists = await SshKeyService.getSshKeyDbRowById(input.ssh_key_id);
                    if (!keyExists) {
                        throw new Error(`提供的 SSH 密钥 ID ${input.ssh_key_id} 无效或不存在。`);
                    }
                    dataToUpdate.ssh_key_id = input.ssh_key_id;
                    // Clear direct key fields when selecting a stored key
                    dataToUpdate.encrypted_private_key = null;
                    dataToUpdate.encrypted_passphrase = null;
                }
                needsCredentialUpdate = true;
            } else if (input.private_key !== undefined) {
                if (!input.private_key && finalAuthMethod !== currentAuthMethod) {
                    throw new Error('切换到密钥认证时需要提供 private_key 或选择一个已保存的密钥。');
                }
                dataToUpdate.encrypted_private_key = input.private_key ? encrypt(input.private_key) : null;
                if (input.passphrase !== undefined) {
                    dataToUpdate.encrypted_passphrase = input.passphrase ? encrypt(input.passphrase) : null;
                } else if (input.private_key) {
                    dataToUpdate.encrypted_passphrase = null;
                }
                dataToUpdate.ssh_key_id = null;
                needsCredentialUpdate = true;
            } else if (input.passphrase !== undefined && !input.ssh_key_id && currentFullConnection.encrypted_private_key) {
                 dataToUpdate.encrypted_passphrase = input.passphrase ? encrypt(input.passphrase) : null;
                 needsCredentialUpdate = true;
            }

            if (finalAuthMethod !== currentAuthMethod) {
                dataToUpdate.encrypted_password = null;
            }
        }
    } else if (allowDirectCredentialEdit && targetType === 'RDP') {
        if (input.password !== undefined) {
             dataToUpdate.encrypted_password = input.password ? encrypt(input.password) : null;
             needsCredentialUpdate = true;
        }
        if (targetType !== currentFullConnection.type || needsCredentialUpdate || Object.keys(dataToUpdate).includes('type')) {
            dataToUpdate.auth_method = 'password';
            dataToUpdate.encrypted_private_key = null;
            dataToUpdate.encrypted_passphrase = null;
            dataToUpdate.ssh_key_id = null;
        }
    } else if (allowDirectCredentialEdit) {
        if (input.password !== undefined) {
            dataToUpdate.encrypted_password = input.password ? encrypt(input.password) : null;
            needsCredentialUpdate = true;
        }
        if (targetType !== currentFullConnection.type || needsCredentialUpdate || Object.keys(dataToUpdate).includes('type')) {
            dataToUpdate.auth_method = 'password';
            dataToUpdate.encrypted_private_key = null;
            dataToUpdate.encrypted_passphrase = null;
            dataToUpdate.ssh_key_id = null;
        }
    }

    const hasNonTagChanges = Object.keys(dataToUpdate).length > 0;
    let updatedFieldsForAudit: string[] = [];
    if (hasNonTagChanges) {
        updatedFieldsForAudit = Object.keys(dataToUpdate);
        console.log(`[Service:updateConnection] Data being passed to ConnectionRepository.updateConnection for ID ${id}:`, JSON.stringify(dataToUpdate, null, 2));
        const updated = await ConnectionRepository.updateConnection(id, dataToUpdate);
        if (!updated) {
            throw new Error('更新连接记录失败。');
        }
    }

    if (input.tag_ids !== undefined) {
        const validTagIds = input.tag_ids.filter(tagId => typeof tagId === 'number' && tagId > 0);
        await ConnectionRepository.updateConnectionTags(id, validTagIds);
    }
    if (input.tag_ids !== undefined) {
        updatedFieldsForAudit.push('tag_ids');
    }


    if (hasNonTagChanges || input.tag_ids !== undefined) {
         const auditDetails: any = { connectionId: id, updatedFields: updatedFieldsForAudit };
         if (dataToUpdate.type) {
             auditDetails.newType = dataToUpdate.type;
         }
         auditLogService.logAction('CONNECTION_UPDATED', auditDetails);
    }

    return getConnectionById(id);
};


/**
 * 删除连接
 */
export const deleteConnection = async (id: number): Promise<boolean> => {
    const deleted = await ConnectionRepository.deleteConnection(id);
    if (deleted) {
        // 删除成功后记录审计操作
        auditLogService.logAction('CONNECTION_DELETED', { connectionId: id });
    }
    return deleted;
};

/**
 * 获取连接信息（包含标签）以及解密后的凭证（如果适用）
 * @param id 连接 ID
 * @returns 包含 ConnectionWithTags 和解密后密码/密钥的对象，或 null
 */
export const getConnectionWithDecryptedCredentials = async (
    id: number
): Promise<{ connection: ConnectionWithTags; decryptedPassword?: string; decryptedPrivateKey?: string; decryptedPassphrase?: string } | null> => {
    // 1. 获取完整的连接数据（包含加密字段和可能的 ssh_key_id）
    const fullConnectionDbRow = await ConnectionRepository.findFullConnectionById(id);
    if (!fullConnectionDbRow) {
        console.log(`[Service:getConnWithDecrypt] Connection not found for ID: ${id}`);
        return null;
    }
    // Convert DbRow to the stricter FullConnectionData type expected by the service/types file
    // Handle potential undefined by defaulting to null
    const fullConnection: FullConnectionData = {
        ...fullConnectionDbRow,
        username: fullConnectionDbRow.login_credential_username ?? fullConnectionDbRow.username,
        auth_method: fullConnectionDbRow.login_credential_auth_method ?? fullConnectionDbRow.auth_method,
        encrypted_password: fullConnectionDbRow.login_credential_encrypted_password ?? fullConnectionDbRow.encrypted_password ?? null,
        encrypted_private_key: fullConnectionDbRow.login_credential_encrypted_private_key ?? fullConnectionDbRow.encrypted_private_key ?? null,
        encrypted_passphrase: fullConnectionDbRow.login_credential_encrypted_passphrase ?? fullConnectionDbRow.encrypted_passphrase ?? null,
        ssh_key_id: fullConnectionDbRow.login_credential_ssh_key_id ?? fullConnectionDbRow.ssh_key_id ?? null,
        login_credential_id: fullConnectionDbRow.login_credential_id ?? null,
    } as FullConnectionData & { ssh_key_id: number | null }; // Type assertion

    // 2. 获取带标签的连接数据（用于返回给调用者）
    const connectionWithTags: ConnectionWithTags | null = await ConnectionRepository.findConnectionByIdWithTags(id);
    if (!connectionWithTags) {
         // This shouldn't happen if findFullConnectionById succeeded, but good practice to check
         console.error(`[Service:getConnWithDecrypt] Mismatch: Full connection found but tagged connection not found for ID: ${id}`);
         // Consider throwing an error or returning a specific error state
         return null;
    }

    // 3. 解密凭证
    let decryptedPassword: string | undefined = undefined;
    let decryptedPrivateKey: string | undefined = undefined;
    let decryptedPassphrase: string | undefined = undefined;

    try {
        // Decrypt password if method is 'password' and encrypted password exists
        if (fullConnection.auth_method === 'password' && fullConnection.encrypted_password) {
            decryptedPassword = decrypt(fullConnection.encrypted_password);
        }
        // Decrypt key and passphrase if method is 'key'
        else if (fullConnection.auth_method === 'key') {
            if (fullConnection.ssh_key_id) {
                // +++ If using ssh_key_id, fetch and decrypt the stored key +++
                console.log(`[Service:getConnWithDecrypt] Connection ${id} uses stored SSH key ID: ${fullConnection.ssh_key_id}. Fetching key...`);
                const storedKeyDetails = await SshKeyService.getDecryptedSshKeyById(fullConnection.ssh_key_id);
                if (!storedKeyDetails) {
                    // This indicates an inconsistency, as the ssh_key_id should be valid
                    console.error(`[Service:getConnWithDecrypt] Error: Connection ${id} references non-existent SSH key ID ${fullConnection.ssh_key_id}`);
                    throw new Error(`关联的 SSH 密钥 (ID: ${fullConnection.ssh_key_id}) 未找到。`);
                }
                decryptedPrivateKey = storedKeyDetails.privateKey;
                decryptedPassphrase = storedKeyDetails.passphrase;
                console.log(`[Service:getConnWithDecrypt] Successfully fetched and decrypted stored SSH key ${fullConnection.ssh_key_id} for connection ${id}.`);
            } else if (fullConnection.encrypted_private_key) {
                // Decrypt the key stored directly in the connection record
                decryptedPrivateKey = decrypt(fullConnection.encrypted_private_key);
                // Only decrypt passphrase if it exists alongside the direct key
                if (fullConnection.encrypted_passphrase) {
                    decryptedPassphrase = decrypt(fullConnection.encrypted_passphrase);
                }
            } else {
                 console.warn(`[Service:getConnWithDecrypt] Connection ${id} uses key auth but has neither ssh_key_id nor encrypted_private_key.`);
                 // No key available to decrypt
            }
        }
    } catch (error: any) { // Catch decryption or key fetching errors
        console.error(`[Service:getConnWithDecrypt] Failed to decrypt credentials for connection ID ${id}:`, error);
        // Decide how to handle decryption errors. Throw? Return null password?
        // For now, we'll log and continue, returning undefined credentials.
        // Consider throwing an error if credentials are required but decryption fails.
        // Or return a specific error structure: return { error: 'Decryption failed' };
    }

    console.log(`[Service:getConnWithDecrypt] Returning data for ID: ${id}, Auth Method: ${fullConnection.auth_method}`);
    return {
        connection: connectionWithTags,
        decryptedPassword,
        decryptedPrivateKey,
        decryptedPassphrase,
    };
};
// 注意：testConnection、importConnections、exportConnections 逻辑
// 将分别移至 SshService 和 ImportExportService。


/**
 * 克隆连接
 * @param originalId 要克隆的原始连接 ID
 * @param newName 新连接的名称
 * @returns 克隆后的新连接信息（包含标签）
 */
export const cloneConnection = async (originalId: number, newName: string): Promise<ConnectionWithTags> => {
    // 1. 检查新名称是否已存在
    const existingByName = await ConnectionRepository.findConnectionByName(newName);
    if (existingByName) {
        throw new Error(`名称为 "${newName}" 的连接已存在。`);
    }

    // 2. 获取原始连接的完整数据（包括加密字段和 ssh_key_id）
    const originalFullConnection = await ConnectionRepository.findFullConnectionById(originalId);
    if (!originalFullConnection) {
        throw new Error(`ID 为 ${originalId} 的原始连接未找到。`);
    }

    // 3. 准备新连接的数据
    // 使用 Omit 来排除不需要的字段，并确保类型正确
    const dataForNewConnection: Omit<ConnectionRepository.FullConnectionData, 'id' | 'created_at' | 'updated_at' | 'last_connected_at' | 'tag_ids'> = {
        name: newName,
        type: originalFullConnection.type,
        host: originalFullConnection.host,
        port: originalFullConnection.port,
        username: originalFullConnection.username,
        auth_method: originalFullConnection.auth_method,
        encrypted_password: originalFullConnection.encrypted_password ?? null,
        encrypted_private_key: originalFullConnection.encrypted_private_key ?? null,
        encrypted_passphrase: originalFullConnection.encrypted_passphrase ?? null,
        ssh_key_id: originalFullConnection.ssh_key_id ?? null, // 保留原始的 ssh_key_id
        login_credential_id: originalFullConnection.login_credential_id ?? null,
        proxy_id: originalFullConnection.proxy_id ?? null,
        proxy_type: originalFullConnection.proxy_type ?? null, // 新增 proxy_type 复制
        notes: originalFullConnection.notes ?? null, // 确保 notes 被复制
        jump_chain: originalFullConnection.jump_chain ? JSON.parse(originalFullConnection.jump_chain) as number[] : null, // 复制并解析 jump_chain
        // 移除不存在的 RDP 字段复制
        // ...(originalFullConnection.rdp_security && { rdp_security: originalFullConnection.rdp_security }),
        // ...(originalFullConnection.rdp_ignore_cert !== undefined && { rdp_ignore_cert: originalFullConnection.rdp_ignore_cert }),
    };

    // 4. 创建新连接记录
    const newConnectionId = await ConnectionRepository.createConnection(dataForNewConnection);

    // 5. 复制原始连接的标签
    const originalTags = await ConnectionRepository.findConnectionTags(originalId);
    if (originalTags.length > 0) {
        const tagIds = originalTags.map(tag => tag.id);
        await ConnectionRepository.updateConnectionTags(newConnectionId, tagIds);
    }

    // 6. 记录审计操作
    const clonedConnection = await getConnectionById(newConnectionId);
    if (!clonedConnection) {
        console.error(`[Audit Log Error] Failed to retrieve connection ${newConnectionId} after cloning from ${originalId}.`);
        throw new Error('克隆连接后无法检索到该连接。');
    }
    // 使用 CONNECTION_CREATED 事件，但添加额外信息表明是克隆操作
    auditLogService.logAction('CONNECTION_CREATED', {
        connectionId: clonedConnection.id,
        type: clonedConnection.type,
        name: clonedConnection.name,
        host: clonedConnection.host,
        clonedFromId: originalId // 添加克隆来源信息
    });

    // 7. 返回新创建的带标签的连接
    return clonedConnection;
};
// 注意：updateConnectionTags 现在主要由 updateConnection 内部调用，
// 或者可以保留用于单独更新单个连接标签的场景（如果需要的话）。
// 为了解决嵌套事务问题，我们添加一个新的批量添加函数。

/**
 * 为指定的一组连接添加一个标签
 * @param connectionIds 连接 ID 数组
 * @param tagId 要添加的标签 ID
 */
export const addTagToConnections = async (connectionIds: number[], tagId: number): Promise<void> => {
    // 1. 验证 tagId 是否有效（可选，但建议）
    // const tagExists = await TagRepository.findTagById(tagId); // 需要导入 TagRepository
    // if (!tagExists) {
    //     throw new Error(`标签 ID ${tagId} 不存在。`);
    // }

    // 2. 调用仓库层批量添加标签
    try {
        await ConnectionRepository.addTagToMultipleConnections(connectionIds, tagId);

        // 记录审计日志 (可以考虑为批量操作定义新的审计类型)
        // TODO: 定义 'CONNECTIONS_TAG_ADDED' 审计日志类型
        // auditLogService.logAction('CONNECTIONS_TAG_ADDED', { connectionIds, tagId });

    } catch (error: any) {
        console.error(`Service: 为连接 ${connectionIds.join(', ')} 添加标签 ${tagId} 时发生错误:`, error);
        throw error; // 重新抛出错误
    }
};

/**
 * 更新指定连接的标签关联 (保留此函数用于可能的其他用途，但主要逻辑转移到 addTagToConnections)
 * @param connectionId 连接 ID
 * @param tagIds 新的标签 ID 数组
 * @returns boolean 指示操作是否成功（找到连接并尝试更新）
 */
export const updateConnectionTags = async (connectionId: number, tagIds: number[]): Promise<boolean> => {
    try {
        const updated = await ConnectionRepository.updateConnectionTags(connectionId, tagIds);
        return updated;
    } catch (error: any) {
        console.error(`Service: 更新连接 ${connectionId} 的标签时发生错误:`, error);
        throw error;
    }
};
