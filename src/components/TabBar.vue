<template>
  <div ref="tabBarRef" class="h-9 bg-slate-100 border-b border-slate-200 px-2 flex items-center justify-between select-none overflow-hidden text-xs">
    <!-- Scrollable Tab Container -->
    <div 
      class="flex items-center space-x-1 overflow-x-auto no-scrollbar flex-1 mr-2 py-0.5" 
      @dragover.prevent
      @drop="onContainerDrop($event)"
    >
      <div
        v-for="(tab, index) in tabs"
        :key="tab.id"
        draggable="true"
        @dragstart="onDragStart($event, index, tab)"
        @dragend="onDragEnd($event, tab)"
        @dragover.prevent
        @drop.stop="onTabDrop($event, index, tab)"
        @click="$emit('select-tab', tab.id)"
        :class="[
          'group relative max-w-[200px] min-w-[120px] h-8 px-3 rounded-t flex items-center justify-between border-t border-x transition-all cursor-pointer truncate',
          tab.id === activeTabId 
            ? 'bg-white border-slate-300 text-blue-600 font-semibold shadow-sm' 
            : 'bg-slate-200/60 border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200',
          tab.isExternal ? 'border-dashed border-blue-400 opacity-90' : ''
        ]"
        :title="tab.isExternal ? `${tab.baseName || tab.name} (独立外置窗口，点击可合并回主窗口)` : (tab.baseName || tab.name)"
      >
        <div class="flex items-center space-x-1.5 truncate">
          <span v-if="tab.isExternal" class="text-[10px] bg-blue-100 text-blue-700 px-1 rounded font-normal">独立</span>
          <span class="truncate text-xs">{{ tab.baseName || tab.name }}</span>
        </div>

        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <!-- External Re-dock Button -->
          <button 
            v-if="tab.isExternal"
            @click.stop="$emit('attach-tab', tab.id)"
            class="p-0.5 text-blue-600 hover:bg-blue-100 rounded transition"
            title="合并回主窗口"
          >
            ↙
          </button>

          <!-- Close Tab -->
          <button 
            @click.stop="$emit('close-tab', tab.id)"
            class="p-0.5 hover:text-red-600 rounded hover:bg-slate-200 transition"
            title="关闭标签页"
          >
            <AppIcon name="close" className="w-3 h-3 text-slate-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      <!-- Quick New Blank Tab Button -->
      <button 
        @click="$emit('open-blank-tab')"
        class="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded transition font-bold"
        title="新建空白标签页"
      >
        ＋
      </button>

      <!-- Quick Add Popup Modal Trigger -->
      <button 
        @click="$emit('quick-add')"
        class="h-7 px-2.5 text-[11px] bg-white hover:bg-slate-50 text-slate-700 rounded transition border border-slate-300 flex items-center space-x-1 shadow-sm font-medium"
        title="快捷选择要打开的窗口"
      >
        <span>窗口库</span>
      </button>
    </div>

    <!-- Right Global Actions -->
    <div class="flex items-center space-x-1.5 flex-shrink-0">
      <button 
        @click="$emit('close-all')"
        class="px-2 py-1 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded transition"
        title="关闭所有窗口"
      >
        关闭所有
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  tabs: Array,
  activeTabId: String,
  isCollapsed: Boolean
})

const emit = defineEmits([
  'select-tab', 'close-tab', 'close-all', 'quick-add',
  'open-blank-tab', 'open-link-tab', 'open-link-tab-at', 'reorder-tabs',
  'detach-tab', 'attach-tab'
])

const tabBarRef = ref(null)
const draggedIndex = ref(null)
const draggedTab = ref(null)
const dragStartY = ref(0)

const onDragStart = (e, index, tab) => {
  draggedIndex.value = index
  draggedTab.value = tab
  dragStartY.value = e.clientY
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/plain', tab.id)
    e.dataTransfer.effectAllowed = 'move'
  }
}

const onDragEnd = (e, tab) => {
  if (!tab || tab.isExternal) {
    draggedIndex.value = null
    draggedTab.value = null
    return
  }

  let isOutOfTabBar = false
  if (tabBarRef.value) {
    const rect = tabBarRef.value.getBoundingClientRect()
    // Detach if dragged away from the TabBar row (leaving tab line)
    if (e.clientY > rect.bottom + 8 || e.clientY < rect.top - 8 || e.clientX < rect.left - 20 || e.clientX > rect.right + 20) {
      isOutOfTabBar = true
    }
  } else {
    if (Math.abs(e.clientY - dragStartY.value) > 30) {
      isOutOfTabBar = true
    }
  }

  if (isOutOfTabBar) {
    emit('detach-tab', tab.id)
  }

  draggedIndex.value = null
  draggedTab.value = null
}

const extractUrlFromDataTransfer = (dt) => {
  if (!dt) return null
  const urlTypes = ['URL', 'text/uri-list', 'text/plain']
  for (const t of urlTypes) {
    try {
      const val = dt.getData(t)
      if (val && typeof val === 'string') {
        const trimmed = val.trim()
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('file://')) {
          return trimmed.split('\n')[0].trim()
        }
      }
    } catch (e) {}
  }
  try {
    const html = dt.getData('text/html')
    if (html && typeof html === 'string') {
      const match = html.match(/href=["'](https?:\/\/[^"']+)["']/i)
      if (match && match[1]) return match[1]
    }
  } catch (e) {}
  try {
    const text = dt.getData('text/plain')
    if (text && typeof text === 'string') {
      const match = text.match(/(https?:\/\/[^\s]+)/i)
      if (match && match[1]) return match[1]
    }
  } catch (e) {}
  return null
}

const onTabDrop = (e, targetIndex, targetTab) => {
  e.preventDefault()
  const droppedUrl = extractUrlFromDataTransfer(e.dataTransfer)
  
  // 1. If dropping a URL from a page/link -> open immediately to the right of targetTab
  if (droppedUrl) {
    emit('open-link-tab-at', { url: droppedUrl, targetTabId: targetTab ? targetTab.id : props.activeTabId })
    draggedIndex.value = null
    draggedTab.value = null
    return
  }

  const textData = e.dataTransfer ? (e.dataTransfer.getData('text/plain') || '') : ''

  // 2. If dropping an external tab back into tabbar -> attach back
  const externalTab = props.tabs.find(t => t.id === textData && t.isExternal)
  if (externalTab) {
    emit('attach-tab', externalTab.id)
    draggedIndex.value = null
    draggedTab.value = null
    return
  }

  // 3. Tab reordering
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
  const newTabs = [...props.tabs]
  const [removed] = newTabs.splice(draggedIndex.value, 1)
  newTabs.splice(targetIndex, 0, removed)
  
  const idsList = newTabs.map((t) => t.id)
  emit('reorder-tabs', idsList)
  draggedIndex.value = null
  draggedTab.value = null
}

const onContainerDrop = (e) => {
  e.preventDefault()
  const droppedUrl = extractUrlFromDataTransfer(e.dataTransfer)
  if (droppedUrl) {
    emit('open-link-tab-at', { url: droppedUrl, targetTabId: props.activeTabId })
  }
}
</script>
