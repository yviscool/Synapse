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
        v-for="(message, index) in conversation.messages"
        :key="message.id || index"
        class="flex gap-3"
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
        <div
          class="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm"
          :class="[
            message.role === 'user'
              ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-tr-md'
              : 'bg-white border border-gray-100 text-gray-800 rounded-tl-md'
          ]"
        >
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

          <!-- 消息文本 -->
          <div class="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {{ message.content }}
          </div>

          <!-- 时间戳 -->
          <div
            v-if="message.timestamp"
            class="mt-2 text-xs opacity-50"
          >
            {{ formatMessageTime(message.timestamp) }}
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
import { getPlatformIcon, getPlatformColor, formatPlatformName } from '@/utils/chatPlatform'
import type { ChatConversation } from '@/types/chat'

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

const localNote = ref(props.conversation.note || '')
const showTagInput = ref(false)
const newTag = ref('')
const tagInputRef = ref<HTMLInputElement | null>(null)

// 监听 conversation 变化，更新本地状态
watch(() => props.conversation, (newConv) => {
  localNote.value = newConv.note || ''
}, { immediate: true })

watch(showTagInput, async (show) => {
  if (show) {
    await nextTick()
    tagInputRef.value?.focus()
  }
})

function getTagName(tagId: string): string {
  const tag = props.tags.find(t => t.id === tagId)
  return tag?.name || tagId
}

function addTag() {
  const tagName = newTag.value.trim()
  if (!tagName) return

  // 获取当前标签名称列表
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
