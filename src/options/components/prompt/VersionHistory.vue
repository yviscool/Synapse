<template>
  <div class="flex flex-col h-full bg-gray-50/50 border-l border-gray-200 dark:bg-gray-900/50 dark:border-gray-700/50">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
      <h3 class="flex items-center gap-2 font-semibold text-lg text-gray-800 dark:text-gray-200">
        <div class="i-carbon-time text-xl"></div>
        <span>{{ t('prompts.versionHistory.title') }}</span>
        <span v-if="versions.length > 0" class="text-sm font-normal text-gray-500">{{ t('prompts.versionHistory.total', { count: versions.length }) }}</span>
      </h3>
      <div class="flex items-center gap-1">
        <button @click="refreshVersions" :title="t('prompts.versionHistory.refresh')" class="p-2 rounded-md text-gray-500 hover:bg-gray-200/60 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200">
          <div class="i-carbon-refresh text-base"></div>
        </button>
        <button @click="cleanupOldVersions" :title="t('prompts.versionHistory.cleanup')" class="p-2 rounded-md text-gray-500 hover:bg-gray-200/60 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200">
          <div class="i-carbon-clean text-base"></div>
        </button>
      </div>
    </div>
    
    <!-- Timeline -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="versions.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="i-carbon-document-blank text-4xl mb-2"></div>
        <p>{{ t('prompts.versionHistory.noHistory') }}</p>
      </div>
      <div v-else class="relative px-4 py-3">
        <!-- Timeline Line -->
        <div class="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700/60"></div>
        
        <!-- Timeline Items -->
        <div
          v-for="(version, index) in versions"
          :key="version.id"
          class="relative pl-10 pr-2 py-1.5 group"
          @click="selectVersion(version)"
        >
          <!-- Timeline Dot -->
          <div class="absolute left-[22px] top-5 -translate-x-1/2">
            <div
              :class="[
                'rounded-full transition-all duration-200',
                isLatestVersion(version)
                  ? 'w-4 h-4 bg-blue-500 border-4 border-blue-100 ring-4 ring-blue-200 dark:border-blue-400 dark:ring-blue-500/30'
                  : 'w-2.5 h-2.5 bg-gray-300 group-hover:bg-blue-400 dark:bg-gray-600 dark:group-hover:bg-blue-500',
                selectedVersionId === version.id && !isLatestVersion(version) ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''
              ]"
            ></div>
          </div>

          <!-- Version Card -->
          <div
            :class="[
              'border rounded-lg p-3 transition-all duration-200 cursor-pointer',
              'bg-white dark:bg-gray-800/80',
              'border-gray-200/80 dark:border-gray-700/60',
              'group-hover:border-blue-300 group-hover:bg-blue-50/30 dark:group-hover:border-blue-600/70 dark:group-hover:bg-blue-900/10',
              isLatestVersion(version) 
                ? 'border-blue-300 bg-blue-50/60 dark:border-blue-600/80 dark:bg-blue-900/20' 
                : '',
              selectedVersionId === version.id && !isLatestVersion(version) 
                ? 'bg-blue-50/40 dark:bg-blue-800/20' 
                : ''
            ]"
          >
            <div class="flex items-start justify-between">
              <!-- Left Info -->
              <div class="flex flex-col">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">v{{ getVersionNumber(version) }}</span>
                  <span class="text-gray-500 dark:text-gray-400">{{ formatRelativeTime(version.createdAt) }}</span>
                  <span v-if="isLatestVersion(version)" class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium dark:bg-green-900/50 dark:text-green-300">{{ t('prompts.versionHistory.current') }}</span>
                  <span v-if="version.type === 'revert'" class="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium dark:bg-yellow-900/50 dark:text-yellow-300">{{ t('prompts.versionHistory.revert') }}</span>
                </div>
                <div class="text-xs text-gray-400 mt-0.5 dark:text-gray-500">{{ formatDate(version.createdAt) }}</div>
              </div>
              
              <!-- Right Actions (show on hover) -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  @click.stop="compareWithCurrent(version)"
                  :title="t('prompts.versionHistory.compare')"
                  :disabled="isLatestVersion(version)"
                  class="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <div class="i-carbon-compare text-base"></div>
                </button>
                <button
                  @click.stop="handleApplyVersion(version)"
                  :title="t('prompts.versionHistory.revert')"
                  :disabled="isLatestVersion(version)"
                  class="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <div class="i-carbon-undo text-base"></div>
                </button>
                <button
                  @click.stop="deleteVersion(version)"
                  :title="t('prompts.versionHistory.delete')"
                  :disabled="versions.length <= 1"
                  class="p-1.5 rounded-md text-red-500/80 hover:bg-red-100/60 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed dark:text-red-400/80 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                >
                  <div class="i-carbon-trash-can text-base"></div>
                </button>
              </div>
            </div>

            <div v-if="version.note" class="mt-2 text-sm text-gray-700 italic bg-gray-100/50 px-2 py-1 rounded dark:bg-gray-700/50 dark:text-gray-300">{{ version.note }}</div>
            <div class="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-400">{{ getPreview(version.content) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Version Comparison Modal -->
    <div v-if="showComparison" class="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" @click="closeComparison">
      <div class="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden dark:bg-gray-800 dark:border dark:border-gray-700" @click.stop>
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 class="font-semibold text-lg dark:text-white flex items-center gap-2">
            <div class="i-carbon-compare"></div>
            {{ t('prompts.versionHistory.comparisonTitle') }}
          </h3>
          <button @click="closeComparison" class="p-2 rounded-full text-gray-400 hover:bg-gray-200/60 dark:text-gray-500 dark:hover:bg-gray-700/50">
            <div class="i-carbon-close text-lg"></div>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div class="text-center">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">{{ t('prompts.versionHistory.version', { version: getVersionNumber(comparisonData?.oldVersion) }) }}</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(comparisonData?.oldVersion.createdAt || 0) }}</span>
            </div>
            <div class="text-center">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">{{ t('prompts.versionHistory.currentVersion') }}</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(Date.now()) }}</span>
            </div>
          </div>
          
          <div v-if="comparisonData?.diff" class="flex items-center justify-center gap-6 mb-4 text-sm">
            <span class="text-green-600 font-mono dark:text-green-400 flex items-center gap-1"><div class="i-carbon-add-alt"></div>{{ t('prompts.versionHistory.additions', { count: comparisonData.diff.stats.additions }) }}</span>
            <span class="text-red-600 font-mono dark:text-red-400 flex items-center gap-1"><div class="i-carbon-subtract-alt"></div>{{ t('prompts.versionHistory.deletions', { count: comparisonData.diff.stats.deletions }) }}</span>
          </div>
          
          <div v-if="comparisonData?.diff">
            <div 
              v-html="comparisonData.diff.markdownHtml" 
              class="markdown-diff prose prose-sm dark:prose-invert max-w-none"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import { useUI } from '@/stores/ui'
import type { PromptVersion } from '@/types/prompt'
import {
  getVersionHistory,
  compareVersions,
  applyVersion,
  deleteVersion as removeVersion,
  cleanupOldVersions as cleanupVersions
} from '@/utils/versionUtils'

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true
})

interface Props {
  promptId: string
  currentContent: string
}

interface Emits {
  (e: 'version-restored', version: PromptVersion): void
  (e: 'version-deleted', versionId: string): void
  (e: 'preview-version', payload: { version: PromptVersion, versionNumber: number, isLatest: boolean }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t, locale } = useI18n()
const { showToast, askConfirm } = useUI()
type VersionDiffResult = Awaited<ReturnType<typeof compareVersions>>

// Reactive data
const versions = ref<PromptVersion[]>([])
const selectedVersionId = ref<string>()
const showComparison = ref(false)

const comparisonData = ref<{
  oldVersion: PromptVersion
  newContent: string
  diff: VersionDiffResult
} | null>(null)

// Watchers
watch(() => props.promptId, () => {
  loadVersions()
}, { immediate: true })

// Methods
async function loadVersions() {
  if (!props.promptId) {
    versions.value = []
    return
  }

  try {
    versions.value = await getVersionHistory(props.promptId)
    if (!selectedVersionId.value && versions.value.length > 0) {
      selectedVersionId.value = versions.value[0].id
    }
  } catch (error) {
    console.error('Failed to load versions:', error)
    showToast(t('prompts.versionHistory.toast.loadFailed'), 'error')
  }
}

// Helper to determine latest version (兼容旧数据：versionNumber 可能缺失)
function isLatestVersion(version: PromptVersion): boolean {
  if (versions.value.length === 0) return false
  // 使用安全的版本号获取，缺失时回退到 0
  const safeVersionNumber = (v: PromptVersion) => 
    typeof v.versionNumber === 'number' && !isNaN(v.versionNumber) ? v.versionNumber : 0
  const maxVersionNumber = Math.max(...versions.value.map(safeVersionNumber))
  // 如果所有版本都没有版本号，则使用第一个（时间最新）
  if (maxVersionNumber === 0) {
    return version.id === versions.value[0].id
  }
  return safeVersionNumber(version) === maxVersionNumber
}

async function refreshVersions() {
  await loadVersions()
  showToast(t('prompts.versionHistory.toast.refreshed'), 'success')
}

function selectVersion(version: PromptVersion) {
  selectedVersionId.value = version.id
  const vn = getVersionNumber(version)
  const isLatest = isLatestVersion(version)
  emit('preview-version', {
    version,
    versionNumber: typeof vn === 'number' ? vn : 0,
    isLatest
  })
}

async function compareWithCurrent(version: PromptVersion) {
  try {
    const diff = await compareVersions(version.content, props.currentContent)
    comparisonData.value = {
      oldVersion: version,
      newContent: props.currentContent,
      diff
    }
    showComparison.value = true
  } catch (error) {
    console.error('Failed to compare versions:', error)
    showToast(t('prompts.versionHistory.toast.compareFailed'), 'error')
  }
}

async function handleApplyVersion(version: PromptVersion) {
  const versionNumber = version.versionNumber
  const confirmed = await askConfirm(t('prompts.versionHistory.confirm.revert', { version: versionNumber }), { type: 'default' })
  if (!confirmed) return

  try {
    await applyVersion(props.promptId, version.id)
    await loadVersions()
    emit('version-restored', version)
    showToast(t('prompts.versionHistory.toast.revertSuccess', { version: versionNumber }), 'success')
  } catch (error) {
    console.error('Failed to apply version:', error)
    showToast(t('prompts.versionHistory.toast.operationFailed'), 'error')
  }
}

async function deleteVersion(version: PromptVersion) {
  if (versions.value.length <= 1) {
    showToast(t('prompts.versionHistory.toast.deleteOnly'), 'error')
    return
  }
  const versionNumber = version.versionNumber
  const confirmed = await askConfirm(t('prompts.versionHistory.confirm.delete', { version: versionNumber }), { type: 'danger' })
  if (!confirmed) return

  try {
    await removeVersion(version.id)
    await loadVersions()
    emit('version-deleted', version.id)
    showToast(t('prompts.versionHistory.toast.deleteSuccess', { version: versionNumber }), 'success')
  } catch (error) {
    console.error('Failed to delete version:', error)
    showToast(t('prompts.versionHistory.toast.deleteFailed'), 'error')
  }
}

async function cleanupOldVersions() {
  const confirmed = await askConfirm(t('prompts.versionHistory.confirm.cleanup'), { type: 'danger' })
  if (!confirmed) return

  try {
    await cleanupVersions(props.promptId, 10)
    await loadVersions()
    showToast(t('prompts.versionHistory.toast.cleanupSuccess'), 'success')
  } catch (error) {
    console.error('Failed to cleanup versions:', error)
    showToast(t('prompts.versionHistory.toast.cleanupFailed'), 'error')
  }
}

function closeComparison() {
  showComparison.value = false
  comparisonData.value = null
}

// 获取版本号显示文本（兼容旧数据）
function getVersionNumber(version?: PromptVersion): number | string {
  if (!version) return 0
  if (typeof version.versionNumber === 'number' && !isNaN(version.versionNumber)) {
    return version.versionNumber
  }
  // 旧数据：使用在列表中的位置（从后往前计数）
  const index = versions.value.findIndex(v => v.id === version.id)
  return index >= 0 ? versions.value.length - index : '?'
}

function getPreview(content: string): string {
  const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return textContent.length > 120 ? textContent.substring(0, 120) + '...' : textContent
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(timestamp))
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return ''
  const now = new Date()
  const past = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 }
  ]

  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })

  for (const { unit, seconds } of units) {
    const interval = diffInSeconds / seconds
    if (interval >= 1) {
      return rtf.format(-Math.floor(interval), unit)
    }
  }
  return '刚刚'
}

const handleEsc = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showComparison.value) {
    e.stopPropagation()
    closeComparison()
  }
}

// Lifecycle
onMounted(() => {
  loadVersions()
  window.addEventListener('keydown', handleEsc, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc, true)
})
</script>

<style scoped>
/* Markdown Diff Styles */
.markdown-diff :deep(.diff-addition) {
  @apply bg-green-50 border-l-4 border-green-400 px-3 my-2 rounded-r-md text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-200;
}
.markdown-diff :deep(.diff-deletion) {
  @apply bg-red-50 border-l-4 border-red-400 px-3 my-2 rounded-r-md text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200 line-through;
}
.markdown-diff :deep(.diff-unchanged) {
  @apply bg-transparent border-l-4 border-gray-300 px-3 my-2 rounded-r-md text-gray-600 dark:border-gray-600 dark:text-gray-400 opacity-70;
}
</style>
