<template>
  <div class="p-5 flex gap-5 h-full items-start">
    <!-- Left Control & Action Panel -->
    <div class="w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-4 flex-shrink-0">
      <div class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
        窗口管理控制台
      </div>

      <!-- Search Box -->
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-500">搜索过滤</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索窗口名称 / 地址 / 账号..." 
          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      <!-- Tag Selector -->
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-500">分组</label>
        <CustomSelect 
          v-model="selectedTag" 
          :options="tagOptions"
          placeholder="全部分组"
        />
      </div>

      <div class="border-t border-slate-100 pt-2 space-y-2">
        <button 
          @click="$emit('open-modal')" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 rounded-lg transition shadow-sm flex items-center justify-center space-x-1"
        >
          <span>＋ 新建窗口</span>
        </button>

        <button 
          @click="$emit('open-batch-modal')" 
          class="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-1.5 rounded-lg border border-slate-300 transition"
        >
          批量新建
        </button>
      </div>

      <!-- Multi-select Batch Actions (Always Visible) -->
      <div class="border-t border-slate-100 pt-2 space-y-2">
        <label class="text-[11px] font-medium text-slate-500 block">批量操作 (跨页共选 {{ selectedIds.length }} 个)</label>

        <button 
          @click="handleBatchLaunch" 
          :disabled="selectedIds.length === 0"
          :class="[
            'w-full font-medium text-xs py-1.5 rounded-lg transition shadow-sm',
            selectedIds.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
          ]"
        >
          批量启动 ({{ selectedIds.length }})
        </button>

        <button 
          @click="handleBatchDelete" 
          :disabled="selectedIds.length === 0"
          :class="[
            'w-full font-medium text-xs py-1.5 rounded-lg transition border',
            selectedIds.length > 0 ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
          ]"
        >
          删除已选 ({{ selectedIds.length }})
        </button>
      </div>

      <!-- File Import / Export -->
      <div class="border-t border-slate-100 pt-3 flex space-x-2">
        <button 
          @click="$emit('import-profiles')" 
          class="flex-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg border border-slate-300 transition text-center font-medium"
        >
          导入 JSON
        </button>

        <button 
          @click="handleExport" 
          class="flex-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg border border-slate-300 transition text-center font-medium"
        >
          导出 JSON
        </button>
      </div>
    </div>

    <!-- Right List Table & Pagination -->
    <div class="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs flex flex-col justify-between h-full min-h-[500px]">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium select-none">
              <th class="py-3 px-4 w-10 text-center">
                <input 
                  type="checkbox" 
                  :checked="isCurrentPageAllSelected" 
                  @change="toggleCurrentPageSelectAll" 
                  class="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  title="全选/反选本页"
                />
              </th>
              <th class="py-3 px-4">窗口</th>
              <th class="py-3 px-4 text-right min-w-[200px]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-800">
            <tr 
              v-for="profile in pagedProfiles" 
              :key="profile.id"
              :class="[
                'hover:bg-slate-50/80 transition-colors',
                selectedIds.includes(profile.id) ? 'bg-blue-50/40' : ''
              ]"
            >
              <td class="py-3 px-4 text-center align-middle">
                <input 
                  type="checkbox" 
                  :value="profile.id" 
                  v-model="selectedIds"
                  class="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-slate-900 text-sm truncate max-w-[320px]">{{ profile.name }}</span>
                  <span 
                    v-if="profile.tag" 
                    class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0"
                  >
                    {{ profile.tag }}
                  </span>
                </div>
                <div class="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 font-sans">
                  <div class="truncate max-w-[360px]">
                    <span class="text-slate-400">网址：</span>
                    <span class="text-slate-600 font-mono select-all">{{ profile.url || 'https://www.baidu.com' }}</span>
                  </div>
                  <div class="truncate max-w-[240px]">
                    <span class="text-slate-400">账号：</span>
                    <span class="text-slate-600 font-mono select-all">{{ profile.username || '-' }}</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-right align-middle space-x-2 whitespace-nowrap">
                <button 
                  @click="$emit('launch', profile.id)"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-2.5 py-1 rounded transition shadow-sm"
                >
                  打开
                </button>
                <button 
                  @click="$emit('edit', profile)" 
                  class="text-slate-600 hover:text-slate-900 transition font-medium text-xs"
                >
                  编辑
                </button>
                <button 
                  @click="$emit('duplicate', profile)" 
                  class="text-slate-600 hover:text-slate-900 transition font-medium text-xs"
                >
                  复制
                </button>
                <button 
                  @click="$emit('delete', profile.id)" 
                  class="text-red-500 hover:text-red-700 transition font-medium text-xs"
                >
                  删除
                </button>
              </td>
            </tr>

            <tr v-if="filteredProfiles.length === 0">
              <td colspan="3" class="py-16 text-center text-slate-400">
                暂无匹配的窗口列表
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer Controls (15 per page) -->
      <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs select-none">
        <div class="text-slate-500">
          显示第 <span class="font-medium text-slate-800">{{ (currentPage - 1) * pageSize + 1 }}</span> 至 <span class="font-medium text-slate-800">{{ Math.min(currentPage * pageSize, filteredProfiles.length) }}</span> 条，共 <span class="font-bold text-slate-900">{{ filteredProfiles.length }}</span> 条窗口 (已选 {{ selectedIds.length }} 个)
        </div>

        <div class="flex items-center space-x-2">
          <button 
            @click="prevPage" 
            :disabled="currentPage === 1"
            :class="[
              'px-2.5 py-1 rounded border transition font-medium',
              currentPage === 1 ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            ]"
          >
            ‹ 上一页
          </button>

          <span class="text-slate-600 font-medium px-2">
            {{ currentPage }} / {{ totalPages }} 页
          </span>

          <button 
            @click="nextPage" 
            :disabled="currentPage >= totalPages"
            :class="[
              'px-2.5 py-1 rounded border transition font-medium',
              currentPage >= totalPages ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            ]"
          >
            下一页 ›
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import CustomSelect from './CustomSelect.vue'

const props = defineProps({
  profiles: Array
})

const emit = defineEmits([
  'launch', 'batch-launch', 'edit', 'duplicate', 'delete', 'batch-delete',
  'open-modal', 'open-batch-modal', 'import-profiles', 'toast'
])

const searchQuery = ref('')
const selectedTag = ref('')
const selectedIds = ref([]) // Maintained globally across page switches!

const currentPage = ref(1)
const pageSize = 15

watch([searchQuery, selectedTag], () => {
  currentPage.value = 1
})

const allTags = computed(() => {
  const set = new Set()
  props.profiles.forEach((p) => {
    if (p.tag) set.add(p.tag)
  })
  return Array.from(set)
})

const tagOptions = computed(() => {
  return [
    { label: '全部分组', value: '' },
    ...allTags.value.map(t => ({ label: t, value: t }))
  ]
})

const filteredProfiles = computed(() => {
  return props.profiles.filter((p) => {
    const matchQuery = !searchQuery.value || 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (p.url && p.url.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchTag = !selectedTag.value || p.tag === selectedTag.value
    return matchQuery && matchTag
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredProfiles.value.length / pageSize))
})

const pagedProfiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredProfiles.value.slice(start, start + pageSize)
})

const isCurrentPageAllSelected = computed(() => {
  if (pagedProfiles.value.length === 0) return false
  return pagedProfiles.value.every((p) => selectedIds.value.includes(p.id))
})

const toggleCurrentPageSelectAll = () => {
  if (isCurrentPageAllSelected.value) {
    // Uncheck items on current page only
    const pageIds = pagedProfiles.value.map((p) => p.id)
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    // Check all items on current page while preserving previous page selections
    const newSet = new Set(selectedIds.value)
    pagedProfiles.value.forEach((p) => newSet.add(p.id))
    selectedIds.value = Array.from(newSet)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const handleBatchLaunch = () => {
  if (selectedIds.value.length === 0) return
  emit('batch-launch', [...selectedIds.value])
}

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return
  emit('batch-delete', [...selectedIds.value])
  selectedIds.value = []
}

const handleExport = () => {
  if (window.electronAPI && window.electronAPI.exportProfiles) {
    window.electronAPI.exportProfiles()
  }
}
</script>
