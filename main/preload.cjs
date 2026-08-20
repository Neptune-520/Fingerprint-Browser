const { contextBridge, ipcRenderer } = require('electron')

console.log('[DEBUG Preload.cjs] Preload script initializing in renderer...')

contextBridge.exposeInMainWorld('electronAPI', {
  // Profiles CRUD
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  saveProfile: (profile) => ipcRenderer.invoke('profiles:save', profile),
  saveProfilesBatch: (profiles) => ipcRenderer.invoke('profiles:save-batch', profiles),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),
  deleteProfilesBatch: (ids) => ipcRenderer.invoke('profiles:delete-batch', ids),
  importProfiles: (profiles) => ipcRenderer.invoke('profiles:import', profiles),
  exportProfiles: () => ipcRenderer.invoke('profiles:export'),

  // Settings CRUD
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  exportSettings: () => ipcRenderer.invoke('settings:export'),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('system:select-directory', defaultPath),

  // Accounts Vault CRUD
  getAccounts: () => ipcRenderer.invoke('accounts:get'),
  saveAccount: (account) => ipcRenderer.invoke('accounts:save', account),
  deleteAccount: (id) => ipcRenderer.invoke('accounts:delete', id),
  deleteAccountsBatch: (ids) => ipcRenderer.invoke('accounts:delete-batch', ids),
  importAccounts: (accounts) => ipcRenderer.invoke('accounts:import', accounts),
  exportAccounts: () => ipcRenderer.invoke('accounts:export'),

  // Downloads Manager
  getDownloads: () => ipcRenderer.invoke('downloads:get'),
  openDownloadedFile: (filePath) => ipcRenderer.invoke('downloads:open-file', filePath),
  openDownloadFolder: (filePath) => ipcRenderer.invoke('downloads:open-folder', filePath),
  removeDownloadTask: (id) => ipcRenderer.invoke('downloads:remove', id),
  toggleDownloadsPopup: () => ipcRenderer.invoke('downloads:toggle-popup'),
  closeDownloadsPopup: () => ipcRenderer.invoke('downloads:close-popup'),

  // Tab & Multi-Window Operations
  getOpenTabs: () => ipcRenderer.invoke('tabs:get-open'),
  getActiveTab: () => ipcRenderer.invoke('tabs:get-active'),
  launchTab: (profileId) => ipcRenderer.invoke('tabs:launch', profileId),
  launchBlankTab: (url) => ipcRenderer.invoke('tabs:launch-blank', url),
  launchTabsBatch: (idsList) => ipcRenderer.invoke('tabs:launch-batch', idsList),
  selectTab: (tabId) => ipcRenderer.invoke('tabs:select', tabId),
  closeTab: (tabId) => ipcRenderer.invoke('tabs:close', tabId),
  closeAllTabs: () => ipcRenderer.invoke('tabs:close-all'),
  reorderTabs: (idsList) => ipcRenderer.invoke('tabs:reorder', idsList),
  detachTabToNewWindow: (tabId) => ipcRenderer.invoke('tabs:detach', tabId),
  attachTabFromWindow: (tabId) => ipcRenderer.invoke('tabs:attach', tabId),
  launchLinkTabAt: (url, parentTabId) => ipcRenderer.invoke('tabs:launch-link-at', url, parentTabId),

  // Active Tab Navigation
  navigateActiveTab: (url) => ipcRenderer.invoke('tab:navigate', url),
  goBack: () => ipcRenderer.invoke('tab:go-back'),
  goForward: () => ipcRenderer.invoke('tab:go-forward'),
  reloadTab: () => ipcRenderer.invoke('tab:reload'),
  stopTab: () => ipcRenderer.invoke('tab:stop'),
  goHome: () => ipcRenderer.invoke('tab:go-home'),

  // DevTools, Search & Autofill
  toggleDevTools: (mode) => ipcRenderer.invoke('tab:toggle-devtools', mode),
  findText: (text, forward, findNext) => ipcRenderer.invoke('tab:find-text', text, forward, findNext),
  autofillCredentials: () => ipcRenderer.invoke('tab:autofill'),

  // Layout & Bounds
  setHeaderHeight: (height) => ipcRenderer.invoke('view:set-header-height', height),
  updateWebviewBounds: (bounds) => ipcRenderer.invoke('view:update-bounds', bounds),
  updateLayoutBounds: (boundsObj) => ipcRenderer.invoke('view:update-layout-bounds', boundsObj),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Platform Info
  platform: process.platform,

  // Auto Updater Manager
  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  quitAndInstall: () => ipcRenderer.invoke('updates:install'),
  getAppVersion: () => ipcRenderer.invoke('updates:get-version'),

  // Backend Signal Event Handlers
  onTabsChanged: (callback) => ipcRenderer.on('tabs-changed', (e, data) => callback(data)),
  onActiveTabChanged: (callback) => ipcRenderer.on('active-tab-changed', (e, data) => callback(data)),
  onProfilesChanged: (callback) => ipcRenderer.on('profiles-changed', (e, data) => callback(data)),
  onAccountsChanged: (callback) => ipcRenderer.on('accounts-changed', (e, data) => callback(data)),
  onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (e, data) => callback(data)),
  onDownloadsChanged: (callback) => ipcRenderer.on('downloads-changed', (e, data) => callback(data)),
  onFindResult: (callback) => ipcRenderer.on('find-result', (e, data) => callback(data)),
  onTabLoadingStatus: (callback) => ipcRenderer.on('tab-loading-status', (e, data) => callback(data)),
  onTriggerFind: (callback) => ipcRenderer.on('trigger-find', (e) => callback()),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (e, data) => callback(data)),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (e, data) => callback(data))
})

console.log('[DEBUG Preload.cjs] electronAPI successfully exposed to window!')
