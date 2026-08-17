<template>
  <div class="relative w-full text-xs select-none" ref="containerRef">
    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggleOpen"
      :disabled="disabled"
      :class="[
        'w-full flex items-center justify-between px-3 py-2 bg-slate-50 border rounded-lg transition text-left focus:outline-none focus:bg-white',
        isOpen ? 'border-blue-500 bg-white ring-2 ring-blue-500/10' : 'border-slate-300 hover:border-slate-400',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
    >
      <span :class="['truncate', selectedLabel ? 'text-slate-800 font-medium' : 'text-slate-400']">
        {{ selectedLabel || placeholder || '请选择...' }}
      </span>
      <AppIcon 
        name="arrow-down" 
        :className="[
          'w-3 h-3 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2',
          isOpen ? 'rotate-180 text-blue-600' : ''
        ]" 
      />
    </button>

    <!-- Floating Options Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-56 overflow-y-auto animate-fade-in text-xs"
    >
      <div
        v-for="opt in normalizedOptions"
        :key="opt.value"
        @click="selectOption(opt.value)"
        :class="[
          'px-3 py-2 flex items-center justify-between cursor-pointer transition',
          opt.value === modelValue
            ? 'bg-blue-50 text-blue-700 font-semibold'
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
        ]"
      >
        <span class="truncate">{{ opt.label }}</span>
        <span v-if="opt.value === modelValue" class="text-blue-600 font-bold ml-2">✓</span>
      </div>

      <div v-if="normalizedOptions.length === 0" class="px-3 py-4 text-center text-slate-400">
        暂无选项
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  modelValue: [String, Number],
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const containerRef = ref(null)

const normalizedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        label: opt.label !== undefined ? opt.label : opt.name || String(opt.value),
        value: opt.value !== undefined ? opt.value : opt.id
      }
    }
    return { label: String(opt), value: opt }
  })
})

const selectedLabel = computed(() => {
  const found = normalizedOptions.value.find((o) => o.value === props.modelValue)
  return found ? found.label : ''
})

const toggleOpen = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectOption = (val) => {
  emit('update:modelValue', val)
  emit('change', val)
  isOpen.value = false
}

const handleClickOutside = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
