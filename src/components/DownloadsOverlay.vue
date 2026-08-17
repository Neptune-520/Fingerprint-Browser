<template>
  <div 
    v-if="visible" 
    :class="[
      isPopupMode ? 'w-full h-full' : 'fixed top-14 right-3 w-[360px] max-h-[520px]',
      'bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden text-xs'
    ]"
  >
    <!-- Header -->
    <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/90 select-none flex-shrink-0">
      <div class="flex items-center space-x-1.5 font-bold text-slate-800">
        <span>下载任务</span>
        <span v-if="downloads.length > 0" class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
          {{ downloads.length }}
        </span>
      </div>
      <button 
        @click="$emit('close')" 
        class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
        title="关闭"
      >
        <AppIcon name="close" className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
      </button>
    </div>

    <!-- Tasks List (Scrollable) -->
    <div class="p-3 overflow-y-auto space-y-2.5 flex-1 min-h-0 select-text">
      <div 
        v-for="task in downloads" 
        :key="task.id"
        class="p-2.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl space-y-1.5 transition"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0 mr-2">
            <span 
              @click="openFile(task.filePath)" 
              class="font-semibold text-slate-800 hover:text-blue-600 cursor-pointer truncate block text-xs" 
              :title="`点击在软件内打开: ${task.fileName}`"
            >
              {{ task.fileName }}
            </span>
            <span class="text-[10px] text-slate-400 truncate block mt-0.5" :title="task.filePath">
              {{ task.filePath }}
            </span>
          </div>

          <div class="flex items-center space-x-1 flex-shrink-0">
            <button 
              @click="openFile(task.filePath)" 
              class="px-2 py-0.5 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded transition"
              title="在软件中打开"
            >
              打开
            </button>
            <button 
              @click="openFolder(task.filePath)" 
              class="px-1.5 py-0.5 text-[11px] bg-white hover:bg-slate-200 text-slate-600 border border-slate-300 rounded transition"
              title="打开所在文件夹"
            >
              目录
            </button>
            <button 
              @click="removeTask(task.id)" 
              class="p-1 text-slate-400 hover:text-red-600 rounded transition"
              title="删除记录"
            >
              <AppIcon name="close" className="w-3 h-3 text-slate-400 hover:text-red-600" />
            </button>
          </div>
        </div>

        <!-- Progress / State -->
        <div v-if="task.state === 'downloading'" class="space-y-1 pt-0.5">
          <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div class="bg-blue-600 h-1.5 transition-all duration-300 rounded-full" :style="{ width: task.progress + '%' }"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>下载中 {{ task.progress }}%</span>
            <span>{{ formatSize(task.receivedBytes) }} / {{ formatSize(task.totalBytes) }}</span>
          </div>
        </div>
        <div v-else-if="task.state === 'finished'" class="flex items-center justify-between text-[10px] text-emerald-600 font-medium pt-0.5">
          <span>✓ 已完成</span>
          <span class="text-slate-400 font-mono">{{ formatSize(task.totalBytes) }}</span>
        </div>
        <div v-else class="text-[10px] text-red-500 font-medium pt-0.5">
          ✕ 下载已中断
        </div>
      </div>

      <div v-if="downloads.length === 0" class="text-center py-10 text-slate-400 text-xs">
        <div class="text-2xl mb-1.5">📥</div>
        <span>暂无下载任务记录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

const props = defineProps({
  visible: Boolean,
  downloads: Array,
  isPopupMode: Boolean
})

const emit = defineEmits(['close'])

const openFile = (fp) => {
  if (window.electronAPI && window.electronAPI.openDownloadedFile) {
    window.electronAPI.openDownloadedFile(fp)
  }
}

const openFolder = (fp) => {
  if (window.electronAPI && window.electronAPI.openDownloadFolder) {
    window.electronAPI.openDownloadFolder(fp)
  }
}

const removeTask = (id) => {
  if (props.downloads) {
    const idx = props.downloads.findIndex((d) => d.id === id)
    if (idx !== -1) props.downloads.splice(idx, 1)
  }
  if (window.electronAPI && window.electronAPI.removeDownloadTask) {
    window.electronAPI.removeDownloadTask(id)
  }
}

const formatSize = (bytes) => {
  if (!bytes) return '未知大小'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let val = bytes
  while (val >= k && i < sizes.length - 1) {
    val /= k
    i++
  }
  return `${val.toFixed(1)} ${sizes[i]}`
}
</script>
