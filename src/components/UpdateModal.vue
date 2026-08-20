<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 select-none animate-fade-in">
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
        <div class="flex items-center space-x-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-lg">
            🚀
          </div>
          <div>
            <h3 class="font-bold text-sm leading-tight">软件在线更新</h3>
            <p class="text-[11px] text-slate-300">Fingerprint Browser Update</p>
          </div>
        </div>
        <button 
          v-if="status !== 'downloading'"
          @click="$emit('close')" 
          class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xs"
        >
          ✕
        </button>
      </div>

      <!-- Content Body -->
      <div class="p-6 space-y-4">
        <!-- Checking State -->
        <div v-if="status === 'checking'" class="py-8 flex flex-col items-center justify-center space-y-3">
          <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-medium text-slate-600">正在与 GitHub 服务器通信，检查版本...</p>
        </div>

        <!-- Latest Version Already State -->
        <div v-else-if="status === 'not-available'" class="py-6 flex flex-col items-center justify-center space-y-3 text-center">
          <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <div>
            <h4 class="font-bold text-slate-800 text-sm">当前已是最新版本</h4>
            <p class="text-xs text-slate-500 mt-1">版本号: <span class="font-mono text-slate-700 font-semibold">v{{ currentVersion }}</span></p>
          </div>
        </div>

        <!-- Update Available State -->
        <div v-else-if="status === 'available'" class="space-y-3">
          <div class="flex items-center justify-between bg-blue-50/80 border border-blue-100 rounded-xl p-3 text-xs">
            <div>
              <span class="text-slate-500">当前版本: </span>
              <span class="font-mono font-medium text-slate-700">v{{ currentVersion }}</span>
            </div>
            <div class="flex items-center space-x-1.5 font-bold text-blue-600">
              <span>发现新版本:</span>
              <span class="font-mono bg-blue-600 text-white px-2 py-0.5 rounded-full text-[11px]">v{{ updateInfo.version }}</span>
            </div>
          </div>

          <!-- Release Notes -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 max-h-40 overflow-y-auto">
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">更新说明 (Release Notes):</p>
            <div class="text-xs text-slate-700 space-y-1 font-mono whitespace-pre-wrap leading-relaxed">
              {{ updateInfo.releaseNotes || '1. 性能提升与稳定性优化\n2. 浏览器指纹防护增强\n3. 修复已知问题' }}
            </div>
          </div>

          <!-- Safety Guarantee Badge -->
          <div class="flex items-center space-x-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <span class="text-base">🛡️</span>
            <span>更新前系统将<b>自动建立快照备份</b>，保障环境与账号数据零风险。</span>
          </div>
        </div>

        <!-- Downloading State -->
        <div v-else-if="status === 'downloading'" class="space-y-4 py-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-slate-800">正在从 GitHub 下载更新包...</span>
            <span class="font-mono font-bold text-blue-600 text-sm">{{ downloadProgress.percent }}%</span>
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200 p-0.5">
            <div 
              class="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-300 shadow-sm"
              :style="{ width: `${downloadProgress.percent}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>已下载: {{ formatBytes(downloadProgress.transferred) }} / {{ formatBytes(downloadProgress.total) }}</span>
            <span>速度: {{ formatBytes(downloadProgress.bytesPerSecond) }}/s</span>
          </div>

          <div class="flex items-center space-x-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
            <span>⏳</span>
            <span>下载完成前请勿关闭程序...</span>
          </div>
        </div>

        <!-- Downloaded & Ready to Install State -->
        <div v-else-if="status === 'downloaded'" class="space-y-3 py-2 text-center">
          <div class="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto">
            🎁
          </div>
          <div>
            <h4 class="font-bold text-slate-800 text-sm">更新包已下载完成！</h4>
            <p class="text-xs text-slate-500 mt-1">新版本 <span class="font-mono font-bold text-slate-800">v{{ updateInfo.version }}</span> 已准备就绪</p>
          </div>

          <div class="flex items-center justify-center space-x-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-left">
            <span class="text-base">🔐</span>
            <span>数据保护备份已成功创建，重启后将自动完成替换。</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="status === 'error'" class="py-4 space-y-3 text-center">
          <div class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold mx-auto">
            ⚠️
          </div>
          <div>
            <h4 class="font-bold text-slate-800 text-sm">检查 / 下载在线更新未成功</h4>
            <div class="text-xs text-red-600 mt-2 font-sans bg-red-50 p-3 rounded-xl border border-red-100 text-left leading-relaxed">
              {{ cleanErrorMessage(errorMessage) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Action Buttons -->
      <div class="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
        <button 
          v-if="status === 'available'"
          @click="$emit('close')"
          class="px-4 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition text-xs font-medium"
        >
          稍后提醒
        </button>

        <button 
          v-if="status === 'available'"
          @click="$emit('start-download')"
          class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-xs font-medium shadow-sm flex items-center space-x-1.5"
        >
          <span>⬇️ 立即下载更新</span>
        </button>

        <button 
          v-if="status === 'downloaded'"
          @click="$emit('install-now')"
          class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition text-xs font-bold shadow-md flex items-center space-x-1.5 animate-bounce"
        >
          <span>🚀 退出并立即重启升级</span>
        </button>

        <button 
          v-if="status === 'not-available' || status === 'error'"
          @click="$emit('close')"
          class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition text-xs font-medium"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: Boolean,
  status: String, // 'checking', 'available', 'not-available', 'downloading', 'downloaded', 'error'
  currentVersion: String,
  updateInfo: {
    type: Object,
    default: () => ({ version: '', releaseNotes: '' })
  },
  downloadProgress: {
    type: Object,
    default: () => ({ percent: 0, bytesPerSecond: 0, total: 0, transferred: 0 })
  },
  errorMessage: String
})

defineEmits(['close', 'start-download', 'install-now'])

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const cleanErrorMessage = (msg) => {
  if (!msg) return '无法连接至 GitHub Releases 服务器，请检查网络设置。'
  if (msg.includes('404') || msg.includes('latest.yml')) {
    return '未找到线上 Release 版本（HTTP 404）。请确认已在 GitHub 创建对应仓库，并将编译好的安装包（FingerprintBrowser-2.0.1-x64.exe）和 latest.yml 配置文件上传发布至 GitHub Releases。'
  }
  if (msg.includes('net::ERR') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT')) {
    return '网络连接超时或无法域名解析，请检查网络代理或连接环境。'
  }
  return msg
}
</script>
