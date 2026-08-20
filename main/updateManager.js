import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export class UpdateManager {
  constructor(profileManager) {
    this.profileManager = profileManager
    this.mainWindow = null
    this.updateInfo = null
    this.isDownloading = false

    this.initAutoUpdater()
  }

  setMainWindow(win) {
    this.mainWindow = win
  }

  sendToRenderer(channel, payload) {
    if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, typeof payload === 'string' ? payload : JSON.stringify(payload))
    }
  }

  initAutoUpdater() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Log update events for debugging
    autoUpdater.on('checking-for-update', () => {
      console.log('[DEBUG UpdateManager] Checking for updates...')
      this.sendToRenderer('update-status', { status: 'checking' })
    })

    autoUpdater.on('update-available', (info) => {
      console.log('[DEBUG UpdateManager] Update available:', info.version)
      this.updateInfo = info
      this.sendToRenderer('update-status', { 
        status: 'available', 
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || '性能优化与问题修复',
        currentVersion: app.getVersion()
      })
    })

    autoUpdater.on('update-not-available', (info) => {
      console.log('[DEBUG UpdateManager] Update not available. Current version is latest:', app.getVersion())
      this.sendToRenderer('update-status', { 
        status: 'not-available', 
        currentVersion: app.getVersion() 
      })
    })

    autoUpdater.on('error', (err) => {
      console.error('[DEBUG UpdateManager ERROR] Update error:', err)
      this.isDownloading = false
      let msg = err ? (err.message || String(err)) : '未知错误'
      if (msg.includes('404') || msg.includes('latest.yml')) {
        msg = '未在 GitHub 上找到发布版本（HTTP 404）。请先在 GitHub 创建对应的 Repository，并将 release/ 目录下的安装包与 latest.yml 上传至 GitHub Releases。'
      }
      this.sendToRenderer('update-status', { 
        status: 'error', 
        message: msg 
      })
    })

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`[DEBUG UpdateManager] Download progress: ${progressObj.percent.toFixed(1)}%`)
      this.sendToRenderer('update-progress', {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        total: progressObj.total || 0,
        transferred: progressObj.transferred || 0
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[DEBUG UpdateManager] Update downloaded successfully. Ready to install:', info.version)
      this.isDownloading = false
      this.sendToRenderer('update-status', { 
        status: 'downloaded', 
        version: info.version 
      })
    })
  }

  applyFeedUrl() {
    const rawProxy = this.profileManager && this.profileManager.settings ? this.profileManager.settings.githubProxy : ''
    const proxy = (rawProxy || '').trim()
    const fixedRepoDownloadUrl = 'https://github.com/Neptune-520/Fingerprint-Browser/releases/latest/download'

    if (proxy && proxy !== 'direct') {
      let formattedProxy = proxy
      if (!formattedProxy.endsWith('/')) {
        formattedProxy += '/'
      }
      const fullUrl = `${formattedProxy}${fixedRepoDownloadUrl}`
      console.log('[DEBUG UpdateManager] Applying GitHub proxy feed URL:', fullUrl)
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: fullUrl
      })
    } else {
      console.log('[DEBUG UpdateManager] Using default direct GitHub feed URL')
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'Neptune-520',
        repo: 'Fingerprint-Browser'
      })
    }
  }

  async checkForUpdates() {
    console.log('[DEBUG UpdateManager] Manual check for updates triggered.')
    try {
      this.applyFeedUrl()
      if (!app.isPackaged) {
        console.log('[DEBUG UpdateManager] App is in development mode. Simulating update check.')
        this.sendToRenderer('update-status', { status: 'checking' })
        setTimeout(() => {
          this.sendToRenderer('update-status', { 
            status: 'not-available', 
            currentVersion: app.getVersion() + ' (Dev Mode)' 
          })
        }, 1200)
        return { status: 'dev-mode' }
      }
      return await autoUpdater.checkForUpdates()
    } catch (err) {
      console.error('[DEBUG UpdateManager ERROR] checkForUpdates failed:', err)
      this.sendToRenderer('update-status', { status: 'error', message: err.message })
      return false
    }
  }

  async downloadUpdate() {
    if (this.isDownloading) return true
    this.isDownloading = true
    console.log('[DEBUG UpdateManager] Download update started.')
    try {
      if (!app.isPackaged) {
        let pct = 0
        const interval = setInterval(() => {
          pct += 20
          this.sendToRenderer('update-progress', {
            percent: pct,
            bytesPerSecond: 1524288,
            total: 50000000,
            transferred: (50000000 * pct) / 100
          })
          if (pct >= 100) {
            clearInterval(interval)
            this.isDownloading = false
            this.sendToRenderer('update-status', { status: 'downloaded', version: '2.1.0-dev' })
          }
        }, 500)
        return true
      }
      return await autoUpdater.downloadUpdate()
    } catch (err) {
      this.isDownloading = false
      console.error('[DEBUG UpdateManager ERROR] downloadUpdate failed:', err)
      this.sendToRenderer('update-status', { status: 'error', message: err.message })
      return false
    }
  }

  quitAndInstall() {
    console.log('[DEBUG UpdateManager] Executing pre-update data protection backup before installation...')
    if (this.profileManager && this.profileManager.backupUserDataBeforeUpdate) {
      this.profileManager.backupUserDataBeforeUpdate()
    }

    console.log('[DEBUG UpdateManager] Invoking autoUpdater.quitAndInstall()')
    if (app.isPackaged) {
      autoUpdater.quitAndInstall(false, true)
    } else {
      console.log('[DEBUG UpdateManager] Dev mode quitAndInstall simulated.')
    }
  }
}
