<template>
  <div class="flex h-full">
    <!-- Left Sidebar -->
    <aside class="w-48 bg-gray-50 border-r p-4">
      <nav class="space-y-2">
        <button
          @click="activeTab = 'general'"
          :class="['w-full text-left px-4 py-2 rounded-lg transition-colors', activeTab === 'general' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200']"
        >
          {{ t('menu.generalSettings') }}
        </button>
        <button
          @click="activeTab = 'data'"
          :class="['w-full text-left px-4 py-2 rounded-lg transition-colors', activeTab === 'data' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200']"
        >
          {{ t('menu.dataManagement') }}
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-8 overflow-y-auto">
      <div v-if="isLoading" class="text-center text-gray-500">
        <p>{{ t('common.loading') }}</p>
      </div>

      <!-- General Settings -->
      <div v-show="!isLoading && activeTab === 'general'" class="max-w-4xl mx-auto space-y-8">
        <div class="p-6 border rounded-xl bg-white shadow-sm">
          <h3 class="text-lg font-semibold text-gray-900">{{ t('settings.language.title') }}</h3>
          <div class="mt-4 space-y-4">
            <div v-for="option in languageOptions" :key="option.value" class="flex items-center">
              <input
                :id="`lang-${option.value}`"
                name="language-selection"
                type="radio"
                :value="option.value"
                :checked="settings && settings.locale === option.value"
                @change="handleLocaleChange(option.value)"
                class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              >
              <label :for="`lang-${option.value}`" class="ml-3 block text-sm font-medium text-gray-700">
                {{ option.label }}
              </label>
            </div>
            <p v-if="settings && settings.locale === 'system'" class="text-sm text-gray-500 mt-2 ml-7">
              {{ t('settings.language.currentSystem', { lang: systemLanguageLabel }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div v-show="!isLoading && activeTab === 'data'" class="max-w-4xl mx-auto space-y-8">
        <!-- Cloud Sync -->
        <div class="p-6 border rounded-xl bg-white shadow-sm transition-all">
          <!-- State B: Sync Enabled -->
          <div v-if="settings?.syncEnabled && settings.userProfile" class="space-y-4">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-gray-900">{{ t('settings.sync.status.enabled') }}</h3>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {{ t('settings.sync.status.connected') }}
                  </span>
                </div>
                <div class="flex items-center space-x-3 mt-3">
                  <img v-if="settings.userProfile.picture" :src="settings.userProfile.picture" alt="User Avatar" class="w-10 h-10 rounded-full">
                  <div class="flex-grow">
                    <p class="text-sm font-semibold text-gray-700">{{ settings.userProfile.email }}</p>
                    <p class="text-sm text-gray-500" :title="t('settings.sync.status.lastSync', { time: formatTimestamp(settings.lastSyncTimestamp) })">
                      {{ syncStatusText }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button @click="handleSyncNow" :disabled="isSyncing" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm">
                  <span v-if="isSyncing" class="flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {{ t('settings.sync.status.syncing') }}
                  </span>
                  <span v-else>{{ t('settings.sync.status.syncNow') }}</span>
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
                      {{ isDisconnecting ? t('settings.sync.status.disconnecting') : t('settings.sync.status.disconnect') }}
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
            <h3 class="text-xl font-semibold text-gray-900">{{ t('settings.sync.enable.title') }}</h3>
            <p class="text-gray-600 max-w-md mx-auto">{{ t('settings.sync.enable.description') }}</p>
            <div class="pt-4">
              <button
                @click="handleEnableSync('google-drive')"
                :disabled="isEnablingSync"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isEnablingSync ? t('common.loading') : t('settings.sync.enable.button') }}
              </button>
              <p class="text-xs text-gray-500 mt-2">{{ t('settings.sync.enable.provider') }}</p>
            </div>
          </div>
        </div>

        <!-- Data Vault -->
        <details class="p-6 border rounded-xl bg-white shadow-sm">
          <summary class="text-lg font-semibold text-gray-800 cursor-pointer">{{ t('settings.data.title') }}</summary>
          <div class="mt-6 border-t pt-6 space-y-6">
            <!-- Cloud Time Machine -->
            <div v-if="settings?.syncEnabled" class="p-4 border rounded-lg bg-gray-50">
              <div class="flex justify-between items-center">
                <h4 class="font-semibold text-gray-800">{{ t('settings.data.backup.title') }}</h4>
                <button @click="loadBackupHistory" :disabled="isHistoryLoading" class="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50">
                  {{ isHistoryLoading ? t('common.loading') : t('settings.data.backup.refresh') }}
                </button>
              </div>
              <p class="text-sm text-gray-500 mt-2">{{ t('settings.data.backup.description') }}</p>
              <ul v-if="backupHistory.length > 0" class="mt-4 space-y-2">
                <li v-for="file in backupHistory" :key="file.id" class="flex items-center justify-between p-3 rounded-md bg-white border">
                  <div>
                    <p class="text-sm font-semibold text-gray-800" :title="formatBackupName(file)">{{ formatRelativeTime(file) }}</p>
                    <p class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="handleRestoreFromCloud(file.id)" class="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">{{ t('settings.data.backup.restore') }}</button>
                    <button @click="handleDownloadFromCloud(file.id, file.name)" class="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">{{ t('settings.data.backup.download') }}</button>
                    <button
                      @click="handleDeleteFromCloud(file.id)"
                      :disabled="isDeletingMap[file.id]"
                      class="px-3 py-1 text-sm text-red-600 bg-transparent rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{ isDeletingMap[file.id] ? t('common.deleting') : t('common.delete') }}
                    </button>
                  </div>
                </li>
              </ul>
              <p v-else-if="!isHistoryLoading" class="text-sm text-gray-500 mt-4 text-center">{{ t('settings.data.backup.noHistory') }}</p>
            </div>

            <!-- Local Snapshot -->
            <div>
              <h4 class="font-semibold text-gray-800">{{ t('settings.data.local.title') }}</h4>
              <p class="text-sm text-gray-600 mt-2">{{ t('settings.data.local.description') }}</p>
              <div class="flex gap-4 flex-wrap mt-3">
                <button @click="exportData" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  {{ t('settings.data.local.create') }}
                </button>
                <div class="relative">
                  <input ref="importInput" type="file" accept=".json" @change="importData" class="hidden">
                  <button @click="importInput?.click()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    {{ t('settings.data.local.import') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <div class="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
              <h4 class="font-semibold text-red-800">{{ t('settings.data.danger.title') }}</h4>
              <div v-if="!showResetConfirmation">
                <p class="text-sm text-red-600 mt-1">{{ t('settings.data.danger.description') }}</p>
                <button @click="showResetConfirmation = true" class="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  {{ t('settings.data.danger.button') }}
                </button>
              </div>
              <div v-else class="space-y-3">
                <p class="text-sm font-semibold text-red-800">{{ t('settings.data.danger.confirm') }}</p>
                <input v-model="resetConfirmationText" type="text" class="w-full px-3 py-2 border border-red-400 rounded-md focus:ring-red-500 focus:border-red-500" :placeholder="t('settings.data.danger.confirmPlaceholder')">
                <div class="flex gap-4">
                  <button @click="executeResetData" :disabled="resetConfirmationText !== 'DELETE'" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ t('settings.data.danger.confirmButton') }}
                  </button>
                  <button @click="showResetConfirmation = false; resetConfirmationText = ''" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    {{ t('common.cancel') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, toRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUI } from '@/stores/ui'
import { db, getSettings } from '@/stores/db'
import { repository } from '@/stores/repository'
import { syncManager, type SyncRunResult } from '@/stores/sync'
import { SUPPORTED_LOCALES, type LocalePreference, type SupportedLocale } from '@/types/i18n'
import type { Settings } from '@/types/prompt'
import { resolveLocalePreference, resolveSystemLocale } from '@/utils/locale'

type LocaleOption = LocalePreference;

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

const { t, locale } = useI18n()
const { showToast, askConfirm } = useUI()

const activeTab = ref('general')
const importInput = ref<HTMLInputElement>()
const settings = ref<Settings | null>(null)
const isLoading = ref(true)
const isSyncing = ref(false)
const isHistoryLoading = ref(false)
const backupHistory = ref<DriveFile[]>([])
const isDeletingMap = ref<Record<string, boolean>>({})
const isEnablingSync = ref(false)
const isDisconnecting = ref(false)
const showAdvancedSyncMenu = ref(false)
const showResetConfirmation = ref(false)
const resetConfirmationText = ref('')

const LOCALE_NAME_KEY_MAP: Record<SupportedLocale, string> = {
  'zh-CN': 'zhCN',
  en: 'en',
  'ja-JP': 'jaJP',
  'ru-RU': 'ruRU',
}

function getLocaleLabel(value: SupportedLocale): string {
  return t(`settings.language.localeNames.${LOCALE_NAME_KEY_MAP[value]}`)
}

const languageOptions = computed<Array<{ value: LocaleOption; label: string }>>(() => [
  ...SUPPORTED_LOCALES.map((value) => ({
    value,
    label: getLocaleLabel(value),
  })),
  { value: 'system', label: t('settings.language.followSystem') },
]);

const systemLocale = computed<SupportedLocale>(() => resolveSystemLocale())
const systemLanguageLabel = computed(() => getLocaleLabel(systemLocale.value))

onMounted(async () => {
  await refreshSettings()
  isLoading.value = false
  if (settings.value?.syncEnabled) {
    loadBackupHistory();
  }
})

async function refreshSettings() {
  const currentSettings = await getSettings()
  // 确保设置对象是纯 JavaScript 对象
  const nextSettings = JSON.parse(JSON.stringify(currentSettings)) as Settings
  settings.value = nextSettings
  locale.value = resolveLocalePreference(nextSettings.locale)
}

async function handleLocaleChange(newLocale: LocaleOption) {
  if (settings.value) {
    // 使用 toRaw 确保传递纯 JavaScript 对象，避免 DataCloneError
    const rawSettings = toRaw(settings.value)
    const newSettings = { ...rawSettings, locale: newLocale }
    await repository.setSettings(newSettings);
    await refreshSettings();
    showToast(t('common.toast.saveSuccess'), 'success');
  }
}

const syncStatusText = computed(() => {
  if (isSyncing.value) return t('settings.sync.status.syncing')
  const timestamp = settings.value?.lastSyncTimestamp
  if (!timestamp) return t('settings.sync.status.never')

  const now = Date.now()
  const diffSeconds = Math.round((now - timestamp) / 1000)
  
  if (diffSeconds < 5) return t('settings.sync.status.justNow')
  if (diffSeconds < 60) return t('settings.sync.status.minutesAgo', { minutes: Math.round(diffSeconds / 60) || 1 })
  
  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return t('settings.sync.status.minutesAgo', { minutes: diffMinutes })

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return t('settings.sync.status.hoursAgo', { hours: diffHours })

  const diffDays = Math.round(diffHours / 24)
  return t('settings.sync.status.daysAgo', { days: diffDays })
})

function formatTimestamp(timestamp?: number): string {
  if (!timestamp) return t('settings.sync.status.never')
  return new Date(timestamp).toLocaleString(locale.value)
}

const BACKUP_FILE_PREFIX = 'synapse-backup-';

function parseDateFromBackupName(fileName: string): Date | null {
  const cleanName = fileName.replace(BACKUP_FILE_PREFIX, '').replace('.json', '');
  const strictMatch = cleanName.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
  if (strictMatch) {
    const [, year, month, day, hour, minute, second] = strictMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
  }

  const fallback = new Date(cleanName.replace('_', 'T'));
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatLocalizedDate(date: Date, withTime = true): string {
  const optsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const optsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const opts: Intl.DateTimeFormatOptions = withTime ? { ...optsDate, ...optsTime } : optsDate;
  return new Intl.DateTimeFormat(locale.value, opts).format(date);
}

function resolveBackupDate(file: DriveFile): Date | null {
  if (file.modifiedTime) {
    const modifiedDate = new Date(file.modifiedTime);
    if (!isNaN(modifiedDate.getTime())) {
      return modifiedDate;
    }
  }
  return parseDateFromBackupName(file.name);
}

function formatBackupName(file: DriveFile): string {
  const date = resolveBackupDate(file);
  return date ? formatLocalizedDate(date, true) : file.name;
}

function formatRelativeTime(file: DriveFile): string {
  const date = resolveBackupDate(file);
  if (!date) return file.name;

  const now = new Date();
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffSeconds < 60) return t('settings.sync.status.justNow')

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return t('settings.sync.status.minutesAgo', { minutes: diffMinutes || 1 })

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return t('settings.sync.status.hoursAgo', { hours: diffHours })

  const diffDays = Math.round(diffHours / 24);
  if (diffDays <= 7) return t('settings.sync.status.daysAgo', { days: diffDays })
  
  return formatLocalizedDate(date, false);
}

function getSyncResultMessage(result: SyncRunResult): string {
  if (result.action === 'uploaded') return t('settings.sync.toast.uploaded')
  if (result.action === 'downloaded') return t('settings.sync.toast.downloaded')
  if (result.action === 'skipped-empty') return t('settings.sync.toast.skippedEmpty')
  return t('settings.sync.toast.upToDate')
}

function formatFileSize(bytes?: string | number): string {
  if (bytes === undefined || bytes === null) return '';
  const numBytes = Number(bytes);
  if (isNaN(numBytes) || numBytes === 0) return '0 B';
  const i = Math.floor(Math.log(numBytes) / Math.log(1024));
  return `${parseFloat((numBytes / Math.pow(1024, i)).toFixed(2))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

async function loadBackupHistory() {
  isHistoryLoading.value = true;
  try {
    backupHistory.value = await syncManager.listCloudBackups();
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error');
  } finally {
    isHistoryLoading.value = false;
  }
}

async function handleRestoreFromCloud(fileId: string) {
  const confirmed = await askConfirm(t('settings.sync.confirmation.restore'), { type: 'danger' });
  if (!confirmed) return;

  showToast(t('common.loading'), 'success');
  try {
    await syncManager.restoreFromCloudBackup(fileId);
    await refreshSettings();
    showToast(t('common.toast.operationSuccess'), 'success');
    setTimeout(() => window.location.reload(), 1500);
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error');
  }
}

async function handleDownloadFromCloud(fileId: string, fileName: string) {
  showToast(t('common.loading'), 'success');
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

    showToast(t('common.toast.operationSuccess'), 'success');
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error');
  }
}

async function handleDeleteFromCloud(fileId: string) {
  const confirmed = await askConfirm(t('settings.sync.confirmation.deleteBackup'), { type: 'danger' });
  if (!confirmed) return;

  isDeletingMap.value[fileId] = true;
  showToast(t('common.loading'), 'success');
  try {
    await syncManager.deleteCloudBackup(fileId);
    await loadBackupHistory();
    showToast(t('common.toast.deleteSuccess'), 'success');
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error');
  } finally {
    isDeletingMap.value[fileId] = false;
  }
}

async function handleEnableSync(provider: 'google-drive') {
  const confirmed = await askConfirm(t('settings.sync.confirmation.enable'), { type: 'default' })
  if (!confirmed) return

  isLoading.value = true
  isEnablingSync.value = true
  try {
    const result = await syncManager.enableSync(provider)
    await refreshSettings()
    if (settings.value?.syncEnabled) {
      await loadBackupHistory()
    }
    showToast(getSyncResultMessage(result), 'success')
  } catch (error) {
    console.error(error)
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error')
  } finally {
    isLoading.value = false
    isEnablingSync.value = false
  }
}

async function handleDisconnect() {
  showAdvancedSyncMenu.value = false;
  const confirmed = await askConfirm(t('settings.sync.confirmation.disconnect'), { type: 'danger' })
  if (!confirmed) return

  isDisconnecting.value = true
  try {
    await syncManager.disconnect()
    await refreshSettings()
    showToast(t('common.toast.operationSuccess'), 'success')
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error')
  } finally {
    isDisconnecting.value = false
  }
}

async function handleSyncNow() {
  isSyncing.value = true
  try {
    const result = await syncManager.triggerSync()
    await refreshSettings()
    if (settings.value?.syncEnabled) {
      await loadBackupHistory()
    }
    showToast(getSyncResultMessage(result), 'success')
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error')
  } finally {
    isSyncing.value = false
  }
}

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
    
    showToast(t('common.toast.saveSuccess'), 'success');
  } catch (error) {
    console.error('Export failed:', error);
    showToast(t('common.error'), 'error');
  }
}

const importData = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const importedData = JSON.parse(text)
    
    if (!importedData.prompts && !importedData.settings) {
      throw new Error(t('settings.data.local.invalidFileError'))
    }

    const confirmed = await askConfirm(t('settings.sync.confirmation.restore'), { type: 'danger' })
    if (!confirmed) return

    const { ok, error } = await repository.importDataFromBackup(importedData)

    if (ok) {
      showToast(t('common.toast.operationSuccess'), 'success')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      throw error
    }

  } catch (error) {
    console.error('Import failed:', error)
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error')
  } finally {
    if (importInput.value) importInput.value.value = ''
  }
}

const executeResetData = async () => {
  if (resetConfirmationText.value !== 'DELETE') {
    showToast(t('settings.data.danger.confirmPlaceholder'), 'error');
    return;
  }

  try {
    const { ok, error } = await repository.resetAllData()
    if (ok) {
      showToast(t('common.toast.operationSuccess'), 'success')
      setTimeout(() => window.location.reload(), 1500)
    } else {
      throw error
    }
  } catch (error) {
    console.error('Reset failed:', error)
    showToast(t('common.error'), 'error')
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
