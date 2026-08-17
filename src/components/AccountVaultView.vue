<template>
  <div class="p-5 flex gap-5 h-full items-start">
    <!-- Left Control & Action Panel -->
    <div class="w-64 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-4 flex-shrink-0">
      <div class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
        账号凭据控制台
      </div>

      <!-- Search Box -->
      <div class="space-y-1">
        <label class="text-[11px] font-medium text-slate-500">搜索检索</label>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索标题 / 账号 / 分组 / 备注..." 
          class="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div class="border-t border-slate-100 pt-2 space-y-2">
        <button 
          @click="openAddModal" 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 rounded-lg transition shadow-sm flex items-center justify-center space-x-1"
        >
          <span>＋ 新增凭据</span>
        </button>

        <button 
          @click="handleBatchDelete" 
          :disabled="selectedIds.length === 0"
          :class="[
            'w-full font-medium text-xs py-1.5 rounded-lg transition border',
            selectedIds.length > 0 ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
          ]"
        >
          批量删除已选 ({{ selectedIds.length }})
        </button>
      </div>

      <!-- File Import / Export -->
      <div class="border-t border-slate-100 pt-3 flex space-x-2">
        <button 
          @click="$emit('import-accounts')" 
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
              <th class="py-3 px-4">账号信息</th>
              <th class="py-3 px-4 text-right min-w-[160px]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-800">
            <tr 
              v-for="acc in pagedAccounts" 
              :key="acc.id"
              :class="[
                'hover:bg-slate-50/80 transition-colors',
                selectedIds.includes(acc.id) ? 'bg-blue-50/40' : ''
              ]"
            >
              <td class="py-3 px-4 text-center align-middle">
                <input 
                  type="checkbox" 
                  :value="acc.id" 
                  v-model="selectedIds"
                  class="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center space-x-2">
                  <span class="font-bold text-slate-900 text-sm truncate max-w-[320px]">{{ acc.title }}</span>
                  <span 
                    v-if="acc.tag" 
                    class="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0"
                  >
                    {{ acc.tag }}
                  </span>
                </div>
                <div class="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-5 gap-y-1 mt-1 font-sans">
                  <div class="truncate max-w-[300px]">
                    <span class="text-slate-400">账号：</span>
                    <span class="text-slate-700 font-mono select-all">{{ acc.username || '-' }}</span>
                  </div>
                  <div class="truncate max-w-[300px]">
                    <span class="text-slate-400">备注：</span>
                    <span class="text-slate-600">{{ acc.note || '-' }}</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4 text-right align-middle space-x-3 whitespace-nowrap">
                <button @click="openEditModal(acc)" class="text-slate-600 hover:text-slate-900 font-medium text-xs">编辑</button>
                <button @click="handleDuplicate(acc)" class="text-slate-600 hover:text-slate-900 font-medium text-xs">复制</button>
                <button @click="$emit('delete-account', acc.id)" class="text-red-500 hover:text-red-700 font-medium text-xs">删除</button>
              </td>
            </tr>

            <tr v-if="filteredAccounts.length === 0">
              <td colspan="3" class="py-16 text-center text-slate-400">
                暂无匹配的账号凭据列表
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer Controls (15 per page) -->
      <div class="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs select-none">
        <div class="text-slate-500">
          显示第 <span class="font-medium text-slate-800">{{ (currentPage - 1) * pageSize + 1 }}</span> 至 <span class="font-medium text-slate-800">{{ Math.min(currentPage * pageSize, filteredAccounts.length) }}</span> 条，共 <span class="font-bold text-slate-900">{{ filteredAccounts.length }}</span> 项凭据 (已选 {{ selectedIds.length }} 项)
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

    <!-- Modal for Account Edit/Add -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in relative">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 class="font-bold text-base text-slate-900">{{ isEditing ? '编辑账号凭据' : '新增账号凭据' }}</h3>
          <button @click="showModal = false" class="p-1 text-slate-400 hover:text-slate-700 rounded transition" title="关闭">
            <AppIcon name="close" className="w-4 h-4 text-slate-400 hover:text-slate-700" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="block text-slate-600 mb-1">标题 *</label>
            <input v-model="form.title" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <div>
            <label class="block text-slate-600 mb-1">账号</label>
            <input v-model="form.username" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <div>
            <label class="block text-slate-600 mb-1">密码</label>
            <input v-model="form.password" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <div>
            <label class="block text-slate-600 mb-1">分组</label>
            <input v-model="form.tag" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <div>
            <label class="block text-slate-600 mb-1">备注</label>
            <textarea v-model="form.note" rows="2" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"></textarea>
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-2">
          <button @click="showModal = false" class="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">取消</button>
          <button @click="handleSave" class="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  accounts: Array
})

const emit = defineEmits(['save-account', 'delete-account', 'batch-delete-accounts', 'import-accounts', 'duplicate-account', 'toast'])

const searchQuery = ref('')
const selectedIds = ref([]) // Maintained globally across page switches!
const showModal = ref(false)
const isEditing = ref(false)

const currentPage = ref(1)
const pageSize = 17

watch(searchQuery, () => {
  currentPage.value = 1
})

const form = ref({
  id: '',
  title: '',
  username: '',
  password: '',
  tag: '',
  note: ''
})

const filteredAccounts = computed(() => {
  return props.accounts.filter((a) => {
    return !searchQuery.value ||
      a.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (a.tag && a.tag.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (a.note && a.note.toLowerCase().includes(searchQuery.value.toLowerCase()))
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredAccounts.value.length / pageSize))
})

const pagedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredAccounts.value.slice(start, start + pageSize)
})

const isCurrentPageAllSelected = computed(() => {
  if (pagedAccounts.value.length === 0) return false
  return pagedAccounts.value.every((a) => selectedIds.value.includes(a.id))
})

const toggleCurrentPageSelectAll = () => {
  if (isCurrentPageAllSelected.value) {
    const pageIds = pagedAccounts.value.map((a) => a.id)
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.includes(id))
  } else {
    const newSet = new Set(selectedIds.value)
    pagedAccounts.value.forEach((a) => newSet.add(a.id))
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

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) return
  emit('batch-delete-accounts', [...selectedIds.value])
  selectedIds.value = []
}

const openAddModal = () => {
  isEditing.value = false
  form.value = { id: 'acc_' + Math.random().toString(36).substring(2, 9), title: '', username: '', password: '', tag: '', note: '' }
  showModal.value = true
}

const openEditModal = (acc) => {
  isEditing.value = true
  form.value = { ...acc }
  showModal.value = true
}

const handleDuplicate = (acc) => {
  emit('duplicate-account', acc)
}

const handleSave = () => {
  if (!form.value.title.trim()) {
    emit('toast', '请输入凭据标题！', 'warning')
    return
  }
  emit('save-account', { ...form.value })
  showModal.value = false
}

const handleExport = () => {
  if (window.electronAPI && window.electronAPI.exportAccounts) {
    window.electronAPI.exportAccounts()
  }
}
</script>
