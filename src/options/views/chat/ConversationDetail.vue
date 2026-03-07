<template>
  <div class="flex flex-col h-full">
    <!-- 头部工具栏 -->
    <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          :style="{ backgroundColor: getPlatformConfig(conversation.platform).color + '15' }"
        >
          <img
            v-if="getIconUrl(conversation.platform)"
            :src="getIconUrl(conversation.platform) || ''"
            alt=""
            class="w-6 h-6 rounded object-cover"
          />
          <div
            v-else
            :class="getPlatformConfig(conversation.platform).icon"
            class="text-xl"
            :style="{ color: getPlatformConfig(conversation.platform).color }"
          ></div>
        </div>
        <div class="min-w-0 flex-1">
          <!-- 标题：展示 / 编辑 -->
          <div v-if="!isEditingTitle" class="flex items-center gap-2 group">
            <h2 class="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{{ conversation.title }}</h2>
            <button
              @click="startEditTitle"
              class="p-1 rounded text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
              :title="t('chat.detail.editTitle')"
            >
              <div class="i-carbon-edit text-sm"></div>
            </button>
          </div>
          <div v-else class="flex items-center gap-2">
            <input
              ref="titleInputRef"
              v-model="editTitleValue"
              @keydown.enter="saveTitle"
              @keydown.escape="cancelEditTitle"
              @blur="saveTitle"
              class="font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-blue-300 rounded-lg px-2 py-1 w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>
          <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span>{{ getPlatformLocalizedName(conversation.platform, t) }}</span>
            <span>·</span>
            <span>{{ t('chat.list.messages', { count: conversation.messageCount }) }}</span>
          </div>

          <!-- 标签/备注编辑（头部） -->
          <div class="mt-2 space-y-2">
            <div class="flex items-start gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1">{{ t('chat.detail.tags') }}:</span>
              <div class="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                <span
                  v-for="tagId in conversation.tagIds"
                  :key="tagId"
                  class="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20"
                >
                  {{ getTagName(tagId) }}
                  <button
                    @click="removeTagById(tagId)"
                    class="text-blue-500 hover:text-red-500 rounded-full transition-colors"
                    :title="t('common.delete')"
                  >
                    <div class="i-carbon-close text-[10px]"></div>
                  </button>
                </span>
                <button
                  v-if="!showTagInput"
                  @click="showTagInput = true"
                  class="px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                >
                  + {{ t('common.add') }}
                </button>
                <div v-else class="flex items-center gap-1.5">
                  <input
                    v-model="newTag"
                    @keydown.enter="addTag"
                    @keydown.escape="showTagInput = false"
                    type="text"
                    :placeholder="t('chat.detail.tagsPlaceholder')"
                    class="w-44 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    ref="tagInputRef"
                  />
                  <button
                    @click="addTag"
                    class="px-2 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {{ t('common.add') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-start gap-2">
              <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 mt-1.5">{{ t('chat.detail.note') }}:</span>
              <textarea
                v-model="localNote"
                @blur="saveNote"
                :placeholder="t('chat.detail.notePlaceholder')"
                rows="2"
                class="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <button
          @click="$emit('toggle-star', conversation)"
          class="p-2 rounded-lg transition-colors"
          :class="[
            conversation.starred
              ? 'text-amber-500 bg-amber-50'
              : 'text-gray-400 dark:text-gray-500 hover:text-amber-500 hover:bg-amber-50'
          ]"
          :title="conversation.starred ? t('chat.actions.unstar') : t('chat.actions.star')"
        >
          <div :class="conversation.starred ? 'i-carbon-star-filled' : 'i-carbon-star'" class="text-lg"></div>
        </button>
        <button
          @click="$emit('export', conversation)"
          class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          :title="t('chat.actions.export')"
        >
          <div class="i-carbon-download text-lg"></div>
        </button>
        <button
          v-if="conversation.link"
          @click="openLink"
          class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-green-500 hover:bg-green-50 transition-colors"
          :title="t('chat.detail.openLink')"
        >
          <div class="i-carbon-launch text-lg"></div>
        </button>
        <button
          @click="$emit('delete', conversation.id)"
          class="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
          :title="t('chat.actions.delete')"
        >
          <div class="i-carbon-trash-can text-lg"></div>
        </button>
      </div>
    </div>

    <!-- 角色筛选标签 -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
      <button
        @click="roleFilter = 'all'"
        class="px-3 py-1 text-xs rounded-full transition-colors"
        :class="roleFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
      >
        {{ t('chat.sidebar.all') }}
      </button>
      <button
        @click="roleFilter = 'user'"
        class="px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1"
        :class="roleFilter === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
      >
        <div class="i-carbon-user text-xs"></div>
        {{ t('chat.detail.user') }}
      </button>
      <button
        @click="roleFilter = 'assistant'"
        class="px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1"
        :class="roleFilter === 'assistant' ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'"
      >
        <div class="i-carbon-bot text-xs"></div>
        AI
      </button>
    </div>

    <!-- 消息列表 -->
    <div ref="messageListRef" @click="handleMarkdownContentClick" class="relative flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-white to-blue-50/40 dark:from-slate-950 dark:to-black">
      <template v-for="(item, index) in visibleMessages" :key="item.message.id || item.originalIndex">
        <!-- 轮次分隔线 -->
        <hr
          v-if="item.message.role === 'user' && index > 0"
          class="my-4 border-gray-200 dark:border-gray-700/60"
        />

        <!-- 消息项 -->
        <div
          :id="'msg-' + item.originalIndex"
          :data-original-index="item.originalIndex"
          :data-role="item.message.role"
          class="message-item group"
          :class="item.message.role === 'user' ? 'flex-row-reverse' : ''"
        >
          <!-- 头像 -->
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            :class="[
              item.message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                : 'bg-gradient-to-br from-emerald-500 to-teal-500'
            ]"
          >
            <div
              :class="item.message.role === 'user' ? 'i-carbon-user' : 'i-carbon-bot'"
              class="text-white text-lg"
            ></div>
          </div>

          <!-- 消息内容 -->
          <div class="message-content flex-1 min-w-0">
            <div
              class="message-bubble relative"
              :class="[
                item.message.role === 'user'
                  ? 'user-bubble rounded-tr-md ml-auto'
                  : 'bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700/70 text-gray-800 dark:text-gray-200 rounded-tl-md'
              ]"
            >
              <!-- 操作按钮（悬停显示） -->
              <div
                class="message-actions absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-md px-1 py-0.5 z-10"
              >
                <button
                  @click="handleEditMessage(item.originalIndex)"
                  class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-blue-500 rounded"
                  :title="t('chat.detail.edit')"
                >
                  <div class="i-carbon-edit text-sm"></div>
                </button>
                <button
                  @click="handleCopyMessage(item.originalIndex)"
                  class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-green-500 rounded"
                  :title="t('chat.detail.copy')"
                >
                  <div class="i-carbon-copy text-sm"></div>
                </button>
                <button
                  @click="handleDeleteMessage(item.originalIndex)"
                  class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 rounded"
                  :title="t('chat.detail.deleteMessage')"
                >
                  <div class="i-carbon-trash-can text-sm"></div>
                </button>
              </div>

              <!-- Thinking 卡片（AI 气泡内部顶部） -->
              <div
                v-if="item.message.role === 'assistant' && item.message.thinking"
                class="thinking-card mb-3 rounded-lg border border-slate-200 dark:border-slate-700/70 bg-slate-50/80 dark:bg-slate-900/55 overflow-hidden -mx-1"
              >
                <div
                  @click="toggleThinking(item.originalIndex)"
                  class="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/35 transition-colors"
                >
                  <div class="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
                    <span>💭</span>
                    <span class="font-medium">{{ t('chat.detail.thinkingLabel') }}</span>
                    <span v-if="getThinkingDurationSeconds(item.message) !== null" class="text-slate-400 dark:text-slate-400">
                      ({{ t('chat.detail.thinkingTime', { seconds: getThinkingDurationSeconds(item.message) }) }})
                    </span>
                  </div>
                  <div
                    class="i-carbon-chevron-down text-slate-400 dark:text-slate-400 text-xs transition-transform duration-200"
                    :class="{ 'rotate-180': thinkingExpanded.has(item.originalIndex) }"
                  ></div>
                </div>
                <div
                  class="thinking-content overflow-hidden transition-all duration-300 ease-in-out"
                  :style="{ maxHeight: thinkingExpanded.has(item.originalIndex) ? '500px' : '0px' }"
                >
                  <div
                    class="px-3 pb-2 text-xs text-slate-700 dark:text-slate-200 leading-relaxed prose prose-xs dark:prose-invert prose-headings:text-slate-900 dark:prose-headings:text-slate-100 max-w-none"
                    v-html="renderMarkdown(item.message.thinking)"
                  ></div>
                </div>
              </div>

              <!-- 编辑标记 -->
              <div v-if="item.message.isEdited" class="text-xs opacity-50 mb-1 flex items-center gap-1">
                <div class="i-carbon-edit text-xs"></div>
                {{ t('chat.detail.edited') }}
              </div>

              <!-- 消息文本 - Markdown 渲染 -->
              <div
                v-if="editingIndex !== item.originalIndex"
                class="message-text prose prose-sm dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 max-w-none text-gray-800 dark:text-gray-100"
                v-html="renderMarkdown(getMessageContent(item.message))"
              ></div>

              <!-- 图片附件（外链打开） -->
              <div
                v-if="editingIndex !== item.originalIndex && item.message.attachments?.length"
                class="mt-2 flex flex-wrap gap-2"
              >
                <a
                  v-for="att in item.message.attachments.filter(a => a.type === 'image')"
                  :key="att.id"
                  :href="att.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div class="i-carbon-image text-sm"></div>
                  {{ att.name || t('chat.detail.imageAttachment') }}
                  <div class="i-carbon-launch text-xs text-gray-400 dark:text-gray-500"></div>
                </a>
              </div>

              <!-- 编辑模式 -->
              <div v-if="editingIndex === item.originalIndex" class="edit-mode">
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 edit-milkdown-wrapper">
                  <MilkdownEditor
                    v-model="editContent"
                    :placeholder="t('chat.detail.editPlaceholder')"
                  />
                </div>
                <div class="flex justify-end gap-2 mt-2">
                  <button
                    @click="cancelEdit"
                    class="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    {{ t('common.cancel') }}
                  </button>
                  <button
                    @click="saveEdit(item.originalIndex)"
                    class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    {{ t('common.save') }}
                  </button>
                </div>
              </div>

              <!-- 时间戳 -->
              <div
                v-if="item.message.timestamp && editingIndex !== item.originalIndex"
                class="mt-2 text-xs opacity-50"
              >
                {{ formatMessageTime(item.message.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 底部信息栏 -->
    <div class="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
      <!-- 元信息 -->
      <div class="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{{ t('chat.list.collected') }}: {{ formatFullTime(conversation.collectedAt || conversation.createdAt) }}</span>
        <span v-if="conversation.link" class="truncate max-w-[200px]">{{ conversation.link }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener, useMutationObserver, useThrottleFn } from '@vueuse/core'
import { handleMarkdownCodeCopyClick, handleMermaidBlockClick, renderMarkdown, renderMermaidInElement, reRenderMermaidInElement, setMarkdownCodeCopyLabels } from '@/utils/markdown'
import { getPlatformConfig, getPlatformIconUrl, getPlatformLocalizedName } from '@/content/site-configs'
import MilkdownEditor from '@/components/Milkdown.vue'
import { countConversationTurns, type ChatConversation, type ChatMessage, type ChatPlatform } from '@/types/chat'

const { t, locale } = useI18n()

const props = defineProps<{
  conversation: ChatConversation
  tags: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update': [id: string, patch: Partial<ChatConversation>, tagNames?: string[]]
  'delete': [id: string]
  'toggle-star': [conversation: ChatConversation]
  'export': [conversation: ChatConversation]
  'active-index-change': [index: number]
}>()

// 状态
const localNote = ref(props.conversation.note || '')
const showTagInput = ref(false)
const newTag = ref('')
const tagInputRef = ref<HTMLInputElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

// 标题编辑
const isEditingTitle = ref(false)
const editTitleValue = ref('')
const titleInputRef = ref<HTMLInputElement | null>(null)

// Thinking 展开状态
const thinkingExpanded = reactive(new Set<number>())

// 编辑状态
const editingIndex = ref<number | null>(null)
const editContent = ref('')

// 角色筛选
const roleFilter = ref<'all' | 'user' | 'assistant'>('all')

function getIconUrl(platform: ChatPlatform): string | null {
  return getPlatformIconUrl(platform)
}

// 过滤已删除的消息 + 角色筛选（保留原始索引）
const visibleMessages = computed(() => {
  return props.conversation.messages
    .map((m, i) => ({ message: m, originalIndex: i }))
    .filter(({ message: m }) => {
      if (m.isDeleted) return false
      if (roleFilter.value !== 'all' && m.role !== roleFilter.value) return false
      return true
    })
})

// 获取消息内容（兼容新旧格式）
function getMessageContent(message: ChatMessage): string {
  if (typeof message.content === 'string') return message.content
  return message.content.edited || message.content.original
}

function getThinkingDurationSeconds(message: ChatMessage): number | null {
  const rawDuration = message.metadata?.thinkingDuration
  if (typeof rawDuration !== 'number' || Number.isNaN(rawDuration)) {
    return null
  }
  return Math.round(rawDuration / 1000)
}

// 标题编辑
async function startEditTitle() {
  editTitleValue.value = props.conversation.title
  isEditingTitle.value = true
  await nextTick()
  titleInputRef.value?.focus()
  titleInputRef.value?.select()
}

function saveTitle() {
  const newTitle = editTitleValue.value.trim()
  if (newTitle && newTitle !== props.conversation.title) {
    emit('update', props.conversation.id, { title: newTitle })
  }
  isEditingTitle.value = false
}

function cancelEditTitle() {
  isEditingTitle.value = false
}

// Thinking 展开/收起
function toggleThinking(index: number) {
  if (thinkingExpanded.has(index)) {
    thinkingExpanded.delete(index)
  } else {
    thinkingExpanded.add(index)
  }
}

// 滚动到指定消息
function scrollToMessage(index: number) {
  const container = messageListRef.value
  if (!container) return
  const el = container.querySelector<HTMLElement>(`[data-original-index="${index}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 当前激活的消息索引（供父组件读取）
const currentActiveIndex = ref(0)

// 滚动时检测当前可见的 user 消息，同步大纲高亮
function handleMessageScroll() {
  const container = messageListRef.value
  if (!container) return

  const userEls = Array
    .from(container.querySelectorAll<HTMLElement>('.message-item[data-role="user"][data-original-index]'))
  if (userEls.length === 0) return

  let nextActiveIndex = Number(userEls[0].dataset.originalIndex || 0)
  const hasInnerScroll = container.scrollHeight > container.clientHeight + 1

  if (hasInnerScroll) {
    const anchorScrollTop = container.scrollTop + Math.min(container.clientHeight * 0.35, 180)
    for (const el of userEls) {
      const rawIndex = el.dataset.originalIndex
      if (!rawIndex) continue
      const index = Number(rawIndex)
      if (Number.isNaN(index)) continue
      if (el.offsetTop <= anchorScrollTop) {
        nextActiveIndex = index
        continue
      }
      break
    }
  } else {
    const anchorY = Math.min(window.innerHeight * 0.35, 260)
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const el of userEls) {
      const rawIndex = el.dataset.originalIndex
      if (!rawIndex) continue
      const index = Number(rawIndex)
      if (Number.isNaN(index)) continue
      const distance = Math.abs(el.getBoundingClientRect().top - anchorY)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nextActiveIndex = index
      }
    }
  }

  if (nextActiveIndex !== currentActiveIndex.value) {
    currentActiveIndex.value = nextActiveIndex
    emit('active-index-change', nextActiveIndex)
  }
}

const handleMessageScrollThrottled = useThrottleFn(() => {
  handleMessageScroll()
}, 33)

// 暴露方法
defineExpose({ scrollToMessage })

// 监听 conversation 变化
watch(() => props.conversation, (newConv) => {
  localNote.value = newConv.note || ''
  editingIndex.value = null
  isEditingTitle.value = false
  thinkingExpanded.clear()
  roleFilter.value = 'all'
}, { immediate: true })

watch(showTagInput, async (show) => {
  if (show) {
    await nextTick()
    tagInputRef.value?.focus()
  }
})

watch(() => locale.value, () => {
  setMarkdownCodeCopyLabels({
    copy: t('chat.detail.copy'),
    copied: t('chat.detail.copied'),
    mermaidChart: t('chat.detail.mermaidChart'),
    mermaidCode: t('chat.detail.mermaidCode'),
    mermaidCopy: t('chat.detail.mermaidCopy'),
    mermaidDownload: t('chat.detail.mermaidDownload'),
    mermaidFullscreen: t('chat.detail.mermaidFullscreen'),
  })
}, { immediate: true })

watch([() => props.conversation.id, visibleMessages], async () => {
  await nextTick()
  handleMessageScroll()
  await renderMermaidInElement(messageListRef.value)
}, { immediate: true })

async function handleMarkdownContentClick(event: MouseEvent) {
  if (await handleMermaidBlockClick(event)) return
  await handleMarkdownCodeCopyClick(event)
}

useEventListener(messageListRef, 'scroll', handleMessageScrollThrottled, { passive: true })
useEventListener(window, 'scroll', handleMessageScrollThrottled, { capture: true, passive: true })

useMutationObserver(
  document.documentElement,
  () => {
    void reRenderMermaidInElement(messageListRef.value)
  },
  {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  },
)

// 标签相关
function getTagName(tagId: string): string {
  const tag = props.tags.find(t => t.id === tagId)
  return tag?.name || tagId
}

function addTag() {
  const tagName = newTag.value.trim()
  if (!tagName) return
  const currentTagNames = props.conversation.tagIds
    .map(id => getTagName(id))
    .filter(Boolean)
  if (!currentTagNames.includes(tagName)) {
    emit('update', props.conversation.id, {}, [...currentTagNames, tagName])
  }
  newTag.value = ''
  showTagInput.value = false
}

function removeTagById(tagId: string) {
  const nextTagNames = props.conversation.tagIds
    .filter(id => id !== tagId)
    .map(id => getTagName(id))
    .filter(Boolean)
  if (nextTagNames.length === 0) {
    // 显式清空 tagIds，避免 saveConversation 回退到旧 tagIds 导致“最后一个标签删不掉”
    emit('update', props.conversation.id, { tagIds: [] }, [])
    return
  }
  emit('update', props.conversation.id, {}, nextTagNames)
}

function saveNote() {
  if (localNote.value !== props.conversation.note) {
    emit('update', props.conversation.id, { note: localNote.value })
  }
}

function openLink() {
  if (props.conversation.link) {
    window.open(props.conversation.link, '_blank')
  }
}

// 消息操作（index 为原始 messages 数组索引）
async function handleEditMessage(index: number) {
  const message = props.conversation.messages[index]
  editingIndex.value = index
  editContent.value = getMessageContent(message)
}

function cancelEdit() {
  editingIndex.value = null
  editContent.value = ''
}

function saveEdit(index: number) {
  const updatedMessages = [...props.conversation.messages]
  const updatedMessage = { ...updatedMessages[index] }

  if (typeof updatedMessage.content === 'string') {
    updatedMessage.content = {
      original: updatedMessage.content,
      edited: editContent.value,
      format: 'text',
    }
  } else {
    updatedMessage.content = { ...updatedMessage.content, edited: editContent.value }
  }

  updatedMessage.isEdited = true
  updatedMessage.editedAt = Date.now()
  updatedMessages[index] = updatedMessage

  emit('update', props.conversation.id, { messages: updatedMessages })
  editingIndex.value = null
  editContent.value = ''
}

async function handleCopyMessage(index: number) {
  const message = props.conversation.messages[index]
  const content = getMessageContent(message)
  try {
    await navigator.clipboard.writeText(content)
  } catch {
    // fallback
  }
}

function handleDeleteMessage(index: number) {
  const updatedMessages = [...props.conversation.messages]
  updatedMessages[index] = { ...updatedMessages[index], isDeleted: true }

  emit('update', props.conversation.id, {
    messages: updatedMessages,
    messageCount: countConversationTurns(updatedMessages),
  })
}

// 格式化时间
function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
}

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(locale.value, {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
}

.message-content {
  max-width: 85%;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.user-bubble {
  background-color: #edf3ff;
  color: #1e293b;
  border: 1px solid rgba(100, 116, 139, 0.16);
}

:global(:is(.dark, [data-theme='dark']) .user-bubble) {
  background-color: rgba(59, 130, 246, 0.2) !important;
  border: 1px solid rgba(148, 163, 184, 0.28) !important;
  color: #dbeafe !important;
}

/* Thinking 卡片 */
.thinking-content {
  will-change: max-height;
}

/* Markdown 样式（消息正文 + thinking 卡片共用） */
.message-text :deep(pre),
.thinking-content :deep(pre) {
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
  background: transparent !important;
  padding: 0 !important;
}

.message-text :deep(code),
.thinking-content :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.92em;
}

.message-text :deep(code::before),
.message-text :deep(code::after),
.thinking-content :deep(code::before),
.thinking-content :deep(code::after) {
  content: none !important;
}

:global(:is(.dark, [data-theme='dark']) .message-text code),
:global(:is(.dark, [data-theme='dark']) .thinking-content code) {
  background: rgba(255, 255, 255, 0.14) !important;
}

.message-text :deep(pre code),
.thinking-content :deep(pre code) {
  background: transparent !important;
  padding: 0;
}

.message-text :deep(pre code.hljs),
.thinking-content :deep(pre code.hljs) {
  padding: 0.9rem 1rem;
}

.message-text :deep(ul),
.message-text :deep(ol),
.thinking-content :deep(ul),
.thinking-content :deep(ol) {
  padding-left: 1.5em;
  margin: 8px 0;
}

.message-text :deep(blockquote),
.thinking-content :deep(blockquote) {
  border-left: 3px solid currentColor;
  padding-left: 12px;
  margin: 8px 0;
  opacity: 0.8;
}

.message-text :deep(a),
.thinking-content :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

:global(:is(.dark, [data-theme='dark']) :is(.message-text, .thinking-content) :is(h1, h2, h3, h4, h5, h6)) {
  color: #f3f4f6 !important;
}

.message-text :deep(table),
.thinking-content :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.message-text :deep(th),
.message-text :deep(td),
.thinking-content :deep(th),
.thinking-content :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px;
  text-align: left;
}

:global(:is(.dark, [data-theme='dark']) :is(.message-text, .thinking-content) pre) {
  border: 1px solid rgba(148, 163, 184, 0.2);
}

:global(:is(.dark, [data-theme='dark']) :is(.message-text, .thinking-content) table) {
  border-color: rgba(255, 255, 255, 0.15) !important;
}

:global(:is(.dark, [data-theme='dark']) :is(.message-text, .thinking-content) :is(th, td)) {
  border-color: rgba(255, 255, 255, 0.15) !important;
}

/* 编辑模式 - Milkdown 编辑器 */
.edit-milkdown-wrapper {
  max-height: 50vh;
}

.edit-milkdown-wrapper :deep(.milkdown-host) {
  height: auto;
  min-height: 0;
}

.edit-milkdown-wrapper :deep(.milkdown-host .milkdown) {
  height: auto;
  max-height: 50vh;
  overflow-y: auto;
  scrollbar-width: thin;
}

.edit-milkdown-wrapper :deep(.milkdown-host .milkdown .ProseMirror) {
  min-height: 80px;
  padding: 12px;
}
</style>
