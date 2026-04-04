import { showToast } from './ui.js';
// ── API ────────────────────────────────────────────────
  export async function fetchFiles(dirPath) {
    const res = await fetch(`/api/files?path=${encodeURIComponent(dirPath)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load');
    }
    return res.json();
  }

  export async function fetchSidebarInfo() {
    const res = await fetch('/api/sidebar');
    return res.json();
  }

  export function downloadFile(filePath) {
    const url = `/api/download?path=${encodeURIComponent(filePath)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Downloading ${a.download}...`, 'success');
  }

  export async function fetchPreview(filePath) {
    const res = await fetch(`/api/preview?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.startsWith('image/')) {
      return { type: 'image', url: `/api/preview?path=${encodeURIComponent(filePath)}` };
    }
    return res.json();
  }

  export async function searchFiles(query, searchPath) {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&path=${encodeURIComponent(searchPath)}`);
    return res.json();
  }

  export async function renameFile(oldPath, newName) {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newName })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Rename failed');
    }
    return res.json();
  }

  export async function deleteFile(path) {
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Delete failed');
    }
    return res.json();
  }

  export async function createFile(path, name) {
    const res = await fetch('/api/create-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, name })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create file');
    }
    return res.json();
  }

  export async function saveFile(path, content) {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Save failed');
    }
    return res.json();
  }

  