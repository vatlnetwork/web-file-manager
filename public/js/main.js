import { state } from './state.js';
import { icons } from './icons.js';
import { getFileIcon, getFileKind, formatSize, formatDate, escapeHtml, isTextFile } from './utils.js';
import { fetchFiles, fetchSidebarInfo, downloadFile, fetchPreview, searchFiles, renameFile, deleteFile, createFile, saveFile } from './api.js';
import { els, $$, showToast, showLoading, hideLoading, showEmpty, hideEmpty, showError, hideError } from './ui.js';

/* ======================================================
   WebFiles — macOS Finder-Inspired File Explorer App
   ====================================================== */



const $ = (sel) => document.querySelector(sel);
  // ── Navigation ─────────────────────────────────────────
  async function navigateTo(dirPath, addToHistory = true) {
    showLoading();
    hideError();
    hideEmpty();
    hideSearch();

    try {
      const data = await fetchFiles(dirPath);
      state.currentPath = data.path;
      state.files = data.files;
      state.selectedFile = null;

      if (addToHistory) {
        // Remove forward history when navigating new path
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(data.path);
        state.historyIndex = state.history.length - 1;
      }

      updateNavButtons();
      updateWindowTitle(data.path);
      updateBreadcrumbs(data.path);
      updateSidebarActive(data.path);
      renderFiles();
      hideLoading();
      updateStatusBar();
      hidePreview();
    } catch (err) {
      hideLoading();
      showError(err.message);
    }
  }

  function goBack() {
    if (state.historyIndex > 0) {
      state.historyIndex--;
      navigateTo(state.history[state.historyIndex], false);
    }
  }

  function goForward() {
    if (state.historyIndex < state.history.length - 1) {
      state.historyIndex++;
      navigateTo(state.history[state.historyIndex], false);
    }
  }

  function updateNavButtons() {
    els.btnBack.disabled = state.historyIndex <= 0;
    els.btnForward.disabled = state.historyIndex >= state.history.length - 1;
  }

  // ── Window Title ───────────────────────────────────────
  function updateWindowTitle(dirPath) {
    const parts = dirPath.split('/').filter(Boolean);
    const name = parts.length === 0 ? '/' : parts[parts.length - 1];
    els.windowTitle.textContent = name;
    document.title = `${name} — WebFiles`;
  }

  // ── Breadcrumbs ────────────────────────────────────────
  function updateBreadcrumbs(dirPath) {
    const parts = dirPath.split('/').filter(Boolean);
    let html = '';

    // Root
    html += `<span class="breadcrumb${parts.length === 0 ? ' current' : ''}" data-path="/">/</span>`;

    let accumulated = '';
    parts.forEach((part, i) => {
      accumulated += '/' + part;
      html += `<span class="breadcrumb-sep">›</span>`;
      html += `<span class="breadcrumb${i === parts.length - 1 ? ' current' : ''}" data-path="${accumulated}">${part}</span>`;
    });

    els.breadcrumbs.innerHTML = html;

    // Click handlers
    els.breadcrumbs.querySelectorAll('.breadcrumb').forEach(bc => {
      bc.addEventListener('click', () => navigateTo(bc.dataset.path));
    });
  }

  // ── Sidebar ────────────────────────────────────────────
  async function initSidebar() {
    try {
      const info = await fetchSidebarInfo();

      // Root dir entry + folder list
      let html = `
        <li class="sidebar-item sidebar-root" data-path="${info.rootDir}">
          <span class="sidebar-icon">${icons.computer}</span>
          <span class="sidebar-label">${escapeHtml(info.rootName)}</span>
        </li>
      `;

      html += info.folders.map(folder => `
        <li class="sidebar-item" data-path="${folder.path}">
          <span class="sidebar-icon">${icons.folder}</span>
          <span class="sidebar-label${folder.isHidden ? ' hidden-file' : ''}">${escapeHtml(folder.name)}</span>
        </li>
      `).join('');

      els.sidebarFolders.innerHTML = html;

      // Click handlers
      els.sidebar.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
          navigateTo(item.dataset.path);
        });
      });

      // Navigate to root dir
      navigateTo(info.rootDir);
    } catch (err) {
      console.error('Failed to init sidebar:', err);
      navigateTo('/');
    }
  }

  function updateSidebarActive(path) {
    els.sidebar.querySelectorAll('.sidebar-item').forEach(item => {
      item.classList.toggle('active', item.dataset.path === path);
    });
  }

  // ── Render Files ───────────────────────────────────────
  function renderFiles() {
    const files = getFilteredAndSortedFiles();

    if (files.length === 0) {
      showEmpty();
      els.fileList.innerHTML = '';
      return;
    }

    hideEmpty();

    if (state.viewMode === 'columns') {
      renderColumnsView();
    } else {
      renderListOrGridView(files);
    }

    updateItemCount(files.length);
  }

  function getFilteredAndSortedFiles() {
    let files = state.files;

    if (!state.showHidden) {
      files = files.filter(f => !f.isHidden);
    }

    files = [...files].sort((a, b) => {
      // Directories always first
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let cmp = 0;
      switch (state.sortBy) {
        case 'name':
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
          break;
        case 'modified':
          cmp = new Date(a.modified) - new Date(b.modified);
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'kind':
          cmp = getFileKind(a).localeCompare(getFileKind(b));
          break;
      }
      return state.sortAsc ? cmp : -cmp;
    });

    return files;
  }

  function renderListOrGridView(files) {
    let html = '';
    files.forEach((file, idx) => {
      const kind = getFileKind(file);
      const icon = getFileIcon(file);
      const hiddenClass = file.isHidden ? ' hidden-file' : '';

      html += `
        <div class="file-row" data-index="${idx}" data-path="${file.path}" data-is-dir="${file.isDirectory}" style="animation-delay:${Math.min(idx * 15, 300)}ms">
          <div class="file-icon-cell">
            <span class="file-icon">${icon}</span>
            <span class="file-name${hiddenClass}">${escapeHtml(file.name)}</span>
          </div>
          <span class="file-meta file-modified">${formatDate(file.modified)}</span>
          <span class="file-meta file-size">${file.isDirectory ? '—' : formatSize(file.size)}</span>
          <span class="file-meta file-kind">${kind}</span>
        </div>
      `;
    });

    els.fileList.innerHTML = html;
    attachFileHandlers();
  }

  function renderColumnsView() {
    // Build column paths
    if (state.columnPaths.length === 0 || state.columnPaths[state.columnPaths.length - 1] !== state.currentPath) {
      state.columnPaths = [state.currentPath];
    }

    renderColumnPanes();
  }

  async function renderColumnPanes() {
    let html = '';

    for (let i = 0; i < state.columnPaths.length; i++) {
      try {
        const data = await fetchFiles(state.columnPaths[i]);
        let files = data.files;
        if (!state.showHidden) files = files.filter(f => !f.isHidden);

        const nextPath = i < state.columnPaths.length - 1 ? state.columnPaths[i + 1] : null;

        html += `<div class="column-pane" data-column-index="${i}" data-path="${data.path}">`;
        files.forEach(file => {
          const isSelected = file.path === nextPath || (i === state.columnPaths.length - 1 && state.selectedFile && state.selectedFile.path === file.path);
          html += `
            <div class="column-item${isSelected ? ' selected' : ''}" data-path="${file.path}" data-is-dir="${file.isDirectory}">
              <span class="column-icon">${getFileIcon(file)}</span>
              <span class="column-name">${escapeHtml(file.name)}</span>
              ${file.isDirectory ? '<span class="column-chevron">›</span>' : ''}
            </div>
          `;
        });
        html += '</div>';
      } catch (e) {
        break;
      }
    }

    els.fileList.innerHTML = html;

    // Scroll to rightmost column
    els.fileView.scrollLeft = els.fileView.scrollWidth;

    // Attach column item handlers
    els.fileList.querySelectorAll('.column-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const colPane = item.closest('.column-pane');
        const colIndex = parseInt(colPane.dataset.columnIndex);

        // Deselect siblings
        colPane.querySelectorAll('.column-item').forEach(si => si.classList.remove('selected'));
        item.classList.add('selected');

        const filePath = item.dataset.path;
        const isDir = item.dataset.isDir === 'true';

        if (isDir) {
          // Trim columns after this one and add new
          state.columnPaths = state.columnPaths.slice(0, colIndex + 1);
          state.columnPaths.push(filePath);
          state.currentPath = filePath;
          updateWindowTitle(filePath);
          updateBreadcrumbs(filePath);
          updateSidebarActive(filePath);
          renderColumnPanes();
        } else {
          // Select file, show preview
          state.columnPaths = state.columnPaths.slice(0, colIndex + 1);
          const file = state.files.find(f => f.path === filePath) || { name: filePath.split('/').pop(), path: filePath, isDirectory: false };
          selectFile(file);
        }
      });

      item.addEventListener('dblclick', () => {
        if (item.dataset.isDir === 'true') {
          navigateTo(item.dataset.path);
        }
      });
    });
  }

  function attachFileHandlers() {
    const rows = els.fileList.querySelectorAll('.file-row');
    rows.forEach(row => {
      row.addEventListener('click', (e) => {
        // Deselect all
        rows.forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        const idx = parseInt(row.dataset.index);
        const files = getFilteredAndSortedFiles();
        selectFile(files[idx]);
      });

      row.addEventListener('dblclick', () => {
        if (row.dataset.isDir === 'true') {
          navigateTo(row.dataset.path);
        }
      });

      // Context menu
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        rows.forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        const idx = parseInt(row.dataset.index);
        const files = getFilteredAndSortedFiles();
        selectFile(files[idx]);
        showContextMenu(e.clientX, e.clientY, files[idx]);
      });
    });
  }

  // ── Selection & Preview ────────────────────────────────
  function selectFile(file) {
    state.selectedFile = file;
    showPreview(file);
  }

  async function showPreview(file) {
    state.previewVisible = true;
    els.previewPanel.style.display = 'flex';

    els.previewIconLarge.innerHTML = getFileIcon(file, true);
    els.previewFilename.textContent = file.name;
    els.previewKind.textContent = getFileKind(file);

    if (els.previewActions) {
      if (!file.isDirectory) {
        els.previewActions.innerHTML = `
          <button class="preview-download-btn" id="btn-preview-download">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v7M4 7l3 3 3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 10v2h10v-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Download
          </button>
        `;
        document.getElementById('btn-preview-download').addEventListener('click', () => downloadFile(file.path));
      } else {
        els.previewActions.innerHTML = '';
      }
    }

    // Hide preview containers
    els.previewImageContainer.style.display = 'none';
    els.previewTextContainer.style.display = 'none';

    // Info table
    let infoHTML = '';
    if (file.modified) infoHTML += `<tr><td>Modified</td><td>${formatDate(file.modified)}</td></tr>`;
    if (file.created) infoHTML += `<tr><td>Created</td><td>${formatDate(file.created)}</td></tr>`;
    if (!file.isDirectory) infoHTML += `<tr><td>Size</td><td>${formatSize(file.size)}</td></tr>`;
    if (file.permissions) infoHTML += `<tr><td>Perms</td><td>${file.permissions}</td></tr>`;
    infoHTML += `<tr><td>Path</td><td style="font-size:11px;word-break:break-all">${escapeHtml(file.path)}</td></tr>`;
    els.previewInfoBody.innerHTML = infoHTML;

    // Try to load preview content
    if (!file.isDirectory && file.path) {
      try {
        const preview = await fetchPreview(file.path);
        if (preview) {
          if (preview.type === 'image') {
            els.previewImage.src = preview.url;
            els.previewImageContainer.style.display = 'block';
          } else if (preview.type === 'text' && preview.content !== null) {
            els.previewTextContent.textContent = preview.content.substring(0, 2000);
            els.previewTextContainer.style.display = 'block';
            
            // Add Edit button to preview actions
            const editBtn = document.createElement('button');
            editBtn.className = 'preview-download-btn'; // Reuse style
            editBtn.style.marginLeft = '8px';
            editBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 11l2 2L13 5l-2-2-8 8zM2 12l1 1M4 10l1 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Edit
            `;
            editBtn.onclick = () => openEditor(file);
            els.previewActions.appendChild(editBtn);
          }
        }
      } catch (e) { /* ignore preview errors */ }
    }
  }

  function hidePreview() {
    state.previewVisible = false;
    els.previewPanel.style.display = 'none';
    state.selectedFile = null;
  }

  // ── View Mode ──────────────────────────────────────────
  function setViewMode(mode) {
    state.viewMode = mode;
    els.fileView.className = `view-${mode}`;

    // Update buttons
    $$('.view-btn').forEach(b => b.classList.remove('active'));
    $(`#btn-view-${mode}`).classList.add('active');

    // Show/hide list header
    els.listHeader.style.display = mode === 'list' ? 'flex' : 'none';

    if (mode === 'columns') {
      state.columnPaths = [state.currentPath];
    }

    renderFiles();
  }

  // ── Sorting ────────────────────────────────────────────
  function setSort(field) {
    if (state.sortBy === field) {
      state.sortAsc = !state.sortAsc;
    } else {
      state.sortBy = field;
      state.sortAsc = true;
    }

    // Update sort indicators
    $$('#list-header .sort-arrow').forEach(a => a.textContent = '');
    const activeCol = $(`#list-header [data-sort="${field}"] .sort-arrow`);
    if (activeCol) activeCol.textContent = state.sortAsc ? '▲' : '▼';

    renderFiles();
  }

  // ── Search ─────────────────────────────────────────────
  let searchTimeout = null;

  function handleSearchInput() {
    const query = els.searchInput.value.trim();
    els.searchClear.style.display = query ? 'flex' : 'none';

    clearTimeout(searchTimeout);

    if (!query) {
      hideSearch();
      return;
    }

    searchTimeout = setTimeout(async () => {
      state.searchActive = true;
      els.fileView.style.display = 'none';
      els.searchResults.style.display = 'block';
      els.listHeader.style.display = 'none';

      try {
        const data = await searchFiles(query, state.currentPath);
        els.searchResultsCount.textContent = `${data.results.length} result${data.results.length !== 1 ? 's' : ''} for "${query}"`;

        let html = '';
        data.results.forEach((file, idx) => {
          const kind = getFileKind(file);
          const icon = getFileIcon(file);
          html += `
            <div class="file-row" data-path="${file.path}" data-is-dir="${file.isDirectory}" style="animation-delay:${Math.min(idx * 20, 400)}ms">
              <div class="file-icon-cell">
                <span class="file-icon">${icon}</span>
                <span class="file-name${file.isHidden ? ' hidden-file' : ''}">${escapeHtml(file.name)}</span>
              </div>
              <span class="file-meta file-modified">${formatDate(file.modified)}</span>
              <span class="file-meta file-size">${file.isDirectory ? '—' : formatSize(file.size)}</span>
              <span class="file-meta file-kind">${kind}</span>
            </div>
          `;
        });

        els.searchResultsList.innerHTML = html;

        // Handlers
        els.searchResultsList.querySelectorAll('.file-row').forEach(row => {
          row.addEventListener('click', () => {
            els.searchResultsList.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
            row.classList.add('selected');
          });
          row.addEventListener('dblclick', () => {
            if (row.dataset.isDir === 'true') {
              clearSearch();
              navigateTo(row.dataset.path);
            }
          });
        });
      } catch (e) {
        els.searchResultsList.innerHTML = '<p style="padding:20px;color:var(--text-secondary)">Search failed</p>';
      }
    }, 300);
  }

  function clearSearch() {
    els.searchInput.value = '';
    els.searchClear.style.display = 'none';
    hideSearch();
  }

  function hideSearch() {
    state.searchActive = false;
    els.searchResults.style.display = 'none';
    els.fileView.style.display = '';
    if (state.viewMode === 'list') {
      els.listHeader.style.display = 'flex';
    }
  }

  // ── Context Menu ───────────────────────────────────────
  function showContextMenu(x, y, file) {
    const menu = els.contextMenu;
    menu.style.display = 'block';
    menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    menu.style.top = y + 'px';

    // Get menu dimensions to check if it needs to flip vertically
    const menuRect = menu.getBoundingClientRect();
    const menuHeight = menuRect.height;
    
    // If menu would go off the bottom of the screen, position it above the cursor instead
    if (y + menuHeight > window.innerHeight) {
      menu.style.top = Math.max(0, y - menuHeight) + 'px';
    }

    const dlItem = menu.querySelector('[data-action="download"]');
    const editItem = menu.querySelector('[data-action="edit"]');
    
    if (dlItem) {
      if (file.isDirectory) {
        dlItem.style.opacity = '0.4';
        dlItem.style.pointerEvents = 'none';
      } else {
        dlItem.style.opacity = '1';
        dlItem.style.pointerEvents = 'auto';
      }
    }

    if (editItem) {
      if (isTextFile(file)) {
        editItem.style.display = 'flex';
      } else {
        editItem.style.display = 'none';
      }
    }

    // Handlers
    menu.querySelectorAll('.context-item').forEach(item => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);

      newItem.addEventListener('click', () => {
        const action = newItem.dataset.action;
        if (action === 'open') {
          if (file.isDirectory) navigateTo(file.path);
        } else if (action === 'download') {
          if (!file.isDirectory) downloadFile(file.path);
        } else if (action === 'info') {
          selectFile(file);
        } else if (action === 'copy-path') {
          navigator.clipboard.writeText(file.path).catch(() => {});
        } else if (action === 'copy-name') {
          navigator.clipboard.writeText(file.name).catch(() => {});
        } else if (action === 'rename') {
          openRenameModal(file);
        } else if (action === 'delete') {
          openDeleteModal(file);
        } else if (action === 'edit') {
          openEditor(file);
        }
        hideContextMenu();
      });
    });
  }

  function hideContextMenu() {
    els.contextMenu.style.display = 'none';
  }

  // ── UI States ──
  function updateItemCount(count) {
    els.statusItems.textContent = `${count} item${count !== 1 ? 's' : ''}`;
  }

  function updateStatusBar() {
    const files = getFilteredAndSortedFiles();
    const dirs = files.filter(f => f.isDirectory).length;
    const fileCount = files.length - dirs;
    els.statusItems.textContent = `${dirs} folder${dirs !== 1 ? 's' : ''}, ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    els.statusPath.textContent = state.currentPath;
  }

  // ── Sidebar Resize ────────────────────────────────────
  function initSidebarResize() {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    els.sidebarResize.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = els.sidebar.offsetWidth;
      els.sidebarResize.classList.add('active');
      document.body.style.cursor = 'col-resize';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= 140 && newWidth <= 350) {
        els.sidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        els.sidebarResize.classList.remove('active');
        document.body.style.cursor = '';
      }
    });
  }

  // ── Keyboard Navigation ────────────────────────────────
  function initKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      // Escape closes things
      if (e.key === 'Escape') {
        hideContextMenu();
        if (state.searchActive) clearSearch();
        else if (state.previewVisible) hidePreview();
      }

      // Don't handle shortcuts when typing in search
      if (document.activeElement === els.searchInput) return;

      // Cmd/Ctrl+F = focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        els.searchInput.focus();
      }

      // Backspace = go back / navigate up
      if (e.key === 'Backspace') {
        e.preventDefault();
        const parent = state.currentPath.split('/').slice(0, -1).join('/') || '/';
        if (parent !== state.currentPath) navigateTo(parent);
      }

      // Alt+Left = back, Alt+Right = forward
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); goForward(); }

      // Enter = open selected
      if (e.key === 'Enter' && state.selectedFile) {
        if (state.selectedFile.isDirectory) {
          navigateTo(state.selectedFile.path);
        }
      }

      // Cmd/Ctrl+Shift+. = toggle hidden files
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '.') {
        e.preventDefault();
        state.showHidden = !state.showHidden;
        renderFiles();
        updateStatusBar();
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateFileSelection(e.key === 'ArrowDown' ? 1 : -1);
      }

      // 1/2/3 = switch views
      if (e.key === '1' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setViewMode('list'); }
      if (e.key === '2' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setViewMode('grid'); }
      if (e.key === '3' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setViewMode('columns'); }
    });
  }

  function navigateFileSelection(direction) {
    const rows = els.fileList.querySelectorAll('.file-row');
    if (rows.length === 0) return;

    const currentIndex = state.selectedFile
      ? Array.from(rows).findIndex(r => r.dataset.path === state.selectedFile.path)
      : -1;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= rows.length) newIndex = rows.length - 1;

    rows.forEach(r => r.classList.remove('selected'));
    rows[newIndex].classList.add('selected');
    rows[newIndex].scrollIntoView({ block: 'nearest' });

    const files = getFilteredAndSortedFiles();
    if (files[newIndex]) selectFile(files[newIndex]);
  }

  // ── Upload Feature ─────────────────────────────────────
  let filesToUpload = [];

  function initUploads() {
    if (!els.btnUpload) return;
    els.btnUpload.addEventListener('click', openUploadModal);
    els.uploadModalClose.addEventListener('click', closeUploadModal);
    els.uploadCancelBtn.addEventListener('click', closeUploadModal);
    els.uploadBrowseBtn.addEventListener('click', () => els.uploadFileInput.click());
    els.uploadFileInput.addEventListener('change', (e) => {
      addFilesToUpload(Array.from(e.target.files));
      els.uploadFileInput.value = '';
    });
    els.uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      els.uploadDropzone.classList.add('drag-over');
    });
    els.uploadDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      els.uploadDropzone.classList.remove('drag-over');
    });
    els.uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.uploadDropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) addFilesToUpload(Array.from(e.dataTransfer.files));
    });

    let dragCounter = 0;
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounter++;
        if (dragCounter === 1 && !state.previewVisible && els.uploadModal.style.display === 'none') els.dragOverlay.style.display = 'flex';
      }
    });
    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounter--;
        if (dragCounter === 0) els.dragOverlay.style.display = 'none';
      }
    });
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        dragCounter = 0;
        els.dragOverlay.style.display = 'none';
        if (e.dataTransfer.files.length > 0) {
          if (els.uploadModal.style.display === 'none') openUploadModal();
          addFilesToUpload(Array.from(e.dataTransfer.files));
        }
      }
    });
    els.uploadSubmitBtn.addEventListener('click', doUpload);
  }

  function openUploadModal() {
    els.uploadDestPath.textContent = state.currentPath || '/';
    els.uploadModal.style.display = 'flex';
    filesToUpload = [];
    renderUploadFiles();
    els.uploadProgressArea.style.display = 'none';
    els.uploadProgressBar.style.width = '0%';
  }

  function closeUploadModal() {
    els.uploadModal.style.display = 'none';
    filesToUpload = [];
  }

  function addFilesToUpload(newFiles) {
    for (const f of newFiles) {
      if (!filesToUpload.find(existing => existing.name === f.name && existing.size === f.size)) {
        filesToUpload.push(f);
      }
    }
    renderUploadFiles();
  }

  function renderUploadFiles() {
    els.uploadFileList.innerHTML = filesToUpload.map((file, idx) => `
      <div class="upload-file-item">
        <span class="file-icon">${icons.file}</span>
        <span class="upload-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="upload-file-size">${formatSize(file.size)}</span>
        <button class="upload-file-remove" data-idx="${idx}" title="Remove file">×</button>
      </div>
    `).join('');
    els.uploadFileList.querySelectorAll('.upload-file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        filesToUpload.splice(parseInt(e.currentTarget.dataset.idx), 1);
        renderUploadFiles();
      });
    });
    els.uploadSubmitBtn.disabled = filesToUpload.length === 0;
  }

  function doUpload() {
    if (filesToUpload.length === 0) return;
    els.uploadProgressArea.style.display = 'block';
    els.uploadSubmitBtn.disabled = true;
    els.uploadCancelBtn.disabled = true;
    els.uploadBrowseBtn.disabled = true;
    els.uploadFileList.querySelectorAll('.upload-file-remove').forEach(btn => btn.style.display = 'none');

    const formData = new FormData();
    formData.append('path', state.currentPath || '/');
    filesToUpload.forEach(file => formData.append('files', file));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = (e.loaded / e.total) * 100;
        els.uploadProgressBar.style.width = pct + '%';
        els.uploadProgressText.textContent = `Uploading... ${Math.round(pct)}%`;
      }
    };
    xhr.onload = () => {
      els.uploadCancelBtn.disabled = false;
      els.uploadBrowseBtn.disabled = false;
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast(`Successfully uploaded ${filesToUpload.length} file(s)`, 'success');
        closeUploadModal();
        navigateTo(state.currentPath || '/');
      } else {
        let err = 'Upload failed';
        try { err = JSON.parse(xhr.responseText).error || err; } catch(e){}
        showToast(err, 'error');
        els.uploadProgressText.textContent = 'Upload failed';
        els.uploadSubmitBtn.disabled = false;
        els.uploadFileList.querySelectorAll('.upload-file-remove').forEach(btn => btn.style.display = 'flex');
      }
    };
    xhr.onerror = () => {
      els.uploadCancelBtn.disabled = false;
      els.uploadBrowseBtn.disabled = false;
      els.uploadSubmitBtn.disabled = false;
      showToast('Network error during upload', 'error');
      els.uploadProgressText.textContent = 'Network error';
    };
    xhr.send(formData);
  }

  // ── Mkdir Feature ──────────────────────────────────────
  function initMkdir() {
    if (!els.btnNewFolder) return;
    els.btnNewFolder.addEventListener('click', () => openMkdirModal('folder'));
    if(els.mkdirModalClose) els.mkdirModalClose.addEventListener('click', closeMkdirModal);
    if(els.mkdirCancelBtn) els.mkdirCancelBtn.addEventListener('click', closeMkdirModal);
    
    if(els.mkdirInput) {
      els.mkdirInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doMkdir();
      });
    }
    
    if(els.mkdirSubmitBtn) els.mkdirSubmitBtn.addEventListener('click', doMkdir);
  }

  function openMkdirModal(mode = 'folder') {
    state.modalMode = mode;
    const isFile = mode === 'file';
    els.mkdirModal.querySelector('h2').textContent = isFile ? 'New File' : 'New Folder';
    els.mkdirInput.placeholder = isFile ? 'untitled.txt' : 'untitled folder';
    els.mkdirSubmitBtn.textContent = 'Create';
    els.mkdirModal.style.display = 'flex';
    els.mkdirInput.value = '';
    // Small timeout to allow modal to display before focusing
    setTimeout(() => els.mkdirInput.focus(), 50);
  }

  function closeMkdirModal() {
    els.mkdirModal.style.display = 'none';
  }

  async function doMkdir() {
    const name = els.mkdirInput.value.trim();
    if (!name) return;
    
    els.mkdirSubmitBtn.disabled = true;
    try {
      const isFile = state.modalMode === 'file';
      const endpoint = isFile ? '/api/create-file' : '/api/mkdir';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: state.currentPath, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to create ${isFile ? 'file' : 'folder'}`);
      
      showToast(`Created ${isFile ? 'file' : 'folder'} "${name}"`, 'success');
      closeMkdirModal();
      navigateTo(state.currentPath || '/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      els.mkdirSubmitBtn.disabled = false;
    }
  }

  // ── Rename Feature ─────────────────────────────────────
  let itemToRename = null;

  function initRename() {
    if (!els.renameModal) return;
    els.renameModalClose.addEventListener('click', closeRenameModal);
    els.renameCancelBtn.addEventListener('click', closeRenameModal);
    els.renameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doRename();
    });
    els.renameSubmitBtn.addEventListener('click', doRename);
  }

  function openRenameModal(file) {
    itemToRename = file;
    els.renameModal.style.display = 'flex';
    els.renameInput.value = file.name;
    // Highlight the filename without extension
    const extIdx = file.name.lastIndexOf('.');
    const end = (file.isDirectory || extIdx === -1) ? file.name.length : extIdx;
    setTimeout(() => {
      els.renameInput.focus();
      els.renameInput.setSelectionRange(0, end);
    }, 50);
  }

  function closeRenameModal() {
    els.renameModal.style.display = 'none';
    itemToRename = null;
  }

  async function doRename() {
    if (!itemToRename) return;
    const newName = els.renameInput.value.trim();
    if (!newName || newName === itemToRename.name) {
      closeRenameModal();
      return;
    }

    els.renameSubmitBtn.disabled = true;
    try {
      await renameFile(itemToRename.path, newName);
      showToast(`Renamed to "${newName}"`, 'success');
      closeRenameModal();
      navigateTo(state.currentPath || '/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      els.renameSubmitBtn.disabled = false;
    }
  }

  // ── Delete Feature ─────────────────────────────────────
  let itemToDelete = null;

  function initDelete() {
    if (!els.deleteModal) return;
    els.deleteModalClose.addEventListener('click', closeDeleteModal);
    els.deleteCancelBtn.addEventListener('click', closeDeleteModal);
    els.deleteSubmitBtn.addEventListener('click', doDelete);
  }

  function openDeleteModal(file) {
    itemToDelete = file;
    els.deleteItemName.textContent = file.name;
    els.deleteModal.style.display = 'flex';
  }

  function closeDeleteModal() {
    els.deleteModal.style.display = 'none';
    itemToDelete = null;
  }

  async function doDelete() {
    if (!itemToDelete) return;
    els.deleteSubmitBtn.disabled = true;
    try {
      await deleteFile(itemToDelete.path);
      showToast(`Deleted "${itemToDelete.name}"`, 'success');
      closeDeleteModal();
      navigateTo(state.currentPath || '/');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      els.deleteSubmitBtn.disabled = false;
    }
  }

  // ── New File Feature ───────────────────────────────────
  function initNewFile() {
    if (!els.btnNewFile) return;
    els.btnNewFile.addEventListener('click', openNewFileModal);
  }

  function openNewFileModal() {
    openMkdirModal('file');
  }

  // ── Editor Feature ────────────────────────────────────
  let fileBeingEdited = null;

  function initEditor() {
    if (!els.editorModal) return;
    els.editorModalClose.addEventListener('click', closeEditor);
    els.editorCancelBtn.addEventListener('click', closeEditor);
    els.editorSaveBtn.addEventListener('click', doSaveFile);
    
    // Keyboard shortcuts for editor
    els.editorTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSaveFile();
      }
    });
  }

  async function openEditor(file) {
    fileBeingEdited = file;
    try {
      const preview = await fetchPreview(file.path);
      if (preview && preview.type === 'text') {
        els.editorTextarea.value = preview.content || '';
        els.editorTitle.textContent = `Editing: ${file.name}`;
        els.editorStatus.textContent = `MIME: ${file.mimeType || 'text/plain'}`;
        els.editorModal.style.display = 'flex';
        setTimeout(() => els.editorTextarea.focus(), 50);
      } else {
        showToast('This file cannot be edited as text', 'error');
      }
    } catch (err) {
      showToast('Failed to load file for editing', 'error');
    }
  }

  function closeEditor() {
    els.editorModal.style.display = 'none';
    fileBeingEdited = null;
  }

  async function doSaveFile() {
    if (!fileBeingEdited) return;
    const content = els.editorTextarea.value;
    
    els.editorSaveBtn.disabled = true;
    els.editorStatus.textContent = 'Saving...';
    
    try {
      await saveFile(fileBeingEdited.path, content);
      showToast(`Saved "${fileBeingEdited.name}"`, 'success');
      els.editorStatus.textContent = `Last saved at ${new Date().toLocaleTimeString()}`;
      
      // Update preview if panel is open
      if (state.selectedFile && state.selectedFile.path === fileBeingEdited.path) {
        selectFile(fileBeingEdited);
      }
    } catch (err) {
      showToast(err.message, 'error');
      els.editorStatus.textContent = 'Save failed';
    } finally {
      els.editorSaveBtn.disabled = false;
    }
  }

  // ── Utility ────────────────────────────────────────────
  
  // ── Init ───────────────────────────────────────────────
  function init() {
    // View mode buttons
    els.btnViewList.addEventListener('click', () => setViewMode('list'));
    els.btnViewGrid.addEventListener('click', () => setViewMode('grid'));
    els.btnViewColumns.addEventListener('click', () => setViewMode('columns'));

    // Navigation buttons
    els.btnBack.addEventListener('click', goBack);
    els.btnForward.addEventListener('click', goForward);

    // Search
    els.searchInput.addEventListener('input', handleSearchInput);
    els.searchClear.addEventListener('click', clearSearch);

    // Sort headers
    $$('#list-header > div').forEach(col => {
      col.addEventListener('click', () => {
        const field = col.dataset.sort;
        if (field) setSort(field);
      });
    });

    // Close context menu on outside click
    document.addEventListener('click', (e) => {
      if (!els.contextMenu.contains(e.target)) hideContextMenu();
    });

    // Click on empty area to deselect
    els.fileView.addEventListener('click', (e) => {
      if (e.target === els.fileView || e.target === els.fileList) {
        els.fileList.querySelectorAll('.file-row').forEach(r => r.classList.remove('selected'));
        hidePreview();
      }
    });

    initSidebarResize();
    initKeyboardNav();
    initSidebar();
    initUploads();
    initMkdir();
    initRename();
    initDelete();
    initNewFile();
    initEditor();
  }

  document.addEventListener('DOMContentLoaded', init);
