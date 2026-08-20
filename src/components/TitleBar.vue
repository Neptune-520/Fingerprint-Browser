<template>
  <div class="relative h-8 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs select-none drag-region">
    <!-- Left: App Title & Logo -->
    <div class="flex items-center space-x-2 text-slate-800 font-semibold no-drag">
      <span class="text-[12px] font-bold tracking-tight text-slate-900">指纹浏览器</span>
    </div>

    <!-- Center: Menu Navigation Icons in TitleBar Row (Middle) -->
    <div class="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1.5 no-drag" style="-webkit-app-region: no-drag;">
      <button 
        @click="$emit('switch-view', 'home')"
        :class="[
          'px-2 py-0.5 rounded transition text-xs font-medium flex items-center space-x-1 border',
          currentView === 'home' 
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
            : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
        ]"
        title="工作台"
      >
        <span>🖥️</span>
        <span class="text-[11px]">工作台</span>
        <span :class="['text-[10px] px-1 py-0.1 rounded font-semibold', currentView === 'home' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-600']">{{ profileCount || 0 }}</span>
      </button>

      <button 
        @click="$emit('switch-view', 'accounts')"
        :class="[
          'px-2 py-0.5 rounded transition text-xs font-medium flex items-center space-x-1 border',
          currentView === 'accounts' 
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
            : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
        ]"
        title="账号凭据库"
      >
        <span>🔑</span>
        <span class="text-[11px]">账号凭据库</span>
      </button>

      <button 
        @click="$emit('switch-view', 'settings')"
        :class="[
          'px-2 py-0.5 rounded transition text-xs font-medium flex items-center space-x-1 border',
          currentView === 'settings' 
            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
            : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
        ]"
        title="系统设置"
      >
        <span>⚙️</span>
        <span class="text-[11px]">系统设置</span>
      </button>

      <button 
        v-if="tabsCount > 0"
        @click="$emit('switch-view', 'active')"
        :class="[
          'px-2 py-0.5 rounded transition text-xs font-medium flex items-center space-x-1 border',
          currentView === 'active' 
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
        ]"
        title="网页视图"
      >
        <span>🌐</span>
        <span class="text-[11px] font-semibold">网页视图</span>
        <span class="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.1 rounded font-bold">{{ tabsCount }}</span>
      </button>

      <!-- Toggle expand / collapse left sidebar -->
      <button 
        @click="$emit('toggle-collapse')"
        class="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition text-xs font-medium border border-slate-200 flex items-center justify-center"
        :title="isCollapsed ? '展开左侧菜单' : '收起左侧菜单'"
      >
        <span>{{ isCollapsed ? '❯' : '❮' }}</span>
      </button>
    </div>

    <!-- Right: In-App Custom Window Controls -->
    <div class="flex items-center space-x-1 no-drag" style="-webkit-app-region: no-drag;">
      <button 
        @click="minimize" 
        class="no-drag w-7 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
        style="-webkit-app-region: no-drag;"
        title="最小化"
      >
        <AppIcon name="minus" className="w-3 h-3 text-slate-600 hover:text-slate-900" />
      </button>

      <button 
        @click="maximize" 
        class="no-drag w-7 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition"
        style="-webkit-app-region: no-drag;"
        title="最大化 / 还原"
      >
        <AppIcon :name="isMaximized ? 'window' : 'square'" className="w-2.5 h-2.5 text-slate-600 hover:text-slate-900" />
      </button>

      <button 
        @click="close" 
        class="no-drag w-7 h-6 flex items-center justify-center text-slate-500 hover:text-white hover:bg-red-600 rounded transition group"
        style="-webkit-app-region: no-drag;"
        title="关闭应用"
      >
        <AppIcon name="close" className="w-3 h-3 text-slate-600 group-hover:text-white" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

defineProps({
  activeTabTitle: String,
  currentView: String,
  profileCount: Number,
  tabsCount: Number,
  isCollapsed: Boolean
})

defineEmits(['switch-view', 'toggle-collapse'])

const isMaximized = ref(false)

const minimize = async () => {
  console.log('[DEBUG TitleBar] minimize button clicked')
  if (window.electronAPI && window.electronAPI.minimizeWindow) {
    const res = await window.electronAPI.minimizeWindow()
    console.log('[DEBUG TitleBar] minimizeWindow return value:', res)
  } else {
    console.error('[DEBUG TitleBar] ERROR: window.electronAPI.minimizeWindow is NOT available!')
  }
}

const maximize = async () => {
  console.log('[DEBUG TitleBar] maximize button clicked')
  if (window.electronAPI && window.electronAPI.maximizeWindow) {
    const res = await window.electronAPI.maximizeWindow()
    console.log('[DEBUG TitleBar] maximizeWindow return value:', res)
    if (window.electronAPI.isWindowMaximized) {
      isMaximized.value = await window.electronAPI.isWindowMaximized()
      console.log('[DEBUG TitleBar] isMaximized current state:', isMaximized.value)
    }
  } else {
    console.error('[DEBUG TitleBar] ERROR: window.electronAPI.maximizeWindow is NOT available!')
  }
}

const close = async () => {
  console.log('[DEBUG TitleBar] close button clicked')
  if (window.electronAPI && window.electronAPI.closeWindow) {
    const res = await window.electronAPI.closeWindow()
    console.log('[DEBUG TitleBar] closeWindow return value:', res)
  } else {
    console.error('[DEBUG TitleBar] ERROR: window.electronAPI.closeWindow is NOT available!')
  }
}
</script>

<style scoped>
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
