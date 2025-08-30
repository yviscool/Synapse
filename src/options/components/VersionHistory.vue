<template>
  <div class="flex flex-col h-full bg-white border-l border-gray-200 dark:bg-gray-800 dark:border-gray-700">
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
        <div class="i-carbon-time"></div>
        版本历史
      </h3>
      <div class="flex items-center gap-1">
        <button @click="refreshVersions" title="刷新" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:text-gray-300">
          <div class="i-carbon-refresh"></div>
        </button>
        <button @click="cleanupOldVersions" title="清理旧版本" class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:text-gray-300">
          <div class="i-carbon-clean"></div>
        </button>
      </div>
    </div>
    
    <div v-if="stats" class="p-3 bg-gray-50 border-b border-gray-200 space-y-1 dark:bg-gray-900/50 dark:border-gray-700">
      <div class="flex justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">总版本数:</span>
        <span class="font-medium text-gray-900 dark:text-gray-100">{{ stats.totalVersions }}</span>
      </div>
      <div v-if="stats.firstCreated" class="flex justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">首次创建:</span>
        <span class="font-medium text-gray-900 dark:text-gray-100">{{ formatDate(stats.firstCreated) }}</span>
      </div>
      <div v-if="stats.lastModified" class="flex justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">最后修改:</span>
        <span class="font-medium text-gray-900 dark:text-gray-100">{{ formatDate(stats.lastModified) }}</span>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto">
      <div class="relative px-2 py-2">
        <div class="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>
        <div
          v-for="(version, index) in versions"
          :key="version.id"
          class="relative pl-10 pr-2 py-2 cursor-pointer"
          @click="selectVersion(version)"
        >
          <div class="absolute left-5 top-1.5 -ml-1">
            <div
              :class="[
                'rounded-full border-2',
                version.id === currentVersionId
                  ? 'w-3.5 h-3.5 bg-blue-500 border-blue-100 ring-4 ring-blue-200 dark:ring-blue-900/60 dark:border-blue-400'
                  : 'w-2.5 h-2.5 bg-gray-300 border-white dark:bg-gray-500 dark:border-gray-700',
                selectedVersionId === version.id && version.id !== currentVersionId ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
              ]"
            ></div>
          </div>

          <div
            :class="[
              'border rounded-md p-2.5',
              'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
              'hover:bg-gray-50 dark:hover:bg-gray-700/40',
              version.id === currentVersionId ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-900/20' : '',
              selectedVersionId === version.id && version.id !== currentVersionId ? 'bg-blue-50/40 dark:bg-blue-800/20' : ''
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-sm">
                <span class="font-mono font-semibold text-blue-600 dark:text-blue-400">v{{ versions.length - index }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ formatDate(version.createdAt) }}</span>
                <span v-if="version.id === currentVersionId" class="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded dark:bg-green-900 dark:text-green-200">当前</span>
              </div>
              <div class="flex items-center gap-1">
                <button
                  @click.stop="compareWithCurrent(version)"
                  title="与当前版本比较"
                  :disabled="version.id === currentVersionId"
                  class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <div class="i-carbon-compare"></div>
                </button>
                <button
                  @click.stop="revertToVersion(version)"
                  title="恢复到此版本"
                  :disabled="version.id === currentVersionId"
                  class="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <div class="i-carbon-undo"></div>
                </button>
                <button
                  @click.stop="deleteVersion(version)"
                  title="删除版本"
                  :disabled="versions.length <= 1"
                  class="p-1 text-red-500 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300"
                >
                  <div class="i-carbon-trash-can"></div>
                </button>
              </div>
            </div>

            <div v-if="version.note" class="mt-1 text-sm text-gray-700 italic dark:text-gray-300">{{ version.note }}</div>
            <div class="mt-1 prose prose-sm dark:prose-invert text-gray-600 line-clamp-2">{{ getPreview(version.content) }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 版本比较模态框 -->
    <div v-if="showComparison" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" @click="closeComparison">
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden dark:bg-gray-800" @click.stop>
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-lg dark:text-white">版本比较</h3>
          <button @click="closeComparison" class="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <div class="i-carbon-close"></div>
          </button>
        </div>
        
        <div class="p-4 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">版本 {{ getVersionNumber(comparisonData?.oldVersion) }}</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(comparisonData?.oldVersion.createdAt || 0) }}</span>
            </div>
            <div v-if="comparisonData?.diff" class="flex items-center gap-4">
              <span class="text-green-600 font-mono dark:text-green-400">+{{ comparisonData.diff.stats.additions }}</span>
              <span class="text-red-600 font-mono dark:text-red-400">-{{ comparisonData.diff.stats.deletions }}</span>
            </div>
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-gray-100">当前版本</h4>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ formatDate(Date.now()) }}</span>
            </div>
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
import { ref, computed, onMounted, watch } from 'vue'
import { marked } from 'marked'
import { useUI } from '@/stores/ui'
import type { PromptVersion } from '@/types/prompt'
import { 
  getVersionHistory, 
  getVersionStats, 
  compareVersions, 
  revertToVersion as revertVersion,
  deleteVersion as removeVersion,
  cleanupOldVersions as cleanupVersions
} from '@/utils/versionUtils'

// 配置 marked
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
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { showToast, askConfirm } = useUI()

// 响应式数据
const versions = ref<PromptVersion[]>([])
const stats = ref<any>(null)
const selectedVersionId = ref<string>()
const showComparison = ref(false)

const comparisonData = ref<{
  oldVersion: PromptVersion
  newContent: string
  diff: any
} | null>(null)

// 计算属性
const selectedVersion = computed(() => 
  versions.value.find(v => v.id === selectedVersionId.value)
)

// 监听器
watch(() => props.promptId, () => {
  loadVersions()
}, { immediate: true })

// 方法
async function loadVersions() {
  if (!props.promptId) return
  
  try {
    versions.value = await getVersionHistory(props.promptId)
    stats.value = await getVersionStats(props.promptId)
  } catch (error) {
    console.error('Failed to load versions:', error)
  }
}

async function refreshVersions() {
  await loadVersions()
}

function selectVersion(version: PromptVersion) {
  selectedVersionId.value = version.id
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
  }
}

async function revertToVersion(version: PromptVersion) {
  const confirmed = await askConfirm(`确定要恢复到版本 ${getVersionNumber(version)} 吗？当前内容将被保存为新版本。`)
  if (!confirmed) {
    return
  }
  
  try {
    await revertVersion(props.promptId, version.id)
    await loadVersions()
    emit('version-restored', version)
  } catch (error) {
    console.error('Failed to revert version:', error)
    showToast('恢复版本失败', 'error')
  }
}

async function deleteVersion(version: PromptVersion) {
  const confirmed = await askConfirm(`确定要删除版本 ${getVersionNumber(version)} 吗？此操作不可撤销。`, { type: 'danger' })
  if (!confirmed) {
    return
  }
  
  try {
    await removeVersion(version.id)
    await loadVersions()
    emit('version-deleted', version.id)
  } catch (error) {
    console.error('Failed to delete version:', error)
    showToast('删除版本失败', 'error')
  }
}

async function cleanupOldVersions() {
  const confirmed = await askConfirm('确定要清理旧版本吗？将保留最近 10 个版本。', { type: 'danger' })
  if (!confirmed) {
    return
  }
  
  try {
    await cleanupVersions(props.promptId, 10)
    await loadVersions()
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
  // 直接截取纯文本作为预览，避免异步问题
  const textContent = content.replace(/<[^>]*>/g, '')
  return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp))
}

// 生命周期
onMounted(() => {
  loadVersions()
})
</script>

<style scoped>
/* Markdown 渲染视图的差异块样式 */
.markdown-diff :deep(.diff-addition) {
  @apply bg-green-50 border-l-4 border-green-400 px-3 py-2 my-2 rounded text-green-800 dark:bg-green-900/40 dark:border-green-500 dark:text-green-200;
}
.markdown-diff :deep(.diff-deletion) {
  @apply bg-red-50 border-l-4 border-red-400 px-3 py-2 my-2 rounded text-red-800 dark:bg-red-900/40 dark:border-red-500 dark:text-red-200;
}
.markdown-diff :deep(.diff-unchanged) {
  @apply bg-gray-50 border-l-4 border-gray-300 px-3 py-2 my-2 rounded text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300;
}
</style>