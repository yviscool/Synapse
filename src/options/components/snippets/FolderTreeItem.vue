<template>
  <div class="folder-tree-item">
    <!-- Drop indicator: before -->
    <div v-if="dropPosition === 'before'" class="drop-indicator-before" :style="{ marginLeft: `${depth * 12 + 8}px` }"></div>

    <!-- Folder row -->
    <div
      :class="[
        'folder-row flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors group',
        isSelected ? 'bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700',
        isDraggingSelf && 'opacity-40',
        dropPosition === 'inside' && 'bg-blue-50 dark:bg-slate-800 ring-1 ring-blue-300 dark:ring-blue-600'
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      draggable="true"
      @click="$emit('select', folder.id)"
      @contextmenu.prevent="showContextMenu"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Expand/collapse button -->
      <button
        v-if="hasChildren"
        @click.stop="$emit('toggle-expand', folder.id)"
        class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
      >
        <div :class="isExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'" class="text-xs"></div>
      </button>
      <div v-else class="w-4"></div>

      <!-- Folder icon -->
      <div :class="isExpanded ? 'i-carbon-folder-open' : 'i-carbon-folder'" class="text-gray-400 dark:text-gray-500"></div>

      <!-- Folder name -->
      <span class="flex-1 truncate">{{ folder.name }}</span>

      <!-- Count -->
      <span class="text-xs text-gray-400 dark:text-gray-500">{{ snippetCounts.get(folder.id) || 0 }}</span>

      <!-- Context menu button -->
      <button
        @click.stop="showContextMenu"
        class="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div class="i-carbon-overflow-menu-vertical text-xs"></div>
      </button>
    </div>

    <!-- Children -->
    <div v-if="isExpanded && hasChildren">
      <FolderTreeItem
        v-for="child in children"
        :key="child.id"
        :folder="child"
        :children="getChildFolders(child.id)"
        :get-child-folders="getChildFolders"
        :selected-folder-id="selectedFolderId"
        :expanded-folders="expandedFolders"
        :snippet-counts="snippetCounts"
        :depth="depth + 1"
        @select="$emit('select', $event)"
        @toggle-expand="$emit('toggle-expand', $event)"
        @rename="$emit('rename', $event)"
        @delete="$emit('delete', $event)"
        @new-subfolder="$emit('new-subfolder', $event)"
        @drop-snippet="$emit('drop-snippet', $event)"
        @reorder-folder="(a, b, c) => $emit('reorder-folder', a, b, c)"
      />
    </div>

    <!-- Drop indicator: after -->
    <div v-if="dropPosition === 'after'" class="drop-indicator-after" :style="{ marginLeft: `${depth * 12 + 8}px` }"></div>

    <!-- Context menu -->
    <div
      v-if="contextMenuVisible"
      ref="contextMenuRef"
      class="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[140px]"
      :style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }"
    >
      <button
        @click="handleRename"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div class="i-carbon-edit"></div>
        {{ t('tools.folder.rename') }}
      </button>
      <button
        v-if="depth < 2"
        @click="handleNewSubfolder"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div class="i-carbon-folder-add"></div>
        {{ t('tools.folder.newSubfolder') }}
      </button>
      <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>
      <button
        @click="handleDelete"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
      >
        <div class="i-carbon-trash-can"></div>
        {{ t('tools.folder.delete') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import type { SnippetFolder } from '@/types/snippet'

const props = defineProps<{
  folder: SnippetFolder
  children: SnippetFolder[]
  getChildFolders: (parentId: string) => SnippetFolder[]
  selectedFolderId: string | null | undefined
  expandedFolders: Set<string>
  snippetCounts: Map<string | null, number>
  depth: number
}>()

const emit = defineEmits<{
  (e: 'select', folderId: string): void
  (e: 'toggle-expand', folderId: string): void
  (e: 'rename', folder: SnippetFolder): void
  (e: 'delete', folderId: string): void
  (e: 'new-subfolder', parentId: string): void
  (e: 'drop-snippet', payload: { snippetId: string; folderId: string }): void
  (e: 'reorder-folder', folderId: string, targetFolderId: string, position: 'before' | 'after' | 'inside'): void
}>()

const { t } = useI18n()

// Refs
const contextMenuRef = ref<HTMLDivElement | null>(null)

// State
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const isDragOver = ref(false)
const isDraggingSelf = ref(false)
const dropPosition = ref<'before' | 'after' | 'inside' | null>(null)
let stopOutsideClickListener: (() => void) | null = null

// Computed
const isSelected = computed(() => props.selectedFolderId === props.folder.id)
const isExpanded = computed(() => props.expandedFolders.has(props.folder.id))
const hasChildren = computed(() => props.children.length > 0)

// Context menu
function showContextMenu(e: MouseEvent) {
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

function handleRename() {
  emit('rename', props.folder)
  hideContextMenu()
}

function handleDelete() {
  emit('delete', props.folder.id)
  hideContextMenu()
}

function handleNewSubfolder() {
  emit('new-subfolder', props.folder.id)
  hideContextMenu()
}

// Drag and drop
function isDescendant(folderId: string, ancestorId: string): boolean {
  // Check if ancestorId is an ancestor of folderId by walking up the tree
  const check = (id: string): boolean => {
    const children = props.getChildFolders(id)
    for (const child of children) {
      if (child.id === folderId) return true
      if (check(child.id)) return true
    }
    return false
  }
  return check(ancestorId)
}

function onDragStart(e: DragEvent) {
  isDraggingSelf.value = true
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/folder-id', props.folder.id)
}

function onDragEnd() {
  isDraggingSelf.value = false
  dropPosition.value = null
}

function onDragOver(e: DragEvent) {
  const hasFolderId = e.dataTransfer?.types.includes('text/folder-id')
  const hasSnippetId = e.dataTransfer?.types.includes('text/snippet-id')

  if (hasFolderId) {
    // Compute drop zone: top 25% = before, bottom 25% = after, middle 50% = inside
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height

    if (ratio < 0.25) {
      dropPosition.value = 'before'
    } else if (ratio > 0.75) {
      dropPosition.value = 'after'
    } else {
      dropPosition.value = 'inside'
    }
    e.dataTransfer!.dropEffect = 'move'
  } else if (hasSnippetId) {
    isDragOver.value = true
  }
}

function onDragLeave() {
  isDragOver.value = false
  dropPosition.value = null
}

function onDrop(e: DragEvent) {
  const folderId = e.dataTransfer?.getData('text/folder-id')
  const snippetId = e.dataTransfer?.getData('text/snippet-id')

  isDragOver.value = false
  const pos = dropPosition.value
  dropPosition.value = null

  if (folderId && pos) {
    // Don't drop on self
    if (folderId === props.folder.id) return
    // Don't drop into own descendant
    if (pos === 'inside' && isDescendant(props.folder.id, folderId)) return
    emit('reorder-folder', folderId, props.folder.id, pos)
  } else if (snippetId) {
    emit('drop-snippet', { snippetId, folderId: props.folder.id })
  }
}

// Click outside to close context menu
function handleClickOutside(e: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(e.target as Node)) {
    hideContextMenu()
  }
}

watch(contextMenuVisible, (visible) => {
  stopOutsideClickListener?.()
  stopOutsideClickListener = null
  if (visible) {
    stopOutsideClickListener = useEventListener(document, 'click', handleClickOutside)
  }
})

onBeforeUnmount(() => {
  stopOutsideClickListener?.()
  stopOutsideClickListener = null
})
</script>

<style scoped>
.folder-tree-item {
  user-select: none;
  position: relative;
}

.drop-indicator-before,
.drop-indicator-after {
  height: 2px;
  background-color: #3b82f6;
  border-radius: 1px;
  pointer-events: none;
}
</style>
