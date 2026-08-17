<template>
  <!-- 1. Dedicated External Window Header Navigation Bar Mode -->
  <div v-if="pageMode === 'external'" class="h-10 px-3 bg-white border-b border-slate-200 flex items-center space-x-2 text-xs select-none" :style="rootStyle">
    <button @click="electronCall('goBack')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="后退">
      <AppIcon name="left" className="w-3.5 h-3.5 text-slate-700" />
    </button>
    <button @click="electronCall('goForward')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="前进">
      <AppIcon name="right" className="w-3.5 h-3.5 text-slate-700" />
    </button>
    <button 
      @click="electronCall('reloadTab')" 
      class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" 
      title="刷新"
    >
      <AppIcon name="refresh" className="w-3.5 h-3.5 text-slate-700" />
    </button>
    <button @click="electronCall('goHome')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="主页">
      <AppIcon name="home" className="w-3.5 h-3.5 text-slate-700" />
    </button>

    <form @submit.prevent="handleNavigateUrl" class="flex-1 flex items-center space-x-2">
      <input 
        type="text" 
        v-model="activeUrl" 
        @keydown.enter="handleNavigateUrl"
        placeholder="输入网址或搜索关键词..." 
        class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
      />
      <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-medium p-1.5 rounded shadow-sm flex items-center justify-center" title="前往">
        <AppIcon name="search" className="w-3.5 h-3.5 text-white" />
      </button>
    </form>

    <button 
      @click="handleToggleDevTools" 
      class="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300 text-[11px]"
      title="调出/关闭 F12 开发者工具"
    >
      DevTools (F12)
    </button>

    <button 
      @click="handleAttachTab(externalTabId)" 
      class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded border border-blue-200 font-medium flex items-center space-x-1 text-[11px]"
      title="合并回主窗口"
    >
      <span>↙ 拖回/合并</span>
    </button>
  </div>

  <!-- 2. Dedicated Downloads Popup Window Mode -->
  <div v-else-if="pageMode === 'downloads'" class="w-screen h-screen p-1 bg-transparent select-none overflow-hidden" :style="rootStyle">
    <DownloadsOverlay 
      :visible="true" 
      :is-popup-mode="true"
      :downloads="downloadsList" 
      @close="closeDownloadsPopup" 
    />
  </div>

  <!-- 3. Full Main Window Application Mode -->
  <div v-else class="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 select-none overflow-hidden relative" :style="rootStyle">
    <!-- Toast Notification Banner System -->
    <div class="fixed top-10 right-4 z-50 flex flex-col space-y-2 pointer-events-none">
      <div 
        v-for="t in toasts" 
        :key="t.id"
        :class="[
          'pointer-events-auto px-4 py-2.5 rounded-lg shadow-lg border text-xs font-medium flex items-center space-x-2 animate-fade-in min-w-[200px]',
          t.type === 'success' ? 'bg-white border-emerald-500 text-emerald-700 shadow-emerald-500/10' :
          t.type === 'warning' ? 'bg-white border-amber-500 text-amber-700 shadow-amber-500/10' :
          t.type === 'error' ? 'bg-white border-red-500 text-red-700 shadow-red-500/10' :
          'bg-white border-slate-300 text-slate-800 shadow-slate-200'
        ]"
      >
        <span v-if="t.type === 'success'" class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span v-else-if="t.type === 'warning'" class="w-2 h-2 rounded-full bg-amber-500"></span>
        <span v-else-if="t.type === 'error'" class="w-2 h-2 rounded-full bg-red-500"></span>
        <span v-else class="w-2 h-2 rounded-full bg-blue-500"></span>
        <span>{{ t.message }}</span>
      </div>
    </div>

    <!-- Top Window TitleBar (Custom Frameless Window Controls) -->
    <TitleBar :active-tab-title="activeTab ? (activeTab.name || activeTab.baseName) : ''" />

    <!-- Main Container (Left Sidebar + Right Area) -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Sidebar Nav (Collapses to Left) -->
      <SidebarNav 
        ref="sidebarRef"
        :current-view="currentView"
        :profile-count="profiles.length"
        :tabs-count="openTabs.length"
        :is-collapsed="isSidebarCollapsed"
        @switch-view="handleSwitchView"
        @toggle-collapse="isSidebarCollapsed = !isSidebarCollapsed"
      />

      <!-- Right Area (Top Web Header Toolbar + Main Content Area) -->
      <div class="flex-1 flex flex-col overflow-hidden relative">
        <!-- Top Toolbar Header for Active Webview Mode -->
        <div ref="topHeaderRef" class="flex-shrink-0 z-40 bg-white border-b border-slate-200 shadow-sm" v-if="openTabs.length > 0 && currentView === 'active'">
          <!-- Tab Bar -->
          <TabBar 
            :tabs="openTabs"
            :active-tab-id="activeTabId"
            :is-collapsed="false"
            @select-tab="handleSelectTab"
            @close-tab="handleCloseTab"
            @close-all="handleCloseAllTabs"
            @quick-add="showQuickAddModal = true"
            @open-blank-tab="handleOpenBlankTab"
            @open-link-tab-at="handleOpenLinkTabAt"
            @reorder-tabs="handleReorderTabs"
            @detach-tab="handleDetachTab"
            @attach-tab="handleAttachTab"
          />

          <!-- Navigation Bar -->
          <div v-if="activeTab" class="h-10 px-3 bg-white border-t border-slate-200 flex items-center space-x-2 text-xs">
            <button @click="electronCall('goBack')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="后退">
              <AppIcon name="left" className="w-3.5 h-3.5 text-slate-700" />
            </button>
            <button @click="electronCall('goForward')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="前进">
              <AppIcon name="right" className="w-3.5 h-3.5 text-slate-700" />
            </button>
            <button 
              @click="activeTab && activeTab.isLoading ? electronCall('stopTab') : electronCall('reloadTab')" 
              class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" 
              :title="activeTab && activeTab.isLoading ? '停止加载' : '刷新'"
            >
              <AppIcon :name="activeTab && activeTab.isLoading ? 'close' : 'refresh'" className="w-3.5 h-3.5 text-slate-700" />
            </button>
            <button @click="electronCall('goHome')" class="p-1.5 hover:bg-slate-100 rounded text-slate-700 font-bold flex items-center justify-center" title="主页">
              <AppIcon name="home" className="w-3.5 h-3.5 text-slate-700" />
            </button>

            <form @submit.prevent="handleNavigateUrl" class="flex-1 flex items-center space-x-2">
              <input 
                type="text" 
                v-model="activeUrl" 
                @keydown.enter="handleNavigateUrl"
                placeholder="输入网址或搜索关键词..." 
                class="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
              <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-medium p-1.5 rounded shadow-sm flex items-center justify-center" title="前往">
                <AppIcon name="search" className="w-3.5 h-3.5 text-white" />
              </button>
            </form>

            <button 
              @click="handleToggleDownloads" 
              class="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300 flex items-center space-x-1"
            >
              <span>下载任务</span>
              <span v-if="downloadsList.length > 0" class="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-bold">{{ downloadsList.length }}</span>
            </button>

            <button 
              @click="handleToggleDevTools" 
              class="bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300"
              title="调出/关闭 F12 开发者工具"
            >
              DevTools (F12)
            </button>

            <button 
              @click="handleCloseTab(activeTabId)" 
              class="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded border border-red-200 font-medium"
            >
              关闭窗口
            </button>

            <!-- In-Page Search Bar Floating Capsule -->
            <FindOverlay 
              :visible="showFindOverlay" 
              :find-result="findResult" 
              @close="showFindOverlay = false" 
              @find="handleFindText" 
            />
          </div>
        </div>

        <!-- Overlays -->
        <DownloadsOverlay 
          :visible="showDownloadsOverlay" 
          :downloads="downloadsList" 
          @close="showDownloadsOverlay = false" 
        />

        <!-- Main Views (Workbench, Accounts, Settings) -->
        <div class="flex-1 overflow-y-auto" v-if="currentView !== 'active'">
          <Workbench 
            v-if="currentView === 'home'"
            :profiles="profiles"
            @launch="handleLaunchProfile"
            @batch-launch="handleBatchLaunchProfiles"
            @edit="handleOpenEditProfile"
            @duplicate="handleDuplicateProfile"
            @delete="handleDeleteProfile"
            @batch-delete="handleBatchDeleteProfiles"
            @open-modal="handleOpenNewProfile"
            @open-batch-modal="showBatchProfileModal = true"
            @import-profiles="handleImportProfiles"
            @toast="showToast"
          />

          <AccountVaultView 
            v-if="currentView === 'accounts'"
            :accounts="accounts"
            @save-account="handleSaveAccount"
            @duplicate-account="handleDuplicateAccount"
            @delete-account="handleDeleteAccount"
            @batch-delete-accounts="handleBatchDeleteAccounts"
            @import-accounts="handleImportAccounts"
            @toast="showToast"
          />

          <SettingsView 
            v-if="currentView === 'settings'"
            :settings="settings"
            @save="handleSaveSettings"
            @toast="showToast"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <ProfileModal 
      v-if="showProfileModal"
      :profile-data="editingProfile"
      :accounts="accounts"
      @close="showProfileModal = false"
      @save="handleSaveProfile"
      @toast="showToast"
    />

    <BatchProfileModal 
      v-if="showBatchProfileModal"
      :accounts="accounts"
      @close="showBatchProfileModal = false"
      @save-batch="handleSaveBatchProfiles"
      @toast="showToast"
    />

    <QuickAddModal 
      v-if="showQuickAddModal" 
      :profiles="profiles" 
      @close="showQuickAddModal = false" 
      @launch="handleLaunchProfile" 
      @batch-launch="handleBatchLaunchProfiles" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import TitleBar from './components/TitleBar.vue'
import SidebarNav from './components/SidebarNav.vue'
import TabBar from './components/TabBar.vue'
import Workbench from './components/Workbench.vue'
import AccountVaultView from './components/AccountVaultView.vue'
import SettingsView from './components/SettingsView.vue'
import ProfileModal from './components/ProfileModal.vue'
import BatchProfileModal from './components/BatchProfileModal.vue'
import QuickAddModal from './components/QuickAddModal.vue'
import DownloadsOverlay from './components/DownloadsOverlay.vue'
import FindOverlay from './components/FindOverlay.vue'
import AppIcon from './components/AppIcon.vue'

const pageMode = ref('main') // 'main', 'external', 'downloads'
const externalTabId = ref('')

const currentView = ref('home')
const isSidebarCollapsed = ref(false)
const sidebarRef = ref(null)
const topHeaderRef = ref(null)

const profiles = ref([])
const accounts = ref([])
const settings = ref({})
const downloadsList = ref([])
const openTabs = ref([])
const activeTabId = ref('')
const activeUrl = ref('')

const showProfileModal = ref(false)
const showBatchProfileModal = ref(false)
const showQuickAddModal = ref(false)
const showDownloadsOverlay = ref(false)
const showFindOverlay = ref(false)

const editingProfile = ref(null)
const findResult = ref({ current: 0, total: 0 })
const toasts = ref([])

const isAnyModalOpen = computed(() => {
  return showProfileModal.value || showBatchProfileModal.value || showQuickAddModal.value
})

const showToast = (message, type = 'info') => {
  const id = Math.random().toString(36).substring(2, 9)
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2500)
}

const rootStyle = computed(() => {
  const fontFamily = settings.value.fontFamily || "'Microsoft YaHei', sans-serif"
  const fontSize = (settings.value.fontSize || 16) + 'px'
  return {
    fontFamily,
    fontSize
  }
})

watch(() => settings.value.fontSize, (newSize) => {
  const size = Number(newSize) || 16
  const percentage = (size / 16) * 100
  document.documentElement.style.fontSize = `${percentage}%`
}, { immediate: true })

watch(() => settings.value.fontFamily, (newFamily) => {
  if (newFamily) {
    document.body.style.fontFamily = newFamily
  }
}, { immediate: true })

const activeTab = computed(() => {
  return openTabs.value.find((t) => t.id === activeTabId.value)
})

watch(activeTab, (newTab) => {
  if (newTab && newTab.url) {
    activeUrl.value = newTab.url
  }
})

const electronCall = async (method, ...args) => {
  if (window.electronAPI && window.electronAPI[method]) {
    return await window.electronAPI[method](...args)
  }
}

const syncLayoutBounds = () => {
  if (pageMode.value !== 'main') return
  nextTick(() => {
    let sideW = isSidebarCollapsed.value ? 48 : 176
    if (sidebarRef.value) {
      const el = sidebarRef.value.$el || sidebarRef.value
      if (el && el.getBoundingClientRect) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0) sideW = Math.round(rect.width)
      }
    }

    let topH = 32
    if (currentView.value === 'active' && topHeaderRef.value) {
      const rect = topHeaderRef.value.getBoundingClientRect()
      if (rect.bottom > 0) topH = Math.round(rect.bottom)
    }

    electronCall('updateLayoutBounds', {
      currentView: currentView.value,
      topHeight: topH,
      sidebarWidth: sideW,
      modalOpen: isAnyModalOpen.value
    })
  })
}

watch([currentView, isSidebarCollapsed, openTabs, activeTabId, isAnyModalOpen], () => {
  if (pageMode.value === 'main') {
    syncLayoutBounds()
  }
})

const handleSwitchView = (viewName) => {
  currentView.value = viewName
  if (viewName === 'active') {
    isSidebarCollapsed.value = true
  }
}

const safeJsonParse = (val, fallback = null) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch (e) {
      return fallback !== null ? fallback : val
    }
  }
  return val !== undefined && val !== null ? val : fallback
}

// Profiles
const loadProfiles = async () => {
  const json = await electronCall('getProfiles')
  if (json) profiles.value = safeJsonParse(json, [])
}
const handleLaunchProfile = async (id) => {
  await electronCall('launchTab', id)
  currentView.value = 'active'
  isSidebarCollapsed.value = true
}
const handleBatchLaunchProfiles = async (ids) => {
  await electronCall('launchTabsBatch', ids)
  currentView.value = 'active'
  isSidebarCollapsed.value = true
}
const handleOpenNewProfile = () => {
  editingProfile.value = null
  showProfileModal.value = true
}
const handleOpenEditProfile = (profile) => {
  editingProfile.value = { ...profile }
  showProfileModal.value = true
}
const handleDuplicateProfile = async (profile) => {
  const dup = {
    ...profile,
    id: 'profile_' + Math.random().toString(36).substring(2, 9),
    name: `${profile.name} (副本)`
  }
  const res = await electronCall('saveProfile', dup)
  if (res) {
    await loadProfiles()
    showToast('环境副本复制成功', 'success')
  }
}
const handleDeleteProfile = async (id) => {
  const res = await electronCall('deleteProfile', id)
  if (res) {
    await loadProfiles()
    showToast('环境已删除', 'info')
  }
}
const handleBatchDeleteProfiles = async (ids) => {
  const res = await electronCall('deleteProfilesBatch', ids)
  if (res) {
    await loadProfiles()
    showToast(`已批量删除 ${ids.length} 个环境`, 'info')
  }
}
const handleSaveProfile = async (profileData) => {
  const res = await electronCall('saveProfile', profileData)
  if (res) {
    await loadProfiles()
    showToast('环境保存成功！', 'success')
    showProfileModal.value = false
  } else {
    showToast('保存失败，请检查配置', 'error')
  }
}
const handleSaveBatchProfiles = async (list) => {
  const res = await electronCall('saveProfilesBatch', list)
  if (res) {
    await loadProfiles()
    showToast(`批量生成 ${list.length} 个环境成功！`, 'success')
    showBatchProfileModal.value = false
  } else {
    showToast('批量保存失败，请重试', 'error')
  }
}
const handleImportProfiles = async () => {
  console.log('[DEBUG App.vue] handleImportProfiles triggered')
  const count = await electronCall('importProfiles')
  console.log('[DEBUG App.vue] handleImportProfiles return count:', count)
  if (typeof count === 'number' && count > 0) {
    await loadProfiles()
    showToast(`已成功导入 ${count} 个窗口配置！`, 'success')
  } else if (count === 0) {
    showToast('未选择文件或导入文件内容为空', 'warning')
  } else {
    showToast('导入失败，请检查 JSON 格式', 'error')
  }
}

// Accounts
const loadAccounts = async () => {
  const json = await electronCall('getAccounts')
  if (json) accounts.value = safeJsonParse(json, [])
}
const handleSaveAccount = async (acc) => {
  const res = await electronCall('saveAccount', acc)
  if (res) {
    await loadAccounts()
    showToast('账号凭据保存成功！', 'success')
  } else {
    showToast('保存失败，请重试', 'error')
  }
}
const handleDuplicateAccount = async (acc) => {
  const dup = {
    ...acc,
    id: 'acc_' + Math.random().toString(36).substring(2, 9),
    title: `${acc.title} (副本)`
  }
  const res = await electronCall('saveAccount', dup)
  if (res) {
    await loadAccounts()
    showToast('账号凭据副本复制成功', 'success')
  } else {
    showToast('复制失败，请重试', 'error')
  }
}
const handleDeleteAccount = async (id) => {
  const res = await electronCall('deleteAccount', id)
  if (res) {
    await loadAccounts()
    showToast('账号凭据已删除', 'info')
  }
}
const handleBatchDeleteAccounts = async (ids) => {
  const res = await electronCall('deleteAccountsBatch', ids)
  if (res) {
    await loadAccounts()
    showToast(`已批量删除 ${ids.length} 项账号凭据`, 'info')
  }
}
const handleImportAccounts = async () => {
  console.log('[DEBUG App.vue] handleImportAccounts triggered')
  const count = await electronCall('importAccounts')
  console.log('[DEBUG App.vue] handleImportAccounts return count:', count)
  if (typeof count === 'number' && count > 0) {
    await loadAccounts()
    showToast(`已成功导入 ${count} 项账号凭据！`, 'success')
  } else if (count === 0) {
    showToast('未选择文件或导入文件内容为空', 'warning')
  } else {
    showToast('导入失败，请检查 JSON 格式', 'error')
  }
}

// Settings
const loadSettings = async () => {
  const json = await electronCall('getSettings')
  if (json) settings.value = safeJsonParse(json, {})
}
const handleSaveSettings = async (s) => {
  const res = await electronCall('saveSettings', s)
  if (res) {
    await loadSettings()
    showToast('系统设置已生效并保存！', 'success')
  } else {
    showToast('设置保存失败，请重试', 'error')
  }
}

// Tabs
const loadOpenTabs = async () => {
  const json = await electronCall('getOpenTabs')
  if (json) openTabs.value = safeJsonParse(json, [])
  const actId = await electronCall('getActiveTab')
  if (actId) activeTabId.value = actId
}
const handleSelectTab = async (id) => {
  await electronCall('selectTab', id)
  currentView.value = 'active'
  isSidebarCollapsed.value = true
}
const handleCloseTab = async (id) => {
  await electronCall('closeTab', id)
}
const handleCloseAllTabs = async () => {
  await electronCall('closeAllTabs')
  if (currentView.value === 'active') {
    currentView.value = 'home'
  }
}
const handleOpenBlankTab = async () => {
  await electronCall('launchBlankTab')
  currentView.value = 'active'
  isSidebarCollapsed.value = true
}
const handleOpenLinkTabAt = async ({ url, targetTabId }) => {
  await electronCall('launchLinkTabAt', url, targetTabId)
  currentView.value = 'active'
  isSidebarCollapsed.value = true
}
const handleReorderTabs = async (ids) => {
  await electronCall('reorderTabs', ids)
}
const handleDetachTab = async (id) => {
  await electronCall('detachTabToNewWindow', id)
}
const handleAttachTab = async (id) => {
  await electronCall('attachTabFromWindow', id)
}

// Downloads
const loadDownloads = async () => {
  const json = await electronCall('getDownloads')
  if (json) downloadsList.value = safeJsonParse(json, [])
}

// Navigation & Actions
const handleNavigateUrl = () => {
  if (activeUrl.value) {
    electronCall('navigateActiveTab', activeUrl.value)
  }
}
const handleToggleDevTools = () => {
  const mode = settings.value.devtoolsDockMode || 'right'
  electronCall('toggleDevTools', mode)
}
const handleFindText = (text, forward, findNext) => {
  electronCall('findText', text, forward, findNext)
}
const handleToggleDownloads = () => {
  if (window.electronAPI && window.electronAPI.toggleDownloadsPopup) {
    window.electronAPI.toggleDownloadsPopup()
  } else {
    showDownloadsOverlay.value = !showDownloadsOverlay.value
  }
}
const closeDownloadsPopup = () => {
  if (window.electronAPI && window.electronAPI.closeDownloadsPopup) {
    window.electronAPI.closeDownloadsPopup()
  } else {
    showDownloadsOverlay.value = false
  }
}

onMounted(() => {
  const hash = window.location.hash || ''
  if (hash.startsWith('#external-nav')) {
    pageMode.value = 'external'
    const query = hash.split('?')[1] || ''
    const urlParams = new URLSearchParams(query)
    externalTabId.value = urlParams.get('tabId') || ''
  } else if (hash === '#downloads-popup') {
    pageMode.value = 'downloads'
  } else {
    pageMode.value = 'main'
  }

  loadSettings()
  loadDownloads()

  if (pageMode.value === 'downloads') {
    if (window.electronAPI) {
      window.electronAPI.onDownloadsChanged((data) => { downloadsList.value = safeJsonParse(data, []) })
      window.electronAPI.onSettingsChanged((data) => { settings.value = safeJsonParse(data, {}) })
    }
    return
  }

  if (pageMode.value === 'external') {
    if (window.electronAPI) {
      window.electronAPI.onSettingsChanged((data) => { settings.value = safeJsonParse(data, {}) })
    }
    return
  }

  loadProfiles()
  loadAccounts()
  loadOpenTabs()

  if (window.electronAPI) {
    window.electronAPI.onProfilesChanged((data) => { profiles.value = safeJsonParse(data, []) })
    window.electronAPI.onAccountsChanged((data) => { accounts.value = safeJsonParse(data, []) })
    window.electronAPI.onSettingsChanged((data) => { settings.value = safeJsonParse(data, {}) })
    window.electronAPI.onDownloadsChanged((data) => { downloadsList.value = safeJsonParse(data, []) })
    window.electronAPI.onTabsChanged((data) => { 
      openTabs.value = safeJsonParse(data, [])
      if (openTabs.value.length === 0 && currentView.value === 'active') {
        currentView.value = 'home'
      }
      syncLayoutBounds()
    })
    window.electronAPI.onActiveTabChanged((id) => { activeTabId.value = id || '' })
    window.electronAPI.onFindResult((data) => { findResult.value = safeJsonParse(data, { current: 0, total: 0 }) })
    window.electronAPI.onTabLoadingStatus((data) => {
      const info = safeJsonParse(data)
      if (info && info.tabId) {
        const t = openTabs.value.find((tab) => tab.id === info.tabId)
        if (t) t.isLoading = info.isLoading
      }
    })
    if (window.electronAPI.onTriggerFind) {
      window.electronAPI.onTriggerFind(() => {
        if (currentView.value === 'active') {
          showFindOverlay.value = !showFindOverlay.value
        }
      })
    }
  }

  window.addEventListener('keydown', (e) => {
    // F12 or Ctrl+Shift+I / Cmd+Option+I for DevTools
    if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
      e.preventDefault()
      handleToggleDevTools()
    }
    // Ctrl+F / Cmd+F for Find
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault()
      if (currentView.value === 'active') {
        showFindOverlay.value = !showFindOverlay.value
      }
    }
    // F5 or Ctrl+R for Refresh
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))) {
      if (currentView.value === 'active') {
        e.preventDefault()
        electronCall('reloadTab')
      }
    }
    // Ctrl+Tab for Switch Tab
    if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
      e.preventDefault()
      if (openTabs.value.length > 1) {
        const curIdx = openTabs.value.findIndex(t => t.id === activeTabId.value)
        const nextIdx = e.shiftKey
          ? (curIdx - 1 + openTabs.value.length) % openTabs.value.length
          : (curIdx + 1) % openTabs.value.length
        handleSelectTab(openTabs.value[nextIdx].id)
      }
    }
  })

  window.addEventListener('resize', syncLayoutBounds)
  syncLayoutBounds()
})
</script>
