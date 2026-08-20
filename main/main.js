import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { ProfileManager } from './profileManager.js'
import { ViewManager } from './viewManager.js'
import { UpdateManager } from './updateManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let profileManager = null
let viewManager = null
let updateManager = null

function safeParse(val, fallback = {}) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch (e) {
      return fallback
    }
  }
  return val !== undefined && val !== null ? val : fallback
}

function createMainWindow() {
  console.log('[DEBUG Main] Creating BrowserWindow...')
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: '指纹浏览器',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Re-bind viewManager & updateManager to newly created mainWindow
  viewManager.setMainWindow(mainWindow)
  updateManager.setMainWindow(mainWindow)

  // Dev server or Production HTML
  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  if (isDev) {
    console.log('[DEBUG Main] Loading Dev Server http://localhost:5173')
    const loadDevServer = () => {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        setTimeout(loadDevServer, 400)
      })
    }
    loadDevServer()
  } else {
    console.log('[DEBUG Main] Loading Production HTML dist/index.html')
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Auto restore tabs if enabled
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('[DEBUG Main] BrowserWindow finish-load complete.')
    if (profileManager.settings.autoRestoreTabs) {
      viewManager.restoreLastSession()
    }
  })

  mainWindow.on('closed', () => {
    console.log('[DEBUG Main] BrowserWindow closed.')
    mainWindow = null
  })
}

function setupIpcHandlers() {
  console.log('[DEBUG Main] Registering IPC handlers...')

  // Profiles IPC
  ipcMain.handle('profiles:get', () => {
    console.log('[DEBUG Main IPC] profiles:get called')
    return JSON.stringify(profileManager.profiles)
  })
  ipcMain.handle('profiles:save', (e, payload) => {
    console.log('[DEBUG Main IPC] profiles:save payload:', payload)
    try {
      const p = safeParse(payload)
      const res = profileManager.saveProfile(p)
      console.log('[DEBUG Main IPC] profiles:save result:', res)
      viewManager.sendToRenderer('profiles-changed', JSON.stringify(profileManager.profiles))
      return res
    } catch (err) {
      console.error('[DEBUG Main IPC ERROR] profiles:save:', err)
      return false
    }
  })
  ipcMain.handle('profiles:save-batch', (e, payload) => {
    console.log('[DEBUG Main IPC] profiles:save-batch payload:', payload)
    try {
      const list = safeParse(payload, [])
      for (const p of list) {
        profileManager.saveProfile(p)
      }
      viewManager.sendToRenderer('profiles-changed', JSON.stringify(profileManager.profiles))
      return true
    } catch (err) {
      console.error('[DEBUG Main IPC ERROR] profiles:save-batch:', err)
      return false
    }
  })
  ipcMain.handle('profiles:delete', (e, id) => {
    console.log('[DEBUG Main IPC] profiles:delete ID:', id)
    const res = profileManager.deleteProfile(id)
    viewManager.sendToRenderer('profiles-changed', JSON.stringify(profileManager.profiles))
    return res
  })
  ipcMain.handle('profiles:delete-batch', (e, payload) => {
    console.log('[DEBUG Main IPC] profiles:delete-batch payload:', payload)
    const ids = safeParse(payload, [])
    for (const id of ids) {
      profileManager.deleteProfile(id)
    }
    viewManager.sendToRenderer('profiles-changed', JSON.stringify(profileManager.profiles))
    return true
  })
  ipcMain.handle('profiles:import', async () => {
    const count = await profileManager.importProfilesDialog(mainWindow)
    if (count > 0) {
      viewManager.sendToRenderer('profiles-changed', JSON.stringify(profileManager.profiles))
    }
    return count
  })
  ipcMain.handle('profiles:export', async () => {
    return await profileManager.exportDialog(profileManager.profiles, 'profiles.json')
  })

  // Accounts IPC
  ipcMain.handle('accounts:get', () => JSON.stringify(profileManager.accounts))
  ipcMain.handle('accounts:save', (e, payload) => {
    console.log('[DEBUG Main IPC] accounts:save payload:', payload)
    try {
      const acc = safeParse(payload)
      const res = profileManager.saveAccount(acc)
      console.log('[DEBUG Main IPC] accounts:save result:', res)
      viewManager.sendToRenderer('accounts-changed', JSON.stringify(profileManager.accounts))
      return res
    } catch (err) {
      console.error('[DEBUG Main IPC ERROR] accounts:save:', err)
      return false
    }
  })
  ipcMain.handle('accounts:delete', (e, id) => {
    const res = profileManager.deleteAccount(id)
    viewManager.sendToRenderer('accounts-changed', JSON.stringify(profileManager.accounts))
    return res
  })
  ipcMain.handle('accounts:delete-batch', (e, payload) => {
    const ids = safeParse(payload, [])
    const res = profileManager.deleteAccountsBatch(ids)
    viewManager.sendToRenderer('accounts-changed', JSON.stringify(profileManager.accounts))
    return res
  })
  ipcMain.handle('accounts:import', async () => {
    const count = await profileManager.importAccountsDialog(mainWindow)
    if (count > 0) {
      viewManager.sendToRenderer('accounts-changed', JSON.stringify(profileManager.accounts))
    }
    return count
  })
  ipcMain.handle('accounts:export', async () => {
    return await profileManager.exportDialog(profileManager.accounts, 'accounts.json')
  })

  // Settings IPC
  ipcMain.handle('settings:get', () => JSON.stringify(profileManager.settings))
  ipcMain.handle('settings:save', (e, payload) => {
    console.log('[DEBUG Main IPC] settings:save payload:', payload)
    try {
      const s = safeParse(payload)
      const res = profileManager.saveSettings(s)
      console.log('[DEBUG Main IPC] settings:save result:', res)
      viewManager.sendToRenderer('settings-changed', JSON.stringify(profileManager.settings))
      return res
    } catch (err) {
      console.error('[DEBUG Main IPC ERROR] settings:save:', err)
      return false
    }
  })
  ipcMain.handle('system:select-directory', async (e, defaultPath) => {
    console.log('[DEBUG Main IPC] system:select-directory requested, defaultPath:', defaultPath)
    try {
      const win = BrowserWindow.fromWebContents(e.sender) || mainWindow
      const opts = {
        title: '选择文件夹',
        properties: ['openDirectory', 'createDirectory']
      }
      if (defaultPath && typeof defaultPath === 'string') {
        const cleanPath = defaultPath.trim()
        if (cleanPath && fs.existsSync(cleanPath)) {
          opts.defaultPath = cleanPath
        }
      }
      const result = win && !win.isDestroyed()
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts)

      console.log('[DEBUG Main IPC] showOpenDialog result:', result)
      if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
        return result.filePaths[0]
      }
    } catch (err) {
      console.error('[DEBUG Main IPC ERROR] system:select-directory:', err)
    }
    return null
  })

  // Downloads IPC
  ipcMain.handle('downloads:get', () => JSON.stringify(profileManager.downloads))
  ipcMain.handle('downloads:open-file', (e, filePath) => {
    if (!filePath) return false
    console.log('[DEBUG Main IPC] downloads:open-file requested for:', filePath)
    const ext = path.extname(filePath).toLowerCase()
    const inAppExts = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
      '.txt', '.json', '.csv', '.log', '.md', '.xml', '.js', '.css', '.html', '.htm',
      '.pdf'
    ]
    if (inAppExts.includes(ext) && fs.existsSync(filePath)) {
      const fileUrl = 'file:///' + filePath.replace(/\\/g, '/')
      const fileName = path.basename(filePath)
      viewManager.createTab({
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        name: fileName,
        baseName: fileName,
        url: fileUrl
      })
      viewManager.setCurrentView('active')
      return true
    } else {
      shell.openPath(filePath)
      return true
    }
  })
  ipcMain.handle('downloads:open-folder', (e, filePath) => {
    if (filePath) shell.showItemInFolder(filePath)
  })
  ipcMain.handle('downloads:remove', (e, id) => {
    profileManager.downloads = profileManager.downloads.filter((d) => d.id !== id)
    profileManager.saveDownloads(profileManager.downloads)
    const json = JSON.stringify(profileManager.downloads)
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed() && w.webContents) {
        w.webContents.send('downloads-changed', json)
      }
    })
    return true
  })

  let downloadsPopupWindow = null
  ipcMain.handle('downloads:toggle-popup', () => {
    if (downloadsPopupWindow && !downloadsPopupWindow.isDestroyed()) {
      downloadsPopupWindow.close()
      downloadsPopupWindow = null
      return false
    }

    if (!mainWindow || mainWindow.isDestroyed()) return false

    const mainBounds = mainWindow.getBounds()
    const popupWidth = 380
    const popupHeight = 490
    const popupX = Math.round(mainBounds.x + mainBounds.width - popupWidth - 14)
    const popupY = Math.round(mainBounds.y + 74)

    downloadsPopupWindow = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      x: popupX,
      y: popupY,
      parent: mainWindow,
      modal: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    const isDev = process.argv.includes('--dev')
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    if (isDev) {
      downloadsPopupWindow.loadURL(`${devUrl}/#downloads-popup`)
    } else {
      downloadsPopupWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'downloads-popup' })
    }

    downloadsPopupWindow.on('blur', () => {
      if (downloadsPopupWindow && !downloadsPopupWindow.isDestroyed()) {
        downloadsPopupWindow.close()
        downloadsPopupWindow = null
      }
    })

    return true
  })

  ipcMain.handle('downloads:close-popup', () => {
    if (downloadsPopupWindow && !downloadsPopupWindow.isDestroyed()) {
      downloadsPopupWindow.close()
      downloadsPopupWindow = null
    }
    return true
  })

  // Tabs IPC
  ipcMain.handle('tabs:launch', (e, id) => {
    console.log('[DEBUG Main IPC] tabs:launch ID:', id)
    const profile = profileManager.profiles.find((p) => p.id === id)
    if (profile) return viewManager.createTab(profile)
    console.error('[DEBUG Main IPC ERROR] tabs:launch profile not found for ID:', id)
    return false
  })
  ipcMain.handle('tabs:launch-batch', (e, payload) => {
    const ids = safeParse(payload, [])
    console.log('[DEBUG Main IPC] tabs:launch-batch count:', ids.length)
    for (const id of ids) {
      const profile = profileManager.profiles.find((p) => p.id === id)
      if (profile) viewManager.createTab(profile)
    }
    return true
  })
  ipcMain.handle('tabs:launch-blank', () => {
    console.log('[DEBUG Main IPC] tabs:launch-blank')
    const defaultUrl = profileManager.settings.newTabDefaultUrl || 'https://www.baidu.com'
    return viewManager.createTab({ name: '新标签页', url: defaultUrl })
  })
  ipcMain.handle('tabs:launch-link-at', (e, url, parentTabId) => {
    console.log('[DEBUG Main IPC] tabs:launch-link-at url:', url, 'parentTabId:', parentTabId)
    viewManager.launchLinkTabAt(url, parentTabId)
    return true
  })
  ipcMain.handle('tabs:select', (e, tabId) => {
    console.log('[DEBUG Main IPC] tabs:select tabId:', tabId)
    viewManager.selectTab(tabId)
    return true
  })
  ipcMain.handle('tabs:close', (e, tabId) => {
    console.log('[DEBUG Main IPC] tabs:close tabId:', tabId)
    viewManager.closeTab(tabId)
    return true
  })
  ipcMain.handle('tabs:close-all', () => {
    console.log('[DEBUG Main IPC] tabs:close-all')
    viewManager.closeAllTabs()
    return true
  })
  ipcMain.handle('tabs:get-open', () => {
    const list = []
    for (const [id, t] of viewManager.openTabs.entries()) {
      list.push({
        id,
        profileId: t.profileId,
        name: t.baseName,
        baseName: t.baseName,
        url: t.view.webContents ? t.view.webContents.getURL() : t.url,
        isExternal: t.isExternal
      })
    }
    return JSON.stringify(list)
  })
  ipcMain.handle('tabs:get-active', () => viewManager.activeTabId)
  ipcMain.handle('tabs:reorder', (e, payload) => {
    const ids = safeParse(payload, [])
    const newMap = new Map()
    for (const id of ids) {
      if (viewManager.openTabs.has(id)) {
        newMap.set(id, viewManager.openTabs.get(id))
      }
    }
    viewManager.openTabs = newMap
    viewManager.notifyTabsChanged()
    return true
  })

  // Detach / Attach
  ipcMain.handle('tabs:detach', (e, tabId) => {
    viewManager.detachTabToNewWindow(tabId)
    return true
  })
  ipcMain.handle('tabs:attach', (e, tabId) => {
    viewManager.attachTabFromWindow(tabId)
    return true
  })

  // Navigation
  ipcMain.handle('tab:navigate', (e, url) => {
    console.log('[DEBUG Main IPC] tab:navigate URL:', url)
    viewManager.navigateActiveTab(url)
    return true
  })
  ipcMain.handle('tab:go-back', () => viewManager.goBack())
  ipcMain.handle('tab:go-forward', () => viewManager.goForward())
  ipcMain.handle('tab:reload', () => viewManager.reloadTab())
  ipcMain.handle('tab:stop', () => viewManager.stopTab())
  ipcMain.handle('tab:go-home', () => viewManager.goHome())

  // DevTools, Search & Autofill
  ipcMain.handle('tab:toggle-devtools', (e, mode) => viewManager.toggleDevTools(mode))
  ipcMain.handle('tab:find-text', (e, text, forward, findNext) => viewManager.findText(text, forward, findNext))
  ipcMain.handle('tab:autofill', () => viewManager.autofillCredentials())

  // View Bounds & Layout
  ipcMain.handle('view:set-header-height', (e, h) => {
    viewManager.setHeaderHeight(h)
    return true
  })
  ipcMain.handle('view:update-bounds', (e, viewName) => {
    console.log('[DEBUG Main IPC] view:update-bounds:', viewName)
    viewManager.setCurrentView(viewName)
    return true
  })
  ipcMain.handle('view:update-layout-bounds', (e, boundsPayload) => {
    const obj = safeParse(boundsPayload)
    console.log('[DEBUG Main IPC] view:update-layout-bounds:', obj)
    viewManager.setLayoutBounds(obj)
    return true
  })

  // Custom In-App Window Controls
  ipcMain.handle('window:minimize', () => {
    console.log('[DEBUG Main IPC] window:minimize requested')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
      console.log('[DEBUG Main IPC] Executed mainWindow.minimize()')
      return true
    }
    console.error('[DEBUG Main IPC ERROR] mainWindow is null or destroyed on minimize!')
    return false
  })
  ipcMain.handle('window:maximize', () => {
    console.log('[DEBUG Main IPC] window:maximize requested')
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
        console.log('[DEBUG Main IPC] Executed mainWindow.unmaximize()')
      } else {
        mainWindow.maximize()
        console.log('[DEBUG Main IPC] Executed mainWindow.maximize()')
      }
      return true
    }
    console.error('[DEBUG Main IPC ERROR] mainWindow is null or destroyed on maximize!')
    return false
  })
  ipcMain.handle('window:close', () => {
    console.log('[DEBUG Main IPC] window:close requested')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
      console.log('[DEBUG Main IPC] Executed mainWindow.close()')
      return true
    }
    console.error('[DEBUG Main IPC ERROR] mainWindow is null or destroyed on close!')
    return false
  })
  ipcMain.handle('window:is-maximized', () => {
    const isMax = mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false
    console.log('[DEBUG Main IPC] window:is-maximized returned:', isMax)
    return isMax
  })

  // Updates IPC
  ipcMain.handle('updates:check', () => updateManager.checkForUpdates())
  ipcMain.handle('updates:download', () => updateManager.downloadUpdate())
  ipcMain.handle('updates:install', () => updateManager.quitAndInstall())
  ipcMain.handle('updates:get-version', () => app.getVersion())
}

app.whenReady().then(() => {
  console.log('[DEBUG Main] app.whenReady triggered')
  Menu.setApplicationMenu(null)

  profileManager = new ProfileManager()
  viewManager = new ViewManager(null, profileManager)
  updateManager = new UpdateManager(profileManager)

  profileManager.onDownloadsChanged = (dlList) => {
    const json = JSON.stringify(dlList)
    BrowserWindow.getAllWindows().forEach((w) => {
      if (!w.isDestroyed() && w.webContents) {
        w.webContents.send('downloads-changed', json)
      }
    })
  }

  setupIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  console.log('[DEBUG Main] app window-all-closed triggered')
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
