import JSZip from 'jszip';

export interface FolderArchiveResult {
  archiveFile: File;
  folderName: string;
  entryCount: number;
}

const TEMP_ARCHIVE_SUFFIX = '__nexus_upload__.zip';

const sanitizeFileName = (name: string): string => {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'folder';
};

const getFolderNameFromRelativePath = (relativePath: string): string => {
  const [folderName] = relativePath.split('/').filter(Boolean);
  return sanitizeFileName(folderName || 'folder');
};

export const createFolderArchive = async (
  selectedFiles: File[] | FileList,
  onProgress?: (percent: number) => void,
): Promise<FolderArchiveResult> => {
  const files = Array.from(selectedFiles).filter((file) => {
    return Boolean(file.webkitRelativePath && file.webkitRelativePath.includes('/'));
  });

  if (files.length === 0) {
    throw new Error('No folder files were selected.');
  }

  const folderName = getFolderNameFromRelativePath(files[0].webkitRelativePath);
  const zip = new JSZip();

  files.forEach((file) => {
    const relativePath = file.webkitRelativePath.replace(/\\/g, '/');
    zip.file(relativePath, file);
  });

  const archiveBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.max(0, Math.min(100, Math.round(metadata.percent))));
    },
  );

  const archiveFileName = `${folderName}${TEMP_ARCHIVE_SUFFIX}`;
  const archiveFile = new File([archiveBlob], archiveFileName, {
    type: 'application/zip',
    lastModified: Date.now(),
  });

  return {
    archiveFile,
    folderName,
    entryCount: files.length,
  };
};
