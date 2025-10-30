<template>
  <!-- 模态框背景遮罩层：固定定位覆盖整个视口，半透明黑色背景配合毛玻璃效果 -->
  <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="handleModalClick">
    <!-- 模态框容器：白色背景，圆角设计，根据是否显示版本历史动态调整宽度 -->
    <div
      class="bg-white rounded-2xl shadow-2xl max-h-[100vh] overflow-hidden w-full"
      :class="{ 'max-w-[80vw]': !showVersionHistoryLocal, 'max-w-[90vw]': showVersionHistoryLocal }"
      @click.stop
    >
      <!-- 模态框头部：包含标题和操作按钮 -->
      <div class="flex items-center justify-between p-2 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <!-- 左侧标题区域 -->
        <div class="flex-1">
          <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <div class="i-carbon-edit"></div>
            <!-- 根据是否有ID显示不同的标题 -->
            {{ modelValue?.id ? t('prompts.editor.titleEdit') : t('prompts.editor.titleCreate') }}
          </h2>
          <!-- 显示当前编辑的提示词ID -->
          <div class="text-sm text-gray-500 mt-1" v-if="modelValue?.id">
            ID: {{ modelValue.id }}
          </div>
        </div>

        <!-- 右侧操作按钮区域 -->
        <div class="flex items-center gap-2">
          <!-- 版本历史切换按钮：只有在编辑现有提示词时显示 -->
          <button
            v-if="modelValue?.id"
            @click="showVersionHistoryLocal = !showVersionHistoryLocal"
            :class="['p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors', { 'text-blue-600 bg-blue-100': showVersionHistoryLocal }]"
            :title="t('prompts.editor.versionHistory')"
          >
            <div class="i-carbon-time"></div>
          </button>
          <!-- 关闭按钮 -->
          <button @click="$emit('close')" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors">
            <div class="i-carbon-close"></div>
          </button>
        </div>
      </div>

      <!-- 模态框主体内容区域 -->
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

        <!-- 右侧编辑区域 -->
        <div class="flex-1 flex overflow-hidden">
          <!-- 中间元数据面板：固定宽度，包含提示词的基本信息 -->
          <div class="w-96 border-r border-gray-200 p-4 flex flex-col space-y-4 overflow-y-auto">
            <h3 class="text-lg font-semibold text-gray-800 tracking-wide">{{ t('prompts.editor.metadata') }}</h3>

            <!-- 元数据表单区域 -->
            <div class="space-y-5">
              <!-- 提示词标题输入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('prompts.editor.promptTitle') }}</label>
                <input
                  v-model="titleProxy"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :placeholder="t('prompts.editor.titlePlaceholder')"
                >
              </div>

              <!-- 分类选择区域 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('prompts.editor.category') }}</label>
                <div class="w-full p-2 border border-gray-200 rounded-lg flex flex-wrap gap-2">
                  <!-- 动态生成分类按钮 -->
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

              <!-- 标签管理区域 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('prompts.editor.tags') }}</label>
                <div class="w-full px-3 py-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex flex-wrap items-center gap-2">
                  <!-- 已添加的标签显示 -->
                  <span
                    v-for="tag in editingTags"
                    :key="tag"
                    class="flex items-center gap-1.5 bg-blue-100 text-blue-800 rounded-full px-3 py-1 text-sm font-medium"
                  >
                    {{ tag }}
                    <!-- 删除单个标签按钮 -->
                    <button @click="removeTag(tag)" class="text-blue-600 hover:text-blue-800 -mr-1 rounded-full hover:bg-blue-200">
                      <div class="i-carbon-close text-xs"></div>
                    </button>
                  </span>
                  <!-- 新标签输入框：支持多种快捷操作 -->
                  <input
                    v-model="tagInputLocal"
                    type="text"
                    class="flex-1 bg-transparent outline-none min-w-[80px] h-8"
                    :placeholder="t('prompts.editor.tagsPlaceholder')"
                    @keydown.enter.prevent="addCurrentTag"
                    @keydown.comma.prevent="addCurrentTag"
                    @keydown.tab.prevent="addCurrentTag"
                    @keydown.backspace="handleTagBackspace"
                    @blur="handleTagInputBlur"
                    @focus="isTagInputFocused = true"
                  >
                </div>
              </div>

              <!-- 修改备注输入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">{{ t('prompts.editor.changeNote') }}</label>
                <input
                  v-model="changeNoteProxy"
                  type="text"
                  class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  :placeholder="t('prompts.editor.changeNotePlaceholder')"
                >
              </div>

              <!-- 收藏标记 -->
              <div>
                <label class="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="checkbox" v-model="favoriteProxy" class="rounded text-blue-600 focus:ring-blue-500">
                  <span class="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <div class="i-carbon-favorite"></div>
                    {{ t('prompts.editor.markAsFavorite') }}
                  </span>
                </label>
              </div>
            </div>
          </div>

          <!-- 右侧编辑器区域：占剩余空间 -->
          <div class="flex-1 flex flex-col p-4 space-y-2 bg-gray-50/50 min-w-0">
            <div class="flex items-center justify-between">
              <label class="block text-sm font-medium text-gray-700">{{ t('prompts.editor.promptContent') }}</label>

              <!-- 版本预览状态提示条 -->
              <!-- 预览历史版本时的提示 -->
              <div v-if="isReadonly && previewingVersion" class="px-2 py-1 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs flex items-center justify-between">
                <span class="font-medium">{{ t('prompts.editor.previewing', { version: previewingVersion.versionNumber }) }}</span>
                <button @click="$emit('edit-from-preview')" class="ml-2 px-2 py-0.5 bg-white border border-yellow-400 rounded-md hover:bg-yellow-50 transition-colors">{{ t('prompts.editor.editFromPreview') }}</button>
              </div>
              <!-- 基于历史版本编辑时的提示 -->
              <div v-else-if="!isReadonly && baseVersionForEdit" class="px-2 py-1 rounded-md bg-blue-100 border border-blue-300 text-blue-800 text-xs flex items-center justify-between">
                <span class="font-medium">{{ t('prompts.editor.editingBasedOn', { version: baseVersionForEdit.versionNumber }) }}</span>
              </div>
              <!-- 新建版本时的提示 -->
              <div v-else-if="!isReadonly && !baseVersionForEdit" class="px-2 py-1 rounded-md bg-green-100 border border-green-300 text-green-800 text-xs flex items-center">
                <span class="font-medium">{{ t('prompts.editor.editingNew') }}</span>
              </div>
            </div>

            <!-- Markdown编辑器 -->
            <div class="flex-1 relative border border-gray-200 rounded-lg overflow-hidden shadow-inner bg-white flex flex-col">
              <MarkdownEditor
                v-model="contentProxy"
                :readonly="isReadonly"
                :placeholder="t('prompts.editor.contentPlaceholder')"
                @change="$emit('content-change')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 模态框底部操作栏 -->
      <div class="flex items-center justify-between p-2 border-t border-gray-200 bg-gray-50">
        <!-- 字符统计 -->
        <div class="text-sm text-gray-500">
          <span v-if="modelValue?.content">
            {{ t('prompts.editor.charCount', { count: (modelValue.content || '').length }) }}
          </span>
        </div>
        <!-- 保存按钮 -->
        <div class="flex items-center gap-3">
          <button @click="$emit('save')" class="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg">
            <div class="i-carbon-save"></div>
            {{ t('prompts.editor.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Vue 3 组合式API相关导入
import { computed, ref, watch } from 'vue'
// 国际化相关导入
import { useI18n } from 'vue-i18n'
// 自定义Hook导入
import { useModal } from '@/composables/useModal'
import { useMagicKeys } from '@vueuse/core'
// 子组件导入
import MarkdownEditor from '@/options/components/MarkdownEditor.vue'
import VersionHistory from '@/options/components/VersionHistory.vue'
// 类型定义导入
import type { Prompt, Category, PromptVersion } from '@/types/prompt'

// ===============================
// Props 定义
// ===============================

const props = defineProps<{
  // 当前编辑的提示词数据对象（支持部分更新）
  modelValue: Partial<Prompt>
  // 可用的分类列表
  availableCategories: Category[]
  // 当前编辑的标签数组
  editingTags: string[]
  // 当前的修改备注
  changeNote: string
  // 是否为只读模式（如版本预览时）
  isReadonly: boolean
  // 当前正在预览的版本信息
  previewingVersion: { version: PromptVersion, versionNumber: number } | null
  // 作为编辑基础的历史版本信息
  baseVersionForEdit: { version: PromptVersion, versionNumber: number } | null
}>()

// ===============================
// 事件定义
// ===============================

const emit = defineEmits<{
  // 更新提示词主要数据
  (e: 'update:modelValue', val: Partial<Prompt>): void
  // 更新标签数组
  (e: 'update:editingTags', val: string[]): void
  // 更新修改备注
  (e: 'update:changeNote', val: string): void
  // 关闭模态框
  (e: 'close'): void
  // 保存提示词
  (e: 'save'): void
  // 内容发生变化
  (e: 'content-change'): void
  // 从预览模式切换到编辑模式
  (e: 'edit-from-preview'): void
  // 版本恢复事件
  (e: 'version-restored', payload: any): void
  // 版本删除事件
  (e: 'version-deleted', id: string): void
  // 预览版本事件
  (e: 'preview-version', payload: { version: PromptVersion, versionNumber: number }): void
}>()

// ===============================
// 本地状态管理
// ===============================

const { t } = useI18n()

// 检查模态框是否打开（通过modelValue是否存在判断）
const isOpen = computed(() => !!props.modelValue)
// 使用自定义Hook处理模态框的打开/关闭逻辑
useModal(isOpen, () => emit('close'))

// 监听快捷键（Ctrl+Enter 或 Meta+Enter 保存）
const keys = useMagicKeys()
watch([keys['Ctrl+Enter'], keys['Meta+Enter']], ([ctrl, meta]) => {
  if ((ctrl || meta) && isOpen.value) {
    emit('save')
  }
})

// ===============================
// 计算属性 - 双向绑定代理
// ===============================

// 标题的双向绑定代理
const titleProxy = computed({
  get: () => props.modelValue?.title || '',
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, title: val }),
})

// 内容的双向绑定代理
const contentProxy = computed({
  get: () => props.modelValue?.content || '',
  set: (val: string) => emit('update:modelValue', { ...props.modelValue, content: val }),
})

// 收藏状态的双向绑定代理
const favoriteProxy = computed({
  get: () => Boolean(props.modelValue?.favorite),
  set: (val: boolean) => emit('update:modelValue', { ...props.modelValue, favorite: val }),
})

// ===============================
// 本地响应式状态
// ===============================

// 本地标签输入框的值
const tagInputLocal = ref<string>('')
// 控制是否显示版本历史面板
const showVersionHistoryLocal = ref(true)
// 跟踪标签输入框是否获得焦点
const isTagInputFocused = ref(false)

// 修改备注的双向绑定代理
const changeNoteProxy = computed({
  get: () => props.changeNote,
  set: (val: string) => emit('update:changeNote', val),
})

// ===============================
// 业务逻辑函数
// ===============================

/**
 * 切换分类选择状态
 * @param categoryId - 要切换的分类ID
 */
function toggleCategoryForEdit(categoryId: string) {
  // 获取当前选中的分类ID数组，如果不存在则初始化为空数组
  const current = Array.isArray(props.modelValue?.categoryIds) ? [...(props.modelValue!.categoryIds as string[])] : []
  const idx = current.indexOf(categoryId)
  // 如果已选中则移除，否则添加
  if (idx > -1) current.splice(idx, 1)
  else current.push(categoryId)
  // 通过事件更新父组件数据
  emit('update:modelValue', { ...props.modelValue, categoryIds: current })
}

/**
 * 添加当前输入的标签
 * 支持批量输入（用逗号分隔多个标签）
 */
function addCurrentTag() {
  const input = tagInputLocal.value.trim()
  if (!input) return

  let tagsToAdd: string[] = []

  // 支持逗号分隔的批量标签输入
  if (input.includes(',')) {
    tagsToAdd = input.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
  } else {
    tagsToAdd = [input]
  }

  const currentTags = [...props.editingTags]
  const newTags = tagsToAdd.filter(tag => !currentTags.includes(tag))

  if (newTags.length > 0) {
    emit('update:editingTags', [...currentTags, ...newTags])
  }

  // 清空输入框
  tagInputLocal.value = ''
}

/**
 * 处理标签输入框失去焦点事件
 * 延迟执行以避免与其他点击事件冲突
 */
function handleTagInputBlur() {
  isTagInputFocused.value = false
  // 延迟执行，确保如果用户点击了其他元素（如保存按钮），不会触发添加标签
  setTimeout(() => {
    if (!isTagInputFocused.value) {
      addCurrentTag()
    }
  }, 100)
}

/**
 * 处理模态框背景点击事件
 * 只有当标签输入框有焦点且有内容时才添加标签
 */
function handleModalClick() {
  // 如果标签输入框有焦点且有内容，点击空白区域时自动添加标签
  if (isTagInputFocused.value && tagInputLocal.value.trim()) {
    addCurrentTag()
  }
}

/**
 * 移除指定的标签
 * @param tagToRemove - 要移除的标签名称
 */
function removeTag(tagToRemove: string) {
  emit('update:editingTags', props.editingTags.filter(t => t !== tagToRemove))
}

/**
 * 处理标签输入框的退格键事件
 * 当输入框为空且有标签时，删除最后一个标签
 */
function handleTagBackspace() {
  if (tagInputLocal.value === '' && props.editingTags.length > 0) {
    const next = props.editingTags.slice(0, -1)
    emit('update:editingTags', next)
  }
}
</script>

<style scoped>
/* ===============================
   提示词编辑器模态框样式
   本文件包含所有与提示词编辑相关的UI样式
   =============================== */

/* 模态框容器基础样式 */
/* 白色背景，圆角设计，阴影效果 */
/* 根据是否显示版本历史动态调整最大宽度 */

/* 标签相关样式 */
/* 标签显示为蓝色背景的圆角徽章 */
/* 支持悬停效果和删除按钮 */

/* 版本状态提示条样式 */
/* 预览模式：黄色提示条 */
/* 编辑模式：蓝色提示条 */
/* 新建模式：绿色提示条 */

/* 按钮状态样式 */
/* 分类按钮的选中/未选中状态 */
/* 保存按钮的渐变背景和悬停效果 */

/* 响应式设计 */
/* 在不同屏幕尺寸下的布局适配 */
/* 移动端的触摸友好设计 */

/* 动画和过渡效果 */
/* 按钮悬停过渡 */
/* 模态框出现/消失动画 */
/* 标签添加/删除动画 */
</style>