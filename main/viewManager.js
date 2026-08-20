import { WebContentsView, BrowserWindow, dialog, Menu, clipboard } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class ViewManager {
  constructor(mainWindow, profileManager) {
    this.mainWindow = mainWindow
    this.profileManager = profileManager
    this.openTabs = new Map() // tabId -> TabObject
    this.activeTabId = null
    this.headerHeight = 32
    this.sidebarWidth = 176
    this.currentView = 'home' // 'home', 'accounts', 'settings', 'active'
    this.findResult = { current: 0, total: 0 }

    this.initMainWindowListeners()
  }

  initMainWindowListeners() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.on('resize', () => {
        console.log('[DEBUG ViewManager] mainWindow resized. Re-calculating WebContentsView bounds.')
        this.updateActiveViewBounds()
      })
    }
  }

  setMainWindow(win) {
    console.log('[DEBUG ViewManager] setMainWindow called with mainWindow:', !!win)
    this.mainWindow = win
    this.initMainWindowListeners()
  }

  setLayoutBounds(boundsObj) {
    console.log('[DEBUG ViewManager] setLayoutBounds called with:', boundsObj)
    if (typeof boundsObj === 'object') {
      if (boundsObj.currentView) this.currentView = boundsObj.currentView
      if (typeof boundsObj.topHeight === 'number') this.headerHeight = boundsObj.topHeight
      if (typeof boundsObj.sidebarWidth === 'number') this.sidebarWidth = boundsObj.sidebarWidth
      if (typeof boundsObj.modalOpen === 'boolean') this.modalOpen = boundsObj.modalOpen
      if (typeof boundsObj.downloadsOpen === 'boolean') this.downloadsOpen = boundsObj.downloadsOpen
    }
    this.updateActiveViewBounds()
  }

  setHeaderHeight(h) {
    console.log('[DEBUG ViewManager] setHeaderHeight:', h)
    this.headerHeight = h
    this.updateActiveViewBounds()
  }

  setCurrentView(viewName) {
    console.log('[DEBUG ViewManager] setCurrentView:', viewName)
    this.currentView = viewName
    this.updateActiveViewBounds()
  }

  updateActiveViewBounds() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('[DEBUG ViewManager WARN] updateActiveViewBounds skipped: mainWindow is null or destroyed!')
      return
    }

    const { width, height } = this.mainWindow.getContentBounds()
    const sideW = typeof this.sidebarWidth === 'number' ? this.sidebarWidth : 176
    const topH = this.headerHeight || 32

    console.log(`[DEBUG ViewManager] updateActiveViewBounds -> currentView: "${this.currentView}", activeTabId: "${this.activeTabId}", modalOpen: ${!!this.modalOpen}`)

    for (const [tabId, tabObj] of this.openTabs.entries()) {
      if (tabObj.isExternal) continue

      if (this.currentView === 'active' && tabId === this.activeTabId && !this.modalOpen) {
        if (!this.mainWindow.contentView.children.includes(tabObj.view)) {
          this.mainWindow.contentView.addChildView(tabObj.view)
          console.log(`[DEBUG ViewManager] Added WebContentsView to contentView for tabId: "${tabId}"`)
        }
        tabObj.view.setBounds({
          x: sideW,
          y: topH,
          width: Math.max(0, width - sideW),
          height: Math.max(0, height - topH)
        })
      } else {
        if (this.mainWindow.contentView.children.includes(tabObj.view)) {
          this.mainWindow.contentView.removeChildView(tabObj.view)
          console.log(`[DEBUG ViewManager] Removed WebContentsView from contentView for hidden tabId: "${tabId}"`)
        }
      }
    }
  }

  createTab(profileData, isExternal = false, insertAfterTabId = null) {
    console.log('[DEBUG ViewManager] createTab requested for profile:', profileData.name, 'ID:', profileData.id, 'URL:', profileData.url)
    const tabId = profileData.id || 'tab_' + Math.random().toString(36).substring(2, 9)

    // Check if already open
    if (this.openTabs.has(tabId)) {
      console.log(`[DEBUG ViewManager] Tab "${tabId}" already open. Selecting it.`)
      this.selectTab(tabId)
      return true
    }

    const partitionId = profileData.partitionId || profileData.id || 'default'
    const sess = this.profileManager.getSessionForPartition(partitionId)

    const view = new WebContentsView({
      webPreferences: {
        session: sess,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    })

    let initialUrl = profileData.url ? profileData.url.trim() : ''
    if (!initialUrl || initialUrl === 'https://' || initialUrl === 'http://') {
      initialUrl = this.profileManager.settings.newTabDefaultUrl || 'https://www.baidu.com'
    }
    if (!initialUrl.startsWith('http://') && !initialUrl.startsWith('https://') && !initialUrl.startsWith('file://')) {
      initialUrl = 'https://' + initialUrl
    }

    console.log(`[DEBUG ViewManager] WebContentsView instantiated for tab "${tabId}". Loading URL: ${initialUrl}`)
    view.setBackgroundColor('#ffffff')

    const tabObj = {
      id: tabId,
      profileId: profileData.profileId || profileData.id,
      profileData: { ...profileData },
      baseName: profileData.baseName || profileData.name || '新窗口',
      partitionId,
      view,
      isExternal: false,
      externalWindow: null,
      url: initialUrl
    }

    // Load initial URL
    view.webContents.loadURL(initialUrl).then(() => {
      console.log(`[DEBUG ViewManager] loadURL resolved successfully for tab "${tabId}" (${initialUrl})`)
    }).catch((err) => {
      console.error(`[DEBUG ViewManager ERROR] loadURL failed for tab "${tabId}" (${initialUrl}):`, err)
    })

    // WebContents Lifecycle Events
    view.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[WebContents Console "${tabId}"][L${line} in ${sourceId || 'page'}] ${message}`)
    })
    view.webContents.on('did-start-loading', () => {
      console.log(`[DEBUG WebContentsView "${tabId}"] did-start-loading -> ${view.webContents.getURL()}`)
      this.sendToRenderer('tab-loading-status', JSON.stringify({ tabId, isLoading: true }))
    })
    view.webContents.on('dom-ready', () => {
      console.log(`[DEBUG WebContentsView "${tabId}"] dom-ready -> ${view.webContents.getURL()}`)
      this.autofillCredentials(tabObj)
    })
    view.webContents.on('did-finish-load', () => {
      console.log(`[DEBUG WebContentsView "${tabId}"] did-finish-load -> Title: "${view.webContents.getTitle()}", URL: ${view.webContents.getURL()}`)
      this.sendToRenderer('tab-loading-status', JSON.stringify({ tabId, isLoading: false }))
      this.autofillCredentials(tabObj)
    })
    view.webContents.on('did-navigate', (event, url) => {
      console.log(`[DEBUG WebContentsView "${tabId}"] did-navigate -> ${url}`)
      this.autofillCredentials(tabObj)
    })
    view.webContents.on('did-navigate-in-page', (event, url) => {
      console.log(`[DEBUG WebContentsView "${tabId}"] did-navigate-in-page -> ${url}`)
      this.autofillCredentials(tabObj)
    })

    // Fail-load diagnostic error page handler
    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      this.sendToRenderer('tab-loading-status', JSON.stringify({ tabId, isLoading: false }))
      if (isMainFrame && errorCode !== -3) {
        console.error(`[DEBUG WebContentsView ERROR "${tabId}"] did-fail-load: code=${errorCode}, desc=${errorDescription}, url=${validatedURL}`)
        const failHtml = `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"/><title>加载失败</title></head>
            <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b;">
              <div style="text-align: center; max-width: 420px; padding: 24px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="font-size: 28px; margin-bottom: 8px;">🌐</div>
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">无法加载网页</h3>
                <p style="font-size: 12px; color: #64748b; word-break: break-all; margin: 0 0 12px 0;">${validatedURL || initialUrl}</p>
                <div style="font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 8px; border-radius: 6px; margin-bottom: 16px; font-family: monospace;">${errorDescription} (${errorCode})</div>
                <button onclick="location.href='${validatedURL || initialUrl}'" style="padding: 8px 20px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer;">重新加载</button>
              </div>
            </body>
          </html>
        `
        view.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(failHtml))
      }
    })

    // Set Window Open Handler (Opens in tab next to current, inherits partition/cookies)
    view.webContents.setWindowOpenHandler(({ url }) => {
      console.log(`[DEBUG WebContentsView "${tabId}"] Window open requested for URL: ${url}`)
      this.launchLinkTab(url, tabId)
      return { action: 'deny' }
    })

    // Found in Page Event Handler
    view.webContents.on('found-in-page', (event, result) => {
      console.log(`[DEBUG WebContentsView "${tabId}"] found-in-page result:`, result)
      this.findResult = {
        current: result.activeMatchOrdinal !== undefined ? result.activeMatchOrdinal : 0,
        total: result.matches !== undefined ? result.matches : 0
      }
      this.sendToRenderer('find-result', JSON.stringify(this.findResult))
    })

    // Listen to keyboard shortcuts inside webContents (F12, Ctrl+F, Ctrl+Tab, F5, etc.)
    view.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return

      // F12 -> Toggle DevTools
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault()
        this.toggleDevTools(this.profileManager.settings.devtoolsDockMode || 'right')
        return
      }

      // Ctrl+F -> Trigger Find
      if (input.control && input.key.toLowerCase() === 'f') {
        event.preventDefault()
        this.sendToRenderer('trigger-find')
        return
      }

      // Ctrl+Tab / Ctrl+Shift+Tab -> Switch Tabs
      if (input.control && input.key === 'Tab') {
        event.preventDefault()
        this.switchNextTab(input.shift)
        return
      }

      // F5 or Ctrl+R -> Reload Tab
      if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        event.preventDefault()
        this.reloadTab()
        return
      }
    })

    // Custom Right-Click Context Menu
    view.webContents.on('context-menu', (event, params) => {
      event.preventDefault()
      const menuTemplate = []

      const canGoBack = typeof view.webContents.canGoBack === 'function' ? view.webContents.canGoBack() : false
      const canGoForward = typeof view.webContents.canGoForward === 'function' ? view.webContents.canGoForward() : false

      // 1. Text Selection
      if (params.selectionText && params.selectionText.trim().length > 0) {
        menuTemplate.push(
          {
            label: '复制',
            role: 'copy'
          },
          { type: 'separator' }
        )
      }

      // 2. Image Selection
      if (params.mediaType === 'image') {
        menuTemplate.push(
          {
            label: '复制图片',
            click: () => {
              view.webContents.copyImageAt(params.x, params.y)
            }
          },
          {
            label: '下载图片',
            click: () => {
              if (params.srcURL) {
                view.webContents.downloadURL(params.srcURL)
              }
            }
          },
          { type: 'separator' }
        )
      }

      // 3. Link Selection
      if (params.linkURL) {
        menuTemplate.push(
          {
            label: '新建标签打开链接',
            click: () => {
              this.launchLinkTab(params.linkURL, tabId)
            }
          },
          {
            label: '复制链接地址',
            click: () => {
              clipboard.writeText(params.linkURL)
            }
          },
          { type: 'separator' }
        )
      }

      // 4. Default / Navigation Actions
      menuTemplate.push(
        {
          label: '后退',
          enabled: canGoBack,
          click: () => {
            if (canGoBack && typeof view.webContents.goBack === 'function') {
              view.webContents.goBack()
            }
          }
        },
        {
          label: '前进',
          enabled: canGoForward,
          click: () => {
            if (canGoForward && typeof view.webContents.goForward === 'function') {
              view.webContents.goForward()
            }
          }
        },
        {
          label: '刷新',
          click: () => {
            view.webContents.reload()
          }
        },
        {
          label: '强制刷新 (忽略缓存)',
          click: () => {
            view.webContents.reloadIgnoringCache()
          }
        },
        { type: 'separator' },
        {
          label: '检查',
          click: () => {
            view.webContents.inspectElement(params.x, params.y)
          }
        }
      )

      const menu = Menu.buildFromTemplate(menuTemplate)
      const targetWin = BrowserWindow.fromWebContents(view.webContents) || this.mainWindow
      if (targetWin && !targetWin.isDestroyed()) {
        menu.popup({ window: targetWin })
      }
    })

    // Listen to url changes
    view.webContents.on('page-title-updated', () => {
      tabObj.url = view.webContents.getURL()
      this.notifyTabsChanged()
    })
    view.webContents.on('did-navigate', () => {
      tabObj.url = view.webContents.getURL()
      console.log(`[DEBUG WebContentsView "${tabId}"] Navigated to: ${tabObj.url}`)
      this.notifyTabsChanged()
    })

    // Insert tab (either next to parent tab or at end)
    if (insertAfterTabId && this.openTabs.has(insertAfterTabId)) {
      const newMap = new Map()
      for (const [key, val] of this.openTabs.entries()) {
        newMap.set(key, val)
        if (key === insertAfterTabId) {
          newMap.set(tabId, tabObj)
        }
      }
      this.openTabs = newMap
    } else {
      this.openTabs.set(tabId, tabObj)
    }

    this.selectTab(tabId)
    this.notifyTabsChanged()
    this.saveSessionState()

    if (isExternal) {
      this.detachTabToNewWindow(tabId)
    }

    return true
  }

  launchLinkTab(url, parentTabId) {
    this.launchLinkTabAt(url, parentTabId)
  }

  launchLinkTabAt(url, parentTabId) {
    const parentTab = parentTabId ? this.openTabs.get(parentTabId) : this.openTabs.get(this.activeTabId)
    const partitionId = parentTab ? parentTab.partitionId : 'default'
    const profileId = parentTab ? parentTab.profileId : null
    const baseName = parentTab ? parentTab.baseName : '新标签页'

    const p = {
      id: 'link_' + Math.random().toString(36).substring(2, 9),
      name: baseName,
      baseName: baseName,
      partitionId: partitionId,
      profileId: profileId,
      url
    }
    this.createTab(p, false, parentTabId || this.activeTabId)
  }

  switchNextTab(reverse = false) {
    const keys = Array.from(this.openTabs.keys())
    if (keys.length <= 1) return
    const curIdx = keys.indexOf(this.activeTabId)
    if (curIdx < 0) return
    const nextIdx = reverse
      ? (curIdx - 1 + keys.length) % keys.length
      : (curIdx + 1) % keys.length
    this.selectTab(keys[nextIdx])
  }

  selectTab(tabId) {
    console.log(`[DEBUG ViewManager] selectTab called for tabId: "${tabId}"`)
    if (!this.openTabs.has(tabId)) return
    this.activeTabId = tabId
    this.currentView = 'active'
    this.updateActiveViewBounds()

    this.sendToRenderer('active-tab-changed', tabId)
    const tabObj = this.openTabs.get(tabId)
    if (tabObj && !tabObj.isExternal) {
      tabObj.view.webContents.focus()
    }
    this.saveSessionState()
  }

  closeTab(tabId) {
    console.log(`[DEBUG ViewManager] closeTab called for tabId: "${tabId}"`)
    if (!this.openTabs.has(tabId)) return
    const tabObj = this.openTabs.get(tabId)

    if (tabObj.isExternal && tabObj.externalWindow && !tabObj.externalWindow.isDestroyed()) {
      tabObj.externalWindow.close()
    }

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.contentView.children.includes(tabObj.view)) {
        this.mainWindow.contentView.removeChildView(tabObj.view)
      }
    }

    this.openTabs.delete(tabId)

    if (this.activeTabId === tabId) {
      const remainingIds = Array.from(this.openTabs.keys())
      if (remainingIds.length > 0) {
        this.selectTab(remainingIds[remainingIds.length - 1])
      } else {
        this.activeTabId = null
        this.currentView = 'home'
        this.sendToRenderer('active-tab-changed', null)
      }
    }

    this.notifyTabsChanged()
    this.saveSessionState()
  }

  closeAllTabs() {
    console.log('[DEBUG ViewManager] closeAllTabs called')
    for (const tabId of Array.from(this.openTabs.keys())) {
      this.closeTab(tabId)
    }
  }

  detachTabToNewWindow(tabId) {
    console.log(`[DEBUG ViewManager] detachTabToNewWindow called for tabId: "${tabId}"`)
    if (!this.openTabs.has(tabId)) return
    const tabObj = this.openTabs.get(tabId)

    if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.contentView.children.includes(tabObj.view)) {
      this.mainWindow.contentView.removeChildView(tabObj.view)
    }

    const win = new BrowserWindow({
      width: 1080,
      height: 750,
      title: `${tabObj.baseName} - 独立窗口`,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    const isDev = process.argv.includes('--dev')
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    if (isDev) {
      win.loadURL(`${devUrl}/#external-nav?tabId=${tabId}`)
    } else {
      win.loadFile(path.join(__dirname, '../dist/index.html'), { hash: `external-nav?tabId=${tabId}` })
    }

    win.contentView.addChildView(tabObj.view)
    const updateBounds = () => {
      if (!win.isDestroyed()) {
        const { width, height } = win.getContentBounds()
        tabObj.view.setBounds({ x: 0, y: 40, width, height: Math.max(0, height - 40) })
      }
    }
    win.on('resize', updateBounds)
    updateBounds()

    // Detect dragging the external window back to the main window's tab bar region
    win.on('moved', () => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return
      const mainBounds = this.mainWindow.getBounds()
      const winBounds = win.getBounds()

      const isOverTabBar = (
        winBounds.x + 80 >= mainBounds.x &&
        winBounds.x <= mainBounds.x + mainBounds.width &&
        winBounds.y + 40 >= mainBounds.y &&
        winBounds.y <= mainBounds.y + 120
      )

      if (isOverTabBar) {
        console.log(`[DEBUG ViewManager] External window "${tabId}" dragged over main window TabBar! Attaching back...`)
        this.attachTabFromWindow(tabId)
      }
    })

    win.on('closed', () => {
      tabObj.isExternal = false
      tabObj.externalWindow = null
      this.closeTab(tabId)
    })

    tabObj.isExternal = true
    tabObj.externalWindow = win
    this.notifyTabsChanged()
  }

  attachTabFromWindow(tabId) {
    console.log(`[DEBUG ViewManager] attachTabFromWindow called for tabId: "${tabId}"`)
    if (!this.openTabs.has(tabId)) return
    const tabObj = this.openTabs.get(tabId)

    if (tabObj.isExternal && tabObj.externalWindow && !tabObj.externalWindow.isDestroyed()) {
      tabObj.externalWindow.removeAllListeners('closed')
      tabObj.externalWindow.close()
    }

    tabObj.isExternal = false
    tabObj.externalWindow = null

    this.selectTab(tabId)
    this.notifyTabsChanged()
  }

  notifyTabsChanged() {
    const tabsList = []
    for (const [id, t] of this.openTabs.entries()) {
      tabsList.push({
        id,
        profileId: t.profileId,
        name: t.baseName,
        baseName: t.baseName,
        url: t.view.webContents ? t.view.webContents.getURL() : t.url,
        isExternal: t.isExternal
      })
    }
    this.sendToRenderer('tabs-changed', JSON.stringify(tabsList))
  }

  getActiveView() {
    if (!this.activeTabId || !this.openTabs.has(this.activeTabId)) return null
    return this.openTabs.get(this.activeTabId).view
  }

  navigateActiveTab(url) {
    console.log('[DEBUG ViewManager] navigateActiveTab requested:', url)
    const v = this.getActiveView()
    if (v && v.webContents) {
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        url = 'https://' + url
      }
      v.webContents.loadURL(url)
    }
  }

  goBack() {
    const v = this.getActiveView()
    if (v && v.webContents && typeof v.webContents.canGoBack === 'function' && v.webContents.canGoBack()) {
      v.webContents.goBack()
    }
  }

  goForward() {
    const v = this.getActiveView()
    if (v && v.webContents && typeof v.webContents.canGoForward === 'function' && v.webContents.canGoForward()) {
      v.webContents.goForward()
    }
  }

  reloadTab() {
    const v = this.getActiveView()
    if (v && v.webContents) v.webContents.reload()
  }

  stopTab() {
    const v = this.getActiveView()
    if (v && v.webContents) v.webContents.stop()
  }

  goHome() {
    if (!this.activeTabId || !this.openTabs.has(this.activeTabId)) return
    const tabObj = this.openTabs.get(this.activeTabId)
    const profile = this.profileManager.profiles.find((p) => p.id === tabObj.profileId)
    const homeUrl = profile && profile.url ? profile.url : (this.profileManager.settings.newTabDefaultUrl || 'https://www.baidu.com')
    this.navigateActiveTab(homeUrl)
  }

  toggleDevTools(mode = 'right') {
    const v = this.getActiveView()
    if (!v || !v.webContents) return

    if (v.webContents.isDevToolsOpened()) {
      v.webContents.closeDevTools()
    } else {
      if (mode === 'detach') {
        v.webContents.openDevTools({ mode: 'detach' })
      } else if (mode === 'bottom') {
        v.webContents.openDevTools({ mode: 'bottom' })
      } else {
        v.webContents.openDevTools({ mode: 'right' })
      }
    }
  }

  findText(text, forward = true, findNext = false) {
    const v = this.getActiveView()
    if (!v || !v.webContents) return

    if (!text) {
      v.webContents.stopFindInPage('clearSelection')
      this.findResult = { current: 0, total: 0 }
      this.sendToRenderer('find-result', JSON.stringify(this.findResult))
      return
    }
    v.webContents.findInPage(text, { forward, findNext })
  }

  autofillCredentials(tabObj) {
    if (!tabObj) {
      if (!this.activeTabId || !this.openTabs.has(this.activeTabId)) return
      tabObj = this.openTabs.get(this.activeTabId)
    }
    if (!tabObj || !tabObj.view || !tabObj.view.webContents) return

    let profile = this.profileManager.profiles.find((p) => p.id === tabObj.profileId)
    if (!profile) profile = tabObj.profileData

    if (!profile) {
      console.log(`[DEBUG Autofill WARN] Profile object not found for tab "${tabObj.id}"`)
      return
    }

    let username = profile.username || ''
    let password = profile.password || ''

    if (profile.accountId) {
      const acc = this.profileManager.accounts.find((a) => a.id === profile.accountId)
      if (acc) {
        if (acc.username) username = acc.username
        if (acc.password) password = acc.password
      }
    }

    console.log(`[DEBUG Autofill Triggered] Tab "${tabObj.id}" (${tabObj.url}) | Profile: "${profile.name}" | Username: "${username}" | Password: ${password ? '***' : '(empty)'}`)

    if (!username && !password) {
      console.log(`[DEBUG Autofill SKIP] Profile "${profile.name}" has no username or password set.`)
      return
    }

    const jsCode = `
      (function() {
        const u = ${JSON.stringify(username)};
        const p = ${JSON.stringify(password)};
        const diag = {
          url: location.href,
          inputsFound: [],
          usernameFilled: false,
          passwordFilled: false
        };

        function setNativeValue(element, value) {
          if (!element || !value) return false;
          try {
            const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
            const prototype = Object.getPrototypeOf(element);
            const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            
            if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
              prototypeValueSetter.call(element, value);
            } else if (valueSetter) {
              valueSetter.call(element, value);
            } else {
              element.value = value;
            }
          } catch(e) {
            element.value = value;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        }

        function isSearchInput(i) {
          if (!i) return true;
          const t = (i.type || '').toLowerCase();
          if (t === 'search') return true;
          const ph = (i.placeholder || '').toLowerCase();
          const name = (i.name || '').toLowerCase();
          const id = (i.id || '').toLowerCase();
          const cls = (i.className || '').toLowerCase();
          const role = (i.getAttribute('role') || '').toLowerCase();

          if (role === 'searchbox' || name.includes('search') || id.includes('search') || cls.includes('search') ||
              name.includes('filter') || id.includes('filter') || cls.includes('filter') ||
              name.includes('query') || id.includes('query')) {
            return true;
          }

          if (ph.includes('搜索') || ph.includes('search') || ph.includes('filter') ||
              ph.includes('单号') || ph.includes('title') || ph.includes('查找') ||
              ph.includes('关键字') || ph.includes('keyword') || ph.includes('查询')) {
            return true;
          }

          if (ph.includes('/') || ph.includes('|')) {
            return true;
          }

          return false;
        }

        function isUsernameCandidate(i) {
          if (!i || i.readOnly || i.disabled || (i.type || '').toLowerCase() === 'hidden') return false;
          if (isSearchInput(i)) return false;
          const t = (i.type || '').toLowerCase();
          return (t === 'text' || t === 'email' || t === 'user' || t === '');
        }

        function fillDoc(doc) {
          if (!doc) return;
          try {
            const inputs = Array.from(doc.querySelectorAll('input'));
            inputs.forEach((inp, idx) => {
              diag.inputsFound.push({
                idx: idx,
                type: inp.type || 'text',
                name: inp.name || '',
                id: inp.id || '',
                placeholder: inp.placeholder || '',
                value: inp.value || ''
              });
            });

            const pwdInput = inputs.find(i => (i.type || '').toLowerCase() === 'password') || doc.querySelector('input[type="password"]');
            if (pwdInput && p) {
              diag.passwordFilled = setNativeValue(pwdInput, p);
            }

            let userInput = null;
            if (pwdInput) {
              const pwdIdx = inputs.indexOf(pwdInput);
              // 优先1：在密码框之前的元素中，寻找有明确账号特征（placeholder/name/id包含账号/用户名/user/account等）且非搜索框的输入框
              for (let i = pwdIdx - 1; i >= 0; i--) {
                const inp = inputs[i];
                if (isUsernameCandidate(inp)) {
                  const ph = (inp.placeholder || '').toLowerCase();
                  const name = (inp.name || '').toLowerCase();
                  const id = (inp.id || '').toLowerCase();
                  const auto = (inp.autocomplete || '').toLowerCase();
                  if (auto === 'username' || auto === 'email' ||
                      ph.includes('账号') || ph.includes('用户名') || ph.includes('邮箱') || ph.includes('手机') ||
                      name.includes('user') || name.includes('account') || name.includes('login') ||
                      id.includes('user') || id.includes('account') || id.includes('login')) {
                    userInput = inp;
                    break;
                  }
                }
              }

              // 优先2：如果在密码框前没找到明确特征的，退而求其次选择距离密码框最近的非搜索类 text 输入框
              if (!userInput) {
                for (let i = pwdIdx - 1; i >= 0; i--) {
                  if (isUsernameCandidate(inputs[i])) {
                    userInput = inputs[i];
                    break;
                  }
                }
              }
            }

            if (!userInput) {
              // 优先3：独立全局查找有明确账号特征且非搜索框的输入框
              userInput = inputs.find(i => {
                if (!isUsernameCandidate(i)) return false;
                const ph = (i.placeholder || '').toLowerCase();
                const name = (i.name || '').toLowerCase();
                const id = (i.id || '').toLowerCase();
                const auto = (i.autocomplete || '').toLowerCase();
                return auto === 'username' || auto === 'email' ||
                  ph.includes('账号') || ph.includes('用户名') ||
                  name.includes('user') || name.includes('account') || name.includes('login') ||
                  id.includes('user') || id.includes('account') || id.includes('login');
              });
            }

            if (userInput && u) {
              diag.usernameFilled = setNativeValue(userInput, u);
            }

            const iframes = doc.querySelectorAll('iframe');
            iframes.forEach(f => {
              try {
                if (f.contentDocument) fillDoc(f.contentDocument);
              } catch(e) {}
            });
          } catch(e) {}
        }

        fillDoc(document);
        return diag;
      })();
    `

    const runScript = (stage) => {
      tabObj.view.webContents.executeJavaScript(jsCode).then((res) => {
        if (!res) return
        console.log(`[DEBUG Autofill Diagnostic (${stage})] Tab: "${tabObj.id}" | URL: ${res.url}`)
        console.log(`[DEBUG Autofill Inputs (${stage})]: ${res.inputsFound.length} input(s) found ->`, JSON.stringify(res.inputsFound))
        console.log(`[DEBUG Autofill Status (${stage})]: Username Filled=${res.usernameFilled}, Password Filled=${res.passwordFilled}`)
      }).catch((err) => {
        console.error(`[DEBUG Autofill ERROR (${stage})]:`, err)
      })
    }

    runScript('Immediate 0ms')
    setTimeout(() => runScript('Delayed 500ms'), 500)
    setTimeout(() => runScript('Delayed 1500ms'), 1500)
    setTimeout(() => runScript('Delayed 3000ms'), 3000)
  }

  saveSessionState() {
    if (!this.profileManager.settings.autoRestoreTabs) return
    const sessionData = {
      open_tab_ids: Array.from(this.openTabs.keys()),
      active_tab_id: this.activeTabId
    }
    this.profileManager.saveLastSession(sessionData)
  }

  restoreLastSession() {
    const lastSession = this.profileManager.loadLastSession()
    if (!lastSession || !lastSession.open_tab_ids || lastSession.open_tab_ids.length === 0) return

    for (const tabId of lastSession.open_tab_ids) {
      const profile = this.profileManager.profiles.find((p) => p.id === tabId)
      if (profile) {
        this.createTab(profile)
      }
    }
    if (lastSession.active_tab_id && this.openTabs.has(lastSession.active_tab_id)) {
      this.selectTab(lastSession.active_tab_id)
    }
  }

  sendToRenderer(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, payload)
    }
  }
}
