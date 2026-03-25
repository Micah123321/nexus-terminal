export type UploadTaskMode = 'file' | 'folder-archive';

export type UploadStatus =
    | 'compressing'
    | 'pending'
    | 'uploading'
    | 'decompressing'
    | 'paused'
    | 'success'
    | 'error'
    | 'cancelled';

// 类型定义：用于文件上传任务
export interface UploadItem {
    id: string; // 上传任务的唯一标识符
    file: File | null; // 要上传的文件对象；本地预处理阶段可为空
    filename: string; // 展示给用户的名称
    progress: number; // 上传/压缩进度 (0-100)
    error?: string; // 错误信息
    status: UploadStatus; // 上传状态
    mode?: UploadTaskMode;
    remotePath?: string;
    detail?: string;
}
