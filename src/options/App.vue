<template>
  <div class="p-4 space-y-4">
    <h1 class="text-xl font-700">APM 设置</h1>
    <label class="flex items-center gap-2">
      <input type="checkbox" v-model="enableSlash" />
      输入框按 “/” 打开面板
    </label>
    <div>
      全局快捷键（Chrome 扩展页面中配置 commands）：<code>Alt+K</code>
    </div>
    <div class="flex gap-2">
      <button class="px-3 py-2 rounded bg-gray-200" @click="save">保存</button>
      <button class="px-3 py-2 rounded" @click="exportAll">导出 JSON</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db, getSettings, setSettings } from '@/stores/db'

const enableSlash = ref(true)

onMounted(async () => {
  const s = await getSettings()
  enableSlash.value = s.enableSlash
})

async function save() {
  await setSettings({ enableSlash: enableSlash.value })
}

async function exportAll() {
  const dumps = {
    prompts: await db.prompts.toArray(),
    prompt_versions: await db.prompt_versions.toArray(),
    categories: await db.categories.toArray(),
    tags: await db.tags.toArray(),
    settings: await db.settings.toArray(),
    meta: { schema: 1, exportedAt: Date.now() },
  }
  const name = `apm-backup-${new Date().toISOString().slice(0,10)}.json`
  chrome.runtime.sendMessage({ type: 'APM/DOWNLOAD_FILE', data: { name, content: JSON.stringify(dumps, null, 2) } })
}
</script>