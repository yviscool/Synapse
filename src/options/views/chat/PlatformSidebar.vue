<template>
  <div class="flex flex-col h-full">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-100">
      <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        {{ t('chat.platforms.all') }}
      </h3>
    </div>

    <!-- 平台列表 -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <!-- 全部 -->
      <button
        @click="$emit('clear-platforms')"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
        :class="[
          selectedPlatforms.length === 0
            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50'
        ]"
      >
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
          <div class="i-carbon-chat-bot text-white text-lg"></div>
        </div>
        <span class="flex-1 text-left font-medium">{{ t('chat.sidebar.all') }}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {{ totalCount }}
        </span>
      </button>

      <!-- 收藏 -->
      <button
        @click="$emit('toggle-starred')"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
        :class="[
          showStarredOnly
            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50'
        ]"
      >
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
          <div class="i-carbon-star-filled text-white text-lg"></div>
        </div>
        <span class="flex-1 text-left font-medium">{{ t('chat.sidebar.starred') }}</span>
        <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {{ starredCount }}
        </span>
      </button>

      <!-- 分隔线 -->
      <div class="my-3 border-t border-gray-100"></div>

      <!-- 各平台 -->
      <button
        v-for="platform in platforms"
        :key="platform.id"
        @click="$emit('toggle-platform', platform.id)"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
        :class="[
          selectedPlatforms.includes(platform.id)
            ? 'bg-gray-100 text-gray-900 shadow-sm'
            : 'text-gray-600 hover:bg-gray-50'
        ]"
      >
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
          :style="{ backgroundColor: platform.color + '15' }"
        >
          <div :class="platform.icon" class="text-lg" :style="{ color: platform.color }"></div>
        </div>
        <span class="flex-1 text-left font-medium">{{ platform.name }}</span>
        <span
          v-if="getPlatformCount(platform.id) > 0"
          class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
        >
          {{ getPlatformCount(platform.id) }}
        </span>
      </button>
    </div>

    <!-- 标签区域 -->
    <div v-if="tags.length > 0" class="border-t border-gray-100">
      <div class="p-3">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {{ t('chat.sidebar.tags') }}
          </h4>
          <button
            v-if="selectedTagIds.length > 0"
            @click="$emit('clear-tags')"
            class="text-xs text-blue-500 hover:text-blue-600"
          >
            {{ t('chat.sidebar.clearTags') }}
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="tag in tags"
            :key="tag.id"
            @click="$emit('toggle-tag', tag.id)"
            class="px-2.5 py-1 text-xs rounded-full transition-all duration-200"
            :class="[
              selectedTagIds.includes(tag.id)
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            {{ tag.name }}
            <span v-if="tag.count" class="ml-1 opacity-70">{{ tag.count }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PlatformConfig, ChatPlatform, ChatTag } from '@/types/chat'

const { t } = useI18n()

const props = defineProps<{
  platforms: PlatformConfig[]
  platformCounts: Map<ChatPlatform, number>
  selectedPlatforms: ChatPlatform[]
  tags: Array<ChatTag & { count: number }>
  selectedTagIds: string[]
  showStarredOnly: boolean
  totalCount: number
  starredCount: number
}>()

defineEmits<{
  'toggle-platform': [platform: ChatPlatform]
  'clear-platforms': []
  'toggle-tag': [tagId: string]
  'clear-tags': []
  'toggle-starred': []
}>()

function getPlatformCount(platform: ChatPlatform): number {
  return props.platformCounts.get(platform) || 0
}
</script>
