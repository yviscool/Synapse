<template>
  <div class="apm-overlay" @click.self="close">
    <div class="apm-panel">
      <div class="apm-header">
        <span>Prompt 面板（MVP）</span>
        <button class="apm-btn" @click="close">✕</button>
      </div>
      <input
        ref="inputRef"
        class="apm-input"
        type="text"
        placeholder="搜索或输入，回车插入（示例）"
        @keydown.enter="insert"
      />
      <div class="apm-tip">按 Esc 关闭，/ 可再次打开（可在设置关闭）</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const emit = defineEmits<{ close: [] }>()
const inputRef = ref<HTMLInputElement | null>(null)

function close() { emit('close') }
function insert() {
  const v = inputRef.value?.value?.trim()
  if (!v) return
  chrome.runtime.sendMessage({ type: 'APM/INSERT_PROMPT', data: v })
  emit('close')
}
onMounted(() => inputRef.value?.focus())
</script>

<style scoped>
.apm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.15); display: flex; align-items: center; justify-content: center; z-index: 2147483647; }
.apm-panel { width: min(720px, 92vw); background: #fff; color: #111; border-radius: 12px; box-shadow: 0 8px 28px rgba(0,0,0,.18); padding: 12px; }
.apm-header { display: flex; align-items: center; justify-content: space-between; font-weight: 600; margin-bottom: 8px; }
.apm-btn { border: none; background: transparent; cursor: pointer; font-size: 16px; }
.apm-input { width: 100%; font-size: 14px; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; }
.apm-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.apm-tip { margin-top: 8px; font-size: 12px; color: #6b7280; }
:host-context(html.dark) .apm-panel { background: #111827; color: #e5e7eb; }
:host-context(html.dark) .apm-input { background: #0b1220; color: #e5e7eb; border-color: #374151; }
</style>