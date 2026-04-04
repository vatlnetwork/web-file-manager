import { icons } from './icons.js';

function getFileIcon(file, large) {
    if (file.isDirectory) {
      if (file.isSymlink) return icons.symlink;
      return large ? icons.folderLarge : icons.folder;
    }

    const mime = file.mimeType || '';
    const ext = file.name.split('.').pop().toLowerCase();

    if (mime.startsWith('image/')) return large ? icons.imageLarge : icons.image;
    if (mime.startsWith('audio/')) return icons.audio;
    if (mime.startsWith('video/')) return icons.video;
    if (mime === 'application/pdf') return icons.pdf;
    if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) return icons.archive;
    if (['js', 'ts', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java', 'cs', 'php', 'sh', 'bash', 'zsh', 'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'sql', 'lua', 'vim', 'jsx', 'tsx', 'vue', 'svelte', 'swift', 'kt', 'dart', 'r', 'cmake', 'makefile', 'dockerfile'].includes(ext)) return icons.code;
    if (mime.startsWith('text/') || ['md', 'txt', 'log', 'csv', 'ini', 'cfg', 'conf', 'gitignore', 'env'].includes(ext)) return icons.text;

    return large ? icons.fileLarge : icons.file;
  }

function getFileKind(file) {
    if (file.isDirectory) return 'Folder';
    const mime = file.mimeType || '';
    const ext = file.name.split('.').pop().toLowerCase();

    if (mime.startsWith('image/')) return 'Image';
    if (mime.startsWith('audio/')) return 'Audio';
    if (mime.startsWith('video/')) return 'Video';
    if (mime === 'application/pdf') return 'PDF Document';
    if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'].includes(ext)) return 'Archive';
    if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return 'JavaScript';
    if (['py'].includes(ext)) return 'Python Script';
    if (['html', 'htm'].includes(ext)) return 'HTML Document';
    if (['css', 'scss', 'sass'].includes(ext)) return 'Stylesheet';
    if (['json'].includes(ext)) return 'JSON';
    if (['md'].includes(ext)) return 'Markdown';
    if (['sh', 'bash', 'zsh'].includes(ext)) return 'Shell Script';
    if (mime.startsWith('text/')) return 'Text File';

    return ext ? ext.toUpperCase() + ' File' : 'Document';
  }

function formatSize(bytes) {
    if (bytes === 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + units[i];
  }

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fileDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (today.getTime() === fileDate.getTime()) {
      return 'Today, ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (yesterday.getTime() === fileDate.getTime()) {
      return 'Yesterday, ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }

    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

function isTextFile(file) {
  if (file.isDirectory) return false;
  if (file.isText !== undefined) return file.isText;
  
  const mime = file.mimeType || '';
  const ext = file.name.split('.').pop().toLowerCase();
  
  return mime.startsWith('text/') || 
         mime === 'application/json' || 
         mime === 'application/javascript' || 
         mime === 'application/xml' ||
         ['js', 'ts', 'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'java', 'cs', 'php', 'sh', 'bash', 'zsh', 'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'toml', 'sql', 'lua', 'vim', 'jsx', 'tsx', 'vue', 'svelte', 'swift', 'kt', 'dart', 'r', 'cmake', 'makefile', 'dockerfile', 'md', 'txt', 'log', 'csv', 'ini', 'cfg', 'conf', 'gitignore', 'env', 'todolist'].includes(ext);
}


export { getFileIcon, getFileKind, formatSize, formatDate, escapeHtml, isTextFile };
