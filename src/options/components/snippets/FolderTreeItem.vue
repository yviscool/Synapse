<template>
  <div class="folder-tree-item">
    <!-- Folder row -->
    <div
      :class="[
        'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors group',
        isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="$emit('select', folder.id)"
      @contextmenu.prevent="showContextMenu"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Expand/collapse button -->
      <button
        v-if="hasChildren"
        @click.stop="$emit('toggle-expand', folder.id)"
        class="p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
      >
        <div :class="isExpanded ? 'i-carbon-chevron-down' : 'i-carbon-chevron-right'" class="text-xs"></div>
      </button>
      <div v-else class="w-4"></div>

      <!-- Folder icon -->
      <div :class="isExpanded ? 'i-carbon-folder-open' : 'i-carbon-folder'" class="text-gray-400"></div>

      <!-- Folder name -->
      <span class="flex-1 truncate">{{ folder.name }}</span>

      <!-- Count -->
      <span class="text-xs text-gray-400">{{ snippetCounts.get(folder.id) || 0 }}</span>

      <!-- Context menu button -->
      <button
        @click.stop="showContextMenu"
        class="p-0.5 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
        @drop-snippet="$emit('drop-snippet', $event.snippetId, $event.folderId)"
      />
    </div>

    <!-- Context menu -->
    <div
      v-if="contextMenuVisible"
      ref="contextMenuRef"
      class="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px]"
      :style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }"
    >
      <button
        @click="handleRename"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <div class="i-carbon-edit"></div>
        {{ t('tools.folder.rename') }}
      </button>
      <button
        v-if="depth < 2"
        @click="handleNewSubfolder"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <div class="i-carbon-folder-add"></div>
        {{ t('tools.folder.newSubfolder') }}
      </button>
      <div class="border-t border-gray-100 my-1"></div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
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
}>()

const { t } = useI18n()

// Refs
const contextMenuRef = ref<HTMLDivElement | null>(null)

// State
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const isDragOver = ref(false)

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
function onDragOver(e: DragEvent) {
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  isDragOver.value = false
  const snippetId = e.dataTransfer?.getData('text/snippet-id')
  if (snippetId) {
    emit('drop-snippet', { snippetId, folderId: props.folder.id })
  }
}

// Click outside to close context menu
function handleClickOutside(e: MouseEvent) {
  if (contextMenuRef.value && !contextMenuRef.value.contains(e.target as Node)) {
    hideContextMenu()
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
.folder-tree-item {
  user-select: none;
}
</style>
