<template>
  <div class="snippet-editor h-full flex flex-col bg-white dark:bg-slate-950">
    <!-- Empty state -->
    <div v-if="!snippet" class="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
      <div class="i-carbon-code text-5xl mb-3 opacity-50"></div>
      <p class="text-base">{{ t('tools.list.empty') }}</p>
      <p class="text-sm mt-1 text-gray-400 dark:text-gray-500">{{ t('tools.list.emptyHint') }}</p>
    </div>

    <!-- Editor content -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <div class="flex-1 min-w-0">
          <input
            v-model="localTitle"
            type="text"
            class="w-full text-base font-medium text-gray-800 dark:text-gray-200 bg-transparent border-0 focus:ring-0 focus:outline-none"
            :placeholder="t('tools.editor.titlePlaceholder')"
            :readonly="isPreviewMode"
          />
        </div>
        <div class="flex items-center gap-1.5 ml-4">
          <!-- Star button -->
          <button
            @click="toggleStar"
            :class="[
              'p-1.5 rounded-lg transition-colors',
              localStarred ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800'
            ]"
            :title="t('tools.editor.starred')"
          >
            <div :class="localStarred ? 'i-carbon-star-filled' : 'i-carbon-star'"></div>
          </button>

          <!-- Copy button -->
          <button
            @click="copyContent"
            class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            :title="t('tools.editor.copy')"
          >
            <div class="i-carbon-copy"></div>
          </button>

          <!-- Download button -->
          <button
            @click="downloadFile"
            class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            :title="t('tools.editor.download')"
          >
            <div class="i-carbon-download"></div>
          </button>

          <!-- Preview toggle (for HTML) -->
          <button
            v-if="localLanguage === 'html'"
            @click="isPreviewMode = !isPreviewMode"
            :class="[
              'p-1.5 rounded-lg transition-colors',
              isPreviewMode ? 'text-blue-600 bg-blue-50 dark:bg-slate-800 dark:text-blue-200' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800'
            ]"
            :title="isPreviewMode ? t('tools.editor.edit') : t('tools.editor.preview')"
          >
            <div :class="isPreviewMode ? 'i-carbon-edit' : 'i-carbon-view'"></div>
          </button>

          <!-- Delete button -->
          <button
            @click="confirmDelete"
            class="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            :title="t('tools.editor.delete')"
          >
            <div class="i-carbon-trash-can"></div>
          </button>

          <!-- Save button -->
          <button
            @click="save"
            :disabled="!hasChanges"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ml-1',
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            ]"
          >
            <div class="i-carbon-save text-sm"></div>
            {{ t('tools.editor.save') }}
          </button>
        </div>
      </div>

      <!-- Metadata bar -->
      <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/70 text-sm">
        <!-- Language -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('tools.editor.language') }}</span>
          <select
            v-model="localLanguage"
            class="text-xs px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            :disabled="isPreviewMode"
          >
            <option v-for="lang in languageOptions" :key="lang.value" :value="lang.value">
              {{ lang.label }}
            </option>
          </select>
        </div>

        <!-- Folder -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ t('tools.editor.folder') }}</span>
          <select
            v-model="localFolderId"
            class="text-xs px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-transparent max-w-[120px]"
            :disabled="isPreviewMode"
          >
            <option :value="null">{{ t('tools.editor.noFolder') }}</option>
            <option v-for="folder in flatFolders" :key="folder.id" :value="folder.id">
              {{ folder.indent }}{{ folder.name }}
            </option>
          </select>
        </div>

        <!-- Tags -->
        <div class="flex-1 flex items-center gap-1.5 min-w-0">
          <span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{{ t('tools.editor.tags') }}</span>
          <div class="flex-1 flex flex-wrap items-center gap-1 min-w-0">
            <span
              v-for="tag in localTags"
              :key="tag"
              class="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
            >
              {{ tag }}
              <button
                v-if="!isPreviewMode"
                @click="removeTag(tag)"
                class="text-blue-500 hover:text-blue-700"
              >
                <div class="i-carbon-close text-xs"></div>
              </button>
            </span>
            <input
              v-if="!isPreviewMode"
              v-model="tagInput"
              type="text"
              class="flex-1 min-w-[60px] text-xs bg-transparent border-0 focus:ring-0 focus:outline-none py-0.5"
              :placeholder="localTags.length === 0 ? t('tools.editor.tagsPlaceholder') : ''"
              @keydown.enter.prevent="addTag"
              @keydown.comma.prevent="addTag"
              @keydown.backspace="handleTagBackspace"
            />
          </div>
        </div>

        <!-- Stats -->
        <div class="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
          <span>{{ formatLastUsed(snippet.usedAt) }}</span>
          <span>·</span>
          <span>{{ t('tools.editor.times', { count: snippet.useCount }) }}</span>
        </div>
      </div>

      <!-- Main content area -->
      <div class="flex-1 flex min-h-0">
        <!-- Code editor -->
        <div v-if="!isPreviewMode" class="flex-1 min-w-0">
          <CodeEditor
            v-model="localContent"
            v-model:language="localLanguage"
            :is-dark="isDark"
            :placeholder="t('tools.editor.contentPlaceholder')"
          />
        </div>

        <!-- HTML Preview -->
        <div v-else class="flex-1 min-w-0">
          <HtmlPreview
            :content="localContent"
            :title="localTitle"
            @dependencies-detected="handleDependencies"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUI } from '@/stores/ui'
import CodeEditor from './CodeEditor.vue'
import HtmlPreview from './HtmlPreview.vue'
import type { Snippet, SnippetFolder, SnippetLanguage } from '@/types/snippet'
import { SNIPPET_LANGUAGES, LANGUAGE_EXTENSIONS } from '@/constants/snippetLanguages'

const props = defineProps<{
  snippet: Snippet | null
  folders: SnippetFolder[]
  availableTags: string[]
  tagIdToName?: Map<string, string>
  isDark?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', data: Partial<Snippet>, tagNames: string[]): void
  (e: 'delete', id: string): void
  (e: 'toggle-star', id: string): void
  (e: 'copy', content: string): void
}>()

const { t } = useI18n()
const { askConfirm } = useUI()

// Local state
const localTitle = ref('')
const localContent = ref('')
const localLanguage = ref<SnippetLanguage>('text')
const localFolderId = ref<string | null>(null)
const localTags = ref<string[]>([])
const localStarred = ref(false)
const tagInput = ref('')
const isPreviewMode = ref(false)
const dependencies = ref<string[]>([])

// Original values for change detection
const originalTitle = ref('')
const originalContent = ref('')
const originalLanguage = ref<SnippetLanguage>('text')
const originalFolderId = ref<string | null>(null)
const originalTags = ref<string[]>([])
const originalStarred = ref(false)

// Language options
const languageOptions = computed(() =>
  SNIPPET_LANGUAGES.map(value => ({ value, label: t(`tools.languages.${value}`) }))
)

// Flatten folders for select
const flatFolders = computed(() => {
  const result: Array<{ id: string; name: string; indent: string }> = []

  function traverse(parentId: string | null, depth: number) {
    const children = props.folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order)

    for (const folder of children) {
      result.push({
        id: folder.id,
        name: folder.name,
        indent: '  '.repeat(depth),
      })
      traverse(folder.id, depth + 1)
    }
  }

  traverse(null, 0)
  return result
})

// Change detection
const hasChanges = computed(() => {
  if (!props.snippet) return false
  return (
    localTitle.value !== originalTitle.value ||
    localContent.value !== originalContent.value ||
    localLanguage.value !== originalLanguage.value ||
    localFolderId.value !== originalFolderId.value ||
    localStarred.value !== originalStarred.value ||
    JSON.stringify(localTags.value) !== JSON.stringify(originalTags.value)
  )
})

// Watch for snippet changes
watch(
  () => props.snippet,
  (snippet) => {
    if (snippet) {
      localTitle.value = snippet.title
      localContent.value = snippet.content
      localLanguage.value = snippet.language
      localFolderId.value = snippet.folderId
      localStarred.value = snippet.starred
      // Convert tag IDs to names using the provided map
      if (props.tagIdToName && snippet.tagIds) {
        localTags.value = snippet.tagIds
          .map(id => props.tagIdToName!.get(id))
          .filter((name): name is string => !!name)
      } else {
        localTags.value = []
      }

      // Store originals
      originalTitle.value = snippet.title
      originalContent.value = snippet.content
      originalLanguage.value = snippet.language
      originalFolderId.value = snippet.folderId
      originalStarred.value = snippet.starred
      originalTags.value = [...localTags.value]

      // Reset preview mode
      isPreviewMode.value = false
    }
  },
  { immediate: true },
)

// Methods
function save() {
  if (!props.snippet) return

  emit('save', {
    id: props.snippet.id,
    title: localTitle.value,
    content: localContent.value,
    language: localLanguage.value,
    folderId: localFolderId.value,
    starred: localStarred.value,
    dependencies: dependencies.value.length > 0 ? dependencies.value : undefined,
  }, localTags.value)

  // Update originals after save
  originalTitle.value = localTitle.value
  originalContent.value = localContent.value
  originalLanguage.value = localLanguage.value
  originalFolderId.value = localFolderId.value
  originalStarred.value = localStarred.value
  originalTags.value = [...localTags.value]
}

async function confirmDelete() {
  if (!props.snippet) return
  const confirmed = await askConfirm(t('tools.editor.deleteConfirm'), { type: 'danger' })
  if (confirmed) {
    emit('delete', props.snippet.id)
  }
}

function toggleStar() {
  localStarred.value = !localStarred.value
  if (props.snippet) {
    emit('toggle-star', props.snippet.id)
  }
}

function copyContent() {
  emit('copy', localContent.value)
}

function downloadFile() {
  if (!localContent.value) return

  const ext = LANGUAGE_EXTENSIONS[localLanguage.value] || 'txt'
  const filename = localTitle.value
    ? `${localTitle.value.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')}.${ext}`
    : `snippet.${ext}`

  const blob = new Blob([localContent.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !localTags.value.includes(tag)) {
    localTags.value.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  const index = localTags.value.indexOf(tag)
  if (index > -1) {
    localTags.value.splice(index, 1)
  }
}

function handleTagBackspace() {
  if (tagInput.value === '' && localTags.value.length > 0) {
    localTags.value.pop()
  }
}

function handleDependencies(links: string[]) {
  dependencies.value = links
}

function formatLastUsed(timestamp: number | null): string {
  if (!timestamp) return t('tools.editor.never')
  const date = new Date(timestamp)
  return date.toLocaleDateString()
}
</script>

<style scoped>
.snippet-editor {
  min-width: 320px;
}
</style>
