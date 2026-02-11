<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 搜索和过滤区域 - 与 Prompts.vue 一致 -->
      <div class="mb-8 space-y-6">
        <!-- 居中搜索框 -->
        <div class="flex justify-center">
          <div class="relative w-full max-w-2xl z-20">
            <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg i-carbon-search z-10"></div>
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('chat.list.searchPlaceholder')"
              class="w-full pl-12 pr-40 py-4 text-lg border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
            <button
              v-if="searchQuery"
              @click="searchQuery = ''"
              class="absolute right-32 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <div class="i-carbon-close"></div>
            </button>
            <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center">
              <div class="w-px h-6 bg-gray-200/80 mr-3"></div>
              <!-- 排序下拉 -->
              <div class="relative" ref="sortRef">
                <button
                  @click="showSortMenu = !showSortMenu"
                  class="flex items-center gap-2 text-base text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                  <span>{{ currentSortLabel }}</span>
                  <i class="i-carbon-chevron-down text-sm transition-transform" :class="{ 'rotate-180': showSortMenu }"></i>
                </button>
                <transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <div v-if="showSortMenu" class="absolute z-30 top-full right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200/80">
                    <div class="py-1">
                      <button
                        v-for="opt in sortOptions"
                        :key="opt.value"
                        @click="handleSortChange(opt.value)"
                        class="w-full text-left px-4 py-2 text-sm flex items-center gap-2"
                        :class="[sortBy === opt.value ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100']"
                      >
                        <i class="i-carbon-checkmark text-transparent" :class="{ '!text-blue-600': sortBy === opt.value }"></i>
                        <span>{{ opt.label }}</span>
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>

        <!-- 控制栏 - 平台筛选 + 收藏 + 标签 -->
        <div class="space-y-4">
          <div class="relative z-10 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/60 space-y-4">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <!-- 平台筛选 -->
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <button
                  @click="clearPlatformSelection"
                  :class="[
                    'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                    selectedPlatforms.length === 0
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <div class="i-carbon-chat-bot"></div>
                  <span>{{ t('chat.sidebar.all') }}</span>
                  <span class="ml-1 px-1.5 py-0.5 text-xs rounded" :class="selectedPlatforms.length === 0 ? 'bg-white/20' : 'bg-gray-100'">
                    {{ totalConversations }}
                  </span>
                </button>

                <div class="relative group flex-1 min-w-0">
                  <div class="overflow-hidden" ref="platformViewportRef" @wheel="handlePlatformScroll">
                    <div
                      class="flex items-center gap-2 transition-transform duration-300 ease-in-out"
                      ref="platformContentRef"
                      :style="{ transform: `translateX(-${platformScrollOffset}px)` }"
                    >
                      <button
                        v-for="platform in visiblePlatforms"
                        :key="platform.id"
                        @click="handlePlatformClick(platform.id)"
                        :class="[
                          'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                          selectedPlatforms.includes(platform.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        ]"
                      >
                        <div :class="platform.icon" :style="{ color: selectedPlatforms.includes(platform.id) ? 'white' : platform.color }"></div>
                        <span>{{ platform.name }}</span>
                        <span
                          v-if="getPlatformCount(platform.id)"
                          class="ml-1 px-1.5 py-0.5 text-xs rounded"
                          :class="selectedPlatforms.includes(platform.id) ? 'bg-white/20' : 'bg-gray-100'"
                        >
                          {{ getPlatformCount(platform.id) }}
                        </span>
                      </button>
                    </div>
                  </div>
                  <!-- 左右滚动按钮 -->
                  <button
                    v-if="canScrollPlatformLeft"
                    @click="scrollPlatform('left')"
                    class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div class="i-carbon-chevron-left"></div>
                  </button>
                  <button
                    v-if="canScrollPlatformRight"
                    @click="scrollPlatform('right')"
                    class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div class="i-carbon-chevron-right"></div>
                  </button>
                </div>

                <!-- 收藏筛选 -->
                <button
                  @click="showStarredOnly = !showStarredOnly"
                  :class="[
                    'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                    showStarredOnly
                      ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  ]"
                >
                  <div :class="showStarredOnly ? 'i-carbon-star-filled' : 'i-carbon-star'" class="text-yellow-500"></div>
                  <span>{{ t('chat.sidebar.starred') }}</span>
                </button>
              </div>
            </div>

            <!-- 标签筛选 -->
            <div
              v-if="tags.length > 0"
              class="flex items-center justify-start gap-2 flex-wrap border-t border-gray-200 pt-4"
            >
              <button
                @click="clearTagSelection"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  selectedTagIds.length === 0
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                ]"
              >
                {{ t('tags.all') }}
              </button>
              <button
                v-for="tag in tags"
                :key="tag.id"
                @click="toggleTag(tag.id)"
                :class="[
                  'px-3 py-1 text-sm rounded-md transition-colors',
                  selectedTagIds.includes(tag.id)
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                ]"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 主内容区：左列表 + 右详情 -->
      <div class="flex gap-6 min-h-[calc(100vh-320px)]">
        <!-- 左侧：对话列表 -->
        <aside class="w-[320px] flex-shrink-0 bg-white rounded-xl border border-gray-200/50 flex flex-col overflow-hidden">
          <!-- 列表头部 -->
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span class="text-sm text-gray-500 font-medium">
              {{ t('chat.sidebar.conversations', { count: totalConversations }) }}
            </span>
          </div>

          <!-- 对话列表 -->
          <div class="flex-1 overflow-y-auto p-2" ref="listRef">
            <!-- 空状态 -->
            <div v-if="conversations.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-16 text-center">
              <div class="mb-4">
                <div class="i-carbon-chat text-5xl text-gray-300"></div>
              </div>
              <p class="text-gray-600 mb-1">{{ t('chat.list.empty') }}</p>
              <p class="text-sm text-gray-400">{{ t('chat.list.emptyHint') }}</p>
            </div>

            <!-- 对话项 -->
            <div
              v-for="conv in conversations"
              :key="conv.id"
              @click="selectConversation(conv)"
              class="flex gap-3 p-3 rounded-lg cursor-pointer transition-all mb-1"
              :class="[
                selectedId === conv.id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              ]"
            >
              <!-- 平台标识 -->
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                :style="{ backgroundColor: getPlatformColor(conv.platform) + '15' }"
              >
                <div :class="getPlatformIcon(conv.platform)" class="text-lg" :style="{ color: getPlatformColor(conv.platform) }"></div>
              </div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h4 class="text-sm font-semibold text-gray-900 truncate">{{ conv.title }}</h4>
                  <button
                    @click.stop="handleToggleStar(conv)"
                    class="flex-shrink-0 p-1 rounded transition-colors"
                    :class="conv.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100'"
                  >
                    <div :class="conv.starred ? 'i-carbon-star-filled' : 'i-carbon-star'" class="text-sm"></div>
                  </button>
                </div>
                <div class="flex items-center gap-1.5 text-xs text-gray-400 mb-1.5">
                  <span>{{ formatPlatformName(conv.platform) }}</span>
                  <span>·</span>
                  <span>{{ conv.messageCount }}条</span>
                  <span>·</span>
                  <span>{{ formatRelativeTime(conv.collectedAt || conv.createdAt) }}</span>
                </div>
                <p class="text-xs text-gray-500 line-clamp-2">{{ getPreviewText(conv) }}</p>
              </div>
            </div>

            <!-- 加载更多 -->
            <div ref="loaderRef" class="py-4 flex justify-center">
              <div v-if="isLoading" class="flex items-center gap-2 text-gray-500">
                <div class="i-carbon-circle-dash w-5 h-5 animate-spin"></div>
              </div>
              <span v-else-if="!hasMore && conversations.length > 0" class="text-xs text-gray-400">
                --- {{ t('common.allLoaded') }} ---
              </span>
            </div>
          </div>
        </aside>

        <!-- 右侧：对话详情 -->
        <section class="flex-1 min-w-0 bg-white rounded-xl border border-gray-200/50 overflow-hidden flex flex-col">
          <ConversationDetail
            v-if="selectedConversation"
            ref="detailRef"
            :conversation="selectedConversation"
            :tags="tags"
            @update="handleUpdateConversation"
            @delete="handleDeleteConversation"
            @toggle-star="handleToggleStar"
            @export="handleExport"
          />
          <EmptyDetail v-else />
        </section>
      </div>
    </main>

    <!-- 语雀风格大纲导航 - 固定在视口右侧 -->
    <transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-4"
    >
      <ChatOutline
        v-if="selectedConversation && showOutline"
        :messages="selectedConversation.messages"
        :active-index="activeMessageIndex"
        @jump="handleOutlineJump"
      />
    </transition>

    <!-- 大纲切换按钮 - 固定右侧 -->
    <button
      v-if="selectedConversation"
      @click="showOutline = !showOutline"
      class="fixed right-4 top-1/2 -translate-y-1/2 z-40 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:shadow-lg transition-all"
      :class="{ '!text-blue-500 !border-blue-300 !bg-blue-50': showOutline }"
      :title="t('chat.outline.title')"
    >
      <div class="i-carbon-list-boxes text-sm"></div>
    </button>

    <!-- 导出模态框 -->
    <ExportModal
      v-if="showExportModal && exportingConversation"
      :conversation="exportingConversation"
      @close="showExportModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'
import { useUI } from '@/stores/ui'
import { db } from '@/stores/db'
import { chatRepository } from '@/stores/chatRepository'
import { useChatQuery } from '@/options/composables/useChatQuery'
import {
  getAllPlatforms,
  getPlatformIcon,
  getPlatformColor,
  formatPlatformName,
} from '@/utils/chatPlatform'
import type { ChatConversation, ChatPlatform, PlatformConfig } from '@/types/chat'

// 开发环境加载调试工具
if (import.meta.env.DEV) {
  import('@/utils/chatDevTools')
}

// 异步加载子组件
const ConversationDetail = defineAsyncComponent(() => import('./chat/ConversationDetail.vue'))
const EmptyDetail = defineAsyncComponent(() => import('./chat/EmptyDetail.vue'))
const ExportModal = defineAsyncComponent(() => import('./chat/ExportModal.vue'))
const ChatOutline = defineAsyncComponent(() => import('./chat/ChatOutline.vue'))

const { t } = useI18n()
const { showToast, askConfirm } = useUI()

// Query composable
const {
  conversations,
  tags,
  platformCounts,
  searchQuery,
  selectedPlatforms,
  selectedTagIds,
  showStarredOnly,
  sortBy,
  totalConversations,
  isLoading,
  hasMore,
  refreshAll,
  togglePlatform,
  clearPlatformSelection,
  toggleTag,
  clearTagSelection,
  changeSortBy,
  loadMore,
} = useChatQuery({
  onLoadError: () => showToast(t('chat.toast.saveFailed'), 'error'),
})

// Local state
const selectedId = ref<string | null>(null)
const showExportModal = ref(false)
const exportingConversation = ref<ChatConversation | null>(null)
const showSortMenu = ref(false)
const sortRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const loaderRef = ref<HTMLElement | null>(null)
const detailRef = ref<InstanceType<typeof ConversationDetail> | null>(null)
const activeMessageIndex = ref(0)
const showOutline = ref(true)

// Platform scroll state
const platformViewportRef = ref<HTMLElement | null>(null)
const platformContentRef = ref<HTMLElement | null>(null)
const platformScrollOffset = ref(0)
const platformMaxScroll = ref(0)
const canScrollPlatformLeft = computed(() => platformScrollOffset.value > 0)
const canScrollPlatformRight = computed(() => platformScrollOffset.value < platformMaxScroll.value)

// Close sort menu on outside click
onClickOutside(sortRef, () => {
  showSortMenu.value = false
})

// Computed
const selectedConversation = computed(() => {
  if (!selectedId.value) return null
  return conversations.value.find((c) => c.id === selectedId.value) || null
})

const allPlatforms = computed(() => getAllPlatforms())

const visiblePlatforms = computed(() => {
  // 只显示有数据的平台
  return allPlatforms.value.filter(
    (p) => p.id !== 'other' && (platformCounts.value.get(p.id) || 0) > 0
  )
})

const sortOptions = computed(() => [
  { value: 'updatedAt' as const, label: t('chat.list.sortOptions.updatedAt') },
  { value: 'createdAt' as const, label: t('chat.list.sortOptions.createdAt') },
  { value: 'collectedAt' as const, label: t('chat.list.sortOptions.collectedAt') },
  { value: 'title' as const, label: t('chat.list.sortOptions.title') },
  { value: 'messageCount' as const, label: t('chat.list.sortOptions.messageCount') },
])

const currentSortLabel = computed(() => {
  return sortOptions.value.find((o) => o.value === sortBy.value)?.label || ''
})

// Methods
function getPlatformCount(platform: ChatPlatform): number {
  return platformCounts.value.get(platform) || 0
}

function handlePlatformClick(platform: ChatPlatform) {
  // 单选模式
  if (selectedPlatforms.value.includes(platform)) {
    clearPlatformSelection()
  } else {
    clearPlatformSelection()
    togglePlatform(platform)
  }
}

function handleSortChange(value: typeof sortBy.value) {
  changeSortBy(value)
  showSortMenu.value = false
}

function selectConversation(conv: ChatConversation) {
  selectedId.value = conv.id
}

function getPreviewText(conv: ChatConversation): string {
  const lastMsg = conv.messages[conv.messages.length - 1]
  if (!lastMsg) return ''
  const content = typeof lastMsg.content === 'string' ? lastMsg.content : lastMsg.content.original
  return content.slice(0, 80) + (content.length > 80 ? '...' : '')
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`

  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}

async function handleToggleStar(conv: ChatConversation) {
  const { ok } = await chatRepository.toggleStarred(conv.id)
  if (ok) {
    conv.starred = !conv.starred
    showToast(
      conv.starred ? t('chat.toast.starAdded') : t('chat.toast.starRemoved'),
      'success'
    )
  }
}

async function handleUpdateConversation(
  id: string,
  patch: Partial<ChatConversation>,
  tagNames?: string[]
) {
  if (tagNames !== undefined) {
    const conversation = await chatRepository.getConversationById(id)
    if (conversation) {
      await chatRepository.saveConversation({ ...conversation, ...patch }, tagNames)
    }
  } else {
    await chatRepository.updateConversation(id, patch)
  }
}

async function handleDeleteConversation(id: string) {
  const confirmed = await askConfirm(t('chat.actions.deleteConfirm'), { type: 'danger' })
  if (!confirmed) return

  const { ok } = await chatRepository.deleteConversation(id)
  if (ok) {
    showToast(t('chat.toast.deleteSuccess'), 'success')
    if (selectedId.value === id) {
      selectedId.value = null
    }
  }
}

function handleExport(conv: ChatConversation) {
  exportingConversation.value = conv
  showExportModal.value = true
}

function handleOutlineJump(index: number) {
  activeMessageIndex.value = index
  detailRef.value?.scrollToMessage(index)
}

// Platform scroll methods
function updatePlatformDimensions() {
  if (platformViewportRef.value && platformContentRef.value) {
    const viewportWidth = platformViewportRef.value.offsetWidth
    const contentWidth = platformContentRef.value.scrollWidth
    platformMaxScroll.value = Math.max(0, contentWidth - viewportWidth)
    if (platformScrollOffset.value > platformMaxScroll.value) {
      platformScrollOffset.value = platformMaxScroll.value
    }
  }
}

function scrollPlatform(direction: 'left' | 'right') {
  if (!platformViewportRef.value) return
  const scrollAmount = platformViewportRef.value.offsetWidth * 0.8
  if (direction === 'right') {
    platformScrollOffset.value = Math.min(platformScrollOffset.value + scrollAmount, platformMaxScroll.value)
  } else {
    platformScrollOffset.value = Math.max(platformScrollOffset.value - scrollAmount, 0)
  }
}

function handlePlatformScroll(event: WheelEvent) {
  if (platformMaxScroll.value <= 0) return
  event.preventDefault()
  const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (scrollDelta === 0) return
  platformScrollOffset.value = Math.max(0, Math.min(platformScrollOffset.value + scrollDelta, platformMaxScroll.value))
}

// Watch for platform changes to update scroll dimensions
watch(visiblePlatforms, async () => {
  await nextTick()
  updatePlatformDimensions()
})

// Infinite scroll
let observer: IntersectionObserver | null = null
let platformObserver: ResizeObserver | null = null

onMounted(async () => {
  await db.open()
  await refreshAll()

  // Setup infinite scroll
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
        loadMore()
      }
    },
    { rootMargin: '100px' }
  )

  if (loaderRef.value) {
    observer.observe(loaderRef.value)
  }

  // Setup platform scroll observer
  await nextTick()
  if (platformViewportRef.value) {
    platformObserver = new ResizeObserver(updatePlatformDimensions)
    platformObserver.observe(platformViewportRef.value)
  }
  updatePlatformDimensions()
})

onUnmounted(() => {
  observer?.disconnect()
  platformObserver?.disconnect()
})
</script>

<style scoped>
/* 响应式布局 */
@media (max-width: 1200px) {
  .w-\[320px\] {
    width: 280px;
  }
}

@media (max-width: 900px) {
  .flex.gap-6.min-h-\[calc\(100vh-320px\)\] {
    flex-direction: column;
  }

  .w-\[320px\] {
    width: 100%;
    max-height: 400px;
  }
}
</style>
