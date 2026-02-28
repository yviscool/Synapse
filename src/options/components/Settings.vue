<template>
  <div class="flex h-full">
    <!-- Left Sidebar -->
    <aside class="w-48 bg-gray-50 dark:bg-gray-800 border-r p-4">
      <nav class="space-y-2">
        <button
          @click="activeTab = 'general'"
          :class="['w-full text-left px-4 py-2 rounded-lg transition-colors', activeTab === 'general' ? 'bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-700']"
        >
          {{ t('menu.generalSettings') }}
        </button>
        <button
          @click="activeTab = 'data'"
          :class="['w-full text-left px-4 py-2 rounded-lg transition-colors', activeTab === 'data' ? 'bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-blue-200' : 'hover:bg-gray-200 dark:hover:bg-gray-700']"
        >
          {{ t('menu.dataManagement') }}
        </button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-4 md:p-8 overflow-y-auto">
      <div v-if="isLoading" class="text-center text-gray-500 dark:text-gray-400">
        <p>{{ t('common.loading') }}</p>
      </div>

      <!-- General Settings -->
      <div v-show="!isLoading && activeTab === 'general'" class="max-w-2xl mx-auto space-y-6">
        <!-- Theme (card-style) -->
        <div class="p-6 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl bg-white dark:bg-gray-900/80 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{{ t('settings.theme.title') }}</h3>
          <div class="mt-5 grid grid-cols-3 gap-3">
            <button
              v-for="option in themeOptions" :key="option.value"
              @click="handleThemeChange(option.value)"
              :class="['relative flex flex-col items-center gap-2.5 pt-3 pb-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group',
                settings?.theme === option.value
                  ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 ring-1 ring-blue-500/20'
                  : 'border-gray-200 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm']"
            >
              <!-- Mini window preview -->
              <div class="w-[calc(100%-1.25rem)] mx-auto">
                <!-- Light preview -->
                <div v-if="option.value === 'light'" class="aspect-[3/2] rounded-lg border border-gray-200 overflow-hidden bg-white">
                  <div class="h-1.5 bg-gray-100 border-b border-gray-200 flex items-center px-1 gap-px">
                    <i class="w-[3px] h-[3px] rounded-full bg-red-300 not-italic"></i>
                    <i class="w-[3px] h-[3px] rounded-full bg-yellow-300 not-italic"></i>
                    <i class="w-[3px] h-[3px] rounded-full bg-green-300 not-italic"></i>
                  </div>
                  <div class="p-1.5 space-y-[3px]">
                    <div class="h-[3px] w-4/5 bg-gray-200 rounded-full"></div>
                    <div class="h-[3px] w-3/5 bg-gray-100 rounded-full"></div>
                    <div class="h-[3px] w-2/3 bg-gray-100 rounded-full"></div>
                  </div>
                </div>
                <!-- Dark preview -->
                <div v-else-if="option.value === 'dark'" class="aspect-[3/2] rounded-lg border border-gray-700 overflow-hidden bg-gray-900">
                  <div class="h-1.5 bg-gray-800 border-b border-gray-700 flex items-center px-1 gap-px">
                    <i class="w-[3px] h-[3px] rounded-full bg-red-400/60 not-italic"></i>
                    <i class="w-[3px] h-[3px] rounded-full bg-yellow-400/60 not-italic"></i>
                    <i class="w-[3px] h-[3px] rounded-full bg-green-400/60 not-italic"></i>
                  </div>
                  <div class="p-1.5 space-y-[3px]">
                    <div class="h-[3px] w-4/5 bg-gray-700 rounded-full"></div>
                    <div class="h-[3px] w-3/5 bg-gray-800 rounded-full"></div>
                    <div class="h-[3px] w-2/3 bg-gray-800 rounded-full"></div>
                  </div>
                </div>
                <!-- Auto preview (split) -->
                <div v-else class="aspect-[3/2] rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden flex">
                  <div class="w-1/2 bg-white border-r border-gray-200">
                    <div class="h-1.5 bg-gray-100 border-b border-gray-200 flex items-center pl-1 gap-px">
                      <i class="w-[3px] h-[3px] rounded-full bg-red-300 not-italic"></i>
                      <i class="w-[3px] h-[3px] rounded-full bg-yellow-300 not-italic"></i>
                    </div>
                    <div class="p-1 space-y-[3px]">
                      <div class="h-[3px] w-4/5 bg-gray-200 rounded-full"></div>
                      <div class="h-[3px] w-3/5 bg-gray-100 rounded-full"></div>
                    </div>
                  </div>
                  <div class="w-1/2 bg-gray-900">
                    <div class="h-1.5 bg-gray-800 border-b border-gray-700 flex items-center pl-1 gap-px">
                      <i class="w-[3px] h-[3px] rounded-full bg-green-400/60 not-italic"></i>
                    </div>
                    <div class="p-1 space-y-[3px]">
                      <div class="h-[3px] w-4/5 bg-gray-700 rounded-full"></div>
                      <div class="h-[3px] w-3/5 bg-gray-800 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <span :class="['text-sm font-medium transition-colors',
                settings?.theme === option.value
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200']">{{ option.label }}</span>
              <div v-if="settings?.theme === option.value" class="absolute top-1.5 right-1.5">
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
              </div>
            </button>
          </div>
        </div>
        <!-- Language (dropdown) -->
        <div class="p-6 border border-gray-200/80 dark:border-gray-700/60 rounded-2xl bg-white dark:bg-gray-900/80 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight">{{ t('settings.language.title') }}</h3>
          <div class="mt-4">
            <div class="relative">
              <select
                :value="settings?.locale"
                @change="handleLocaleChange(($event.target as HTMLSelectElement).value as LocaleOption)"
                class="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none transition-shadow cursor-pointer"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
                <option disabled class="text-gray-300">──────────</option>
                <option value="zh-TW">繁體中文</option>
                <option value="de">Deutsch</option>
                <option value="ja-JP">日本語</option>
                <option value="ko">한국어</option>
                <option value="ru-RU">Русский</option>
                <option disabled class="text-gray-300">──────────</option>
                <option value="system">{{ t('settings.language.followSystem') }}</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
            <p v-if="settings && settings.locale === 'system'" class="text-xs text-gray-500 dark:text-gray-400 mt-2.5 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ t('settings.language.currentSystem', { lang: systemLanguageLabel }) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Data Management -->
      <div v-show="!isLoading && activeTab === 'data'" class="max-w-4xl mx-auto space-y-8">
        <!-- Cloud Sync -->
        <div class="p-6 border rounded-xl bg-white dark:bg-gray-900 shadow-sm transition-all">
          <!-- State B: Sync Enabled -->
          <div v-if="settings?.syncEnabled && settings.userProfile" class="space-y-4">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ t('settings.sync.status.enabled') }}</h3>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {{ t('settings.sync.status.connected') }}
                  </span>
                </div>
                <div class="flex items-center space-x-3 mt-3">
                  <img v-if="settings.userProfile.picture" :src="settings.userProfile.picture" alt="User Avatar" class="w-10 h-10 rounded-full">
                  <div class="flex-grow">
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">{{ settings.userProfile.email }}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400" :title="t('settings.sync.status.lastSync', { time: formatTimestamp(settings.lastSyncTimestamp) })">
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
                  <button @click="showAdvancedSyncMenu = !showAdvancedSyncMenu" class="p-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>
                  </button>
                  <div v-if="showAdvancedSyncMenu" @click="showAdvancedSyncMenu = false" class="fixed inset-0 z-10"></div>
                  <div v-if="showAdvancedSyncMenu" class="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-20 border">
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
            <div class="mx-auto bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{{ t('settings.sync.enable.title') }}</h3>
            <p class="text-gray-600 dark:text-gray-300 max-w-md mx-auto">{{ t('settings.sync.enable.description') }}</p>
            <div class="pt-4">
              <button
                @click="handleEnableSync('google-drive')"
                :disabled="isEnablingSync"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isEnablingSync ? t('common.loading') : t('settings.sync.enable.button') }}
              </button>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">{{ t('settings.sync.enable.provider') }}</p>
            </div>
          </div>
        </div>

        <!-- Data Vault -->
        <details class="p-6 border rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          <summary class="text-lg font-semibold text-gray-800 dark:text-gray-200 cursor-pointer">{{ t('settings.data.title') }}</summary>
          <div class="mt-6 border-t pt-6 space-y-6">
            <!-- Cloud Time Machine -->
            <div v-if="settings?.syncEnabled" class="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div class="flex justify-between items-center">
                <h4 class="font-semibold text-gray-800 dark:text-gray-200">{{ t('settings.data.backup.title') }}</h4>
                <button @click="loadBackupHistory" :disabled="isHistoryLoading" class="px-3 py-1 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
                  {{ isHistoryLoading ? t('common.loading') : t('settings.data.backup.refresh') }}
                </button>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ t('settings.data.backup.description') }}</p>
              <ul v-if="backupHistory.length > 0" class="mt-4 space-y-2">
                <li v-for="file in backupHistory" :key="file.id" class="flex items-center justify-between p-3 rounded-md bg-white dark:bg-gray-900 border">
                  <div>
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200" :title="formatBackupName(file)">{{ formatRelativeTime(file) }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatFileSize(file.size) }}</p>
                  </div>
                  <div class="flex gap-2">
                    <button @click="handleRestoreFromCloud(file.id)" class="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700">{{ t('settings.data.backup.restore') }}</button>
                    <button @click="handleDownloadFromCloud(file.id, file.name)" class="px-3 py-1 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800">{{ t('settings.data.backup.download') }}</button>
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
              <p v-else-if="!isHistoryLoading" class="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">{{ t('settings.data.backup.noHistory') }}</p>
            </div>

            <!-- Local Snapshot -->
            <div>
              <h4 class="font-semibold text-gray-800 dark:text-gray-200">{{ t('settings.data.local.title') }}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">{{ t('settings.data.local.description') }}</p>
              <div class="flex gap-4 flex-wrap mt-3">
                <button @click="exportData" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  {{ t('settings.data.local.create') }}
                </button>
                <div class="relative">
                  <input ref="importInput" type="file" accept=".json" @change="importData" class="hidden">
                  <button @click="importInput?.click()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
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
                  <button @click="showResetConfirmation = false; resetConfirmationText = ''" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
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
import { ref, onMounted, computed, toRaw, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useUI } from '@/stores/ui'
import { db, getSettings } from '@/stores/db'
import { repository } from '@/stores/repository'
import { syncManager, type SyncRunResult } from '@/stores/sync'
import { type LocalePreference, type SupportedLocale } from '@/types/i18n'
import type { Settings } from '@/types/prompt'
import { resolveLocalePreference, resolveSystemLocale } from '@/utils/locale'
import { optionsThemeKey } from '@/options/composables/useOptionsTheme'

type LocaleOption = LocalePreference;
type ThemeOption = Settings["theme"];

interface DriveFile {
  id: string;
  name: string;
  size?: string;
  modifiedTime?: string;
}

const { t, locale } = useI18n()
const { showToast, askConfirm } = useUI()
const optionsTheme = inject(optionsThemeKey, null)

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
const { start: startReloadDelay, stop: stopReloadDelay } = useTimeoutFn(() => {
  window.location.reload()
}, 1500, { immediate: false })

const LOCALE_NAME_KEY_MAP: Record<SupportedLocale, string> = {
  'zh-CN': 'zhCN',
  'zh-TW': 'zhTW',
  en: 'en',
  de: 'de',
  'ja-JP': 'jaJP',
  ko: 'ko',
  'ru-RU': 'ruRU',
}

function getLocaleLabel(value: SupportedLocale): string {
  return t(`settings.language.localeNames.${LOCALE_NAME_KEY_MAP[value]}`)
}

function scheduleReload() {
  stopReloadDelay()
  startReloadDelay()
}

function downloadJsonFile(fileName: string, data: unknown) {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const themeOptions = computed<Array<{ value: ThemeOption; label: string }>>(() => [
  { value: 'light', label: t('settings.theme.light') },
  { value: 'dark', label: t('settings.theme.dark') },
  { value: 'auto', label: t('settings.theme.followSystem') },
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

async function handleThemeChange(newTheme: ThemeOption) {
  if (settings.value) {
    const previousSettings = toRaw(settings.value)
    const previousTheme = previousSettings.theme

    settings.value = { ...settings.value, theme: newTheme } as Settings
    optionsTheme?.applyThemePreference(newTheme === 'light' || newTheme === 'dark' || newTheme === 'auto' ? newTheme : 'auto')

    const result = await repository.setSettings({ ...previousSettings, theme: newTheme })
    if (!result.ok) {
      settings.value = { ...settings.value, theme: previousTheme } as Settings
      optionsTheme?.applyThemePreference(
        previousTheme === 'light' || previousTheme === 'dark' || previousTheme === 'auto' ? previousTheme : 'auto',
      )
      showToast(t('common.toast.saveFailed'), 'error')
      return
    }

    await refreshSettings()
    showToast(t('common.toast.saveSuccess'), 'success')
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
    scheduleReload();
  } catch (error) {
    showToast(`${t('common.error')}: ${(error as Error).message}`, 'error');
  }
}

async function handleDownloadFromCloud(fileId: string, fileName: string) {
  showToast(t('common.loading'), 'success');
  try {
    const data = await syncManager.downloadCloudBackup(fileId);
    downloadJsonFile(fileName, data);

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
      // Prompts
      prompts: await db.prompts.toArray(),
      prompt_versions: await db.prompt_versions.toArray(),
      categories: await db.categories.toArray(),
      tags: await db.tags.toArray(),
      // Snippets
      snippets: await db.snippets.toArray(),
      snippet_folders: await db.snippet_folders.toArray(),
      snippet_tags: await db.snippet_tags.toArray(),
      // Chats
      chat_conversations: await db.chat_conversations.toArray(),
      chat_tags: await db.chat_tags.toArray(),
      // Meta
      settings: await getSettings(),
      exportTime: new Date().toISOString(),
      version: '2.0.0'
    };

    downloadJsonFile(`Synapse-backup-${new Date().toISOString().split('T')[0]}.json`, exportObject);
    
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
    
    if (!importedData.prompts && !importedData.snippets && !importedData.chat_conversations && !importedData.settings) {
      throw new Error(t('settings.data.local.invalidFileError'))
    }

    const confirmed = await askConfirm(t('settings.sync.confirmation.restore'), { type: 'danger' })
    if (!confirmed) return

    const { ok, error } = await repository.importDataFromBackup(importedData)

    if (ok) {
      showToast(t('common.toast.operationSuccess'), 'success')
      scheduleReload()
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
      scheduleReload()
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
