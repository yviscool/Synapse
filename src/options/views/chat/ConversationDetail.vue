<template>
  <div class="flex flex-col h-full">
    <!-- 头部工具栏 -->
    <div class="flex items-center justify-between p-4 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center"
          :style="{ backgroundColor: getPlatformColor(conversation.platform) + '15' }"
        >
          <div
            :class="getPlatformIcon(conversation.platform)"
            class="text-xl"
            :style="{ color: getPlatformColor(conversation.platform) }"
          ></div>
        </div>
        <div>
          <h2 class="font-semibold text-gray-900 line-clamp-1">{{ conversation.title }}</h2>
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <span>{{ formatPlatformName(conversation.platform) }}</span>
            <span>·</span>
            <span>{{ t('chat.list.messages', { count: conversation.messageCount }) }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-1">
        <button
          @click="$emit('toggle-star', conversation)"
          class="p-2 rounded-lg transition-colors"
          :class="[
            conversation.starred
              ? 'text-amber-500 bg-amber-50'
              : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
          ]"
          :title="conversation.starred ? t('chat.actions.unstar') : t('chat.actions.star')"
        >
          <div :class="conversation.starred ? 'i-carbon-star-filled' : 'i-carbon-star'" class="text-lg"></div>
        </button>
        <button
          @click="$emit('export', conversation)"
          class="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          :title="t('chat.actions.export')"
        >
          <div class="i-carbon-download text-lg"></div>
        </button>
        <button
          v-if="conversation.link"
          @click="openLink"
          class="p-2 rounded-lg text-gray-400 hover:text-green-500 hover:bg-green-50 transition-colors"
          :title="t('chat.detail.openLink')"
        >
          <div class="i-carbon-launch text-lg"></div>
        </button>
        <button
          @click="$emit('delete', conversation.id)"
          class="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          :title="t('chat.actions.delete')"
        >
          <div class="i-carbon-trash-can text-lg"></div>
        </button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
      <div
        v-for="(message, index) in visibleMessages"
        :key="message.id || index"
        class="message-item group"
        :class="message.role === 'user' ? 'flex-row-reverse' : ''"
      >
        <!-- 头像 -->
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          :class="[
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500'
          ]"
        >
          <div
            :class="message.role === 'user' ? 'i-carbon-user' : 'i-carbon-bot'"
            class="text-white text-sm"
          ></div>
        </div>

        <!-- 消息内容 -->
        <div class="message-content flex-1 min-w-0">
          <div
            class="message-bubble relative"
            :class="[
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-tr-md ml-auto'
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md'
            ]"
          >
            <!-- 操作按钮（悬停显示） -->
            <div
              class="message-actions absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white rounded-lg shadow-md px-1 py-0.5"
            >
              <button
                @click="handleEditMessage(index)"
                class="p-1.5 text-gray-400 hover:text-blue-500 rounded"
                :title="t('chat.detail.edit')"
              >
                <div class="i-carbon-edit text-sm"></div>
              </button>
              <button
                @click="handleCopyMessage(index)"
                class="p-1.5 text-gray-400 hover:text-green-500 rounded"
                :title="t('chat.detail.copy')"
              >
                <div class="i-carbon-copy text-sm"></div>
              </button>
              <button
                @click="handleDeleteMessage(index)"
                class="p-1.5 text-gray-400 hover:text-red-500 rounded"
                :title="t('chat.detail.deleteMessage')"
              >
                <div class="i-carbon-trash-can text-sm"></div>
              </button>
            </div>

            <!-- 编辑标记 -->
            <div v-if="message.isEdited" class="text-xs opacity-50 mb-1 flex items-center gap-1">
              <div class="i-carbon-edit text-xs"></div>
              {{ t('chat.detail.edited') }}
            </div>

            <!-- 思考过程 -->
            <details v-if="message.thinking" class="mb-2">
              <summary
                class="cursor-pointer text-xs opacity-70 hover:opacity-100 flex items-center gap-1"
              >
                <div class="i-carbon-idea"></div>
                {{ t('chat.detail.thinking') }}
              </summary>
              <div
                class="mt-2 p-2 rounded-lg text-xs leading-relaxed"
                :class="message.role === 'user' ? 'bg-white/10' : 'bg-gray-50'"
              >
                {{ message.thinking }}
              </div>
            </details>

            <!-- 消息文本 - Markdown 渲染 -->
            <div
              v-if="editingIndex !== index"
              class="message-text prose prose-sm max-w-none"
              :class="message.role === 'user' ? 'prose-invert' : ''"
              v-html="renderMarkdown(getMessageContent(message))"
            ></div>

            <!-- 编辑模式 -->
            <div v-else class="edit-mode">
              <textarea
                ref="editTextareaRef"
                v-model="editContent"
                class="w-full min-h-[100px] p-2 text-sm border border-gray-200 rounded-lg resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                :class="message.role === 'user' ? 'bg-white/10 text-white border-white/20' : 'bg-white'"
              ></textarea>
              <div class="flex justify-end gap-2 mt-2">
                <button
                  @click="cancelEdit"
                  class="px-3 py-1.5 text-xs rounded-lg"
                  :class="message.role === 'user' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  @click="saveEdit(index)"
                  class="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {{ t('common.save') }}
                </button>
              </div>
            </div>

            <!-- 时间戳 -->
            <div
              v-if="message.timestamp && editingIndex !== index"
              class="mt-2 text-xs opacity-50"
            >
              {{ formatMessageTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部信息栏 -->
    <div class="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
      <!-- 标签 -->
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 flex-shrink-0">{{ t('chat.detail.tags') }}:</span>
        <div class="flex flex-wrap gap-1.5 flex-1">
          <span
            v-for="tagId in conversation.tagIds"
            :key="tagId"
            class="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700"
          >
            {{ getTagName(tagId) }}
          </span>
          <button
            @click="showTagInput = true"
            class="px-2 py-0.5 text-xs rounded-full border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            + {{ t('common.add') }}
          </button>
        </div>
      </div>

      <!-- 标签输入 -->
      <div v-if="showTagInput" class="flex items-center gap-2">
        <input
          v-model="newTag"
          @keydown.enter="addTag"
          @keydown.escape="showTagInput = false"
          type="text"
          :placeholder="t('chat.detail.tagsPlaceholder')"
          class="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          ref="tagInputRef"
        />
        <button
          @click="addTag"
          class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          {{ t('common.add') }}
        </button>
      </div>

      <!-- 备注 -->
      <div class="flex items-start gap-2">
        <span class="text-xs text-gray-500 flex-shrink-0 mt-1.5">{{ t('chat.detail.note') }}:</span>
        <textarea
          v-model="localNote"
          @blur="saveNote"
          :placeholder="t('chat.detail.notePlaceholder')"
          rows="2"
          class="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        ></textarea>
      </div>

      <!-- 元信息 -->
      <div class="flex items-center justify-between text-xs text-gray-400">
        <span>{{ t('chat.list.collected') }}: {{ formatFullTime(conversation.collectedAt || conversation.createdAt) }}</span>
        <span v-if="conversation.link" class="truncate max-w-[200px]">{{ conversation.link }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { getPlatformIcon, getPlatformColor, formatPlatformName } from '@/utils/chatPlatform'
import type { ChatConversation, ChatMessage } from '@/types/chat'

const { t } = useI18n()

const props = defineProps<{
  conversation: ChatConversation
  tags: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update': [id: string, patch: Partial<ChatConversation>, tagNames?: string[]]
  'delete': [id: string]
  'toggle-star': [conversation: ChatConversation]
  'export': [conversation: ChatConversation]
}>()

// 状态
const localNote = ref(props.conversation.note || '')
const showTagInput = ref(false)
const newTag = ref('')
const tagInputRef = ref<HTMLInputElement | null>(null)
const editTextareaRef = ref<HTMLTextAreaElement | null>(null)

// 编辑状态
const editingIndex = ref<number | null>(null)
const editContent = ref('')

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 过滤已删除的消息
const visibleMessages = computed(() => {
  return props.conversation.messages.filter(m => !m.isDeleted)
})

// 获取消息内容（兼容新旧格式）
function getMessageContent(message: ChatMessage): string {
  if (typeof message.content === 'string') {
    return message.content
  }
  return message.content.edited || message.content.original
}

// 渲染 Markdown
function renderMarkdown(content: string): string {
  try {
    return marked.parse(content) as string
  } catch {
    return content.replace(/\n/g, '<br>')
  }
}

// 监听 conversation 变化
watch(() => props.conversation, (newConv) => {
  localNote.value = newConv.note || ''
  editingIndex.value = null
}, { immediate: true })

watch(showTagInput, async (show) => {
  if (show) {
    await nextTick()
    tagInputRef.value?.focus()
  }
})

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

// 消息操作
async function handleEditMessage(index: number) {
  const message = visibleMessages.value[index]
  editingIndex.value = index
  editContent.value = getMessageContent(message)
  await nextTick()
  editTextareaRef.value?.focus()
}

function cancelEdit() {
  editingIndex.value = null
  editContent.value = ''
}

function saveEdit(index: number) {
  const message = visibleMessages.value[index]
  const originalIndex = props.conversation.messages.findIndex(m => m.id === message.id)

  if (originalIndex === -1) return

  // 更新消息内容
  const updatedMessages = [...props.conversation.messages]
  const updatedMessage = { ...updatedMessages[originalIndex] }

  if (typeof updatedMessage.content === 'string') {
    // 转换为新格式
    updatedMessage.content = {
      original: updatedMessage.content,
      edited: editContent.value,
      format: 'text',
    }
  } else {
    updatedMessage.content = {
      ...updatedMessage.content,
      edited: editContent.value,
    }
  }

  updatedMessage.isEdited = true
  updatedMessage.editedAt = Date.now()
  updatedMessages[originalIndex] = updatedMessage

  emit('update', props.conversation.id, { messages: updatedMessages })

  editingIndex.value = null
  editContent.value = ''
}

async function handleCopyMessage(index: number) {
  const message = visibleMessages.value[index]
  const content = getMessageContent(message)

  try {
    await navigator.clipboard.writeText(content)
  } catch {
    // fallback
  }
}

function handleDeleteMessage(index: number) {
  const message = visibleMessages.value[index]
  const originalIndex = props.conversation.messages.findIndex(m => m.id === message.id)

  if (originalIndex === -1) return

  // 软删除
  const updatedMessages = [...props.conversation.messages]
  updatedMessages[originalIndex] = {
    ...updatedMessages[originalIndex],
    isDeleted: true,
  }

  emit('update', props.conversation.id, {
    messages: updatedMessages,
    messageCount: updatedMessages.filter(m => !m.isDeleted).length,
  })
}

// 格式化时间
function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
}

.message-content {
  max-width: 80%;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Markdown 样式 */
.message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}

.message-text :deep(pre code) {
  background: transparent;
  padding: 0;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  padding-left: 1.5em;
  margin: 8px 0;
}

.message-text :deep(blockquote) {
  border-left: 3px solid currentColor;
  padding-left: 12px;
  margin: 8px 0;
  opacity: 0.8;
}

.message-text :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.message-text :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  width: 100%;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px;
  text-align: left;
}

/* 用户消息的 Markdown 样式 */
.prose-invert :deep(pre) {
  background: rgba(255, 255, 255, 0.1);
}

.prose-invert :deep(code) {
  background: rgba(255, 255, 255, 0.1);
}

.prose-invert :deep(th),
.prose-invert :deep(td) {
  border-color: rgba(255, 255, 255, 0.2);
}

/* 编辑模式 */
.edit-mode textarea {
  font-family: inherit;
}
</style>
