<template>
  <div class="p-3 text-sm">
    <div class="font-600 mb-2">APM Popup</div>
    <button class="px-3 py-2 rounded bg-blue-600 text-white" @click="open">打开面板</button>
  </div>
</template>

<script setup lang="ts">
import { MSG } from '@/utils/messaging'
async function open() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab.id) await chrome.tabs.sendMessage(tab.id, { type: MSG.OPEN_PANEL })
}
</script>