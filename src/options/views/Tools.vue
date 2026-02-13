<template>
  <div class="tools-page">
    <main class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex gap-6 h-[calc(100vh-180px)] min-h-[500px]">
        <!-- Left sidebar: Folder tree -->
        <div class="w-52 flex-shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <FolderTree
            :folders="folders"
            :tags="tags"
            :selected-folder-id="selectedFolderId"
            :special-folder="specialFolder"
            :selected-tag-ids="selectedTagIds"
            :snippet-counts="snippetCounts"
            :total-snippets="totalSnippets"
            :starred-count="starredCount"
            :recent-count="recentCount"
            @select-folder="handleSelectFolder"
            @select-special-folder="handleSelectSpecialFolder"
            @toggle-tag="handleToggleTag"
            @clear-all-tags="handleClearAllTags"
            @create-folder="handleCreateFolder"
            @rename-folder="handleRenameFolder"
            @delete-folder="handleDeleteFolder"
            @move-snippet="handleMoveSnippet"
            @new-snippet="handleNewSnippet"
            @reorder-folder="handleReorderFolder"
          />
        </div>

        <!-- Middle: Snippet list -->
        <div class="w-64 flex-shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
          <SnippetList
            :snippets="snippets"
            :selected-snippet-id="selectedSnippetId"
            :search-query="searchQuery"
            :highlight-query="searchQueryDebounced"
            :sort-by="sortBy"
            :selected-languages="selectedLanguages"
            :is-loading="isLoading"
            :has-more="hasMore"
            :total="totalSnippets"
            @select="handleSelectSnippet"
            @edit="handleEditSnippet"
            @toggle-star="handleToggleStar"
            @update:search-query="searchQuery = $event"
            @update:sort-by="changeSortBy($event)"
            @toggle-language="toggleLanguage"
            @load-more="loadMore"
          />
        </div>

        <!-- Right: Editor/Preview -->
        <div class="flex-1 min-w-0 bg-white dark:bg-slate-950 rounded-xl border border-gray-200 dark:border-slate-700/60 overflow-hidden">
          <SnippetEditor
            :snippet="selectedSnippet"
            :folders="folders"
            :available-tags="availableTagNames"
            :tag-id-to-name="tagIdToName"
            :is-dark="isDark"
            @save="handleSaveSnippet"
            @delete="handleDeleteSnippet"
            @toggle-star="handleToggleStar"
            @copy="handleCopyContent"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUI } from '@/stores/ui'
import { optionsThemeKey } from '@/options/composables/useOptionsTheme'
import { snippetRepository } from '@/stores/snippetRepository'
import { useSnippetQuery } from './useSnippetQuery'
import FolderTree from '@/options/components/snippets/FolderTree.vue'
import SnippetList from '@/options/components/snippets/SnippetList.vue'
import SnippetEditor from '@/options/components/snippets/SnippetEditor.vue'
import type { Snippet, SnippetLanguage } from '@/types/snippet'

const { t } = useI18n()
const { showToast, askConfirm } = useUI()
const optionsTheme = inject(optionsThemeKey, null)
const isDark = computed(() => optionsTheme?.isDark.value ?? false)

// Use the snippet query composable
const {
  snippets,
  folders,
  tags,
  searchQuery,
  searchQueryDebounced,
  selectedFolderId,
  specialFolder,
  selectedTagIds,
  selectedLanguages,
  sortBy,
  totalSnippets,
  isLoading,
  hasMore,
  refreshAll,
  selectFolder,
  selectSpecialFolder,
  toggleTag,
  clearTagSelection,
  toggleLanguage,
  changeSortBy,
  loadMore,
} = useSnippetQuery({
  onLoadError: () => {
    showToast(t('tools.toast.saveFailed'), 'error')
  },
})

// Local state
const selectedSnippetId = ref<string | null>(null)
const snippetCounts = ref<Map<string | null, number>>(new Map())
const starredCount = ref(0)
const recentCount = ref(0)

// Computed
const selectedSnippet = computed(() => {
  if (!selectedSnippetId.value) return null
  return snippets.value.find((s) => s.id === selectedSnippetId.value) || null
})

const availableTagNames = computed(() => {
  return tags.value.map((t) => t.name)
})

const tagIdToName = computed(() => {
  const map = new Map<string, string>()
  for (const tag of tags.value) {
    map.set(tag.id, tag.name)
  }
  return map
})

// Initialize
onMounted(async () => {
  await refreshAll()
  await refreshCounts()
})

// Refresh counts
async function refreshCounts() {
  snippetCounts.value = await snippetRepository.getSnippetCountByFolder()

  // Count starred
  const allSnippets = await snippetRepository.querySnippets({ starredOnly: true, limit: 1000 })
  starredCount.value = allSnippets.total

  // Count recent (used in last 7 days)
  const recentSnippets = await snippetRepository.getRecentSnippets(100)
  recentCount.value = recentSnippets.length
}

// Watch for data changes to refresh counts
watch([snippets, folders], () => {
  refreshCounts()
})

// Handlers
function handleSelectFolder(folderId: string | null) {
  selectFolder(folderId)
}

function handleSelectSpecialFolder(type: 'all' | 'starred' | 'recent' | 'uncategorized') {
  selectSpecialFolder(type)
}

function handleToggleTag(tagId: string) {
  toggleTag(tagId)
}

function handleClearAllTags() {
  clearTagSelection()
}

async function handleCreateFolder(name: string, parentId: string | null) {
  const result = await snippetRepository.createFolder({ name, parentId })
  if (result.ok) {
    showToast(t('tools.toast.folderCreated'), 'success')
  } else {
    showToast(t('tools.toast.saveFailed'), 'error')
  }
}

async function handleRenameFolder(id: string, name: string) {
  const result = await snippetRepository.updateFolder(id, { name })
  if (!result.ok) {
    showToast(t('tools.toast.saveFailed'), 'error')
  }
}

async function handleDeleteFolder(id: string) {
  const confirmed = await askConfirm(t('tools.folder.deleteConfirm'), { type: 'danger' })
  if (!confirmed) return

  const result = await snippetRepository.deleteFolder(id)
  if (result.ok) {
    showToast(t('tools.toast.folderDeleted'), 'success')
  } else {
    showToast(t('tools.toast.deleteFailed'), 'error')
  }
}

async function handleMoveSnippet(snippetId: string, folderId: string | null) {
  const result = await snippetRepository.moveSnippetToFolder(snippetId, folderId)
  if (result.ok) {
    showToast(t('tools.toast.movedToFolder'), 'success')
  } else {
    showToast(t('tools.toast.saveFailed'), 'error')
  }
}

async function handleReorderFolder(folderId: string, targetFolderId: string, position: 'before' | 'after' | 'inside') {
  if (position === 'inside') {
    // Move folder into target as a child
    const result = await snippetRepository.moveFolder(folderId, targetFolderId)
    if (!result.ok) {
      showToast(t('tools.toast.saveFailed'), 'error')
    }
    return
  }

  // Same-level or cross-level reorder: before/after
  const targetFolder = folders.value.find(f => f.id === targetFolderId)
  const draggedFolder = folders.value.find(f => f.id === folderId)
  if (!targetFolder || !draggedFolder) return

  const targetParentId = targetFolder.parentId

  // If dragged folder is moving to a different parent, update parentId first
  if (draggedFolder.parentId !== targetParentId) {
    const moveResult = await snippetRepository.moveFolder(folderId, targetParentId)
    if (!moveResult.ok) {
      showToast(t('tools.toast.saveFailed'), 'error')
      return
    }
    // After moveFolder, refresh to get updated folder list
    await refreshAll()
  }

  // Get siblings at the target level (excluding the dragged folder)
  const siblings = folders.value
    .filter(f => f.parentId === targetParentId && f.id !== folderId)
    .sort((a, b) => a.order - b.order)

  // Insert the dragged folder at the correct position
  const targetIndex = siblings.findIndex(f => f.id === targetFolderId)
  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
  siblings.splice(insertIndex, 0, draggedFolder)

  // Reassign order values
  const reorderList = siblings.map((f, i) => ({ id: f.id, order: i }))
  const result = await snippetRepository.reorderFolders(reorderList)
  if (!result.ok) {
    showToast(t('tools.toast.saveFailed'), 'error')
  }
}

function handleNewSnippet() {
  // Create a new snippet
  const newSnippet: Partial<Snippet> = {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    language: 'text',
    folderId: selectedFolderId.value ?? null,
    tagIds: [],
    starred: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    usedAt: null,
    useCount: 0,
  }

  // Save immediately to get it in the list
  handleSaveSnippet(newSnippet, [])
}

function handleSelectSnippet(snippet: Snippet) {
  selectedSnippetId.value = snippet.id
}

function handleEditSnippet(snippet: Snippet) {
  selectedSnippetId.value = snippet.id
  // Could focus the editor here
}

async function handleToggleStar(snippetOrId: Snippet | string) {
  const id = typeof snippetOrId === 'string' ? snippetOrId : snippetOrId.id
  await snippetRepository.toggleStarred(id)
}

async function handleSaveSnippet(data: Partial<Snippet>, tagNames: string[]) {
  const result = await snippetRepository.saveSnippet(data, tagNames)
  if (result.ok) {
    showToast(t('tools.toast.saveSuccess'), 'success')
    if (result.data) {
      selectedSnippetId.value = result.data.id
    }
  } else {
    showToast(t('tools.toast.saveFailed'), 'error')
  }
}

async function handleDeleteSnippet(id: string) {
  const result = await snippetRepository.deleteSnippet(id)
  if (result.ok) {
    showToast(t('tools.toast.deleteSuccess'), 'success')
    selectedSnippetId.value = null
  } else {
    showToast(t('tools.toast.deleteFailed'), 'error')
  }
}

async function handleCopyContent(content: string) {
  try {
    await navigator.clipboard.writeText(content)
    showToast(t('tools.toast.copySuccess'), 'success')

    // Record usage
    if (selectedSnippetId.value) {
      await snippetRepository.recordUsage(selectedSnippetId.value)
    }
  } catch (error) {
    showToast(t('tools.toast.copyFailed'), 'error')
  }
}
</script>

<style scoped>
.tools-page {
  min-height: calc(100vh - 64px);
}
</style>
