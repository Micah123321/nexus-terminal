import { reactive, nextTick, onUnmounted, type Ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import type { FileListItem } from '../types/sftp.types'; 
import type { UploadItem, UploadTaskMode } from '../types/upload.types'; 
import type { WebSocketMessage, MessagePayload } from '../types/websocket.types'; 


import type { WebSocketDependencies } from './useSftpActions'; 


const generateUploadId = (): string => {
    return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};


const joinPath = (base: string, name: string): string => {
    if (base === '/') return `/${name}`;
    if (base.endsWith('/')) return `${base}${name}`;
    return `${base}/${name}`;
};

export function useFileUploader(
    sessionIdForLog: Ref<string>,
    currentPathRef: Ref<string>,
    fileListRef: Readonly<Ref<readonly FileListItem[]>>, // 使用 Readonly 类型
    wsDeps: Ref<WebSocketDependencies> 
) {
    const { t } = useI18n();
    const uploads = reactive<Record<string, UploadItem>>({});
    const uploadHooks = new Map<string, { afterUpload?: (context: { uploadId: string; remotePath: string; item: UploadItem; }) => Promise<void> }>();

    const cleanupUploadTask = (uploadId: string, delayMs = 0) => {
        const removeTask = () => {
            delete uploads[uploadId];
            uploadHooks.delete(uploadId);
        };

        if (delayMs > 0) {
            setTimeout(removeTask, delayMs);
            return;
        }

        removeTask();
    };

    const getErrorMessage = (payload: MessagePayload, fallback: string): string => {
        if (typeof payload === 'string') {
            return payload;
        }

        if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
            return payload.message;
        }

        return fallback;
    };

    const getUploadId = (payload: MessagePayload, message: WebSocketMessage): string | undefined => {
        if (message.uploadId) {
            return message.uploadId;
        }

        if (payload && typeof payload === 'object' && 'uploadId' in payload && typeof payload.uploadId === 'string') {
            return payload.uploadId;
        }

        return undefined;
    };

    const createUploadTask = (
        filename: string,
        initial: Partial<UploadItem> = {},
    ): string => {
        const uploadId = generateUploadId();
        uploads[uploadId] = {
            id: uploadId,
            file: null,
            filename,
            progress: 0,
            status: 'pending',
            mode: initial.mode ?? 'file',
            ...initial,
        };
        return uploadId;
    };

    const updateUploadTask = (uploadId: string, patch: Partial<UploadItem>) => {
        const upload = uploads[uploadId];
        if (!upload) {
            return;
        }

        Object.assign(upload, patch);
    };

    const buildRemotePath = (file: File, relativePath?: string, targetPath?: string) => {
        const uploadBasePath = targetPath || currentPathRef.value;
        let finalRemotePath: string;
        if (relativePath) {
            const basePath = uploadBasePath.endsWith('/') ? uploadBasePath : `${uploadBasePath}/`;
            let cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
            cleanRelativePath = cleanRelativePath.endsWith('/') ? cleanRelativePath.slice(0, -1) : cleanRelativePath;
            finalRemotePath = `${basePath}${cleanRelativePath ? `${cleanRelativePath}/` : ''}${file.name}`;
        } else {
            finalRemotePath = joinPath(uploadBasePath, file.name);
        }

        return finalRemotePath.replace(/\/+/g, '/');
    };

    // --- 上传逻辑 ---

    const sendFileChunks = (uploadId: string, file: File, startByte = 0) => {
        const upload = uploads[uploadId];
        // 在继续之前检查连接和上传状态
        if (!wsDeps.value.isConnected.value || !upload || upload.status !== 'uploading') { 
            console.warn(`[FileUploader ${sessionIdForLog.value}] Cannot send chunk for ${uploadId}. Connection: ${wsDeps.value.isConnected.value}, Upload status: ${upload?.status}`);
            return;
        }

        const chunkSize = 1024 * 64; // 64KB 块大小
        const reader = new FileReader();
        let offset = startByte;
        let chunkIndex = 0; // Initialize chunk index counter
        let currentChunkSize = 0; // Store the size of the chunk being processed

        reader.onload = (e) => {
            const currentUpload = uploads[uploadId];
            // *发送前* 再次检查连接和状态
            if (!wsDeps.value.isConnected.value || !currentUpload || currentUpload.status !== 'uploading') { 
                 console.warn(`[FileUploader ${sessionIdForLog.value}] Upload ${uploadId} status changed or disconnected before sending chunk at offset ${offset}.`);
                 return; // 如果状态改变或断开连接，则停止发送
            }

            const chunkResult = e.target?.result as string;
            // 确保结果是字符串并且包含 base64 前缀
            if (typeof chunkResult === 'string' && chunkResult.startsWith('data:')) {
                const chunkBase64 = chunkResult.split(',')[1];
                const isLast = offset + chunkSize >= file.size;

                wsDeps.value.sendMessage({ 
                    type: 'sftp:upload:chunk',
                    payload: { uploadId, chunkIndex: chunkIndex++, data: chunkBase64, isLast }
                });

                
                offset += currentChunkSize; 
                

                if (!isLast) {                                     
                    nextTick(readNextChunk);
                } else {
                    console.log(`[FileUploader ${sessionIdForLog.value}] Sent last chunk for ${uploadId}`);
                    
                }
            } else {
                 console.error(`[FileUploader ${sessionIdForLog.value}] FileReader returned unexpected result for ${uploadId}:`, chunkResult);
                 currentUpload.status = 'error';
                 currentUpload.error = t('fileManager.errors.readFileError');
            }
        };

        reader.onerror = () => {
            console.error(`[FileUploader ${sessionIdForLog.value}] FileReader error for upload ID: ${uploadId}`);
            const failedUpload = uploads[uploadId];
            if (failedUpload) {
                failedUpload.status = 'error';
                failedUpload.error = t('fileManager.errors.readFileError');
            }
        };

        const readNextChunk = () => {
            // 读取下一个块之前再次检查状态
            if (offset < file.size && uploads[uploadId]?.status === 'uploading') {
                const slice = file.slice(offset, offset + chunkSize);
                currentChunkSize = slice.size; 
                reader.readAsDataURL(slice);
            }
        };

        // 开始读取第一个块（或恢复时的下一个块）
        if (file.size > 0) {
             readNextChunk();
        } else {
             // 立即处理零字节文件
             console.log(`[FileUploader ${sessionIdForLog.value}] Processing zero-byte file ${uploadId}`);
             // Send chunkIndex 0 for zero-byte file
             wsDeps.value.sendMessage({ type: 'sftp:upload:chunk', payload: { uploadId, chunkIndex: 0, data: '', isLast: true } });
             upload.progress = 100;
             
        }
    };


    const startFileUpload = (
        file: File,
        relativePath?: string,
        options?: {
            uploadId?: string;
            displayName?: string;
            mode?: UploadTaskMode;
            detail?: string;
            targetPath?: string;
            afterUpload?: (context: { uploadId: string; remotePath: string; item: UploadItem; }) => Promise<void>;
        }
    ) => {
        if (!wsDeps.value.isConnected.value) { 
            console.warn(`[FileUploader ${sessionIdForLog.value}] Cannot start upload: WebSocket not connected.`);
            if (options?.uploadId && uploads[options.uploadId]) {
                updateUploadTask(options.uploadId, {
                    status: 'error',
                    error: t('fileManager.errors.uploadFailed'),
                });
                cleanupUploadTask(options.uploadId, 5000);
            }
            return;
        }

        const uploadId = options?.uploadId ?? generateUploadId();
        const finalRemotePath = buildRemotePath(file, relativePath, options?.targetPath);
        console.log(`[FileUploader ${sessionIdForLog.value}] Calculated finalRemotePath: ${finalRemotePath} (current: ${currentPathRef.value}, relative: ${relativePath}, target: ${options?.targetPath}, filename: ${file.name}) // wsDeps.isSftpReady: ${wsDeps.value.isSftpReady.value}`); 

        uploads[uploadId] = {
            id: uploadId,
            file,
            filename: options?.displayName ?? uploads[uploadId]?.filename ?? file.name,
            progress: 0,
            status: 'pending',
            mode: options?.mode ?? uploads[uploadId]?.mode ?? 'file',
            remotePath: finalRemotePath,
            detail: options?.detail,
        };

        if (options?.afterUpload) {
            uploadHooks.set(uploadId, { afterUpload: options.afterUpload });
        } else {
            uploadHooks.delete(uploadId);
        }

        console.log(`[FileUploader ${sessionIdForLog.value}] Starting upload ${uploadId} to ${finalRemotePath}`);
        wsDeps.value.sendMessage({ 
            type: 'sftp:upload:start',
            payload: { uploadId, remotePath: finalRemotePath, size: file.size, relativePath: relativePath || undefined }
        });
        // 后端应该响应 sftp:upload:ready
    };

    const cancelUpload = (uploadId: string, notifyBackend = true) => {
        const upload = uploads[uploadId];
        if (upload && ['pending', 'uploading', 'paused'].includes(upload.status)) {
            console.log(`[FileUploader ${sessionIdForLog.value}] Cancelling upload ${uploadId}`);
            upload.status = 'cancelled'; // 立即更新状态

            if (notifyBackend && wsDeps.value.isConnected.value) { 
                wsDeps.value.sendMessage({ type: 'sftp:upload:cancel', payload: { uploadId } }); 
            }

            cleanupUploadTask(uploadId, 3000);
        }
    };

    // --- 消息处理器 ---

    const onUploadReady = (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) return;

        const upload = uploads[uploadId];
        if (upload && upload.status === 'pending' && upload.file) {
            console.log(`[FileUploader ${sessionIdForLog.value}] Upload ${uploadId} ready, starting chunk sending.`);
            upload.status = 'uploading';
            sendFileChunks(uploadId, upload.file); // 开始发送块
        } else {
             console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:ready for unknown or non-pending upload ID: ${uploadId}`);
        }
    };

    const onUploadSuccess = async (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) return;

        const upload = uploads[uploadId];
        if (upload) {
            const remotePath = message.path || upload.remotePath;
            console.log(`[FileUploader ${sessionIdForLog.value}] Upload ${uploadId} successful.`);
            upload.progress = 100;

            const hook = uploadHooks.get(uploadId);
            if (hook?.afterUpload && remotePath) {
                upload.status = 'decompressing';
                try {
                    await hook.afterUpload({ uploadId, remotePath, item: upload });
                    upload.status = 'success';
                    cleanupUploadTask(uploadId, 1200);
                } catch (error: any) {
                    upload.status = 'error';
                    upload.error = error?.message || t('fileManager.errors.decompressFailed');
                    cleanupUploadTask(uploadId, 5000);
                }
            } else {
                upload.status = 'success';
                cleanupUploadTask(uploadId);
            }
        } else {
            console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:success for unknown upload ID: ${uploadId}`);
        }
    };

    const onUploadError = (payload: MessagePayload, message: WebSocketMessage) => {
        // 从 message 中获取 uploadId，因为 payload 此时是错误字符串
        const uploadId = message.uploadId;
        if (!uploadId) {
             console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:error with missing uploadId:`, message);
             return;
        }

        const upload = uploads[uploadId];
        if (upload) {
            const errorMessage = getErrorMessage(payload, t('fileManager.errors.uploadFailed'));
            console.error(`[FileUploader ${sessionIdForLog.value}] Upload ${uploadId} error:`, errorMessage);
            upload.status = 'error';
            upload.error = errorMessage;
            cleanupUploadTask(uploadId, 5000);
        } else {
             console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:error for unknown upload ID: ${uploadId}`);
        }
    };

    const onUploadPause = (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) return;
        const upload = uploads[uploadId];
        if (upload && upload.status === 'uploading') {
            console.log(`[FileUploader ${sessionIdForLog.value}] Upload ${uploadId} paused.`);
            upload.status = 'paused';
        }
    };

    const onUploadResume = (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) return;
        const upload = uploads[uploadId];
        if (upload && upload.status === 'paused' && upload.file) {
            console.log(`[FileUploader ${sessionIdForLog.value}] Resuming upload ${uploadId}`);
            upload.status = 'uploading';
            sendFileChunks(uploadId, upload.file);
        }
    };

     const onUploadCancelled = (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) return;
        const upload = uploads[uploadId];
        if (upload) {
            // 状态可能已经由用户操作设置为 'cancelled'
            if (upload.status !== 'cancelled') {
                 upload.status = 'cancelled';
            }
            // 确保它会被移除（如果尚未计划移除）
            setTimeout(() => {
                if (uploads[uploadId]?.status === 'cancelled') {
                    cleanupUploadTask(uploadId);
                }
            }, 3000);
        }
    };

    // +++ 处理上传进度更新 +++
    const onUploadProgress = (payload: MessagePayload, message: WebSocketMessage) => {
        const uploadId = getUploadId(payload, message);
        if (!uploadId) {
            return;
        }

        const upload = uploads[uploadId];
        if (upload && upload.status === 'uploading') {
            // payload 现在应该包含 bytesWritten 和 totalSize
            if (typeof payload?.bytesWritten === 'number' && typeof payload?.totalSize === 'number') {
                upload.progress = Math.min(100, Math.round((payload.bytesWritten / payload.totalSize) * 100));
                
            } else {
                console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:progress with incorrect payload format:`, payload);
            }
        } else if (upload) {
            
        } else {
            console.warn(`[FileUploader ${sessionIdForLog.value}] Received upload:progress for unknown upload ID: ${uploadId}`);
        }
    };
    

    // --- 动态注册和注销处理器 ---
    watchEffect((onCleanup) => {
        // 当 wsDeps.value 变化时，此 effect 会重新运行
        if (!wsDeps.value || !wsDeps.value.onMessage) {
            console.warn(`[FileUploader ${sessionIdForLog.value}] wsDeps.value or wsDeps.value.onMessage is not available for registering listeners.`);
            return;
        }

        const unregisterUploadReady = wsDeps.value.onMessage('sftp:upload:ready', onUploadReady);
        const unregisterUploadSuccess = wsDeps.value.onMessage('sftp:upload:success', onUploadSuccess);
        const unregisterUploadError = wsDeps.value.onMessage('sftp:upload:error', onUploadError);
        const unregisterUploadPause = wsDeps.value.onMessage('sftp:upload:pause', onUploadPause);
        const unregisterUploadResume = wsDeps.value.onMessage('sftp:upload:resume', onUploadResume);
        const unregisterUploadCancelled = wsDeps.value.onMessage('sftp:upload:cancelled', onUploadCancelled);
        const unregisterUploadProgress = wsDeps.value.onMessage('sftp:upload:progress', onUploadProgress);

        onCleanup(() => {
            unregisterUploadReady?.();
            unregisterUploadSuccess?.();
            unregisterUploadError?.();
            unregisterUploadPause?.();
            unregisterUploadResume?.();
            unregisterUploadCancelled?.();
            unregisterUploadProgress?.();
        });
    });

    // --- 清理 (onUnmounted 仍然用于组件生命周期结束时的清理) ---
    onUnmounted(() => {
        // 注意：消息监听器的注销现在主要由 watchEffect 的 onCleanup 处理。
        // onUnmounted 仍然负责取消正在进行的上传。

        // 当使用此 composable 的组件卸载时，取消任何正在进行的上传
        Object.keys(uploads).forEach(uploadId => {
            cancelUpload(uploadId, true); // 卸载时通知后端
        });
    });

    return {
        uploads, 
        startFileUpload,
        cancelUpload,
        createUploadTask,
        updateUploadTask,
        cleanupUploadTask,
    };
}
