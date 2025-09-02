<template>
  <div class="flex flex-col h-full bg-gray-50/50 border-l border-gray-200 dark:bg-gray-900/50 dark:border-gray-700/50">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700/60 shrink-0">
      <h3 class="flex items-center gap-2 font-semibold text-lg text-gray-800 dark:text-gray-200">
        <div class="i-carbon-time text-xl"></div>
        <span>版本历史</span>
        <span v-if="versions.length > 0" class="text-sm font-normal text-gray-500">({{ versions.length }})</span>
      </h3>
      <div class="flex items-center gap-1">
        <button @click="refreshVersions" title="刷新" class="p-2 rounded-md text-gray-500 hover:bg-gray-200/60 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200">
          <div class="i-carbon-refresh text-base"></div>
        </button>
        <button @click="cleanupOldVersions" title="清理旧版本" class="p-2 rounded-md text-gray-500 hover:bg-gray-200/60 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200">
          <div class="i-carbon-clean text-base"></div>
        </button>
      </div>
    </div>
    
    <!-- Timeline -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="versions.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
        <div class="i-carbon-document-blank text-4xl mb-2"></div>
        <p>暂无历史版本</p>
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
                version.id === currentVersionId
                  ? 'w-4 h-4 bg-blue-500 border-4 border-blue-100 ring-4 ring-blue-200 dark:border-blue-400 dark:ring-blue-500/30'
                  : 'w-2.5 h-2.5 bg-gray-300 group-hover:bg-blue-400 dark:bg-gray-600 dark:group-hover:bg-blue-500',
                selectedVersionId === version.id && version.id !== currentVersionId ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''
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
              version.id === currentVersionId 
                ? 'border-blue-300 bg-blue-50/60 dark:border-blue-600/80 dark:bg-blue-900/20' 
                : '',
              selectedVersionId === version.id && version.id !== currentVersionId 
                ? 'bg-blue-50/40 dark:bg-blue-800/20' 
                : ''
            ]"
          >
            <div class="flex items-start justify-between">
              <!-- Left Info -->
              <div class="flex flex-col">
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">v{{ versions.length - index }}</span>
                  <span class="text-gray-500 dark:text-gray-400">{{ formatRelativeTime(version.createdAt) }}</span>
                  <span v-if="version.id === currentVersionId" class="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium dark:bg-green-900/50 dark:text-green-300">当前</span>
                </div>
                <div class="text-xs text-gray-400 mt-0.5 dark:text-gray-500">{{ formatDate(version.createdAt) }}</div>
              </div>
              
              <!-- Right Actions (show on hover) -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  @click.stop="compareWithCurrent(version)"
                  title="与当前版本比较"
                  :disabled="version.id === currentVersionId"
                  class="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <div class="i-carbon-compare text-base"></div>
                </button>
                <button
                  @click.stop="revertToVersion(version)"
                  title="设为当前版本"
                  :disabled="version.id === currentVersionId"
                  class="p-1.5 rounded-md text-gray-500 hover:bg-gray-200 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <div class="i-carbon-undo text-base"></div>
                </button>
                <button
                  @click.stop="deleteVersion(version)"
                  title="删除版本"
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
            版本比较
          </h3>
          <button @click="closeComparison" class="p-2 rounded-full text-gray-400 hover:bg-gray-200/60 dark:text-gray-500 dark:hover:bg-gray-700/50">
            <div class="i-carbon-close text-lg"></div>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div class="text-center">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">版本 {{ getVersionNumber(comparisonData?.oldVersion) }}</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(comparisonData?.oldVersion.createdAt || 0) }}</span>
            </div>
            <div class="text-center">
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">当前版本</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(Date.now()) }}</span>
            </div>
          </div>
          
          <div v-if="comparisonData?.diff" class="flex items-center justify-center gap-6 mb-4 text-sm">
            <span class="text-green-600 font-mono dark:text-green-400 flex items-center gap-1"><div class="i-carbon-add-alt"></div>+{{ comparisonData.diff.stats.additions }} additions</span>
            <span class="text-red-600 font-mono dark:text-red-400 flex items-center gap-1"><div class="i-carbon-subtract-alt"></div>-{{ comparisonData.diff.stats.deletions }} deletions</span>
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { marked } from 'marked'
import { useUI } from '@/stores/ui'
import type { PromptVersion } from '@/types/prompt'
import { 
  getVersionHistory, 
  compareVersions, 
  revertToVersion as revertVersion,
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
  currentVersionId?: string
  currentContent: string
}

interface Emits {
  (e: 'version-restored', version: PromptVersion): void
  (e: 'version-deleted', versionId: string): void
  (e: 'preview-version', payload: { version: PromptVersion, versionNumber: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { showToast, askConfirm } = useUI()

// Reactive data
const versions = ref<PromptVersion[]>([])
const selectedVersionId = ref<string>()
const showComparison = ref(false)

const comparisonData = ref<{
  oldVersion: PromptVersion
  newContent: string
  diff: any
} | null>(null)

// Watchers
watch(() => props.promptId, () => {
  loadVersions()
}, { immediate: true })

watch(() => props.currentVersionId, (newId) => {
  selectedVersionId.value = newId
})


// Methods
async function loadVersions() {
  if (!props.promptId) {
    versions.value = []
    return
  }
  
  try {
    versions.value = await getVersionHistory(props.promptId)
    if (!selectedVersionId.value && versions.value.length > 0) {
      selectedVersionId.value = props.currentVersionId || versions.value[0].id
    }
  } catch (error) {
    console.error('Failed to load versions:', error)
    showToast('加载版本历史失败', 'error')
  }
}

async function refreshVersions() {
  await loadVersions()
  showToast('版本历史已刷新', 'success')
}

function selectVersion(version: PromptVersion) {
  selectedVersionId.value = version.id
  emit('preview-version', { version, versionNumber: getVersionNumber(version) })
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
    showToast('版本比较失败', 'error')
  }
}

async function revertToVersion(version: PromptVersion) {
  const confirmed = await askConfirm(`确定要将 v${getVersionNumber(version)} 设为当前版本吗？您当前未保存的修改将被自动保存为一个新版本。`, { type: 'default' })
  if (!confirmed) return
  
  try {
    const newVersion = await revertVersion(props.promptId, version.id, props.currentContent)
    await loadVersions()
    emit('version-restored', newVersion)
    showToast(`v${getVersionNumber(version)} 已设为当前版本`, 'success')
  } catch (error) {
    console.error('Failed to revert version:', error)
    showToast('操作失败', 'error')
  }
}

async function deleteVersion(version: PromptVersion) {
  if (versions.value.length <= 1) {
    showToast('无法删除唯一的版本', 'warning')
    return
  }
  const confirmed = await askConfirm(`确定要永久删除版本 ${getVersionNumber(version)} 吗？此操作不可撤销。`, { type: 'danger' })
  if (!confirmed) return
  
  try {
    await removeVersion(version.id)
    await loadVersions()
    emit('version-deleted', version.id)
    showToast(`版本 ${getVersionNumber(version)} 已删除`, 'success')
  } catch (error) {
    console.error('Failed to delete version:', error)
    showToast('删除版本失败', 'error')
  }
}

async function cleanupOldVersions() {
  const confirmed = await askConfirm('确定要清理旧版本吗？将仅保留最近 10 个版本。', { type: 'danger' })
  if (!confirmed) return
  
  try {
    await cleanupVersions(props.promptId, 10)
    await loadVersions()
    showToast('旧版本清理完毕', 'success')
  } catch (error) {
    console.error('Failed to cleanup versions:', error)
    showToast('清理版本失败', 'error')
  }
}

function closeComparison() {
  showComparison.value = false
  comparisonData.value = null
}

function getVersionNumber(version?: PromptVersion): number {
  if (!version) return 0
  const index = versions.value.findIndex(v => v.id === version.id)
  return versions.value.length - index
}

function getPreview(content: string): string {
  const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return textContent.length > 120 ? textContent.substring(0, 120) + '...' : textContent
}

function formatDate(timestamp: number): string {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('zh-CN', {
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

  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

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