<template>
  <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="$emit('close')">
    <div
      class="bg-white rounded-2xl shadow-2xl max-h-[100vh] overflow-hidden w-full"
      :class="{ 'max-w-[80vw]': !showVersionHistoryLocal, 'max-w-[90vw]': showVersionHistoryLocal }"
      @click.stop
    >
      <div class="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div class="flex-1">
          <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <div class="i-carbon-edit"></div>
            {{ modelValue?.id ? '编辑 Prompt' : '新建 Prompt' }}
          </h2>
          <div class="text-sm text-gray-500 mt-1" v-if="modelValue?.id">
            ID: {{ modelValue.id }}
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="modelValue?.id"
            @click="showVersionHistoryLocal = !showVersionHistoryLocal"
            :class="['p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors', { 'text-blue-600 bg-blue-100': showVersionHistoryLocal }]"
            title="版本历史"
          >
            <div class="i-carbon-time"></div>
          </button>
          <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors">
            <div class="i-carbon-close"></div>
          </button>
        </div>
      </div>

      <div class="flex h-[75vh]">
        <!-- 左侧版本历史面板 -->
        <div v-if="showVersionHistoryLocal && modelValue?.id" class="w-80 border-l border-gray-200 flex flex-col flex-shrink-0 min-w-0">
          <VersionHistory
            :prompt-id="modelValue.id"
            :current-version-id="modelValue.currentVersionId"
            :current-content="modelValue.content || ''"
            @version-restored="$emit('version-restored', $event)"
            @version-deleted="$emit('version-deleted', $event)"
            @preview-version="$emit('preview-version', $event)"
          />
        </div>

        <div class="flex-1 flex overflow-hidden">
          <!-- 中间元数据面板 -->
          <div class="w-96 border-r border-gray-200 p-4 flex flex-col space-y-4 overflow-y-auto">
            <h3 class="text-lg font-semibold text-gray-800 tracking-wide">元数据</h3>

            <div class="space-y-5">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
                <input
                  v-model="titleProxy"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="为你的 Prompt 起个好名字..."
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">分类 (可多选)</label>
                <div class="w-full p-2 border border-gray-200 rounded-lg flex flex-wrap gap-2">
                  <button
                    v-for="category in availableCategories"
                    :key="category.id"
                    @click="toggleCategoryForEdit(category.id)"
                    :class="[
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                      (modelValue?.categoryIds || []).includes(category.id)
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    ]"
                  >
                    {{ category.name }}
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">标签</label>
                <div class="w-full px-3 py-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap items-center gap-2">
                  <span
                    v-for="tag in editingTags"
                    :key="tag"
                    class="flex items-center gap-1.5 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium"
                  >
                    {{ tag }}
                    <button @click="removeTag(tag)" class="text-blue-600 hover:text-blue-800 -mr-1 rounded-full hover:bg-blue-200">
                      <div class="i-carbon-close text-xs"></div>
                    </button>
                  </span>
                  <input
                    v-model="tagInputLocal"
                    type="text"
                    class="flex-1 bg-transparent outline-none min-w-[80px] h-8"
                    placeholder="添加标签后回车..."
                    @keydown.enter.prevent="addCurrentTag"
                    @keydown.backspace="handleTagBackspace"
                  >
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">变更说明</label>
                <input
                  v-model="changeNoteProxy"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="描述本次修改的内容 (可选)..."
                >
              </div>

              <div>
                <label class="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" v-model="favoriteProxy" class="rounded text-blue-600 focus:ring-blue-500">
                  <span class="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div class="i-carbon-favorite"></div>
                    标记为收藏
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- 右侧编辑器区域 -->
          <div class="flex-1 flex flex-col p-4 space-y-2 bg-gray-50/50 min-w-0">
            <label class="block text-sm font-medium text-gray-700">Prompt 内容</label>

            <!-- Time Machine Banner -->
            <div v-if="isReadonly && previewingVersion" class="p-2 rounded-lg bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm flex items-center justify-between">
              <span class="font-medium">正在预览 v{{ previewingVersion.versionNumber }} (只读模式)</span>
              <button @click="$emit('edit-from-preview')" class="px-3 py-1 bg-white border border-yellow-400 rounded-md hover:bg-yellow-50 transition-colors">✍️ 基于此版本编辑</button>
            </div>
            <div v-if="!isReadonly && baseVersionForEdit" class="p-2 rounded-lg bg-blue-100 border border-blue-300 text-blue-800 text-sm flex items-center justify-between">
              <span class="font-medium">正在编辑 (基于 v{{ baseVersionForEdit.versionNumber }})</span>
            </div>
            <div v-if="!isReadonly && !baseVersionForEdit" class="p-2 rounded-lg bg-green-100 border border-green-300 text-green-800 text-sm flex items-center">
              <span class="font-medium">正在编辑新版本</span>
            </div>

            <div class="flex-1 relative border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-white flex flex-col">
              <MarkdownEditor
                v-model="contentProxy"
                :readonly="isReadonly"
                placeholder="在这里编写你的 AI Prompt..."
                @change="$emit('content-change')"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <div class="text-sm text-gray-500">
          <span v-if="modelValue?.content">
            {{ (modelValue.content || '').length }} 字符
          </span>
        </div>
        <div class="flex items-center gap-3">
          <button @click="$emit('save')" class="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg">
            <div class="i-carbon-save"></div>
            保存 
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useModal } from '@/composables/useModal'
import { useMagicKeys } from '@vueuse/core'
import MarkdownEditor from '@/options/components/MarkdownEditor.vue'
import VersionHistory from '@/options/components/VersionHistory.vue'
import type { Prompt, Category, PromptVersion } from '@/types/prompt'

const props = defineProps<{
  modelValue: Partial<Prompt>
  availableCategories: Category[]
  editingTags: string[]
  changeNote: string
  isReadonly: boolean
  previewingVersion: { version: PromptVersion, versionNumber: number } | null
  baseVersionForEdit: { version: PromptVersion, versionNumber: number } | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: Partial<Prompt>): void
  (e: 'update:editingTags', val: string[]): void
  (e: 'update:changeNote', val: string): void
  (e: 'close'): void
  (e: 'save'): void
  (e: 'content-change'): void
  (e: 'edit-from-preview'): void
  (e: 'version-restored', payload: any): void
  (e: 'version-deleted', id: string): void
  (e: 'preview-version', payload: { version: PromptVersion, versionNumber: number }): void
}>()

const isOpen = computed(() => !!props.modelValue)
useModal(isOpen, () => emit('close'))

const keys = useMagicKeys()
watch([keys['Ctrl+Enter'], keys['Meta+Enter']], ([ctrl, meta]) => {
  if ((ctrl || meta) && isOpen.value) {
    emit('save')
  }
})

const titleProxy = computed({
  get: () => props.modelValue?.title || '',
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, title: val }),
})

const contentProxy = computed({
  get: () => props.modelValue?.content || '',
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, content: val }),
})

const favoriteProxy = computed({
  get: () => Boolean(props.modelValue?.favorite),
  set: (val: boolean) => emit('update:modelValue', { ...props.modelValue, favorite: val }),
})

const tagInputLocal = ref<string>('')
const showVersionHistoryLocal = ref(true)

const changeNoteProxy = computed({
  get: () => props.changeNote,
  set: (val: string) => emit('update:changeNote', val),
})

function toggleCategoryForEdit(categoryId: string) {
  const current = Array.isArray(props.modelValue?.categoryIds) ? [...(props.modelValue!.categoryIds as string[])] : []
  const idx = current.indexOf(categoryId)
  if (idx > -1) current.splice(idx, 1)
  else current.push(categoryId)
  emit('update:modelValue', { ...props.modelValue, categoryIds: current })
}

function addCurrentTag() {
  const name = tagInputLocal.value.trim()
  if (!name) return
  if (!props.editingTags.includes(name)) {
    emit('update:editingTags', [...props.editingTags, name])
  }
  tagInputLocal.value = ''
}

function removeTag(tagToRemove: string) {
  emit('update:editingTags', props.editingTags.filter(t => t !== tagToRemove))
}

function handleTagBackspace() {
  if (tagInputLocal.value === '' && props.editingTags.length > 0) {
    const next = props.editingTags.slice(0, -1)
    emit('update:editingTags', next)
  }
}
</script>

<style scoped>
</style>