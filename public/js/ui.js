import { escapeHtml } from './utils.js';

const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

export const els = {
    windowTitle: $('#window-title'),
    btnBack: $('#btn-back'),
    btnForward: $('#btn-forward'),
    searchInput: $('#search-input'),
    searchClear: $('#search-clear'),
    searchWrapper: $('#search-wrapper'),
    btnViewList: $('#btn-view-list'),
    btnViewGrid: $('#btn-view-grid'),
    btnViewColumns: $('#btn-view-columns'),
    sidebar: $('#sidebar'),
    sidebarFolders: $('#sidebar-folders'),
    sidebarResize: $('#sidebar-resize'),
    contentArea: $('#content-area'),
    breadcrumbs: $('#breadcrumbs'),
    itemCount: $('#item-count'),
    listHeader: $('#list-header'),
    fileView: $('#file-view'),
    fileList: $('#file-list'),
    searchResults: $('#search-results'),
    searchResultsList: $('#search-results-list'),
    searchResultsCount: $('#search-results-count'),
    emptyState: $('#empty-state'),
    loadingState: $('#loading-state'),
    errorState: $('#error-state'),
    errorMessage: $('#error-message'),
    previewPanel: $('#preview-panel'),
    previewIconLarge: $('#preview-icon-large'),
    previewFilename: $('#preview-filename'),
    previewKind: $('#preview-kind'),
    previewInfoBody: $('#preview-info-body'),
    previewImageContainer: $('#preview-image-container'),
    previewImage: $('#preview-image'),
    previewTextContainer: $('#preview-text-container'),
    previewTextContent: $('#preview-text-content'),
    statusItems: $('#status-items'),
    statusPath: $('#status-path'),
    contextMenu: $('#context-menu'),
    btnNewFile: $('#btn-new-file'),
    btnNewFolder: $('#btn-new-folder'),
    btnUpload: $('#btn-upload'),
    uploadModal: $('#upload-modal'),
    uploadModalClose: $('#upload-modal-close'),
    uploadDestPath: $('#upload-dest-path'),
    uploadDropzone: $('#upload-dropzone'),
    uploadBrowseBtn: $('#upload-browse-btn'),
    uploadFileInput: $('#upload-file-input'),
    uploadFileList: $('#upload-file-list'),
    uploadProgressArea: $('#upload-progress-area'),
    uploadProgressBar: $('#upload-progress-bar'),
    uploadProgressText: $('#upload-progress-text'),
    uploadCancelBtn: $('#upload-cancel-btn'),
    uploadSubmitBtn: $('#upload-submit-btn'),
    dragOverlay: $('#drag-overlay'),
    toastContainer: $('#toast-container'),
    previewActions: $('#preview-actions'),
    mkdirModal: $('#mkdir-modal'),
    mkdirModalClose: $('#mkdir-modal-close'),
    mkdirInput: $('#mkdir-input'),
    mkdirCancelBtn: $('#mkdir-cancel-btn'),
    mkdirSubmitBtn: $('#mkdir-submit-btn'),
    renameModal: $('#rename-modal'),
    renameModalClose: $('#rename-modal-close'),
    renameInput: $('#rename-input'),
    renameCancelBtn: $('#rename-cancel-btn'),
    renameSubmitBtn: $('#rename-submit-btn'),
    deleteModal: $('#delete-modal'),
    deleteModalClose: $('#delete-modal-close'),
    deleteItemName: $('#delete-item-name'),
    deleteCancelBtn: $('#delete-cancel-btn'),
    deleteSubmitBtn: $('#delete-submit-btn'),
    editorModal: $('#editor-modal'),
    editorModalClose: $('#editor-modal-close'),
    editorTitle: $('#editor-title'),
    editorTextarea: $('#editor-textarea'),
    editorStatus: $('#editor-status'),
    editorCancelBtn: $('#editor-cancel-btn'),
    editorSaveBtn: $('#editor-save-btn'),
  };

export function showToast(message, type = 'info') {
    if (!els.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'i';
    toast.innerHTML = `<div class="toast-icon ${type}">${icon}</div><div class="toast-message">${escapeHtml(message)}</div>`;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function showLoading() { els.loadingState.style.display = 'flex'; els.fileList.innerHTML = ''; }
export function hideLoading() { els.loadingState.style.display = 'none'; }
export function showEmpty() { els.emptyState.style.display = 'flex'; }
export function hideEmpty() { els.emptyState.style.display = 'none'; }
export function showError(msg) { els.errorState.style.display = 'flex'; els.errorMessage.textContent = msg; }
export function hideError() { els.errorState.style.display = 'none'; }
