<template>
  <transition
    enter-active-class="transition duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
    enter-from-class="opacity-0 -translate-y-8 scale-90"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      class="fixed top-8 left-1/2 -translate-x-1/2 z-[2147483647] pointer-events-none"
    >
      <div
        class="pointer-events-auto flex items-center gap-4 px-6 py-3.5 rounded-[24px] shadow-2xl backdrop-blur-xl border synapse-toast-panel"
        :class="[
          type === 'success' ? 'is-success' : 'is-error'
        ]"
      >
        <div class="flex-shrink-0 synapse-toast-icon">
          <div v-if="type === 'success'" class="i-carbon-checkmark-filled text-xl text-emerald-500"></div>
          <div v-else class="i-carbon-warning-filled text-xl text-rose-500"></div>
        </div>
        
        <span class="text-sm font-bold tracking-tight synapse-toast-message">{{ message }}</span>
        
        <div class="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
        
        <button 
          @click="$emit('close')" 
          class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
        >
          <div class="i-carbon-close text-slate-400"></div>
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  message: string
  type?: 'success' | 'error'
}>(), {
  type: 'success'
})
defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
.synapse-toast-panel {
  min-width: 240px;
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.12),
    0 0 0 1px rgba(0, 0, 0, 0.02);
}

.synapse-toast-message {
  color: #1e293b; /* Slate-800 */
}

/* 适配暗色模式 - 即使宿主环境没有 .dark */
:where(.dark, [data-theme='dark']) .synapse-toast-panel {
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05);
}

:where(.dark, [data-theme='dark']) .synapse-toast-message {
  color: #f8fafc;
}

.is-success {
  border-bottom: 2px solid rgba(16, 185, 129, 0.3);
}

.is-error {
  border-bottom: 2px solid rgba(244, 63, 94, 0.3);
}

/* 强制图标显色 */
:deep([class^="i-"]) {
  display: block;
}
</style>
