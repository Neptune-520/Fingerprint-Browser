<template>
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-xl animate-fade-in relative">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 class="font-bold text-base text-slate-900">批量新建（一行一个对应）</h3>
        </div>
        <div class="flex items-center space-x-2">
          <button 
            @click="openAccountPicker" 
            class="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 shadow-sm"
            title="选择指定账号导入"
          >
            <span>选择账号导入</span>
          </button>
          <button @click="$emit('close')" class="p-1 text-slate-400 hover:text-slate-700 rounded transition" title="关闭">
            <AppIcon name="close" className="w-4 h-4 text-slate-400 hover:text-slate-700" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs">
        <div>
          <label class="block text-slate-700 font-medium mb-1">窗口名称</label>
          <textarea 
            v-model="namesText" 
            rows="5" 
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
          ></textarea>
        </div>

        <div>
          <label class="block text-slate-700 font-medium mb-1">跳转URL</label>
          <textarea 
            v-model="urlsText" 
            rows="5" 
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
          ></textarea>
        </div>

        <div>
          <label class="block text-slate-700 font-medium mb-1">关联账号</label>
          <textarea 
            v-model="usernamesText" 
            rows="5" 
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
          ></textarea>
        </div>

        <div>
          <label class="block text-slate-700 font-medium mb-1">关联密码</label>
          <textarea 
            v-model="passwordsText" 
            rows="5" 
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
          ></textarea>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs pt-1">
        <div>
          <label class="block text-slate-600 mb-1">统一分组</label>
          <input 
            v-model="tag" 
            type="text" 
            class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" 
          />
        </div>
        <div class="flex items-end justify-between">
          <div class="text-slate-500 text-[11px]">
            预计生成: <span class="font-bold text-blue-600 text-sm">{{ estimatedCount }}</span> 个窗口
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
        <button @click="$emit('close')" class="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">取消</button>
        <button @click="handleSave" class="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">批量生成窗口</button>
      </div>

      <!-- Sub-Modal: Select Specific Accounts to Import -->
      <div v-if="showAccountPicker" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-fade-in relative">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="font-bold text-sm text-slate-900">选择要导入的账号凭据</h4>
            <div class="flex items-center space-x-2">
              <span class="text-xs text-slate-500">已选 {{ selectedPickerAccountIds.length }} / {{ accounts.length }} 个</span>
              <button @click="showAccountPicker = false" class="p-1 text-slate-400 hover:text-slate-700 rounded transition" title="关闭">
                <AppIcon name="close" className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
          </div>

          <div class="flex space-x-2">
            <input 
              v-model="pickerSearch" 
              type="text" 
              placeholder="检索标题 / 账号 / 分组..." 
              class="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <button @click="selectAllPickerAccounts" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs">全选</button>
            <button @click="clearAllPickerAccounts" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs">清空</button>
          </div>

          <div class="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
            <label 
              v-for="acc in filteredPickerAccounts" 
              :key="acc.id" 
              class="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer space-x-2"
            >
              <input 
                type="checkbox" 
                :value="acc.id" 
                v-model="selectedPickerAccountIds" 
                class="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5" 
              />
              <div class="flex-1 truncate">
                <div class="font-bold text-slate-800 truncate">{{ acc.title }}</div>
                <div class="text-slate-400 font-mono text-[10px] truncate">{{ acc.username || '-' }}</div>
              </div>
              <span v-if="acc.tag" class="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{{ acc.tag }}</span>
            </label>

            <div v-if="filteredPickerAccounts.length === 0" class="py-8 text-center text-slate-400 text-xs">
              无匹配可用的账号凭据
            </div>
          </div>

          <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button @click="showAccountPicker = false" class="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">取消</button>
            <button 
              @click="confirmAccountImport" 
              :disabled="selectedPickerAccountIds.length === 0"
              :class="[
                'px-4 py-1.5 text-xs font-medium rounded-lg transition shadow-sm',
                selectedPickerAccountIds.length > 0 ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed'
              ]"
            >
              导入选中的 {{ selectedPickerAccountIds.length }} 个账号
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  accounts: Array
})

const emit = defineEmits(['close', 'save-batch', 'toast'])

const namesText = ref('')
const urlsText = ref('')
const usernamesText = ref('')
const passwordsText = ref('')
const tag = ref('')

const showAccountPicker = ref(false)
const pickerSearch = ref('')
const selectedPickerAccountIds = ref([])

const splitLines = (text) => {
  if (!text) return []
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
}

const estimatedCount = computed(() => {
  const n = splitLines(namesText.value).length
  const u = splitLines(urlsText.value).length
  const user = splitLines(usernamesText.value).length
  const pwd = splitLines(passwordsText.value).length
  return Math.max(n, u, user, pwd, 1)
})

const filteredPickerAccounts = computed(() => {
  if (!props.accounts) return []
  return props.accounts.filter((a) => {
    return !pickerSearch.value ||
      a.title.toLowerCase().includes(pickerSearch.value.toLowerCase()) ||
      a.username.toLowerCase().includes(pickerSearch.value.toLowerCase()) ||
      (a.tag && a.tag.toLowerCase().includes(pickerSearch.value.toLowerCase()))
  })
})

const openAccountPicker = () => {
  if (!props.accounts || props.accounts.length === 0) {
    emit('toast', '账号凭据库为空，无可用凭据！', 'warning')
    return
  }
  selectedPickerAccountIds.value = []
  showAccountPicker.value = true
}

const selectAllPickerAccounts = () => {
  selectedPickerAccountIds.value = filteredPickerAccounts.value.map((a) => a.id)
}

const clearAllPickerAccounts = () => {
  selectedPickerAccountIds.value = []
}

const confirmAccountImport = () => {
  const selectedAccounts = props.accounts.filter((a) => selectedPickerAccountIds.value.includes(a.id))
  if (selectedAccounts.length === 0) return

  const nList = []
  const uList = []
  const userList = []
  const pwdList = []

  selectedAccounts.forEach((acc) => {
    nList.push(acc.title || '环境-' + acc.id)
    uList.push('https://www.baidu.com')
    userList.push(acc.username || '')
    pwdList.push(acc.password || '')
  })

  namesText.value = nList.join('\n')
  urlsText.value = uList.join('\n')
  usernamesText.value = userList.join('\n')
  passwordsText.value = pwdList.join('\n')

  showAccountPicker.value = false
  emit('toast', `已成功导入所选的 ${selectedAccounts.length} 个账号配置！`, 'success')
}

const handleSave = () => {
  const names = splitLines(namesText.value)
  const urls = splitLines(urlsText.value)
  const usernames = splitLines(usernamesText.value)
  const passwords = splitLines(passwordsText.value)

  const count = Math.max(names.length, urls.length, usernames.length, passwords.length, 1)
  const list = []

  for (let i = 0; i < count; i++) {
    const profileName = names[i] || (names[0] ? `${names[0]}-${i + 1}` : `窗口-${i + 1}`)
    let targetUrl = urls[i] || urls[0] || 'https://www.baidu.com'
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }
    const uname = usernames[i] !== undefined ? usernames[i] : (usernames[0] || '')
    const pass = passwords[i] !== undefined ? passwords[i] : (passwords[0] || '')

    list.push({
      id: 'profile_' + Math.random().toString(36).substring(2, 9),
      name: profileName,
      url: targetUrl,
      username: uname,
      password: pass,
      tag: tag.value
    })
  }

  emit('save-batch', list)
}
</script>
