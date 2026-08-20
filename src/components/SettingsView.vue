<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 class="text-base font-bold text-slate-900">系统全局设置</h3>
          <p class="text-xs text-slate-500">设置底层环境路径、界面字体字号、多窗口运行模式及默认偏好。</p>
        </div>

        <button 
          @click="handleSave" 
          class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg shadow-sm transition"
        >
          保存设置
        </button>
      </div>

      <div class="space-y-4 text-xs">
        <!-- UI Font Settings -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label class="font-medium text-slate-800 block">界面字体</label>
          </div>
          <div class="md:col-span-2">
            <CustomSelect 
              v-model="form.fontFamily" 
              :options="fontOptions"
              placeholder="选择字体..."
            />
          </div>
        </div>

        <!-- UI Font Size Settings -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">系统字号大小 (16 - 25)</label>
          </div>
          <div class="md:col-span-2 flex items-center space-x-3">
            <input 
              type="number" 
              min="16" 
              max="25" 
              v-model.number="form.fontSize" 
              class="w-32 bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
            />
            <span class="text-slate-600 text-xs font-medium">px</span>
          </div>
        </div>

        <!-- Browser Mode -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">默认打开模式</label>
          </div>
          <div class="md:col-span-2 flex items-center space-x-4">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="radio" value="internal" v-model="form.browserType" class="text-blue-600 focus:ring-0" />
              <span class="text-slate-700">内置模式</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="radio" value="external" v-model="form.browserType" class="text-blue-600 focus:ring-0" />
              <span class="text-slate-700">独立模式</span>
            </label>
          </div>
        </div>

        <!-- DevTools Mode -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">F12默认停靠位置</label>
          </div>
          <div class="md:col-span-2 flex items-center space-x-4">
            <label class="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" value="right" v-model="form.devtoolsDockMode" class="text-blue-600 focus:ring-0" />
              <span class="text-slate-700">右侧停靠</span>
            </label>
            <label class="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" value="bottom" v-model="form.devtoolsDockMode" class="text-blue-600 focus:ring-0" />
              <span class="text-slate-700">底部停靠</span>
            </label>
            <label class="flex items-center space-x-1.5 cursor-pointer">
              <input type="radio" value="detach" v-model="form.devtoolsDockMode" class="text-blue-600 focus:ring-0" />
              <span class="text-slate-700">独立窗口</span>
            </label>
          </div>
        </div>

        <!-- Storage Directory -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">数据目录</label>
            <span class="text-slate-400 text-[11px] block mt-0.5">变更路径将自动迁移原目录所有数据</span>
          </div>
          <div class="md:col-span-2 flex items-center space-x-2">
            <input 
              v-model="form.storageDir" 
              type="text" 
              class="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
            />
            <button 
              type="button" 
              @click="browseDirectory('storageDir')" 
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium transition text-xs flex-shrink-0"
              title="浏览并选择本地文件夹"
            >
              浏览...
            </button>
          </div>
        </div>

        <!-- Download Directory -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">文件下载路径</label>
          </div>
          <div class="md:col-span-2 flex items-center space-x-2">
            <input 
              v-model="form.downloadDir" 
              type="text" 
              class="flex-1 bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
            />
            <button 
              type="button" 
              @click="browseDirectory('downloadDir')" 
              class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-medium transition text-xs flex-shrink-0"
              title="浏览并选择本地文件夹"
            >
              浏览...
            </button>
          </div>
        </div>

        <!-- Default URL -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">新建标签页默认 URL</label>
          </div>
          <div class="md:col-span-2">
            <input 
              v-model="form.newTabDefaultUrl" 
              type="text" 
              class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white" 
            />
          </div>
        </div>

        <!-- Auto Restore Tabs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">自动恢复上次标签页</label>
          </div>
          <div class="md:col-span-2">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" v-model="form.autoRestoreTabs" class="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4" />
              <span class="text-slate-700">启用</span>
            </label>
          </div>
        </div>

        <!-- GitHub Proxy Settings -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">GitHub 更新加速代理</label>
            <span class="text-slate-400 text-[11px] block mt-0.5">国内访问 GitHub 受限或 404 时，可切换内置代理服务</span>
          </div>
          <div class="md:col-span-2 space-y-2">
            <CustomSelect 
              v-model="form.githubProxy" 
              :options="proxyOptions"
              placeholder="选择 GitHub 加速代理..."
            />
            <input 
              v-if="form.githubProxy === 'custom'"
              v-model="customProxyInput"
              type="text"
              placeholder="请输入代理前缀，例如：https://ghp.ci/"
              class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
            <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
              <div class="flex items-center space-x-1 font-medium text-slate-700">
                <span>🔗 最终更新与资源下载地址：</span>
              </div>
              <div class="font-mono text-blue-600 break-all bg-white p-1.5 rounded border border-slate-200">
                {{ getFinalPreviewUrl() }}
              </div>
            </div>
          </div>
        </div>

        <!-- Software Version & Online Update -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border-t border-slate-100 pt-4">
          <div>
            <label class="font-medium text-slate-800 block">软件版本与更新</label>
            <span class="text-slate-400 text-[11px] block mt-0.5">支持基于 GitHub 的在线自动检查与在线升级</span>
          </div>
          <div class="md:col-span-2 flex items-center space-x-3">
            <span class="bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold">
              v{{ appVersion }}
            </span>
            <button 
              type="button" 
              @click="$emit('check-updates')" 
              class="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg font-medium transition text-xs flex items-center space-x-1.5 shadow-sm"
            >
              <span>🚀</span>
              <span>检查在线更新</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import CustomSelect from './CustomSelect.vue'

const props = defineProps({
  settings: Object
})

const emit = defineEmits(['save', 'toast', 'check-updates'])
const appVersion = ref('2.0.5')
const customProxyInput = ref('')

onMounted(async () => {
  if (window.electronAPI && window.electronAPI.getAppVersion) {
    const v = await window.electronAPI.getAppVersion()
    if (v) appVersion.value = v
  }
})

const fontOptions = [
  { label: '微软雅黑 (Microsoft YaHei)', value: "'Microsoft YaHei', sans-serif" },
  { label: '苹方 (PingFang SC)', value: "'PingFang SC', sans-serif" },
  { label: '宋体 (SimSun)', value: 'SimSun, serif' },
  { label: '黑体 (SimHei)', value: 'SimHei, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Inter', value: 'Inter, sans-serif' }
]

const proxyOptions = [
  { label: '直连 GitHub (官方默认地址)', value: '' },
  { label: 'https://ghp.ci/ (推荐镜像)', value: 'https://ghp.ci/' },
  { label: 'https://gh-proxy.com/', value: 'https://gh-proxy.com/' },
  { label: 'https://ghproxy.net/', value: 'https://ghproxy.net/' },
  { label: 'https://ghproxy.homeboyc.cn/', value: 'https://ghproxy.homeboyc.cn/' },
  { label: 'https://github.ur1.fun/', value: 'https://github.ur1.fun/' },
  { label: 'https://github.moeyy.xyz/', value: 'https://github.moeyy.xyz/' },
  { label: '自定义代理前缀...', value: 'custom' }
]

const form = ref({
  fontFamily: "'Microsoft YaHei', sans-serif",
  fontSize: 16,
  browserType: 'internal',
  devtoolsDockMode: 'right',
  storageDir: '',
  downloadDir: '',
  newTabDefaultUrl: 'https://www.baidu.com',
  autoRestoreTabs: true,
  githubProxy: 'https://ghp.ci/'
})

watch(() => props.settings, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
    if (newVal.githubProxy && !proxyOptions.some(o => o.value === newVal.githubProxy)) {
      customProxyInput.value = newVal.githubProxy
      form.value.githubProxy = 'custom'
    }
  }
}, { immediate: true })

const getFinalPreviewUrl = () => {
  let prefix = form.value.githubProxy || ''
  if (prefix === 'custom') {
    prefix = customProxyInput.value || ''
  }
  const fixedRepo = 'https://github.com/Neptune-520/Fingerprint-Browser/releases/latest/download/latest.yml'
  if (!prefix) return fixedRepo
  return (prefix.endsWith('/') ? prefix : prefix + '/') + fixedRepo
}

const browseDirectory = async (field) => {
  if (window.electronAPI && window.electronAPI.selectDirectory) {
    const selected = await window.electronAPI.selectDirectory(form.value[field])
    if (selected) {
      form.value[field] = selected
    }
  }
}

const handleSave = () => {
  const saveForm = { ...form.value }
  if (saveForm.githubProxy === 'custom') {
    let p = customProxyInput.value.trim()
    if (p && !p.endsWith('/')) p += '/'
    saveForm.githubProxy = p
  }
  emit('save', saveForm)
}
</script>
