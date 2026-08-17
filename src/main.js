import { createApp } from 'vue'
import './assets/style.css'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')

// Provide mock electronAPI if running in browser dev mode without Electron main process
if (!window.electronAPI) {
  console.warn('[FingerprintBrowser] Running in Web Preview mode without Electron backend.')
  window.electronAPI = {
    platform: 'win32',
    getProfiles: async () => JSON.stringify([
      { id: 'p1', name: '后台账号A-运营', url: 'https://admin.example.com', username: 'op_user', password: '123', tag: '运营' },
      { id: 'p2', name: '后台账号B-财务', url: 'https://finance.example.com', username: 'fin_user', password: '456', tag: '财务' }
    ]),
    getSettings: async () => JSON.stringify({ autoHideDelay: 5, browserType: 'internal', newTabDefaultUrl: 'https://www.baidu.com' }),
    getAccounts: async () => JSON.stringify([
      { id: 'acc1', title: 'Google 谷歌运营账号', username: 'admin@gmail.com', password: 'pass', tag: '谷歌平台', note: '测试账号' }
    ]),
    getDownloads: async () => JSON.stringify([]),
    getOpenTabs: async () => JSON.stringify([]),
    getActiveTab: async () => '',
    launchTab: async (id) => console.log('[Mock] launchTab:', id),
    launchBlankTab: async (url) => console.log('[Mock] launchBlankTab:', url),
    saveProfile: async () => true,
    saveSettings: async () => true,
    saveAccount: async () => true,
    setHeaderHeight: async () => true,
    updateWebviewBounds: async () => true,
    onTabsChanged: () => {},
    onActiveTabChanged: () => {},
    onProfilesChanged: () => {},
    onAccountsChanged: () => {},
    onSettingsChanged: () => {},
    onDownloadsChanged: () => {},
    onFindResult: () => {}
  }
}
