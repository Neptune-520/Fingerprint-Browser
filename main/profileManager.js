import path from 'path'
import fs from 'fs'
import os from 'os'
import { fileURLToPath } from 'url'
import { session, dialog, app } from 'electron'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Project local data folder:
// In development: f:\browser-new\Fingerprint_Browser\data
// In production (packaged): directory next to FingerprintBrowser.exe (e.g., D:\win-unpacked\data)
const APP_ROOT_DIR = path.resolve(__dirname, '..')
const getLocalDataDir = () => {
  try {
    if (app && app.isPackaged) {
      return path.join(path.dirname(app.getPath('exe')), 'data')
    }
  } catch (e) { }
  return path.join(APP_ROOT_DIR, 'data')
}
const LOCAL_DATA_DIR = getLocalDataDir()
const DEFAULT_DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads')

/**
 * Backup an invalid / conflicting file or folder to Desktop, creating a TXT file inside with the original path,
 * and then delete the original conflicting item.
 */
function backupAndDeleteInvalidPath(targetPath) {
  if (!targetPath || targetPath.includes('.asar')) return
  try {
    let desktopDir
    try {
      desktopDir = app.getPath('desktop')
    } catch (e) {
      desktopDir = path.join(os.homedir(), 'Desktop')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseName = path.basename(targetPath) || 'data'
    const folderName = `FingerprintBrowser_Backup_${baseName}_${timestamp}`
    const backupDir = path.join(desktopDir, folderName)

    safeEnsureDirBasic(backupDir)

    // Create TXT file with original path details
    const txtPath = path.join(backupDir, '原数据目录.txt')
    const txtContent = `原数据目录: ${targetPath}\n备份时间: ${new Date().toLocaleString()}\n`
    fs.writeFileSync(txtPath, txtContent, 'utf-8')

    // Copy original item to backup dir if it exists
    if (fs.existsSync(targetPath)) {
      const destPath = path.join(backupDir, baseName)
      copyPathRecursiveSync(targetPath, destPath)

      // Delete the original item
      fs.rmSync(targetPath, { recursive: true, force: true })
      console.log(`[DEBUG ProfileManager] Successfully backed up ${targetPath} to Desktop (${backupDir}) and deleted original.`)
    }
  } catch (err) {
    console.error(`[DEBUG ProfileManager ERROR] Failed backing up invalid path ${targetPath}:`, err)
  }
}

function copyPathRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    const children = fs.readdirSync(src)
    for (const child of children) {
      copyPathRecursiveSync(path.join(src, child), path.join(dest, child))
    }
  } else {
    fs.copyFileSync(src, dest)
  }
}

function safeEnsureDirBasic(dirPath) {
  if (!dirPath) return
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Ensures a directory exists safely.
 * If targetPath or any of its ancestor paths exists as a FILE instead of a DIRECTORY,
 * or if mkdirSync throws ENOTDIR/EEXIST:
 * 1. Backs up the conflicting item to Desktop.
 * 2. Writes a TXT file in the backup directory containing the original path.
 * 3. Deletes the original conflicting item.
 * 4. Creates the target directory cleanly.
 */
function safeEnsureDir(dirPath) {
  if (!dirPath) return
  const resolved = path.resolve(dirPath)

  const checkAndFixConflicts = (target) => {
    let current = target
    const root = path.parse(current).root
    while (current && current !== root) {
      // Do not process .asar virtual file paths
      if (current.includes('.asar')) {
        break
      }
      if (fs.existsSync(current)) {
        try {
          const stat = fs.statSync(current)
          if (!stat.isDirectory()) {
            console.warn(`[DEBUG ProfileManager WARNING] "${current}" exists but is a FILE, not a directory! Backing up and removing...`)
            backupAndDeleteInvalidPath(current)
            return true
          }
        } catch (e) { }
      }
      current = path.dirname(current)
    }
    return false
  }

  checkAndFixConflicts(resolved)

  try {
    fs.mkdirSync(resolved, { recursive: true })
  } catch (err) {
    if (err.code === 'ENOTDIR' || err.code === 'EEXIST') {
      console.warn(`[DEBUG ProfileManager WARNING] mkdirSync failed with ${err.code} for "${resolved}". Executing backup & fix...`)
      backupAndDeleteInvalidPath(resolved)
      try {
        fs.mkdirSync(resolved, { recursive: true })
      } catch (retryErr) {
        console.error(`[DEBUG ProfileManager ERROR] Retry mkdirSync failed for "${resolved}":`, retryErr)
      }
    } else {
      throw err
    }
  }
}

export class ProfileManager {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'app_config.json')
    this.localConfigPath = path.join(LOCAL_DATA_DIR, 'app_config.json')

    const tryReadDir = (cfgFile) => {
      if (fs.existsSync(cfgFile)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'))
          if (cfg && cfg.storageDir && fs.existsSync(cfg.storageDir)) {
            const stat = fs.statSync(cfg.storageDir)
            if (stat.isDirectory()) {
              return path.resolve(cfg.storageDir)
            }
          }
        } catch (e) { }
      }
      return null
    }

    const activeDir = tryReadDir(this.configPath) || tryReadDir(this.localConfigPath) || LOCAL_DATA_DIR
    this.storageDir = activeDir

    safeEnsureDir(this.storageDir)
    safeEnsureDir(DEFAULT_DOWNLOADS_DIR)

    this.profilesFile = path.join(this.storageDir, 'profiles.json')
    this.settingsFile = path.join(this.storageDir, 'settings.json')
    this.accountsFile = path.join(this.storageDir, 'accounts.json')
    this.downloadsFile = path.join(this.storageDir, 'downloads.json')
    this.sessionsDir = path.join(this.storageDir, 'user_sessions')
    this.lastSessionFile = path.join(this.storageDir, 'last_session.json')
    safeEnsureDir(this.sessionsDir)

    console.log('[DEBUG ProfileManager] Initialized with storageDir:', this.storageDir)

    this.profiles = this.loadProfiles()
    this.settings = this.loadSettings()
    this.accounts = this.loadAccounts()
    this.downloads = this.loadDownloads()
    this.sessionsMap = new Map()
  }

  readJsonFile(filePath, fallbackData) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8')
        if (content && content.trim()) {
          const parsed = JSON.parse(content)
          console.log(`[DEBUG ProfileManager] Successfully read ${path.basename(filePath)} (${Array.isArray(parsed) ? parsed.length + ' items' : 'object'})`)
          return parsed
        }
      } catch (e) {
        console.error(`[DEBUG ProfileManager ERROR] Reading ${filePath}:`, e)
      }
    }
    console.log(`[DEBUG ProfileManager] File ${path.basename(filePath)} missing or empty. Writing fallback default data.`)
    this.writeJsonFile(filePath, fallbackData)
    return fallbackData
  }

  writeJsonFile(filePath, data) {
    try {
      safeEnsureDir(path.dirname(filePath))
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`[DEBUG ProfileManager] Successfully wrote ${path.basename(filePath)} to disk.`)
      return true
    } catch (e) {
      console.error(`[DEBUG ProfileManager ERROR] Writing ${filePath}:`, e)
      return false
    }
  }

  loadProfiles() {
    const defaults = [
      {
        id: 'profile_1',
        name: '百度测试环境',
        url: 'https://www.baidu.com',
        username: 'op_user_01@example.com',
        password: 'password123',
        tag: '运营'
      },
      {
        id: 'profile_2',
        name: '必应搜索环境',
        url: 'https://www.bing.com',
        username: 'fin_admin@example.com',
        password: 'password456',
        tag: '财务'
      }
    ]
    return this.readJsonFile(this.profilesFile, defaults)
  }

  saveProfilesData(data) {
    this.profiles = data
    console.log(`[DEBUG ProfileManager] Saving ${data.length} profiles to profiles.json`)
    return this.writeJsonFile(this.profilesFile, data)
  }

  saveProfile(profile) {
    console.log('[DEBUG ProfileManager] saveProfile called with profile:', JSON.stringify(profile))
    const idx = this.profiles.findIndex((p) => p.id === profile.id)
    if (idx >= 0) {
      this.profiles[idx] = profile
      console.log(`[DEBUG ProfileManager] Updated existing profile at index ${idx}`)
    } else {
      this.profiles.push(profile)
      console.log(`[DEBUG ProfileManager] Added new profile. Total now: ${this.profiles.length}`)
    }
    return this.saveProfilesData(this.profiles)
  }

  deleteProfile(id) {
    console.log('[DEBUG ProfileManager] deleteProfile called for ID:', id)
    this.profiles = this.profiles.filter((p) => p.id !== id)
    return this.saveProfilesData(this.profiles)
  }

  importProfiles(list) {
    console.log('[DEBUG ProfileManager] importProfiles called with count:', list ? list.length : 0)
    if (!Array.isArray(list)) return false
    for (const p of list) {
      if (!p.id) p.id = 'profile_' + Math.random().toString(36).substring(2, 9)
      const idx = this.profiles.findIndex((item) => item.id === p.id)
      if (idx >= 0) {
        this.profiles[idx] = p
      } else {
        this.profiles.push(p)
      }
    }
    return this.saveProfilesData(this.profiles)
  }

  async importProfilesDialog(parentWin) {
    console.log('[DEBUG ProfileManager] Opening showOpenDialog for importing profiles...')
    const result = await dialog.showOpenDialog(parentWin || null, {
      title: '选择要导入的环境 JSON 文件',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })
    console.log('[DEBUG ProfileManager] showOpenDialog result:', result)
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8')
        const list = JSON.parse(content)
        if (Array.isArray(list) && list.length > 0) {
          this.importProfiles(list)
          return list.length
        } else {
          console.warn('[DEBUG ProfileManager WARN] Selected JSON file is empty or not an array')
        }
      } catch (e) {
        console.error('[DEBUG ProfileManager ERROR] importProfilesDialog error:', e)
      }
    }
    return 0
  }

  loadSettings() {
    const defaults = {
      browserType: 'internal',
      externalPath: '',
      autoHideDelay: 5,
      devtoolsDockMode: 'right',
      fontFamily: "'Microsoft YaHei', sans-serif",
      fontSize: 16,
      storageDir: this.storageDir,
      newTabDefaultUrl: 'https://www.baidu.com',
      downloadDir: DEFAULT_DOWNLOADS_DIR,
      autoRestoreTabs: true
    }
    const s = this.readJsonFile(this.settingsFile, defaults)
    if (s && s.storageDir && fs.existsSync(s.storageDir) && path.resolve(s.storageDir) !== path.resolve(this.storageDir)) {
      this.updateStoragePaths(s.storageDir)
    }
    return s
  }

  saveMasterConfig(newDir) {
    const payload = JSON.stringify({ storageDir: newDir }, null, 2)
    try {
      if (this.configPath) {
        safeEnsureDir(path.dirname(this.configPath))
        fs.writeFileSync(this.configPath, payload, 'utf-8')
      }
    } catch (e) {
      console.error('[DEBUG ProfileManager ERROR] Failed to write userData app_config.json:', e)
    }
    try {
      if (this.localConfigPath) {
        safeEnsureDir(path.dirname(this.localConfigPath))
        fs.writeFileSync(this.localConfigPath, payload, 'utf-8')
      }
    } catch (e) {
      console.error('[DEBUG ProfileManager ERROR] Failed to write local app_config.json:', e)
    }
  }

  updateStoragePaths(newDir) {
    this.storageDir = path.resolve(newDir)
    safeEnsureDir(this.storageDir)
    this.profilesFile = path.join(this.storageDir, 'profiles.json')
    this.settingsFile = path.join(this.storageDir, 'settings.json')
    this.accountsFile = path.join(this.storageDir, 'accounts.json')
    this.downloadsFile = path.join(this.storageDir, 'downloads.json')
    this.sessionsDir = path.join(this.storageDir, 'user_sessions')
    this.lastSessionFile = path.join(this.storageDir, 'last_session.json')
    safeEnsureDir(this.sessionsDir)
    this.saveMasterConfig(this.storageDir)
  }

  migrateStorageDirectory(newStorageDir) {
    if (!newStorageDir || typeof newStorageDir !== 'string') return false
    const normalizedNewDir = path.resolve(newStorageDir.trim())
    const normalizedOldDir = path.resolve(this.storageDir)

    if (normalizedNewDir === normalizedOldDir) return true

    console.log(`[DEBUG ProfileManager] Migrating data directory from "${normalizedOldDir}" to "${normalizedNewDir}"...`)

    try {
      safeEnsureDir(normalizedNewDir)

      const copyRecursiveSync = (src, dest) => {
        const exists = fs.existsSync(src)
        const stats = exists && fs.statSync(src)
        const isDirectory = exists && stats.isDirectory()
        if (isDirectory) {
          safeEnsureDir(dest)
          fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName))
          })
        } else if (exists) {
          fs.copyFileSync(src, dest)
        }
      }

      if (fs.existsSync(normalizedOldDir)) {
        const entries = fs.readdirSync(normalizedOldDir)
        for (const entry of entries) {
          const srcPath = path.join(normalizedOldDir, entry)
          const destPath = path.join(normalizedNewDir, entry)
          copyRecursiveSync(srcPath, destPath)
        }
      }

      this.updateStoragePaths(normalizedNewDir)

      this.profiles = this.loadProfiles()
      this.accounts = this.loadAccounts()
      this.downloads = this.loadDownloads()

      console.log(`[DEBUG ProfileManager] Data migration to "${normalizedNewDir}" completed successfully!`)
      return true
    } catch (err) {
      console.error('[DEBUG ProfileManager ERROR] Data migration failed:', err)
      return false
    }
  }

  saveSettings(s) {
    console.log('[DEBUG ProfileManager] saveSettings called:', JSON.stringify(s))
    if (!s.downloadDir) s.downloadDir = DEFAULT_DOWNLOADS_DIR
    safeEnsureDir(s.downloadDir)

    if (s.storageDir && path.resolve(s.storageDir.trim()) !== path.resolve(this.storageDir)) {
      const migrationOk = this.migrateStorageDirectory(s.storageDir)
      if (migrationOk) {
        s.storageDir = this.storageDir
      }
    } else {
      s.storageDir = this.storageDir
    }

    this.settings = s
    return this.writeJsonFile(this.settingsFile, s)
  }

  loadAccounts() {
    const defaults = [
      {
        id: 'acc_1',
        title: 'Google 谷歌运营账号',
        username: 'op_admin@gmail.com',
        password: 'GooglePassword123',
        tag: '谷歌平台',
        note: '主要运营邮箱'
      },
      {
        id: 'acc_2',
        title: '亚马逊店铺主账号',
        username: 'seller_mgr@amazon-shop.com',
        password: 'AmazonPassword456',
        tag: '电商平台',
        note: '美国站主账号'
      }
    ]
    return this.readJsonFile(this.accountsFile, defaults)
  }

  saveAccountsData(data) {
    this.accounts = data
    console.log(`[DEBUG ProfileManager] Saving ${data.length} accounts to accounts.json`)
    return this.writeJsonFile(this.accountsFile, data)
  }

  saveAccount(acc) {
    console.log('[DEBUG ProfileManager] saveAccount called:', JSON.stringify(acc))
    const idx = this.accounts.findIndex((a) => a.id === acc.id)
    if (idx >= 0) {
      this.accounts[idx] = acc
    } else {
      this.accounts.push(acc)
    }
    return this.saveAccountsData(this.accounts)
  }

  deleteAccount(id) {
    console.log('[DEBUG ProfileManager] deleteAccount called for ID:', id)
    this.accounts = this.accounts.filter((a) => a.id !== id)
    return this.saveAccountsData(this.accounts)
  }

  deleteAccountsBatch(ids) {
    console.log('[DEBUG ProfileManager] deleteAccountsBatch called for IDs:', ids)
    this.accounts = this.accounts.filter((a) => !ids.includes(a.id))
    return this.saveAccountsData(this.accounts)
  }

  importAccounts(list) {
    console.log('[DEBUG ProfileManager] importAccounts called with count:', list ? list.length : 0)
    if (!Array.isArray(list)) return false
    for (const acc of list) {
      if (!acc.id) acc.id = 'acc_' + Math.random().toString(36).substring(2, 9)
      const idx = this.accounts.findIndex((item) => item.id === acc.id)
      if (idx >= 0) {
        this.accounts[idx] = acc
      } else {
        this.accounts.push(acc)
      }
    }
    return this.saveAccountsData(this.accounts)
  }

  async importAccountsDialog(parentWin) {
    console.log('[DEBUG ProfileManager] Opening showOpenDialog for importing accounts...')
    const result = await dialog.showOpenDialog(parentWin || null, {
      title: '选择要导入的账号 JSON 文件',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })
    console.log('[DEBUG ProfileManager] showOpenDialog accounts result:', result)
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      try {
        const content = fs.readFileSync(result.filePaths[0], 'utf-8')
        const list = JSON.parse(content)
        if (Array.isArray(list) && list.length > 0) {
          this.importAccounts(list)
          return list.length
        } else {
          console.warn('[DEBUG ProfileManager WARN] Selected accounts JSON file is empty or not an array')
        }
      } catch (e) {
        console.error('[DEBUG ProfileManager ERROR] importAccountsDialog error:', e)
      }
    }
    return 0
  }

  loadDownloads() {
    return this.readJsonFile(this.downloadsFile, [])
  }

  saveDownloads(list) {
    this.downloads = list
    return this.writeJsonFile(this.downloadsFile, list)
  }

  loadLastSession() {
    return this.readJsonFile(this.lastSessionFile, { open_tab_ids: [], active_tab_id: null })
  }

  saveLastSession(s) {
    return this.writeJsonFile(this.lastSessionFile, s)
  }

  getSessionForPartition(partitionId) {
    const partitionKey = `persist:${partitionId}`
    if (this.sessionsMap.has(partitionKey)) {
      return this.sessionsMap.get(partitionKey)
    }
    const sess = session.fromPartition(partitionKey)

    // Set standard Chrome User-Agent to prevent CDN stream truncation
    const standardUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    sess.setUserAgent(standardUA)

    // Clear session HTTP disk cache on session creation to remove any stale or truncated JS files
    sess.clearCache().catch((err) => {
      console.error(`[DEBUG ProfileManager ERROR] Failed to clear session cache for ${partitionKey}:`, err)
    })

    const downloadPath = this.settings.downloadDir || DEFAULT_DOWNLOADS_DIR
    sess.on('will-download', (event, item) => {
      const baseDir = this.settings.downloadDir || DEFAULT_DOWNLOADS_DIR
      safeEnsureDir(baseDir)

      const rawFileName = item.getFilename()
      const ext = path.extname(rawFileName)
      const nameWithoutExt = path.basename(rawFileName, ext)

      let finalFileName = rawFileName
      let savePath = path.join(baseDir, finalFileName)
      let counter = 1

      // Check if file already exists on disk, rename to (1), (2), etc.
      while (fs.existsSync(savePath)) {
        finalFileName = `${nameWithoutExt}(${counter})${ext}`
        savePath = path.join(baseDir, finalFileName)
        counter++
      }

      item.setSavePath(savePath)

      const taskId = 'dl_' + Math.random().toString(36).substring(2, 9)
      const downloadTask = {
        id: taskId,
        fileName: finalFileName,
        filePath: savePath,
        totalBytes: item.getTotalBytes(),
        receivedBytes: item.getReceivedBytes(),
        progress: 0,
        state: 'downloading'
      }

      this.downloads.unshift(downloadTask)
      this.saveDownloads(this.downloads)
      if (this.onDownloadsChanged) {
        this.onDownloadsChanged(this.downloads)
      }

      item.on('updated', (evt, state) => {
        if (state === 'interrupted') {
          downloadTask.state = 'interrupted'
        } else if (state === 'progressing') {
          downloadTask.state = 'downloading'
          downloadTask.receivedBytes = item.getReceivedBytes()
          downloadTask.totalBytes = item.getTotalBytes()
          if (downloadTask.totalBytes > 0) {
            downloadTask.progress = Math.round((downloadTask.receivedBytes / downloadTask.totalBytes) * 100)
          }
        }
        this.saveDownloads(this.downloads)
        if (this.onDownloadsChanged) {
          this.onDownloadsChanged(this.downloads)
        }
      })

      item.once('done', (evt, state) => {
        if (state === 'completed') {
          downloadTask.state = 'finished'
          downloadTask.progress = 100
          downloadTask.receivedBytes = item.getTotalBytes()
        } else {
          downloadTask.state = 'interrupted'
        }
        this.saveDownloads(this.downloads)
        if (this.onDownloadsChanged) {
          this.onDownloadsChanged(this.downloads)
        }
      })
    })

    this.sessionsMap.set(partitionKey, sess)
    return sess
  }

  async exportDialog(data, defaultName) {
    const { filePath } = await dialog.showSaveDialog({
      title: '导出数据 JSON',
      defaultPath: defaultName,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    })
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
      return true
    }
    return false
  }

  backupUserDataBeforeUpdate() {
    try {
      const backupsRootDir = path.join(this.storageDir, 'backups')
      safeEnsureDir(backupsRootDir)

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const targetBackupDir = path.join(backupsRootDir, `update_backup_${timestamp}`)
      safeEnsureDir(targetBackupDir)

      const filesToBackup = [
        this.profilesFile,
        this.settingsFile,
        this.accountsFile,
        this.downloadsFile,
        this.lastSessionFile
      ]

      for (const file of filesToBackup) {
        if (file && fs.existsSync(file)) {
          const dest = path.join(targetBackupDir, path.basename(file))
          fs.copyFileSync(file, dest)
        }
      }

      console.log(`[DEBUG ProfileManager] User data successfully backed up before update to: ${targetBackupDir}`)

      // Cleanup old update backups, keep latest 5
      const entries = fs.readdirSync(backupsRootDir)
        .filter(n => n.startsWith('update_backup_'))
        .map(n => path.join(backupsRootDir, n))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

      if (entries.length > 5) {
        for (let i = 5; i < entries.length; i++) {
          try {
            fs.rmSync(entries[i], { recursive: true, force: true })
          } catch (e) {}
        }
      }

      return true
    } catch (err) {
      console.error('[DEBUG ProfileManager ERROR] Failed backing up user data before update:', err)
      return false
    }
  }
}
