<template>
  <div class="flex flex-col h-full">
    <!-- 搜索和排序 -->
    <div class="p-3 border-b border-gray-100 space-y-3">
      <!-- 搜索框 -->
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <div class="i-carbon-search"></div>
        </div>
        <input
          :value="searchQuery"
          @input="$emit('update:search-query', ($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="t('chat.list.searchPlaceholder')"
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        <button
          v-if="searchQuery"
          @click="$emit('update:search-query', '')"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <div class="i-carbon-close"></div>
        </button>
      </div>

      <!-- 排序和统计 -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500">
          {{ t('chat.sidebar.conversations', { count: total }) }}
        </span>
        <div class="relative" ref="sortMenuRef">
          <button
            @click="showSortMenu = !showSortMenu"
            class="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <span>{{ currentSortText }}</span>
            <div class="i-carbon-chevron-down text-xs" :class="{ 'rotate-180': showSortMenu }"></div>
          </button>
          <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showSortMenu"
              class="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
            >
              <button
                v-for="option in sortOptions"
                :key="option.value"
                @click="handleSortChange(option.value)"
                class="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2"
                :class="[
                  sortBy === option.value
                    ? 'text-blue-600 bg-blue-50 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                ]"
              >
                <div
                  class="i-carbon-checkmark text-xs"
                  :class="sortBy === option.value ? 'opacity-100' : 'opacity-0'"
                ></div>
                {{ option.text }}
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 对话列表 -->
    <div class="flex-1 overflow-y-auto" ref="listRef">
      <!-- 空状态 -->
      <div v-if="conversations.length === 0 && !isLoading" class="p-6 text-center">
        <div class="i-carbon-chat text-4xl text-gray-300 mx-auto mb-3"></div>
        <p class="text-sm text-gray-500">{{ t('chat.list.empty') }}</p>
      </div>

      <!-- 对话卡片 -->
      <div class="p-2 space-y-1">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          @click="$emit('select', conversation)"
          class="group relative p-3 rounded-xl cursor-pointer transition-all duration-200"
          :class="[
            selectedId === conversation.id
              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm ring-1 ring-blue-200/50'
              : 'hover:bg-gray-50'
          ]"
        >
          <!-- 平台图标和标题 -->
          <div class="flex items-start gap-3">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="{ backgroundColor: getPlatformConfig(conversation.platform).color + '15' }"
            >
              <div
                :class="getPlatformConfig(conversation.platform).icon"
                class="text-base"
                :style="{ color: getPlatformConfig(conversation.platform).color }"
              ></div>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 truncate text-sm leading-tight">
                {{ conversation.title }}
              </h4>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs text-gray-400">
                  {{ getPlatformConfig(conversation.platform).name }}
                </span>
                <span class="text-gray-300">·</span>
                <span class="text-xs text-gray-400">
                  {{ t('chat.list.messages', { count: conversation.messageCount }) }}
                </span>
              </div>
            </div>
            <!-- 收藏按钮 -->
            <button
              @click.stop="$emit('toggle-star', conversation)"
              class="p-1 rounded-md transition-all opacity-0 group-hover:opacity-100"
              :class="[
                conversation.starred
                  ? 'text-amber-500 opacity-100'
                  : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
              ]"
            >
              <div :class="conversation.starred ? 'i-carbon-star-filled' : 'i-carbon-star'"></div>
            </button>
          </div>

          <!-- 预览文本 -->
          <p
            v-if="getPreviewText(conversation)"
            class="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed"
          >
            {{ getPreviewText(conversation) }}
          </p>

          <!-- 时间和标签 -->
          <div class="flex items-center justify-between mt-2">
            <span class="text-xs text-gray-400">
              {{ formatTime(conversation.collectedAt || conversation.createdAt) }}
            </span>
            <div v-if="conversation.tagIds.length > 0" class="flex gap-1">
              <span
                v-for="(_, index) in conversation.tagIds.slice(0, 2)"
                :key="index"
                class="w-2 h-2 rounded-full bg-blue-400"
              ></span>
              <span
                v-if="conversation.tagIds.length > 2"
                class="text-xs text-gray-400"
              >
                +{{ conversation.tagIds.length - 2 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div ref="loaderRef" class="p-4 flex justify-center">
        <div v-if="isLoading" class="flex items-center gap-2 text-gray-500 text-sm">
          <div class="i-carbon-circle-dash w-4 h-4 animate-spin"></div>
          <span>{{ t('common.loading') }}</span>
        </div>
        <div v-else-if="!hasMore && conversations.length > 0" class="text-xs text-gray-400">
          {{ t('common.allLoaded') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'
import { getPlatformConfig } from '@/utils/chatPlatform'
import type { ChatConversation } from '@/types/chat'

const { t } = useI18n()

type SortBy = 'updatedAt' | 'createdAt' | 'collectedAt' | 'title' | 'messageCount'

const props = defineProps<{
  conversations: ChatConversation[]
  selectedId: string | null
  searchQuery: string
  sortBy: SortBy
  isLoading: boolean
  hasMore: boolean
  total: number
}>()

const emit = defineEmits<{
  'select': [conversation: ChatConversation]
  'toggle-star': [conversation: ChatConversation]
  'update:search-query': [value: string]
  'update:sort-by': [value: SortBy]
  'load-more': []
}>()

const showSortMenu = ref(false)
const sortMenuRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const loaderRef = ref<HTMLElement | null>(null)

onClickOutside(sortMenuRef, () => {
  showSortMenu.value = false
})

const sortOptions = computed(() => [
  { value: 'updatedAt' as const, text: t('chat.list.sortOptions.updatedAt') },
  { value: 'createdAt' as const, text: t('chat.list.sortOptions.createdAt') },
  { value: 'collectedAt' as const, text: t('chat.list.sortOptions.collectedAt') },
  { value: 'title' as const, text: t('chat.list.sortOptions.title') },
  { value: 'messageCount' as const, text: t('chat.list.sortOptions.messageCount') },
])

const currentSortText = computed(() => {
  return sortOptions.value.find((o) => o.value === props.sortBy)?.text || ''
})

function handleSortChange(value: SortBy) {
  emit('update:sort-by', value)
  showSortMenu.value = false
}

function getPreviewText(conversation: ChatConversation): string {
  const lastMessage = conversation.messages[conversation.messages.length - 1]
  if (!lastMessage) return ''
  const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content.original
  return content.slice(0, 100)
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

// 无限滚动
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && props.hasMore && !props.isLoading) {
        emit('load-more')
      }
    },
    { rootMargin: '100px' }
  )
  if (loaderRef.value) {
    observer.observe(loaderRef.value)
  }
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>
