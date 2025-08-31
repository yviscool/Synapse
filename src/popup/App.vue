<template>
  <div class="w-[400px] h-[600px] text-sm flex flex-col bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div class="font-semibold text-lg flex items-center">
        <img src="/icons/icon-32.png" alt="Synapse Logo" class="w-6 h-6 mr-2">
        <span>Synapse</span>
      </div>
      <button @click="openOptionsPage" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none rounded-full p-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.58-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.44.17-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.58.22L2.7 9.81a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.58.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.48.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .58-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
      </button>
    </header>

    <main class="flex-1 flex flex-col p-6 overflow-y-auto">
      <div v-if="isError" class="w-full flex flex-col items-center justify-center h-full">
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md w-full" role="alert">
          <p class="font-bold">错误</p>
          <p>{{ errorMessage }}</p>
        </div>
        <button
          class="mt-6 w-full px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors"
          @click="isError = false"
        >
          再试一次
        </button>
      </div>

      <div v-else class="w-full">
        <!-- Primary Action -->
        <div class="text-center">
          <h1 class="text-xl font-bold mb-2 text-gray-900 dark:text-white">启动 Synapse</h1>
          <p class="text-gray-500 dark:text-gray-400 mb-5 text-sm">
            点击下方按钮，在当前页面上启动面板。
          </p>
          <button
            class="w-full px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out transform hover:scale-105 disabled:bg-blue-400 disabled:cursor-not-allowed"
            @click="openPanel"
            :disabled="isLoading"
          >
            <div v-if="isLoading" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>正在启动...</span>
            </div>
            <span v-else>打开面板</span>
          </button>
        </div>

        <hr class="my-6 border-gray-200 dark:border-gray-600" />

        <!-- Secondary Methods -->
        <div class="text-left">
          <h2 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">更多启动方式</h2>
          <div class="space-y-3 text-gray-600 dark:text-gray-400 text-sm">
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M21 18H3v-2h18v2M15 8H9v2h6V8M21 4H3v2h18V4Z"/></svg>
              <span>在任意输入框输入 <code class="bg-gray-200 dark:bg-gray-700 font-mono px-1.5 py-0.5 rounded-md text-gray-800 dark:text-gray-200">/p</code> 即可唤出</span>
            </div>
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M22 6H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1M7 13H4v-2h3v2m5 0h-3v-2h3v2m5 0h-3v-2h3v2Z"/></svg>
              <span>使用快捷键 <code class="bg-gray-200 dark:bg-gray-700 font-mono px-1.5 py-0.5 rounded-md text-gray-800 dark:text-gray-200">Alt + K</code> 快速打开</span>
            </div>
            <div class="flex items-center">
              <svg class="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M4.4 18.243q-.425.225-.913-.038t-.487-.805V6.6q0-.55.487-.805t.913-.038l10.4 5.4q.425.225.425.713t-.425.712zM14 6v12h2V6zm4 0v12h2V6z"/></svg>
              <span>选中文本, 点击 <code class="bg-gray-200 dark:bg-gray-700 font-mono px-1.5 py-0.5 rounded-md text-gray-800 dark:text-gray-200">鼠标右键</code> 保存</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="py-3 px-4 text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
      <p>Version {{ version }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MSG } from '@/utils/messaging'
import manifest from '@/../manifest.json'

const version = manifest.version
const isLoading = ref(false)
const isError = ref(false)
const errorMessage = ref('发生未知错误。')

async function openPanel() {
  isLoading.value = true
  isError.value = false

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: MSG.OPEN_PANEL })
      window.close()
    } catch (error: any) {
      console.error("Synapse Error:", error)
      isError.value = true
      if (error.message.includes('Receiving end does not exist')) {
        errorMessage.value = 'Synapse 无法在此页面上运行，请尝试其他网站。'
      } else {
        errorMessage.value = '打开面板失败，请检查控制台获取详细信息。'
      }
      isLoading.value = false
    }
  } else {
    isError.value = true
    errorMessage.value = '无法找到用于打开面板的活动标签页。'
    isLoading.value = false
  }
}

function openOptionsPage() {
  chrome.runtime.openOptionsPage()
}
</script>

<style>
.font-sans {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

code {
  @apply text-sm font-semibold;
}
</style>
