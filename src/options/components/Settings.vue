<template>
  <div class="p-4">
    <!-- 导入导出功能 -->
    <div class="p-4 border rounded-lg bg-gray-50">
      <h3 class="text-lg font-semibold mb-4 text-gray-800">数据管理</h3>
      <div class="flex gap-4 flex-wrap">
        <button
          @click="exportData"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          导出数据
        </button>
        <div class="relative">
          <input
            ref="importInput"
            type="file"
            accept=".json"
            @change="importData"
            class="hidden"
          >
          <button
            @click="importInput?.click()"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            导入数据
          </button>
        </div>
        <button
          @click="resetData"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          重置数据 (危险)
        </button>
      </div>
      <p class="text-sm text-gray-500 mt-4">
        您可以导出所有数据（包括灵感、分类等）为 JSON 文件，以便备份或在其他设备上导入。
        <br>
        重置数据将清除此扩展的所有本地存储数据，此操作不可逆。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUI } from '@/stores/ui'
import { db } from '@/stores/db'

const { showToast, askConfirm } = useUI()
const importInput = ref<HTMLInputElement>()

// 导出数据
const exportData = async () => {
  try {
    const prompts = await db.prompts.toArray();
    const prompt_versions = await db.prompt_versions.toArray();
    const categories = await db.categories.toArray();
    const tags = await db.tags.toArray();
    const appSettingsResult = await chrome.storage.sync.get('appSettings');
    const appSettings = appSettingsResult.appSettings;

    const exportObject = {
      prompts,
      prompt_versions,
      categories,
      tags,
      settings: appSettings,
      exportTime: new Date().toISOString(),
      version: '1.1.0' 
    };

    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Synapse-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据导出成功', 'success');
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast('导出失败，请重试', 'error');
  }
}

// 导入数据
const importData = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const importedData = JSON.parse(text)
    
    if (!importedData.prompts && !importedData.settings) {
      throw new Error('无效的备份文件格式')
    }

    const confirmed = await askConfirm('导入数据将覆盖现有所有数据和设置，此操作不可撤销。是否继续？', { type: 'danger' })
    if (!confirmed) return

    await db.transaction('rw', db.prompts, db.prompt_versions, db.categories, db.tags, async () => {
      if (importedData.prompts) {
        await db.prompts.clear();
        await db.prompts.bulkPut(importedData.prompts);
      }
      if (importedData.prompt_versions) {
        await db.prompt_versions.clear();
        await db.prompt_versions.bulkPut(importedData.prompt_versions);
      }
      if (importedData.categories) {
        await db.categories.clear();
        await db.categories.bulkPut(importedData.categories);
      }
      if (importedData.tags) {
        await db.tags.clear();
        await db.tags.bulkPut(importedData.tags);
      }
    });

    if (importedData.settings) {
      await chrome.storage.sync.set({ appSettings: importedData.settings });
    }

    showToast('数据导入成功！页面将刷新。', 'success')
    
    setTimeout(() => {
      window.location.reload()
    }, 1500)

  } catch (error) {
    console.error('导入数据失败:', error)
    showToast(`导入失败: ${(error as Error).message}`, 'error')
  }
  
  if (importInput.value) {
    importInput.value.value = ''
  }
}

// 重置数据
const resetData = async () => {
  const confirmed = await askConfirm('确定要重置所有数据吗？这将删除所有灵感、分类和设置，此操作不可撤销。', { type: 'danger' })
  if (!confirmed) return

  try {
    // Clear all tables in the database
    await db.transaction('rw', db.prompts, db.prompt_versions, db.categories, db.tags, async () => {
      await db.prompts.clear();
      await db.prompt_versions.clear();
      await db.categories.clear();
      await db.tags.clear();
    });

    // Clear settings from chrome.storage
    await chrome.storage.sync.remove('appSettings');

    showToast('所有数据已重置！页面将刷新。', 'success')
    
    setTimeout(() => {
      window.location.reload()
    }, 1500)

  } catch (error) {
    console.error('重置数据失败:', error)
    showToast('重置失败，请重试', 'error')
  }
}
</script>

<style scoped>
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>