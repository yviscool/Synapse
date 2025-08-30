<template>
  <div
    class="fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm"
    :class="{
      'bg-green-500/90 text-white': type === 'success',
      'bg-red-500/90 text-white': type === 'error'
    }"
  >
    <div class="text-lg">
      <div v-if="type === 'success'" class="i-carbon-checkmark-filled"></div>
      <div v-else class="i-carbon-warning-filled"></div>
    </div>
    <span class="font-medium">{{ message }}</span>
    <button @click="$emit('close')" class="p-1 hover:bg-white/20 rounded transition-colors">
      <div class="i-carbon-close"></div>
    </button>
  </div>
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