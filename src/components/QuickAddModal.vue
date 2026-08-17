<template>
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl animate-fade-in relative flex flex-col max-h-[80vh]">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-shrink-0">
        <div class="flex items-center space-x-2">
          <h3 class="font-bold text-sm text-slate-900">窗口库 - 快捷启动窗口</h3>
          <span class="text-xs text-slate-400 font-mono">共 {{ profiles.length }} 个环境</span>
        </div>
        <button @click="$emit('close')" class="p-1 text-slate-400 hover:text-slate-700 rounded transition" title="关闭">
          <AppIcon name="close" className="w-4 h-4 text-slate-400 hover:text-slate-700" />
        </button>
      </div>

      <!-- Search & Batch Action Bar -->
      <div class="space-y-2.5 flex-shrink-0 text-xs">
        <input 
          v-model="query" 
          type="text" 
          placeholder="快速搜索环境名称或网址..." 
          class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" 
        />

        <div class="flex items-center justify-between pt-1">
          <label class="flex items-center space-x-2 cursor-pointer select-none text-slate-700">
            <input 
              type="checkbox" 
              :checked="isAllSelected" 
              @change="toggleSelectAll" 
              class="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span class="font-medium">全选当前列表</span>
            <span v-if="selectedIds.length > 0" class="text-blue-600 font-bold">
              (已选 {{ selectedIds.length }} 项)
            </span>
          </label>

          <button 
            @click="handleBatchLaunch"
            :disabled="selectedIds.length === 0"
            :class="[
              'px-3 py-1.5 rounded-lg font-medium transition text-xs flex items-center space-x-1 shadow-sm',
              selectedIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            ]"
          >
            <span>批量启动 ({{ selectedIds.length }})</span>
          </button>
        </div>
      </div>

      <!-- Profiles List -->
      <div class="overflow-y-auto space-y-1.5 flex-1 pr-1 text-xs min-h-[160px]">
        <div 
          v-for="profile in filteredProfiles" 
          :key="profile.id"
          class="p-2.5 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-300 border border-slate-200 rounded-lg flex items-center justify-between transition"
        >
          <div class="flex items-center space-x-2.5 flex-1 min-w-0 mr-2">
            <input 
              type="checkbox" 
              :value="profile.id" 
              v-model="selectedIds" 
              class="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5 flex-shrink-0 cursor-pointer"
            />
            <div class="min-w-0 flex-1 cursor-pointer" @click="toggleSelect(profile.id)">
              <div class="font-semibold text-slate-800 truncate">{{ profile.name }}</div>
              <div class="text-[11px] text-slate-400 truncate font-mono mt-0.5">{{ profile.url || '默认主页' }}</div>
            </div>
          </div>

          <button 
            @click="handleLaunch(profile.id)" 
            class="px-2.5 py-1 bg-white hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 rounded-lg font-medium transition flex-shrink-0 shadow-sm"
          >
            启动 ➔
          </button>
        </div>

        <div v-if="filteredProfiles.length === 0" class="text-center py-10 text-slate-400">
          <span>未找到匹配的环境</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  profiles: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'launch', 'batch-launch'])

const query = ref('')
const selectedIds = ref([])

const filteredProfiles = computed(() => {
  const q = query.value.trim().toLowerCase()
  return (props.profiles || []).filter((p) => {
    return !q || (p.name && p.name.toLowerCase().includes(q)) || (p.url && p.url.toLowerCase().includes(q))
  })
})

const isAllSelected = computed(() => {
  if (filteredProfiles.value.length === 0) return false
  return filteredProfiles.value.every((p) => selectedIds.value.includes(p.id))
})

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    const ids = filteredProfiles.value.map((p) => p.id)
    selectedIds.value = Array.from(new Set([...selectedIds.value, ...ids]))
  } else {
    const currentIds = new Set(filteredProfiles.value.map((p) => p.id))
    selectedIds.value = selectedIds.value.filter((id) => !currentIds.has(id))
  }
}

const toggleSelect = (id) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((i) => i !== id)
  } else {
    selectedIds.value.push(id)
  }
}

const handleLaunch = (id) => {
  emit('launch', id)
  emit('close')
}

const handleBatchLaunch = () => {
  if (selectedIds.value.length === 0) return
  emit('batch-launch', [...selectedIds.value])
  emit('close')
}
</script>
