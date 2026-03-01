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
                  <span class="font-mono font-semibold text-blue-600 whitespace-nowrap shrink-0 dark:text-blue-400">v{{ getVersionNumber(version) }}</span>
                  <span class="text-gray-500 whitespace-nowrap shrink-0 dark:text-gray-400">{{ formatRelativeTime(version.createdAt) }}</span>
                  <span v-if="isLatestVersion(version)" class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium whitespace-nowrap shrink-0 dark:bg-green-900/50 dark:text-green-300">{{ t('prompts.versionHistory.current') }}</span>
                  <span v-if="version.type === 'revert'" class="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium whitespace-nowrap shrink-0 dark:bg-yellow-900/50 dark:text-yellow-300">{{ t('prompts.versionHistory.revert') }}</span>
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
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">{{ t('prompts.versionHistory.version', { version: getVersionNumber(comparisonData?.newVersion) }) }}</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(comparisonData?.newVersion.createdAt || 0) }}</span>
            </div>
          </div>
          
          <div v-if="comparisonData?.diff" class="flex items-center justify-center gap-6 mb-4 text-sm">
            <span class="text-green-600 font-mono dark:text-green-400 flex items-center gap-1"><div class="i-carbon-add-alt"></div>{{ t('prompts.versionHistory.additions', { count: comparisonData.diff.stats.additions }) }}</span>
            <span class="text-red-600 font-mono dark:text-red-400 flex items-center gap-1"><div class="i-carbon-subtract-alt"></div>{{ t('prompts.versionHistory.deletions', { count: comparisonData.diff.stats.deletions }) }}</span>
          </div>
          
          <div v-if="comparisonData?.diff">
            <div 
              ref="comparisonContentRef"
              v-html="comparisonData.diff.markdownHtml" 
              class="markdown-diff prose prose-sm dark:prose-invert max-w-none"
              @click="handleComparisonMarkdownClick"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutationObserver } from '@vueuse/core'
import { useUI } from '@/stores/ui'
import type { PromptVersion } from '@/types/prompt'
import { handleMarkdownCodeCopyClick, handleMermaidBlockClick, renderMermaidInElement, reRenderMermaidInElement, setMarkdownCodeCopyLabels } from '@/utils/markdown'
import { formatRelativeTime } from '@/utils/intl'
import {
  getVersionHistory,
  compareVersions,
  applyVersion,
  deleteVersion as removeVersion,
  cleanupOldVersions as cleanupVersions
} from '@/utils/versionUtils'

interface Props {
  promptId: string
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
const comparisonContentRef = ref<HTMLElement | null>(null)

const comparisonData = ref<{
  oldVersion: PromptVersion
  newVersion: PromptVersion
  newContent: string
  diff: VersionDiffResult
} | null>(null)

const headVersionId = computed<string | undefined>(() => {
  if (versions.value.length === 0) return undefined
  const first = versions.value[0]
  const head = versions.value.reduce((best, current) => {
    const bestNumber = Number.isFinite(best.versionNumber) ? best.versionNumber : Number.NEGATIVE_INFINITY
    const currentNumber = Number.isFinite(current.versionNumber) ? current.versionNumber : Number.NEGATIVE_INFINITY

    if (currentNumber !== bestNumber) {
      return currentNumber > bestNumber ? current : best
    }
    if (current.createdAt !== best.createdAt) {
      return current.createdAt > best.createdAt ? current : best
    }
    return best
  }, first)
  return head.id
})

// Watchers
watch(() => props.promptId, () => {
  loadVersions()
}, { immediate: true })

watch([showComparison, comparisonData], async ([visible, data]) => {
  if (!visible || !data?.diff) return
  await nextTick()
  await renderMermaidInElement(comparisonContentRef.value)
})

watch(() => locale.value, () => {
  setMarkdownCodeCopyLabels({
    copy: t('chat.detail.copy'),
    copied: t('chat.detail.copied'),
    mermaidChart: t('chat.detail.mermaidChart'),
    mermaidCode: t('chat.detail.mermaidCode'),
    mermaidCopy: t('chat.detail.mermaidCopy'),
    mermaidDownload: t('chat.detail.mermaidDownload'),
    mermaidFullscreen: t('chat.detail.mermaidFullscreen'),
  })
}, { immediate: true })

async function handleComparisonMarkdownClick(event: MouseEvent) {
  if (await handleMermaidBlockClick(event)) return
  await handleMarkdownCodeCopyClick(event)
}

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

// Determine latest version id for UI state and compare base.
function isLatestVersion(version: PromptVersion): boolean {
  return version.id === headVersionId.value
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
    const headVersion = versions.value.find(v => v.id === headVersionId.value)
    if (!headVersion) {
      showToast(t('prompts.versionHistory.toast.compareFailed'), 'error')
      return
    }
    const diff = await compareVersions(version.content, headVersion.content)
    comparisonData.value = {
      oldVersion: version,
      newVersion: headVersion,
      newContent: headVersion.content,
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

// Fallback display for legacy data without versionNumber.
function getVersionNumber(version?: PromptVersion): number | string {
  if (!version) return 0
  if (typeof version.versionNumber === 'number' && !isNaN(version.versionNumber)) {
    return version.versionNumber
  }
  // For legacy versions, infer label by list position.
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

function handleGlobalEscapeCapture(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !showComparison.value) return
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  closeComparison()
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalEscapeCapture, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalEscapeCapture, true)
})

useMutationObserver(
  document.documentElement,
  () => {
    if (!showComparison.value || !comparisonData.value?.diff) return
    void reRenderMermaidInElement(comparisonContentRef.value)
  },
  {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  },
)
</script>

<style scoped>
/* Markdown Diff Styles */
.markdown-diff :deep(.diff-addition) {
  background: #f0fdf4;
  border-left: 4px solid #4ade80;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #166534;
}
.markdown-diff :deep(.diff-deletion) {
  background: #fef2f2;
  border-left: 4px solid #f87171;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #991b1b;
  text-decoration: line-through;
}
.markdown-diff :deep(.diff-unchanged) {
  background: transparent;
  border-left: 4px solid #d1d5db;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0;
  border-radius: 0 0.375rem 0.375rem 0;
  color: #4b5563;
  opacity: 0.7;
}

:global(.dark .markdown-diff .diff-addition),
:global([data-theme='dark'] .markdown-diff .diff-addition) {
  background: rgba(20, 83, 45, 0.45);
  border-left-color: #22c55e;
  color: #bbf7d0;
}

:global(.dark .markdown-diff .diff-deletion),
:global([data-theme='dark'] .markdown-diff .diff-deletion) {
  background: rgba(127, 29, 29, 0.45);
  border-left-color: #ef4444;
  color: #fecaca;
}

:global(.dark .markdown-diff .diff-unchanged),
:global([data-theme='dark'] .markdown-diff .diff-unchanged) {
  border-left-color: #4b5563;
  color: #9ca3af;
}

.markdown-diff :deep(pre) {
  background: transparent !important;
  padding: 0 !important;
}
</style>

