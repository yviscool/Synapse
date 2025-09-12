<template>
  <div class="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
    <!-- Cloud Sync: The Star of the Show -->
    <div class="p-6 border rounded-xl bg-white shadow-sm transition-all">
      <div v-if="isLoading" class="text-center text-gray-500">
        <p>正在加载设置...</p>
      </div>

      <!-- State B: Sync Enabled -->
      <div v-else-if="settings?.syncEnabled && settings.userProfile" class="space-y-4">
        <div class="flex justify-between items-start">
          <div>
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-gray-900">同步已开启</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                已连接
              </span>
            </div>
            <div class="flex items-center space-x-3 mt-3">
              <img v-if="settings.userProfile.picture" :src="settings.userProfile.picture" alt="User Avatar" class="w-10 h-10 rounded-full">
              <div class="flex-grow">
                <p class="text-sm font-semibold text-gray-700">{{ settings.userProfile.email }}</p>
                <p class="text-sm text-gray-500" :title="`最后同步于: ${formatTimestamp(settings.lastSyncTimestamp)}`">
                  {{ syncStatusText }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button @click="handleSyncNow" :disabled="isSyncing" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm">
              <span v-if="isSyncing" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                同步中...
              </span>
              <span v-else>立即同步</span>
            </button>
            <div class="relative">
              <button @click="showAdvancedSyncMenu = !showAdvancedSyncMenu" class="p-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
              </button>
              <div v-if="showAdvancedSyncMenu" @click="showAdvancedSyncMenu = false" class="fixed inset-0 z-10"></div>
              <div v-if="showAdvancedSyncMenu" class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl z-20 border">
                <button @click="handleDisconnect" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg">
                  断开连接
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- State A: Not Synced -->
      <div v-else class="text-center space-y-3">
        <div class="mx-auto bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
        </div>
        <h3 class="text-xl font-semibold text-gray-900">给你的灵感一个永恒的家</h3>
        <p class="text-gray-600 max-w-md mx-auto">
          启用云同步，在所有设备间无缝创作，永不丢失。
        </p>
        <div class="pt-4">
          <button @click="handleEnableSync('google-drive')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg">
            启用云同步
          </button>
          <p class="text-xs text-gray-500 mt-2">由 Google Drive 提供安全支持</p>
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
                <p class="text-sm font-semibold text-gray-800" :title="`创建于: ${formatBackupName(file.name)}`">{{ formatRelativeTime(file.name) }}</p>
                <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
              </div>
              <div class="flex gap-2">
                <button @click="handleRestoreFromCloud(file.id)" class="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">恢复</button>
                <button @click="handleDownloadFromCloud(file.id, file.name)" class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">下载</button>
                <button @click="handleDeleteFromCloud(file.id)" class="px-3 py-1 text-sm text-red-600 bg-transparent rounded-md hover:bg-red-100">删除</button>
              </div>
            </li>
          </ul>
          <p v-else-if="!isHistoryLoading" class="text-sm text-gray-500 mt-4 text-center">暂无云端备份记录。</p>
        </div>

        <div>
          <h4 class="font-semibold text-gray-800">本地快照</h4>
          <p class="text-sm text-gray-600 mt-2">
            创建一份完整的本地备份，以备不时之需。您也可以从备份文件恢复。
          </p>
          <div class="flex gap-4 flex-wrap mt-3">
            <button @click="exportData" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              创建快照
            </button>
            <div class="relative">
              <input ref="importInput" type="file" accept=".json" @change="importData" class="hidden">
              <button @click="importInput?.click()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                从文件导入
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
          <h4 class="font-semibold text-red-800">危险操作</h4>
          <div v-if="!showResetConfirmation">
            <p class="text-sm text-red-600 mt-1">此操作将从您的浏览器中删除所有本地数据，且无法撤销。</p>
            <button @click="showResetConfirmation = true" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              清空所有数据
            </button>
          </div>
          <div v-else class="space-y-3">
            <p class="text-sm font-semibold text-red-800">为确认此操作，请输入 'DELETE'</p>
            <input v-model="resetConfirmationText" type="text" class="w-full px-3 py-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500" placeholder="DELETE">
            <div class="flex gap-4">
              <button @click="executeResetData" :disabled="resetConfirmationText !== 'DELETE'" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                永久删除
              </button>
              <button @click="showResetConfirmation = false; resetConfirmationText = ''" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const showAdvancedSyncMenu = ref(false)
const showResetConfirmation = ref(false)
const resetConfirmationText = ref('')

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

const syncStatusText = computed(() => {
  if (isSyncing.value) {
    return '正在同步...'
  }
  const timestamp = settings.value?.lastSyncTimestamp
  if (!timestamp) return '从未同步'

  const now = Date.now()
  const diffSeconds = Math.round((now - timestamp) / 1000)
  
  if (diffSeconds < 5) return '刚刚同步'
  if (diffSeconds < 60) return `${diffSeconds} 秒前同步`
  
  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} 分钟前同步`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前同步`

  const diffDays = Math.round(diffHours / 24)
  return `${diffDays} 天前同步`
})

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}

function parseDateFromBackupName(fileName: string): Date | null {
  const cleanName = fileName.replace(BACKUP_FILE_PREFIX, '').replace('.json', '');
  const dateString = cleanName.replace('_', 'T') + 'Z';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

function formatBackupName(fileName: string): string {
  const date = parseDateFromBackupName(fileName);
  return date ? date.toLocaleString() : fileName;
}

function formatRelativeTime(fileName: string): string {
  const date = parseDateFromBackupName(fileName);
  if (!date) return fileName;

  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return '刚刚';

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 7) return `${diffDays} 天前`;
  
  return date.toLocaleDateString();
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

async function handleDeleteFromCloud(fileId: string) {
  const confirmed = await askConfirm('确定要永久删除此云端备份吗？此操作不可撤销。', { type: 'danger' });
  if (!confirmed) return;

  showToast('正在删除...', 'success');
  try {
    await syncManager.deleteCloudBackup(fileId);
    await loadBackupHistory();
    showToast('备份已删除', 'success');
  } catch (error) {
    showToast(`删除失败: ${(error as Error).message}`, 'error');
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
  showAdvancedSyncMenu.value = false;
  const confirmed = await askConfirm('确定要断开云同步吗？您的数据将保留在云端，但此设备将不再同步。', { type: 'danger' })
  if (!confirmed) return

  await syncManager.disconnect()
  await refreshSettings()
  showToast('已断开云同步', 'success')
}

async function handleSyncNow() {
  isSyncing.value = true
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

const executeResetData = async () => {
  if (resetConfirmationText.value !== 'DELETE') {
    showToast('确认文本不匹配', 'error');
    return;
  }

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
