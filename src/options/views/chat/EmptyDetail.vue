<template>
  <div class="flex flex-col items-center justify-center h-full p-8 text-center">
    <!-- 动画图标 -->
    <div class="relative mb-8">
      <div class="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
        <div class="i-carbon-chat-bot text-5xl text-blue-500 animate-pulse"></div>
      </div>
      <!-- 装饰元素 -->
      <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-lg">
        <div class="i-carbon-star-filled text-white text-sm"></div>
      </div>
      <div class="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center shadow-lg">
        <div class="i-carbon-checkmark text-white text-xs"></div>
      </div>
    </div>

    <!-- 标题 -->
    <h2 class="text-2xl font-bold text-gray-900 mb-3">
      {{ t('chat.empty.title') }}
    </h2>
    <p class="text-gray-500 mb-8 max-w-md">
      {{ t('chat.empty.description') }}
    </p>

    <!-- 功能特点 -->
    <div class="grid grid-cols-2 gap-4 max-w-lg">
      <div class="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50">
        <div class="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
          <div class="i-carbon-download text-white text-lg"></div>
        </div>
        <span class="text-sm text-gray-700 text-left">{{ t('chat.empty.features.collect') }}</span>
      </div>
      <div class="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50">
        <div class="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
          <div class="i-carbon-folder text-white text-lg"></div>
        </div>
        <span class="text-sm text-gray-700 text-left">{{ t('chat.empty.features.manage') }}</span>
      </div>
      <div class="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/50">
        <div class="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
          <div class="i-carbon-search text-white text-lg"></div>
        </div>
        <span class="text-sm text-gray-700 text-left">{{ t('chat.empty.features.search') }}</span>
      </div>
      <div class="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100/50">
        <div class="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <div class="i-carbon-share text-white text-lg"></div>
        </div>
        <span class="text-sm text-gray-700 text-left">{{ t('chat.empty.features.export') }}</span>
      </div>
    </div>

    <!-- 支持的平台 -->
    <div class="mt-8 flex items-center gap-3">
      <span class="text-xs text-gray-400">支持平台:</span>
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-[#10a37f]/10 flex items-center justify-center" title="ChatGPT">
          <div class="i-simple-icons-openai text-[#10a37f]"></div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-[#d97706]/10 flex items-center justify-center" title="Claude">
          <div class="i-simple-icons-anthropic text-[#d97706]"></div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-[#4285f4]/10 flex items-center justify-center" title="Gemini">
          <div class="i-simple-icons-google text-[#4285f4]"></div>
        </div>
        <div class="w-7 h-7 rounded-lg bg-[#0066ff]/10 flex items-center justify-center" title="DeepSeek">
          <div class="i-carbon-machine-learning-model text-[#0066ff]"></div>
        </div>
        <span class="text-xs text-gray-400">...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
