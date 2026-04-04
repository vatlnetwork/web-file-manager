export const state = {
  currentPath: '',
  files: [],
  history: [],
  historyIndex: -1,
  selectedFile: null,
  viewMode: 'list',
  sortBy: 'name',
  sortAsc: true,
  showHidden: true,
  searchActive: false,
  columnPaths: [],
  previewVisible: false,
  sidebarActive: null,
  modalMode: null, // 'file' or 'folder'
};
