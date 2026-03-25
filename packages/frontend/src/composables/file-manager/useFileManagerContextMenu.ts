import { ref, nextTick, type Ref, type ComponentPublicInstance } from 'vue'; 
import type { FileListItem } from '../../types/sftp.types'; 
import { type useI18n } from 'vue-i18n'; 
import type FileManagerContextMenu from '../../components/FileManagerContextMenu.vue'; 

// 定义菜单项类型 (可以根据需要扩展)
export interface ContextMenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  separator?: boolean; // 添加分隔符类型
  submenu?: ContextMenuItem[]; // 添加二级菜单支持
  icon?: string;
  danger?: boolean;
}

// 支持的压缩格式
export type CompressFormat = 'zip' | 'targz' | 'tarbz2';

// 定义剪贴板状态类型
export interface ClipboardState {
  hasContent: boolean;
  operation?: 'copy' | 'cut';
  // 可以添加 sourcePaths: string[] 等更多信息，但对于禁用/启用粘贴，hasContent 就够了
}

// 定义 Composable 的输入参数类型
export interface UseFileManagerContextMenuOptions {
  selectedItems: Ref<Set<string>>;
  lastClickedIndex: Ref<number>;
  fileList: Ref<Readonly<FileListItem[]>>; // 使用 Readonly 避免直接修改
  currentPath: Ref<string>;
  isConnected: Ref<boolean>;
  isSftpReady: Ref<boolean>;
  clipboardState: Ref<Readonly<ClipboardState>>; // +++ 剪贴板状态 +++
  t: ReturnType<typeof useI18n>['t']; // 使用 useI18n 获取 t 的类型
  // --- 回调函数 ---
  onRefresh: () => void;
  onUpload: () => void;
  onUploadFolder: () => void;
  onDownload: (items: FileListItem[]) => void; // 文件下载回调
  onDownloadDirectory: (item: FileListItem) => void; // +++ 文件夹下载回调 +++
  onDelete: () => void; // 删除操作现在由外部处理
  onRename: (item: FileListItem) => void;
  onChangePermissions: (item: FileListItem) => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onCopy: () => void; // +++ 复制回调 +++
  onCut: () => void; // +++ 剪切回调 +++
  onPaste: () => void; // +++ 粘贴回调 +++
  // --- 压缩/解压回调 ---
  onCompressRequest: (items: FileListItem[], format: CompressFormat) => void; // +++ 压缩回调 +++
  onDecompressRequest: (item: FileListItem) => void; // +++ 解压回调 +++
  onCopyPath?: (item: FileListItem) => void; // +++ 复制路径回调 +++
  onCopyFilename?: (item: FileListItem) => void;
  onSendCdToTerminal?: (item: FileListItem) => void;
  onOpenTerminalAtPath?: (item: FileListItem) => void;
}

// 辅助函数：检查文件是否为支持的压缩格式
const SUPPORTED_ARCHIVE_EXTENSIONS = ['.zip', '.tar.gz', '.tgz', '.tar.bz2', '.tbz2'];
function isSupportedArchive(filename: string): boolean {
  const lowerCaseFilename = filename.toLowerCase();
  return SUPPORTED_ARCHIVE_EXTENSIONS.some(ext => lowerCaseFilename.endsWith(ext));
}


export function useFileManagerContextMenu(options: UseFileManagerContextMenuOptions) {
  const {
    selectedItems,
    lastClickedIndex,
    fileList,
    currentPath,
    isConnected,
    isSftpReady,
    clipboardState, // +++ 解构剪贴板状态 +++
    t,
    onRefresh,
    onUpload,
    onUploadFolder,
    onDownload,
    onDelete,
    onRename,
    onChangePermissions,
    onNewFolder,
    onNewFile,
    onCopy, // +++ 解构复制回调 +++
    onCut, // +++ 解构剪切回调 +++
    onPaste, // +++ 解构粘贴回调 +++
    onDownloadDirectory, // +++ 解构文件夹下载回调 +++
    onCompressRequest, // +++ 解构压缩回调 +++
    onDecompressRequest, // +++ 解构解压回调 +++
    onCopyPath, // +++ 解构复制路径回调 +++
    onCopyFilename,
    onSendCdToTerminal,
    onOpenTerminalAtPath,
  } = options;

  const contextMenuVisible = ref(false);
  const contextMenuPosition = ref({ x: 0, y: 0 });
  const contextMenuItems = ref<ContextMenuItem[]>([]);
  const contextTargetItem = ref<FileListItem | null>(null);
  // 修正 Ref 类型为组件实例类型
  const contextMenuRef = ref<InstanceType<typeof FileManagerContextMenu> | null>(null);

  const showContextMenu = (event: MouseEvent, item?: FileListItem) => {
    event.preventDefault();
    const targetItem = item || null;
    const targetItemIndex = targetItem
      ? fileList.value.findIndex((f: FileListItem) => f.filename === targetItem.filename)
      : -1;
    const isExternalTreeItem = Boolean(targetItem && targetItemIndex === -1 && typeof targetItem.longname === 'string' && targetItem.longname.startsWith('/'));

    // Adjust selection based on right-click target (逻辑保持不变)
    if (targetItem && !isExternalTreeItem && !event.ctrlKey && !event.metaKey && !event.shiftKey && !selectedItems.value.has(targetItem.filename)) {
        selectedItems.value.clear();
        selectedItems.value.add(targetItem.filename);
        // 使用传入的 fileList ref
        lastClickedIndex.value = targetItemIndex;
    } else if (!targetItem) {
        selectedItems.value.clear();
        lastClickedIndex.value = -1;
    }

    contextTargetItem.value = targetItem;
    let menu: ContextMenuItem[] = [];
    const selectionSize = selectedItems.value.size;
    const clickedItemIsSelected = targetItem && selectedItems.value.has(targetItem.filename);
    const hasClipboardContent = clipboardState.value.hasContent; // +++ 获取剪贴板状态 +++

    // Build context menu items (使用传入的回调)
    if (selectionSize > 1 && clickedItemIsSelected) {
        // Multi-selection menu
        const selectedFileItems = Array.from(selectedItems.value)
            .map(filename => fileList.value.find(f => f.filename === filename))
            .filter((item): item is FileListItem => !!item); // 过滤掉未找到的项并确保类型

        const allFilesSelected = selectedFileItems.length === selectionSize && selectedFileItems.every(item => item.attrs.isFile);

        menu = [
            // 调整顺序：剪切、复制优先
            { label: t('fileManager.actions.cut'), action: onCut, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-scissors' },
            { label: t('fileManager.actions.copy'), action: onCopy, disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-copy' },
        ];

        // --- 多选下载 ---
        // 多选时暂时禁用文件夹下载，只允许下载文件
        // 如果需要支持多选文件夹下载或混合下载，需要更复杂的逻辑和后端支持（例如打包成 zip）
        // 目前仅在 allFilesSelected 为 true 时启用多文件下载
         if (allFilesSelected) {
             menu.push({ label: t('fileManager.actions.downloadMultiple', { count: selectionSize }), action: () => onDownload(selectedFileItems), disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-download' });
         }


        // --- 多选压缩 ---
        menu.push({
            label: t('fileManager.contextMenu.compress'),
            submenu: [
                { label: t('fileManager.contextMenu.compressZip'), action: () => onCompressRequest(selectedFileItems, 'zip'), disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-file-archive' },
                { label: t('fileManager.contextMenu.compressTarGz'), action: () => onCompressRequest(selectedFileItems, 'targz'), disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-file-archive' },
                { label: t('fileManager.contextMenu.compressTarBz2'), action: () => onCompressRequest(selectedFileItems, 'tarbz2'), disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-file-archive' }
            ],
            icon: 'fas fa-box-archive'
        });
        menu.push({ label: '', action: () => {}, disabled: true, separator: true }); // Separator



       menu.push(
             // --- 分隔符 (视觉) ---
            { label: t('fileManager.actions.deleteMultiple', { count: selectionSize }), action: onDelete, disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-trash-alt', danger: true },
            // --- 分隔符 (视觉) ---
            { label: t('fileManager.actions.refresh'), action: onRefresh, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-rotate-right' }
        );
    } else if (targetItem && targetItem.filename !== '..') {
        // Single item (not '..') menu
        menu = [];

        const canOperate = isConnected.value && isSftpReady.value;
        const canCompress = canOperate;
        const canDecompress = canOperate && targetItem.attrs.isFile && isSupportedArchive(targetItem.filename);

        menu.push({ label: t('fileManager.actions.refresh'), action: onRefresh, disabled: !canOperate, icon: 'fas fa-rotate-right' });
        menu.push({ label: '', action: () => {}, disabled: true, separator: true });
        menu.push({ label: t('fileManager.actions.newFile'), action: onNewFile, disabled: !canOperate, icon: 'far fa-file' });
        menu.push({ label: t('fileManager.actions.newFolder'), action: onNewFolder, disabled: !canOperate, icon: 'far fa-folder' });
        menu.push({ label: '', action: () => {}, disabled: true, separator: true });
        menu.push({ label: t('fileManager.actions.rename'), action: () => onRename(targetItem), disabled: !canOperate, icon: 'far fa-pen-to-square' });

        if (targetItem.attrs.isFile) {
            menu.push({ label: t('fileManager.actions.download', { name: targetItem.filename }), action: () => onDownload([targetItem]), disabled: !canOperate, icon: 'fas fa-download' });
        } else if (targetItem.attrs.isDirectory) {
            menu.push({ label: t('fileManager.actions.downloadFolder', { name: targetItem.filename }), action: () => onDownloadDirectory(targetItem), disabled: !canOperate, icon: 'fas fa-download' });
        }

        menu.push({ label: t('fileManager.actions.changePermissions'), action: () => onChangePermissions(targetItem), disabled: !canOperate, icon: 'fas fa-lock' });
        menu.push({
            label: t('fileManager.actions.terminalMenu', '终端'),
            icon: 'fas fa-terminal',
            submenu: [
              {
                label: t('fileManager.actions.cdToTerminalMenu', '执行 cd 命令到终端'),
                action: () => onSendCdToTerminal?.(targetItem),
                disabled: !canOperate || !onSendCdToTerminal,
                icon: 'fas fa-terminal',
              },
              {
                label: t('fileManager.actions.newTerminalAtPath', '新建终端到当前目录'),
                action: () => onOpenTerminalAtPath?.(targetItem),
                disabled: !canOperate || !onOpenTerminalAtPath,
                icon: 'far fa-square-plus',
              },
            ],
        });
        menu.push({ label: '', action: () => {}, disabled: true, separator: true });

        if (onCopyFilename) {
          menu.push({ label: t('fileManager.actions.copyFilename', '复制文件名'), action: () => onCopyFilename(targetItem), disabled: !canOperate, icon: 'far fa-copy' });
        }
        if (onCopyPath) {
          menu.push({ label: t('fileManager.actions.copyPath', 'Copy Path'), action: () => onCopyPath(targetItem), disabled: !canOperate, icon: 'far fa-copy' });
        }

        menu.push({ label: t('fileManager.actions.delete'), action: onDelete, disabled: !canOperate, icon: 'far fa-trash-alt', danger: true });
        menu.push({
          label: t('fileManager.actions.uploadMenu', '上传'),
          icon: 'fas fa-upload',
          submenu: [
            {
              label: t('fileManager.actions.uploadFile', '上传文件'),
              action: onUpload,
              disabled: !canOperate,
              icon: 'fas fa-upload',
            },
            {
              label: t('fileManager.actions.uploadFolder', '上传文件夹'),
              action: onUploadFolder,
              disabled: !canOperate,
              icon: 'fas fa-folder-open',
            },
          ],
        });

        if (targetItem.attrs.isDirectory) {
          menu.push({ label: t('fileManager.actions.paste'), action: onPaste, disabled: !canOperate || !hasClipboardContent, icon: 'far fa-clipboard' });
        }
        menu.push({ label: t('fileManager.actions.copy'), action: onCopy, disabled: !canOperate, icon: 'far fa-copy' });
        menu.push({ label: t('fileManager.actions.cut'), action: onCut, disabled: !canOperate, icon: 'fas fa-scissors' });

        if (canCompress) {
          menu.push({ label: '', action: () => {}, disabled: true, separator: true });
          menu.push({
              label: t('fileManager.contextMenu.compress'),
              submenu: [
                  { label: t('fileManager.contextMenu.compressZip'), action: () => onCompressRequest([targetItem], 'zip'), disabled: !canCompress, icon: 'far fa-file-archive' },
                  { label: t('fileManager.contextMenu.compressTarGz'), action: () => onCompressRequest([targetItem], 'targz'), disabled: !canCompress, icon: 'far fa-file-archive' },
                  { label: t('fileManager.contextMenu.compressTarBz2'), action: () => onCompressRequest([targetItem], 'tarbz2'), disabled: !canCompress, icon: 'far fa-file-archive' }
              ],
              icon: 'fas fa-box-archive'
          });
        }

        if (canDecompress) {
            menu.push({ label: t('fileManager.contextMenu.decompress'), action: () => onDecompressRequest(targetItem), icon: 'fas fa-box-open' });
        }
    } else if (!targetItem) {
        // Right-click on empty space menu
        menu = [
            // 1. 粘贴
            { label: t('fileManager.actions.paste'), action: onPaste, disabled: !(isConnected.value && isSftpReady.value) || !hasClipboardContent, icon: 'far fa-clipboard' },
            // --- 分隔符 (视觉) ---
            // 2. 新建、上传
            { label: t('fileManager.actions.newFolder'), action: onNewFolder, disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-folder' },
            { label: t('fileManager.actions.newFile'), action: onNewFile, disabled: !(isConnected.value && isSftpReady.value), icon: 'far fa-file' },
            {
              label: t('fileManager.actions.uploadMenu', '上传'),
              icon: 'fas fa-upload',
              submenu: [
                { label: t('fileManager.actions.uploadFile', '上传文件'), action: onUpload, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-upload' },
                { label: t('fileManager.actions.uploadFolder', '上传文件夹'), action: onUploadFolder, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-folder-open' },
              ],
            },
            // --- 分隔符 (视觉) ---
            // 3. 刷新
            { label: t('fileManager.actions.refresh'), action: onRefresh, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-rotate-right' },
        ];
    } else { // Clicked on '..'
        menu = [
             // +++ 粘贴 (可以粘贴到上级目录) +++
            { label: t('fileManager.actions.paste'), action: onPaste, disabled: !(isConnected.value && isSftpReady.value) || !hasClipboardContent, icon: 'far fa-clipboard' },
            { label: t('fileManager.actions.refresh'), action: onRefresh, disabled: !(isConnected.value && isSftpReady.value), icon: 'fas fa-rotate-right' }
        ];
    }

    contextMenuItems.value = menu;

    // Set initial position based on click event
    contextMenuPosition.value = { x: event.clientX, y: event.clientY };
    contextMenuVisible.value = true; // Make menu visible so we can measure it

    // Use nextTick to allow the DOM to update and the menu to render
    nextTick(() => {
        // Access the DOM element via $el from the component instance ref
        const menuElement = contextMenuRef.value?.$el as HTMLDivElement | undefined;
        if (menuElement && contextMenuVisible.value) {
            // const menuElement = contextMenuRef.value; // Old way
            const menuRect = menuElement.getBoundingClientRect(); // Now should work
            const menuWidth = menuRect.width;
            const menuHeight = menuRect.height;

            let finalX = contextMenuPosition.value.x;
            let finalY = contextMenuPosition.value.y;

            // Adjust horizontally if needed
            if (finalX + menuWidth > window.innerWidth) {
                finalX = window.innerWidth - menuWidth - 5;
            }

            // Adjust vertically if needed
            if (finalY + menuHeight > window.innerHeight) {
                finalY = window.innerHeight - menuHeight - 5;
            }

            // Ensure menu doesn't go off-screen top or left
            finalX = Math.max(5, finalX);
            finalY = Math.max(5, finalY);

            // Update the position state if adjustments were made
            if (finalX !== contextMenuPosition.value.x || finalY !== contextMenuPosition.value.y) {
                 console.log(`[useFileManagerContextMenu] Adjusting context menu position: (${contextMenuPosition.value.x}, ${contextMenuPosition.value.y}) -> (${finalX}, ${finalY})`);
                 contextMenuPosition.value = { x: finalX, y: finalY };
            }

            // Add global listener to hide menu *after* positioning
            document.removeEventListener('click', hideContextMenu, { capture: true });
            document.addEventListener('click', hideContextMenu, { capture: true, once: true });
        } else {
             // Fallback listener if measurement fails
             document.removeEventListener('click', hideContextMenu, { capture: true });
             document.addEventListener('click', hideContextMenu, { capture: true, once: true });
        }
    });
  };

  const hideContextMenu = () => {
    if (!contextMenuVisible.value) return;
    contextMenuVisible.value = false;
    contextMenuItems.value = [];
    contextTargetItem.value = null; // 清理目标项
    document.removeEventListener('click', hideContextMenu, { capture: true });
  };

  // 返回需要暴露的状态和方法
  return {
    contextMenuVisible,
    contextMenuPosition,
    contextMenuItems,
    contextTargetItem, // 可能外部需要知道右键点击了哪个项
    contextMenuRef,
    showContextMenu,
    hideContextMenu,
  };
}
