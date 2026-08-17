<template>
  <div class="h-8 bg-white border-b border-slate-200 px-3 flex items-center justify-between text-xs select-none drag-region">
    <!-- Left: App Title & Logo -->
    <div class="flex items-center space-x-2 text-slate-800 font-semibold no-drag">
      <span class="text-[12px] font-bold tracking-tight text-slate-900">指纹浏览器</span>
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
