<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
    <!-- Cloud Sync: The Star of the Show -->
    <div class="p-6 border rounded-xl bg-white shadow-sm transition-all">
      <div v-if="isLoading" class="text-center text-gray-500">
        <p>正在加载设置...</p>
      </div>

      <!-- State B: Sync Enabled -->
      <div v-else-if="settings?.syncEnabled && settings.userProfile" class="space-y-4">
        <div class="flex items-center space-x-4">
          <img v-if="settings.userProfile.picture" :src="settings.userProfile.picture" alt="User Avatar" class="w-12 h-12 rounded-full">
          <div class="flex-grow">
            <h3 class="text-lg font-semibold text-gray-900">同步已开启</h3>
            <p class="text-sm text-gray-600">{{ settings.userProfile.email }}</p>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            已连接
          </span>
        </div>
        <p class="text-sm text-gray-500">
          最后同步时间：{{ formatTimestamp(settings.lastSyncTimestamp) }}
        </p>
        <div class="flex gap-4 flex-wrap pt-2">
          <button @click="handleSyncNow" :disabled="isSyncing" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait">
            {{ isSyncing ? '正在同步...' : '立即同步' }}
          </button>
          <button @click="handleDisconnect" class="px-4 py-2 bg-transparent text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            断开连接
          </button>
        </div>
      </div>

      <!-- State A: Not Synced -->
      <div v-else class="text-center space-y-3">
        <div class="mx-auto bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900">云端，让灵感无界</h3>
        <p class="text-gray-600 max-w-md mx-auto">
          在您的所有设备间无缝同步提示词、分类和历史记录。安全、自动、即时。
        </p>
        <div class="pt-4">
          <button @click="handleEnableSync('google-drive')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg">
            启用云同步 (Google Drive)
          </button>
        </div>
      </div>
    </div>

    <!-- Data Vault -->
    <details class="p-6 border rounded-xl bg-white shadow-sm">
      <summary class="text-lg font-semibold text-gray-800 cursor-pointer">
        数据保险箱
      </summary>
      <div class="mt-6 border-t pt-6 space-y-6">
        <!-- Cloud Time Machine -->
        <div v-if="settings?.syncEnabled" class="p-4 border rounded-lg bg-gray-50">
          <div class="flex justify-between items-center">
            <h4 class="font-semibold text-gray-800">云端时光机</h4>
            <button @click="loadBackupHistory" :disabled="isHistoryLoading" class="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">
              {{ isHistoryLoading ? '加载中...' : '刷新列表' }}
            </button>
          </div>
          <p class="text-sm text-gray-500 mt-2">这里会列出您最近在云端的10个备份版本。您可以随时恢复到任一版本。</p>
          <ul v-if="backupHistory.length > 0" class="mt-4 space-y-2">
            <li v-for="file in backupHistory" :key="file.id" class="flex items-center justify-between p-3 rounded-md bg-white border">
              <div>
                <p class="text-sm font-semibold text-gray-800">{{ formatBackupName(file.name) }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
              </div>
              <div class="flex gap-2">
                <button @click="handleRestoreFromCloud(file.id)" class="text-sm text-blue-600 hover:underline">恢复</button>
                <button @click="handleDownloadFromCloud(file.id, file.name)" class="text-sm text-gray-600 hover:underline">下载</button>
              </div>
            </li>
          </ul>
          <p v-else-if="!isHistoryLoading" class="text-sm text-gray-500 mt-4 text-center">暂无云端备份记录。</p>
        </div>

        <div>
          <h4 class="font-semibold text-gray-800">本地备份与恢复</h4>
          <p class="text-sm text-gray-600 mt-2">
            创建一份完整的本地备份，以备不时之需。您也可以从备份文件恢复。
          </p>
          <div class="flex gap-4 flex-wrap mt-3">
            <button @click="exportData" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              创建本地备份
            </button>
            <div class="relative">
              <input ref="importInput" type="file" accept=".json" @change="importData" class="hidden">
              <button @click="importInput?.click()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                从备份恢复
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
          <h4 class="font-semibold text-red-800">危险操作</h4>
          <p class="text-sm text-red-600 mt-1">此操作将从您的浏览器中删除所有本地数据，且无法撤销。</p>
          <button @click="resetData" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            清空所有数据
          </button>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUI } from '@/stores/ui'
import { db, getSettings, DEFAULT_SETTINGS } from '@/stores/db' // Read-only and defaults
import { repository } from '@/stores/repository'
import { syncManager } from '@/stores/sync'
import type { Settings } from '@/types/prompt'

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  [key: string]: any;
}

const { showToast, askConfirm } = useUI()
const importInput = ref<HTMLInputElement>()
const settings = ref<Settings | null>(null)
const isLoading = ref(true)
const isSyncing = ref(false)
const isHistoryLoading = ref(false)
const backupHistory = ref<DriveFile[]>([])

onMounted(async () => {
  await refreshSettings()
  isLoading.value = false
  if (settings.value?.syncEnabled) {
    loadBackupHistory();
  }
})

async function refreshSettings() {
  const currentSettings = await getSettings()
  settings.value = { ...currentSettings }
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}

function formatBackupName(fileName: string): string {
  const cleanName = fileName.replace(BACKUP_FILE_PREFIX, '').replace('.json', '');
  const dateString = cleanName.replace('_', 'T') + 'Z'; // Re-add T and Z for UTC parsing
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return cleanName; // Fallback to clean name if date is invalid
  }
  return date.toLocaleString();
}

function formatFileSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null) return '';
  const numBytes = Number(bytes);
  if (isNaN(numBytes) || numBytes === 0) return '0 B';
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));
  return `${parseFloat((numBytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

const BACKUP_FILE_PREFIX = 'synapse-backup-';

async function loadBackupHistory() {
  isHistoryLoading.value = true;
  try {
    backupHistory.value = await syncManager.listCloudBackups();
  } catch (error) {
    showToast(`加载备份历史失败: ${(error as Error).message}`, 'error');
  } finally {
    isHistoryLoading.value = false;
  }
}

async function handleRestoreFromCloud(fileId: string) {
  const confirmed = await askConfirm('确定要从此版本恢复吗？当前设备上的所有数据都将被覆盖。', { type: 'danger' });
  if (!confirmed) return;

  showToast('正在从云端恢复...', 'success');
  try {
    await syncManager.restoreFromCloudBackup(fileId);
    await refreshSettings();
    showToast('恢复成功！页面即将刷新。', 'success');
    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    showToast(`恢复失败: ${(error as Error).message}`, 'error');
  }
}

async function handleDownloadFromCloud(fileId: string, fileName: string) {
  showToast('正在从云端下载...', 'success');
  try {
    const data = await syncManager.downloadCloudBackup(fileId);
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    showToast('文件已下载', 'success');
  } catch (error) {
    showToast(`下载失败: ${(error as Error).message}`, 'error');
  }
}

async function handleEnableSync(provider: 'google-drive') {
  const confirmed = await askConfirm(`即将跳转到 Google 进行授权，以允许 Synapse 在您的 Google Drive 中创建专属应用文件夹来存放备份数据。我们不会访问您的任何其他文件。`, { type: 'default' })
  if (!confirmed) return

  isLoading.value = true
  try {
    await syncManager.enableSync(provider)
    await refreshSettings()
    showToast('云同步已成功开启！', 'success')
  } catch (error) {
    console.error(error)
    showToast(`授权失败: ${(error as Error).message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

async function handleDisconnect() {
  const confirmed = await askConfirm('确定要断开云同步吗？您的数据将保留在云端，但此设备将不再同步。', { type: 'danger' })
  if (!confirmed) return

  await syncManager.disconnect()
  await refreshSettings()
  showToast('已断开云同步', 'success')
}

async function handleSyncNow() {
  isSyncing.value = true
  showToast('正在同步...', 'success', 2000)
  try {
    await syncManager.triggerSync()
    await refreshSettings()
    showToast('同步完成！', 'success')
  } catch (error) {
    showToast(`同步失败: ${(error as Error).message}`, 'error')
  } finally {
    isSyncing.value = false
  }
}

// --- Data Vault Methods ---

const exportData = async () => {
  try {
    const exportObject = {
      prompts: await db.prompts.toArray(),
      prompt_versions: await db.prompt_versions.toArray(),
      categories: await db.categories.toArray(),
      tags: await db.tags.toArray(),
      settings: await getSettings(),
      exportTime: new Date().toISOString(),
      version: '2.0.0' 
    };

    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Synapse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('本地备份创建成功', 'success');
  } catch (error) {
    console.error('导出数据失败:', error);
    showToast('导出失败，请重试', 'error');
  }
}

const importData = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const importedData = JSON.parse(text)
    
    if (!importedData.prompts && !importedData.settings) {
      throw new Error('无效的备份文件格式')
    }

    const confirmed = await askConfirm('从备份恢复将覆盖此设备上的所有数据，但会保留当前的云同步设置。此操作不可撤销。是否继续？', { type: 'danger' })
    if (!confirmed) return

    const { ok, error } = await repository.importDataFromBackup(importedData)

    if (ok) {
      showToast('数据恢复成功！页面将刷新。', 'success')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      throw error
    }

  } catch (error) {
    console.error('导入数据失败:', error)
    showToast(`导入失败: ${(error as Error).message}`, 'error')
  } finally {
    if (importInput.value) importInput.value.value = ''
  }
}

const resetData = async () => {
  const confirmed = await askConfirm('确定要清空所有本地数据吗？您的云同步设置将保留。此操作不可撤销。', { type: 'danger' })
  if (!confirmed) return

  try {
    const { ok, error } = await repository.resetAllData()
    if (ok) {
      showToast('所有数据已重置！页面将刷新。', 'success')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      throw error
    }
  } catch (error) {
    console.error('重置数据失败:', error)
    showToast('重置失败，请重试', 'error')
  }
}
</script>

<style scoped>
details[open] summary ~ * {
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
