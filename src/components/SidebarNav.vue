<template>
  <aside 
    :class="[
      'bg-white border-r border-slate-200 flex flex-col justify-between select-none z-30 flex-shrink-0 box-border',
      isCollapsed ? 'w-12 px-1 py-3' : 'w-44 p-3'
    ]"
    :style="{ width: isCollapsed ? '48px' : '176px', minWidth: isCollapsed ? '48px' : '176px', maxWidth: isCollapsed ? '48px' : '176px' }"
  >
    <!-- Top Nav Links -->
    <div class="space-y-1">
      <button 
        @click="$emit('switch-view', 'home')"
        :class="[
          'w-full py-2 rounded-lg transition font-medium text-xs flex items-center',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-3',
          currentView === 'home' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        ]"
        :title="isCollapsed ? '工作台' : ''"
      >
        <div class="flex items-center space-x-2 truncate">
          <span>🖥️</span>
          <span v-if="!isCollapsed" class="truncate">工作台</span>
        </div>
        <span v-if="!isCollapsed" :class="['text-[10px] px-1.5 py-0.2 rounded font-semibold', currentView === 'home' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500']">{{ profileCount }}</span>
      </button>

      <button 
        @click="$emit('switch-view', 'accounts')"
        :class="[
          'w-full py-2 rounded-lg transition font-medium text-xs flex items-center',
          isCollapsed ? 'justify-center px-0' : 'px-3 space-x-2',
          currentView === 'accounts' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        ]"
        :title="isCollapsed ? '账号凭据库' : ''"
      >
        <span>🔑</span>
        <span v-if="!isCollapsed" class="truncate">账号凭据库</span>
      </button>

      <button 
        @click="$emit('switch-view', 'settings')"
        :class="[
          'w-full py-2 rounded-lg transition font-medium text-xs flex items-center',
          isCollapsed ? 'justify-center px-0' : 'px-3 space-x-2',
          currentView === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        ]"
        :title="isCollapsed ? '系统设置' : ''"
      >
        <span>⚙️</span>
        <span v-if="!isCollapsed" class="truncate">系统设置</span>
      </button>

      <button 
        v-if="tabsCount > 0"
        @click="$emit('switch-view', 'active')"
        :class="[
          'w-full py-2 rounded-lg transition font-medium text-xs flex items-center',
          isCollapsed ? 'justify-center px-0' : 'justify-between px-3',
          currentView === 'active' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-600 hover:bg-blue-50'
        ]"
        :title="isCollapsed ? '网页视图' : ''"
      >
        <div class="flex items-center space-x-2 truncate">
          <span>🌐</span>
          <span v-if="!isCollapsed" class="truncate font-semibold">网页视图</span>
        </div>
        <span v-if="!isCollapsed" class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">{{ tabsCount }}</span>
      </button>
    </div>

    <!-- Bottom Collapse Toggle Button (Collapses to Left) -->
    <div class="pt-2 border-t border-slate-100">
      <button 
        @click="$emit('toggle-collapse')"
        :class="[
          'w-full py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition text-xs font-medium flex items-center',
          isCollapsed ? 'justify-center' : 'justify-center space-x-1'
        ]"
        :title="isCollapsed ? '展开左侧菜单' : '收起左侧菜单'"
      >
        <span>{{ isCollapsed ? '❯' : '❮' }}</span>
        <span v-if="!isCollapsed">收起菜单</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  currentView: String,
  profileCount: Number,
  tabsCount: Number,
  isCollapsed: Boolean
})

defineEmits(['switch-view', 'toggle-collapse'])
</script>
