<template>
  <div class="folder-tree h-full flex flex-col">
    <!-- Header -->
    <div class="px-3 py-3 border-b border-gray-100">
      <button
        @click="$emit('new-snippet')"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        <div class="i-carbon-add"></div>
        {{ t('tools.sidebar.newSnippet') }}
      </button>
    </div>

    <!-- Quick filters -->
    <div class="px-2 py-2 space-y-0.5 border-b border-gray-100">
      <button
        v-for="item in quickFilters"
        :key="item.type"
        @click="selectSpecialFolder(item.type)"
        :class="[
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
          specialFolder === item.type
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-50'
        ]"
      >
        <div :class="item.icon" class="text-base"></div>
        <span class="flex-1 text-left truncate">{{ item.label }}</span>
        <span v-if="item.count !== undefined" class="text-xs text-gray-400">{{ item.count }}</span>
      </button>
    </div>

    <!-- Folders section -->
    <div class="flex-1 overflow-y-auto px-2 py-2">
      <div class="flex items-center justify-between px-2 py-1 mb-1">
        <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {{ t('tools.sidebar.folders') }}
        </span>
        <button
          @click="showNewFolderInput = true"
          class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
          :title="t('tools.sidebar.newFolder')"
        >
          <div class="i-carbon-folder-add text-sm"></div>
        </button>
      </div>

      <!-- New folder input -->
      <div v-if="showNewFolderInput" class="px-2 mb-2">
        <input
          ref="newFolderInputRef"
          v-model="newFolderName"
          type="text"
          class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          :placeholder="t('tools.folder.namePlaceholder')"
          @keydown.enter="createFolder(null)"
          @keydown.escape="cancelNewFolder"
          @blur="cancelNewFolder"
        />
      </div>

      <!-- Folder tree -->
      <div class="space-y-0.5">
        <FolderTreeItem
          v-for="folder in rootFolders"
          :key="folder.id"
          :folder="folder"
          :children="getChildFolders(folder.id)"
          :get-child-folders="getChildFolders"
          :selected-folder-id="selectedFolderId"
          :expanded-folders="expandedFolders"
          :snippet-counts="snippetCounts"
          :depth="0"
          @select="selectFolder"
          @toggle-expand="toggleExpand"
          @rename="startRename"
          @delete="deleteFolder"
          @new-subfolder="startNewSubfolder"
          @drop-snippet="handleDropSnippet"
          @reorder-folder="handleReorderFolder"
        />
      </div>

      <!-- Uncategorized -->
      <button
        @click="selectFolder(null)"
        :class="[
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors mt-2',
          selectedFolderId === null && specialFolder === 'all'
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-50'
        ]"
      >
        <div class="i-carbon-folder text-gray-400"></div>
        <span class="flex-1 text-left truncate">{{ t('tools.sidebar.uncategorized') }}</span>
        <span class="text-xs text-gray-400">{{ snippetCounts.get(null) || 0 }}</span>
      </button>
    </div>

    <!-- Tags section -->
    <div class="border-t border-gray-100 px-2 py-2">
      <div class="flex items-center justify-between px-2 py-1 mb-1">
        <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {{ t('tools.sidebar.tags') }}
        </span>
        <button
          v-if="selectedTagIds.length > 0"
          @click="clearAllTags"
          class="text-xs text-gray-400 hover:text-blue-600 transition-colors"
          :title="t('tools.sidebar.clearTags')"
        >
          {{ t('tools.sidebar.clearAll') }}
        </button>
      </div>
      <div class="max-h-24 overflow-y-auto px-1">
        <div class="flex flex-wrap gap-1">
          <button
            v-for="tag in tags"
            :key="tag.id"
            @click="toggleTag(tag.id)"
            :class="[
              'px-2 py-0.5 text-xs rounded-full transition-colors',
              selectedTagIds.includes(tag.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
          >
            {{ tag.name }}
          </button>
        </div>
      </div>
      <span v-if="tags.length === 0" class="text-xs text-gray-400 px-1">
        {{ t('tools.sidebar.noTags') }}
      </span>
    </div>

    <!-- Rename modal -->
    <div
      v-if="renamingFolder"
      class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      @click="cancelRename"
    >
      <div class="bg-white rounded-lg shadow-xl p-4 w-80" @click.stop>
        <h3 class="text-lg font-medium mb-3">{{ t('tools.folder.rename') }}</h3>
        <input
          ref="renameInputRef"
          v-model="renameValue"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          @keydown.enter="confirmRename"
          @keydown.escape="cancelRename"
        />
        <div class="flex justify-end gap-2 mt-4">
          <button
            @click="cancelRename"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            @click="confirmRename"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import FolderTreeItem from './FolderTreeItem.vue'
import type { SnippetFolder, SnippetTag, SpecialFolderType } from '@/types/snippet'

const props = defineProps<{
  folders: SnippetFolder[]
  tags: Array<SnippetTag & { count: number }>
  selectedFolderId: string | null | undefined
  specialFolder: SpecialFolderType
  selectedTagIds: string[]
  snippetCounts: Map<string | null, number>
  totalSnippets: number
  starredCount: number
  recentCount: number
}>()

const emit = defineEmits<{
  (e: 'select-folder', folderId: string | null): void
  (e: 'select-special-folder', type: SpecialFolderType): void
  (e: 'toggle-tag', tagId: string): void
  (e: 'clear-all-tags'): void
  (e: 'create-folder', name: string, parentId: string | null): void
  (e: 'rename-folder', id: string, name: string): void
  (e: 'delete-folder', id: string): void
  (e: 'move-snippet', snippetId: string, folderId: string | null): void
  (e: 'new-snippet'): void
  (e: 'reorder-folder', folderId: string, targetFolderId: string, position: 'before' | 'after' | 'inside'): void
}>()

const { t } = useI18n()

// Refs
const newFolderInputRef = ref<HTMLInputElement | null>(null)
const renameInputRef = ref<HTMLInputElement | null>(null)

// State
const expandedFolders = ref<Set<string>>(new Set())
const showNewFolderInput = ref(false)
const newFolderName = ref('')
const newFolderParentId = ref<string | null>(null)
const renamingFolder = ref<SnippetFolder | null>(null)
const renameValue = ref('')

// Computed
const folderTree = computed(() => {
  const map = new Map<string | null, SnippetFolder[]>()
  for (const folder of props.folders) {
    const parentId = folder.parentId
    if (!map.has(parentId)) {
      map.set(parentId, [])
    }
    map.get(parentId)!.push(folder)
  }
  for (const children of map.values()) {
    children.sort((a, b) => a.order - b.order)
  }
  return map
})

const rootFolders = computed(() => folderTree.value.get(null) || [])

const quickFilters = computed(() => [
  {
    type: 'all' as SpecialFolderType,
    icon: 'i-carbon-list',
    label: t('tools.sidebar.all'),
    count: props.totalSnippets,
  },
  {
    type: 'starred' as SpecialFolderType,
    icon: 'i-carbon-star-filled text-yellow-500',
    label: t('tools.sidebar.starred'),
    count: props.starredCount,
  },
  {
    type: 'recent' as SpecialFolderType,
    icon: 'i-carbon-recently-viewed',
    label: t('tools.sidebar.recent'),
    count: props.recentCount,
  },
])

// Methods
function getChildFolders(parentId: string): SnippetFolder[] {
  return folderTree.value.get(parentId) || []
}

function selectFolder(folderId: string | null) {
  emit('select-folder', folderId)
}

function selectSpecialFolder(type: SpecialFolderType) {
  emit('select-special-folder', type)
}

function toggleTag(tagId: string) {
  emit('toggle-tag', tagId)
}

function clearAllTags() {
  emit('clear-all-tags')
}

function toggleExpand(folderId: string) {
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

function createFolder(parentId: string | null) {
  const name = newFolderName.value.trim()
  if (name) {
    emit('create-folder', name, parentId)
  }
  cancelNewFolder()
}

function cancelNewFolder() {
  showNewFolderInput.value = false
  newFolderName.value = ''
  newFolderParentId.value = null
}

function startNewSubfolder(parentId: string) {
  newFolderParentId.value = parentId
  showNewFolderInput.value = true
  expandedFolders.value.add(parentId)
  nextTick(() => {
    newFolderInputRef.value?.focus()
  })
}

function startRename(folder: SnippetFolder) {
  renamingFolder.value = folder
  renameValue.value = folder.name
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

function confirmRename() {
  if (renamingFolder.value && renameValue.value.trim()) {
    emit('rename-folder', renamingFolder.value.id, renameValue.value.trim())
  }
  cancelRename()
}

function cancelRename() {
  renamingFolder.value = null
  renameValue.value = ''
}

function deleteFolder(folderId: string) {
  emit('delete-folder', folderId)
}

function handleDropSnippet(payload: { snippetId: string; folderId: string }) {
  emit('move-snippet', payload.snippetId, payload.folderId)
}

function handleReorderFolder(folderId: string, targetFolderId: string, position: 'before' | 'after' | 'inside') {
  emit('reorder-folder', folderId, targetFolderId, position)
}

// Watch for new folder input
watch(showNewFolderInput, (show) => {
  if (show) {
    nextTick(() => {
      newFolderInputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.folder-tree {
  min-width: 180px;
}
</style>
