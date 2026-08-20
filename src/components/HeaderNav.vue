<template>
  <header class="h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between text-xs select-none">
    <!-- Left: App Brand & View Switches -->
    <div class="flex items-center space-x-3">
      <!-- MacOS Traffic Light Padding Spacer -->
      <div v-if="isMac" class="w-16 h-full flex-shrink-0"></div>

      <div class="flex items-center space-x-2 font-bold text-slate-800 tracking-tight">
        <span>指纹浏览器</span>
        <span class="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">v2.0.1</span>
      </div>

      <div class="h-4 w-px bg-slate-200 mx-1"></div>

      <nav class="flex items-center space-x-1">
        <button 
          @click="$emit('switch-view', 'home')"
          :class="[
            'px-3 py-1 rounded transition font-medium flex items-center space-x-1.5',
            currentView === 'home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>工作台</span>
          <span :class="['text-[10px] px-1 py-0.2 rounded', currentView === 'home' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500']">{{ profileCount }}</span>
        </button>

        <button 
          @click="$emit('switch-view', 'accounts')"
          :class="[
            'px-3 py-1 rounded transition font-medium flex items-center space-x-1.5',
            currentView === 'accounts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>账号凭据库</span>
        </button>

        <button 
          @click="$emit('switch-view', 'settings')"
          :class="[
            'px-3 py-1 rounded transition font-medium flex items-center space-x-1.5',
            currentView === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          ]"
        >
          <span>系统设置</span>
        </button>

        <button 
          v-if="tabsCount > 0"
          @click="$emit('switch-view', 'active')"
          :class="[
            'px-3 py-1 rounded transition font-medium flex items-center space-x-1.5',
            currentView === 'active' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'
          ]"
        >
          <span>网页视图</span>
          <span class="text-[10px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-semibold">{{ tabsCount }}</span>
        </button>
      </nav>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center space-x-2 text-slate-500">
      <button 
        @click="$emit('toggle-collapse')"
        class="px-2 py-1 hover:text-slate-800 hover:bg-slate-100 rounded transition text-[11px]"
        :title="isCollapsed ? '展开顶栏' : '收起顶栏'"
      >
        {{ isCollapsed ? '▼ 展开顶栏' : '▲ 收起顶栏' }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentView: String,
  profileCount: Number,
  tabsCount: Number,
  isCollapsed: Boolean
})

defineEmits(['switch-view', 'toggle-collapse'])

const isMac = computed(() => window.electronAPI && window.electronAPI.platform === 'darwin')
</script>
