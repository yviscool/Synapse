<template>
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    @click.self="$emit('close')"
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      @click.stop
    >
      <!-- 头部 -->
      <div class="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
            <div class="i-carbon-download text-white text-xl"></div>
          </div>
          <div>
            <h3 class="font-semibold text-gray-900">{{ t('chat.export.title') }}</h3>
            <p class="text-xs text-gray-500 truncate max-w-[280px]">{{ conversation.title }}</p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
        >
          <div class="i-carbon-close text-lg"></div>
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-5 space-y-5">
        <!-- 格式选择 -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-3">
            {{ t('chat.export.format') }}
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="format in formats"
              :key="format.value"
              @click="selectedFormat = format.value"
              class="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all"
              :class="[
                selectedFormat === format.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              ]"
            >
              <div :class="format.icon" class="text-2xl"></div>
              <span class="text-xs font-medium">{{ format.label }}</span>
            </button>
          </div>
        </div>

        <!-- 选项 -->
        <div class="space-y-3">
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              v-model="includeMetadata"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20"
            />
            <span class="text-sm text-gray-700 group-hover:text-gray-900">
              {{ t('chat.export.options.includeMetadata') }}
            </span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              v-model="includeTimestamps"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20"
            />
            <span class="text-sm text-gray-700 group-hover:text-gray-900">
              {{ t('chat.export.options.includeTimestamps') }}
            </span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer group">
            <input
              v-model="includeThinking"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20"
            />
            <span class="text-sm text-gray-700 group-hover:text-gray-900">
              {{ t('chat.export.options.includeThinking') }}
            </span>
          </label>
        </div>

        <!-- 预览 -->
        <div class="bg-gray-50 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-500">预览</span>
            <button
              @click="copyContent"
              class="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <div class="i-carbon-copy"></div>
              {{ t('chat.export.copy') }}
            </button>
          </div>
          <pre class="text-xs text-gray-600 max-h-32 overflow-auto whitespace-pre-wrap font-mono">{{ previewContent }}</pre>
        </div>
      </div>

      <!-- 底部 -->
      <div class="flex items-center justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50/50">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          @click="handleDownload"
          class="px-5 py-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2"
        >
          <div class="i-carbon-download"></div>
          {{ t('chat.export.download') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUI } from '@/stores/ui'
import { exportConversation, downloadExport } from '@/utils/chatExport'
import type { ChatConversation, ExportFormat } from '@/types/chat'

const { t } = useI18n()
const { showToast } = useUI()

const props = defineProps<{
  conversation: ChatConversation
}>()

const emit = defineEmits<{
  'close': []
}>()

const selectedFormat = ref<ExportFormat>('markdown')
const includeMetadata = ref(true)
const includeTimestamps = ref(true)
const includeThinking = ref(true)

const formats = [
  { value: 'markdown' as const, label: 'Markdown', icon: 'i-carbon-document' },
  { value: 'json' as const, label: 'JSON', icon: 'i-carbon-json' },
  { value: 'txt' as const, label: 'TXT', icon: 'i-carbon-document-blank' },
  { value: 'html' as const, label: 'HTML', icon: 'i-carbon-html' },
]

const exportOptions = computed(() => ({
  format: selectedFormat.value,
  includeMetadata: includeMetadata.value,
  includeTimestamps: includeTimestamps.value,
  includeThinking: includeThinking.value,
}))

const previewContent = computed(() => {
  const content = exportConversation(props.conversation, exportOptions.value)
  return content.slice(0, 500) + (content.length > 500 ? '\n...' : '')
})

async function copyContent() {
  try {
    const content = exportConversation(props.conversation, exportOptions.value)
    await navigator.clipboard.writeText(content)
    showToast(t('chat.toast.copySuccess'), 'success')
  } catch {
    showToast(t('chat.toast.copyFailed'), 'error')
  }
}

function handleDownload() {
  try {
    downloadExport(props.conversation, exportOptions.value)
    showToast(t('chat.toast.exportSuccess'), 'success')
    emit('close')
  } catch {
    showToast(t('chat.toast.exportFailed'), 'error')
  }
}
</script>
