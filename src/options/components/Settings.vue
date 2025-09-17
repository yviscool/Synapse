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
                <button
                  @click="handleDisconnect"
                  :disabled="isDisconnecting"
                  class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isDisconnecting ? '断开中...' : '断开连接' }}
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
          <button
            @click="handleEnableSync('google-drive')"
            :disabled="isEnablingSync"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isEnablingSync ? '正在启用...' : '启用云同步' }}
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
                <button
                  @click="handleDeleteFromCloud(file.id)"
                  :disabled="isDeletingMap[file.id]"
                  class="px-3 py-1 text-sm text-red-600 bg-transparent rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isDeletingMap[file.id] ? '删除中...' : '删除' }}
                </button>
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
/**
 * 每个云端备份条目的删除状态映射：
 * - key: fileId
 * - value: 是否处于“删除中”状态，用于控制按钮禁用与文案显示
 */
const isDeletingMap = ref<Record<string, boolean>>({})
/** 启用云同步的加载态：防止重复点击授权按钮 */
const isEnablingSync = ref(false)
/** 断开云同步的加载态：防止重复点击断开按钮 */
const isDisconnecting = ref(false)
const showAdvancedSyncMenu = ref(false)
const showResetConfirmation = ref(false)
const resetConfirmationText = ref('')

/**
 * 组件挂载时初始化：
 * 1. 拉取设置，设置加载状态
 * 2. 若已启用同步，则拉取云端备份历史
 */
onMounted(async () => {
  await refreshSettings()
  isLoading.value = false
  if (settings.value?.syncEnabled) {
    loadBackupHistory();
  }
})

/**
 * 拉取并刷新设置到本地 state
 * - 使用解构副本避免外部引用的意外修改
 */
async function refreshSettings() {
  const currentSettings = await getSettings()
  settings.value = { ...currentSettings }
}

/**
 * 计算属性：同步状态的友好提示文案
 * - isSyncing 时直接显示“正在同步...”
 * - 否则根据 lastSyncTimestamp 生成相对时间
 */
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

/** 将时间戳转为本地可读字符串，若无则显示“从未” */
function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return '从未'
  return new Date(timestamp).toLocaleString()
}

/**
 * 从备份文件名解析时间（形如 synapse-backup-YYYY-MM-DD_HH-mm-ss.json）
 * 返回 Date；解析失败返回 null
 */
function parseDateFromBackupName(fileName: string): Date | null {
  const cleanName = fileName.replace(BACKUP_FILE_PREFIX, '').replace('.json', '');
  const dateString = cleanName.replace('_', 'T') + 'Z';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? null : date;
}

/** 将备份文件名中的时间格式化为本地可读字符串 */
/**
 * 中国地区友好日期格式化：
 * - 使用 zh-CN 语言环境与当前时区
 * - 24 小时制，补零显示
 * - withTime=false 时仅显示日期
 */
function formatCNDate(date: Date, withTime = true): string {
  const optsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const optsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const opts: Intl.DateTimeFormatOptions = withTime ? { ...optsDate, ...optsTime } : optsDate;
  return new Intl.DateTimeFormat('zh-CN', opts).format(date);
}

function formatBackupName(fileName: string): string {
  const date = parseDateFromBackupName(fileName);
  return date ? formatCNDate(date, true) : fileName;
}

/**
 * 根据备份文件名中的时间，生成相对时间文案
 * - < 1 分钟：刚刚
 * - < 1 小时：X 分钟前
 * - < 1 天：X 小时前
 * - ≤ 7 天：X 天前
 * - 其他：显示本地日期
 */
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
  
  // 超过 7 天，按中国地区本地日期显示（不含时间）
  return formatCNDate(date, false);
}


/** 字节数转人类可读单位（B/KB/MB/GB） */
function formatFileSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null) return '';
  const numBytes = Number(bytes);
  if (isNaN(numBytes) || numBytes === 0) return '0 B';
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));
  return `${parseFloat((numBytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

const BACKUP_FILE_PREFIX = 'synapse-backup-';

/**
 * 从云端拉取最近的备份历史
 * - isHistoryLoading 控制“刷新列表”按钮加载态
 * - 出错时以 toast 告知用户
 */
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

/**
 * 从云端备份恢复：
 * - 二次确认，防止覆盖误操作
 * - 成功后刷新设置并提示，随后刷新页面以确保一致性
 */
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

/**
 * 从云端下载备份文件：
 * - 拉取数据并生成 Blob，触发浏览器下载
 * - 出错时弹出错误提示
 */
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

/**
 * 删除云端备份
 * - 二次确认，防止误删
 * - isDeletingMap[fileId] 控制当前项删除按钮禁用与文案
 * - 成功后刷新历史列表，保持 UI 与云端一致
 */
async function handleDeleteFromCloud(fileId: string) {
  const confirmed = await askConfirm('确定要永久删除此云端备份吗？此操作不可撤销。', { type: 'danger' });
  if (!confirmed) return;

  // 标记当前项进入删除中
  isDeletingMap.value[fileId] = true;
  showToast('正在删除...', 'success');
  try {
    await syncManager.deleteCloudBackup(fileId);
    await loadBackupHistory();
    showToast('备份已删除', 'success');
  } catch (error) {
    showToast(`删除失败: ${(error as Error).message}`, 'error');
  } finally {
    // 恢复按钮状态
    isDeletingMap.value[fileId] = false;
  }
}

/**
 * 开启云同步（Google Drive）
 * - 授权前给出清晰说明
 * - 成功后刷新设置，并在启用同步时拉取云端备份历史
 */
/**
 * 开启云同步（Google Drive）
 * - 授权前给出清晰说明
 * - 成功后刷新设置，并在启用同步时拉取云端备份历史
 */
async function handleEnableSync(provider: 'google-drive') {
  const confirmed = await askConfirm(`即将跳转到 Google 进行授权，以允许 Synapse 在您的 Google Drive 中创建专属应用文件夹来存放备份数据。我们不会访问您的任何其他文件。`, { type: 'default' })
  if (!confirmed) return

  isLoading.value = true
  isEnablingSync.value = true
  try {
    await syncManager.enableSync(provider)
    await refreshSettings()
    if (settings.value?.syncEnabled) {
      await loadBackupHistory()
    }
    showToast('云同步已成功开启！', 'success')
  } catch (error) {
    console.error(error)
    showToast(`授权失败: ${(error as Error).message}`, 'error')
  } finally {
    isLoading.value = false
    isEnablingSync.value = false
  }
}

/**
 * 断开云同步：
 * - 二次确认
 * - 加载态防止重复操作
 * - 成功后刷新设置，UI 会自动切换到“未同步”态
 */
async function handleDisconnect() {
  showAdvancedSyncMenu.value = false;
  const confirmed = await askConfirm('确定要断开云同步吗？您的数据将保留在云端，但此设备将不再同步。', { type: 'danger' })
  if (!confirmed) return

  isDisconnecting.value = true
  try {
    await syncManager.disconnect()
    await refreshSettings()
    showToast('已断开云同步', 'success')
  } catch (error) {
    showToast(`断开失败: ${(error as Error).message}`, 'error')
  } finally {
    isDisconnecting.value = false
  }
}

/**
 * 立即执行同步
 * - isSyncing 控制“立即同步”按钮的加载/禁用态
 * - 同步成功后刷新设置与云端备份列表（若已启用同步）
 */
async function handleSyncNow() {
  isSyncing.value = true
  try {
    await syncManager.triggerSync()
    await refreshSettings()
    if (settings.value?.syncEnabled) {
      await loadBackupHistory()
    }
    showToast('同步完成！', 'success')
  } catch (error) {
    showToast(`同步失败: ${(error as Error).message}`, 'error')
  } finally {
    isSyncing.value = false
  }
}

// --- Data Vault Methods ---

/**
 * 创建本地数据快照：
 * - 导出 prompts / versions / categories / tags / settings
 * - 以 JSON 文件下载到本地
 */
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

/**
 * 从 JSON 文件导入数据：
 * - 校验基本结构
 * - 二次确认提示不可逆
 * - 成功后刷新页面以确保数据一致性
 */
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

/**
 * 危险操作：清空所有本地数据
 * - 需要输入 DELETE 确认
 * - 成功后刷新页面
 */
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
