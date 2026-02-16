<template>
  <div class="snippet-list h-full flex flex-col">
    <!-- Header -->
    <div class="px-3 py-3 border-b border-gray-100 dark:border-gray-800">
      <!-- Search -->
      <div class="relative">
        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 i-carbon-search text-gray-400 dark:text-gray-500 text-sm"></div>
        <input
          v-model="localSearchQuery"
          type="text"
          class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          :placeholder="t('tools.list.searchPlaceholder')"
        />
      </div>

      <!-- Filters row -->
      <div class="flex items-center justify-between mt-2">
        <div class="flex items-center gap-1.5">
          <!-- Sort dropdown -->
          <select
            v-model="localSortBy"
            class="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="updatedAt">{{ t('tools.list.sortOptions.updatedAt') }}</option>
            <option value="createdAt">{{ t('tools.list.sortOptions.createdAt') }}</option>
            <option value="title">{{ t('tools.list.sortOptions.title') }}</option>
            <option value="usedAt">{{ t('tools.list.sortOptions.usedAt') }}</option>
            <option value="useCount">{{ t('tools.list.sortOptions.useCount') }}</option>
          </select>

          <!-- Language filter -->
          <div class="relative" ref="languageDropdownRef">
            <button
              @click="showLanguageFilter = !showLanguageFilter"
              :class="[
                'flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors',
                selectedLanguages.length > 0
                  ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-200'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              ]"
            >
              <div class="i-carbon-code text-sm"></div>
              <span v-if="selectedLanguages.length > 0">{{ selectedLanguages.length }}</span>
            </button>
            <div
              v-if="showLanguageFilter"
              class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]"
            >
              <button
                v-for="lang in languageOptions"
                :key="lang.value"
                @click="toggleLanguage(lang.value)"
                :class="[
                  'w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                  selectedLanguages.includes(lang.value)
                    ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-200'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                ]"
              >
                <div :class="selectedLanguages.includes(lang.value) ? 'i-carbon-checkmark text-blue-600' : 'w-3'"></div>
                {{ lang.label }}
              </button>
            </div>
          </div>
        </div>

        <span class="text-xs text-gray-400 dark:text-gray-500">
          {{ total }}
        </span>
      </div>
    </div>

    <!-- List -->
    <div
      ref="listRef"
      class="flex-1 overflow-y-auto"
      @scroll="handleScroll"
    >
      <!-- Empty state -->
      <div v-if="snippets.length === 0 && !isLoading" class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 px-4">
        <div class="i-carbon-document-blank text-3xl mb-2"></div>
        <p class="text-sm">{{ t('tools.list.empty') }}</p>
        <p class="text-xs mt-1 text-center">{{ t('tools.list.emptyHint') }}</p>
      </div>

      <!-- Snippet items -->
      <div v-else class="py-1">
        <div
          v-for="(snippet, index) in snippets"
          :key="snippet.id"
          :class="[
            'snippet-item mx-1.5 my-0.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all',
            selectedSnippetId === snippet.id
              ? 'bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-600/60'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
          ]"
          :draggable="true"
          @click="selectSnippet(snippet)"
          @dblclick="editSnippet(snippet)"
          @dragstart="onDragStart($event, snippet)"
          @keydown.enter="selectSnippet(snippet)"
          @keydown.up.prevent="navigateUp(index)"
          @keydown.down.prevent="navigateDown(index)"
          tabindex="0"
        >
          <!-- Title row -->
          <div class="flex items-center gap-1.5">
            <span
              class="flex-1 font-medium text-sm text-gray-800 dark:text-gray-200 truncate"
              v-html="getHighlightedTitle(snippet)"
            ></span>
            <button
              v-if="snippet.starred"
              class="text-yellow-500 flex-shrink-0"
              @click.stop="toggleStar(snippet)"
            >
              <div class="i-carbon-star-filled text-xs"></div>
            </button>
          </div>

          <!-- Meta row -->
          <div class="flex items-center gap-1.5 mt-1">
            <span :class="[
              'px-1.5 py-0.5 text-xs rounded',
              getLanguageColor(snippet.language)
            ]">
              {{ getLanguageLabel(snippet.language) }}
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ formatTime(snippet.updatedAt) }}
            </span>
          </div>

          <!-- Preview -->
          <div
            class="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-mono leading-relaxed"
            v-html="getHighlightedPreview(snippet.content)"
          ></div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <div class="i-carbon-circle-dash animate-spin text-gray-400 dark:text-gray-500"></div>
        </div>

        <!-- Load more trigger -->
        <div v-if="hasMore && !isLoading" ref="loadMoreRef" class="h-4"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Snippet, SnippetLanguage } from '@/types/snippet'
import {
  generateHighlightedHtmlByQuery,
  generateHighlightedPreviewHtmlByQuery,
} from '@/utils/highlighter'
import { formatRelativeTime } from '@/utils/intl'
import { SNIPPET_LANGUAGES, LANGUAGE_COLORS } from '@/constants/snippetLanguages'

type SortBy = "updatedAt" | "createdAt" | "title" | "usedAt" | "useCount"

const props = defineProps<{
  snippets: Snippet[]
  selectedSnippetId: string | null
  searchQuery: string
  highlightQuery?: string
  sortBy: SortBy
  selectedLanguages: SnippetLanguage[]
  isLoading: boolean
  hasMore: boolean
  total: number
}>()

const emit = defineEmits<{
  (e: 'select', snippet: Snippet): void
  (e: 'edit', snippet: Snippet): void
  (e: 'toggle-star', snippet: Snippet): void
  (e: 'update:searchQuery', value: string): void
  (e: 'update:sortBy', value: SortBy): void
  (e: 'toggle-language', language: SnippetLanguage): void
  (e: 'load-more'): void
}>()

const { t } = useI18n()

// Refs
const listRef = ref<HTMLDivElement | null>(null)
const loadMoreRef = ref<HTMLDivElement | null>(null)
const languageDropdownRef = ref<HTMLDivElement | null>(null)

// State
const showLanguageFilter = ref(false)

// Local state for v-model
const localSearchQuery = computed({
  get: () => props.searchQuery,
  set: (value) => emit('update:searchQuery', value),
})

const localSortBy = computed({
  get: () => props.sortBy,
  set: (value: SortBy) => emit('update:sortBy', value),
})

// Language options
const languageOptions = computed(() =>
  SNIPPET_LANGUAGES.map(value => ({ value, label: t(`tools.languages.${value}`) }))
)

// Methods
function selectSnippet(snippet: Snippet) {
  emit('select', snippet)
}

function editSnippet(snippet: Snippet) {
  emit('edit', snippet)
}

function toggleStar(snippet: Snippet) {
  emit('toggle-star', snippet)
}

function toggleLanguage(language: SnippetLanguage) {
  emit('toggle-language', language)
}

function onDragStart(e: DragEvent, snippet: Snippet) {
  e.dataTransfer?.setData('text/snippet-id', snippet.id)
}

function navigateUp(currentIndex: number) {
  if (currentIndex > 0) {
    emit('select', props.snippets[currentIndex - 1])
  }
}

function navigateDown(currentIndex: number) {
  if (currentIndex < props.snippets.length - 1) {
    emit('select', props.snippets[currentIndex + 1])
  }
}

function handleScroll() {
  if (!listRef.value || !loadMoreRef.value) return

  const rect = loadMoreRef.value.getBoundingClientRect()
  const listRect = listRef.value.getBoundingClientRect()

  if (rect.top < listRect.bottom && props.hasMore && !props.isLoading) {
    emit('load-more')
  }
}

function getLanguageLabel(language: SnippetLanguage): string {
  return t(`tools.languages.${language}`)
}

function getLanguageColor(language: SnippetLanguage): string {
  return LANGUAGE_COLORS[language] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
}

function getHighlightedTitle(snippet: Snippet): string {
  const title = snippet.title || t('tools.editor.titlePlaceholder')
  return generateHighlightedHtmlByQuery(title, props.highlightQuery)
}

function getHighlightedPreview(content: string): string {
  const flattenedContent = content.replace(/\n/g, ' ')
  return generateHighlightedPreviewHtmlByQuery(flattenedContent, props.highlightQuery, 100)
}

function formatTime(timestamp: number): string {
  return formatRelativeTime(timestamp)
}

// Click outside to close language filter
function handleClickOutside(e: MouseEvent) {
  if (languageDropdownRef.value && !languageDropdownRef.value.contains(e.target as Node)) {
    showLanguageFilter.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.snippet-list {
  min-width: 240px;
}

.snippet-item:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
