<template>
  <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-fade-in relative">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 class="font-bold text-base text-slate-900">{{ isEdit ? '编辑隔离环境' : '新建隔离环境' }}</h3>
        <button @click="$emit('close')" class="p-1 text-slate-400 hover:text-slate-700 rounded transition" title="关闭">
          <AppIcon name="close" className="w-4 h-4 text-slate-400 hover:text-slate-700" />
        </button>
      </div>

      <div class="space-y-3 text-xs">
        <div>
          <label class="block text-slate-600 mb-1">环境名称</label>
          <input v-model="form.name" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
        </div>

        <div>
          <label class="block text-slate-600 mb-1">默认URL</label>
          <input v-model="form.url" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-slate-600 mb-1">用户名</label>
            <input v-model="form.username" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
          <div>
            <label class="block text-slate-600 mb-1">密码</label>
            <input v-model="form.password" type="password" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
          </div>
        </div>

        <div>
          <label class="block text-slate-600 mb-1">分组标签</label>
          <input v-model="form.tag" type="text" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white" />
        </div>

        <div>
          <label class="block text-slate-600 mb-1">预设账号</label>
          <CustomSelect 
            v-model="form.accountId" 
            :options="accountOptions"
            placeholder="-- 选择预设账号 --"
          />
        </div>
      </div>

      <div class="flex justify-end space-x-2 pt-2">
        <button @click="$emit('close')" class="px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300">取消</button>
        <button @click="handleSave" class="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium shadow-sm">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import CustomSelect from './CustomSelect.vue'

const props = defineProps({
  profileData: Object,
  accounts: Array
})

const emit = defineEmits(['close', 'save', 'toast'])

const isEdit = computed(() => !!(props.profileData && props.profileData.id))

const accountOptions = computed(() => {
  return [
    { label: '-- 不绑定预设账号 --', value: '' },
    ...(props.accounts || []).map(a => ({
      label: `${a.title} (${a.username})`,
      value: a.id
    }))
  ]
})

const form = ref({
  id: '',
  name: '',
  url: '',
  username: '',
  password: '',
  tag: '',
  accountId: ''
})

watch(() => props.profileData, (val) => {
  if (val) {
    form.value = { ...val }
  } else {
    form.value = {
      id: 'profile_' + Math.random().toString(36).substring(2, 9),
      name: '',
      url: '',
      username: '',
      password: '',
      tag: '',
      accountId: ''
    }
  }
}, { immediate: true })

watch(() => form.value.accountId, (newAccId) => {
  if (newAccId && props.accounts) {
    const acc = props.accounts.find((a) => a.id === newAccId)
    if (acc) {
      if (acc.title) form.value.name = acc.title
      if (acc.tag) form.value.tag = acc.tag
      if (acc.username) form.value.username = acc.username
      if (acc.password) form.value.password = acc.password
    }
  }
})

const handleSave = () => {
  if (!form.value.name.trim()) {
    emit('toast', '请输入环境名称！', 'warning')
    return
  }
  let targetUrl = form.value.url ? form.value.url.trim() : 'https://www.baidu.com'
  if (!targetUrl || targetUrl === 'https://' || targetUrl === 'http://') {
    targetUrl = 'https://www.baidu.com'
  }
  emit('save', { ...form.value, url: targetUrl })
}
</script>
