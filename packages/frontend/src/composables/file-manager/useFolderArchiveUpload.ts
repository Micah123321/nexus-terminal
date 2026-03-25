import JSZip from 'jszip';

export interface FolderArchiveSource {
  file: File;
  relativePath: string;
}

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
  selectedFiles: File[] | FileList | FolderArchiveSource[],
  onProgress?: (percent: number) => void,
): Promise<FolderArchiveResult> => {
  const entries: Array<File | FolderArchiveSource> = Array.isArray(selectedFiles)
    ? selectedFiles
    : Array.from(selectedFiles);

  const files = entries
    .map<FolderArchiveSource | null>((entry) => {
      if (entry instanceof File) {
        const relativePath = entry.webkitRelativePath?.replace(/\\/g, '/');
        return relativePath && relativePath.includes('/') ? { file: entry, relativePath } : null;
      }

      const relativePath = entry.relativePath.replace(/\\/g, '/');
      return relativePath && relativePath.includes('/') ? { file: entry.file, relativePath } : null;
    })
    .filter((entry): entry is FolderArchiveSource => entry !== null);

  if (files.length === 0) {
    throw new Error('No folder files were selected.');
  }

  const folderName = getFolderNameFromRelativePath(files[0].relativePath);
  const zip = new JSZip();

  files.forEach(({ file, relativePath }) => {
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
