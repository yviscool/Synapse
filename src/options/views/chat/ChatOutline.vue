<template>
  <div
    :class="embedded
      ? 'outline-embedded h-full w-full flex flex-col'
      : 'outline-nav fixed right-14 top-1/2 -translate-y-1/2 z-30 w-52 max-h-[80vh] flex flex-col'"
  >
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700/80 overflow-hidden flex flex-col">
      <!-- 标题栏 -->
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800/80 flex items-center gap-2">
        <div class="i-carbon-list-boxes text-sm text-gray-400 dark:text-gray-500"></div>
        <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('chat.outline.title') }}</span>
      </div>

      <!-- 目录列表 -->
      <div class="flex-1 overflow-y-auto overscroll-contain py-1.5">
        <div v-if="userMessages.length === 0" class="px-4 py-6 text-xs text-gray-300 text-center">
          {{ t('chat.outline.empty') }}
        </div>
        <div
          v-for="item in userMessages"
          :key="item.index"
          @click="$emit('jump', item.index)"
          class="outline-item group relative flex items-start gap-2 px-4 py-2 cursor-pointer transition-colors duration-150"
          :class="activeIndex === item.index ? 'is-active' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
        >
          <!-- 左侧激活指示条 -->
          <div
            class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full transition-all duration-200"
            :class="activeIndex === item.index ? 'bg-blue-500' : 'bg-transparent group-hover:bg-gray-200 dark:hover:bg-gray-700'"
          ></div>
          <span class="text-[11px] leading-5 text-gray-300 flex-shrink-0 font-mono select-none">{{ item.seq }}</span>
          <span
            class="text-[13px] leading-5 line-clamp-2 transition-colors duration-150"
            :class="activeIndex === item.index ? 'text-blue-600 font-medium' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:hover:text-gray-200'"
          >{{ item.summary }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChatMessage } from '@/types/chat'

const { t } = useI18n()

const props = defineProps<{
  messages: ChatMessage[]
  activeIndex: number
  embedded?: boolean
}>()

const embedded = computed(() => !!props.embedded)

defineEmits<{
  jump: [index: number]
}>()

function getContent(message: ChatMessage): string {
  if (typeof message.content === 'string') return message.content
  return message.content.edited || message.content.original
}

const userMessages = computed(() => {
  let seq = 0
  return props.messages
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => msg.role === 'user' && !msg.isDeleted)
    .map(({ msg, index }) => ({
      index,
      seq: ++seq,
      summary: getContent(msg).replace(/\n/g, ' ').slice(0, 30) + (getContent(msg).length > 30 ? '...' : ''),
    }))
})
</script>

<style scoped>
.outline-nav {
  font-feature-settings: 'tnum';
}

/* 自定义滚动条 */
.outline-nav ::-webkit-scrollbar {
  width: 3px;
}
.outline-nav ::-webkit-scrollbar-track {
  background: transparent;
}
.outline-nav ::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}
.outline-nav ::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
