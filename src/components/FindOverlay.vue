<template>
  <div 
    v-if="visible" 
    class="absolute right-3 top-1 h-8 bg-white border border-slate-300 rounded-lg shadow-lg z-50 px-2 flex items-center space-x-2 text-xs animate-fade-in"
  >
    <input 
      ref="inputRef"
      v-model="searchText"
      @keydown.enter="findNext"
      @keydown.esc="handleClose"
      type="text" 
      placeholder="在页面中查找关键词..." 
      class="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white w-48 font-mono"
    />

    <span class="text-slate-500 font-mono text-[11px] min-w-[36px] text-center">
      {{ findResult.current }}/{{ findResult.total }}
    </span>

    <button @click="findPrev" class="p-1 hover:bg-slate-100 rounded text-slate-600 font-bold" title="上一项 (Shift+Enter)">▲</button>
    <button @click="findNext" class="p-1 hover:bg-slate-100 rounded text-slate-600 font-bold" title="下一项 (Enter)">▼</button>
    <button @click="handleClose" class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700" title="关闭 (Esc)">
      <AppIcon name="close" className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  visible: Boolean,
  findResult: {
    type: Object,
    default: () => ({ current: 0, total: 0 })
  }
})

const emit = defineEmits(['close', 'find'])

const searchText = ref('')
const inputRef = ref(null)

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      if (inputRef.value) {
        inputRef.value.focus()
        inputRef.value.select()
      }
    })
  }
})

watch(searchText, (val) => {
  emit('find', val, true, false)
})

const findNext = () => {
  if (!searchText.value) return
  emit('find', searchText.value, true, true)
}

const findPrev = () => {
  if (!searchText.value) return
  emit('find', searchText.value, false, true)
}

const handleClose = () => {
  searchText.value = ''
  emit('find', '', true, false)
  emit('close')
}
</script>
