<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <!-- 现代化头部 -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <!-- <img src="/icons/icon-128.png" alt="Synapse" class="h-8 w-8"> -->
            <h1 class="text-2xl font-bold bg-clip-text text-transparent relative inline-block" style="background-image: linear-gradient(135deg, #00D5FF 0%, #00A6FF 12%, #0066FF 24%, #3B3BFF 34%, #6A00FF 46%, #8B00FF 56%, #FF00B8 66%, #FF1744 76%, #FF7A00 88%, #FFC107 100%);">Synapse
              <span class="pointer-events-none absolute rounded-full bg-white" style="width: 0.75rem; height: 0.75rem; top: -0.4rem; left: -0.4rem; box-shadow: 0 0 12px rgba(255,255,255,0.9);"></span>
              <span class="pointer-events-none absolute rounded-full bg-white" style="width: 0.75rem; height: 0.75rem; bottom: -0.4rem; right: -0.4rem; box-shadow: 0 0 12px rgba(255,255,255,0.9);"></span>
              <span class="pointer-events-none absolute" style="left: -0.6rem; bottom: -0.25rem;">
                <span class="absolute rounded-full" style="width: 0.4rem; height: 0.4rem; left: -0.2rem; bottom: 0; background-color: #5B21B6; opacity: 0.95;"></span>
                <span class="absolute rounded-full" style="width: 0.3rem; height: 0.3rem; left: -0.55rem; bottom: 0.35rem; background-color: #7C3AED; opacity: 0.85;"></span>
                <span class="absolute rounded-full" style="width: 0.2rem; height: 0.2rem; left: -0.8rem; bottom: 0.8rem; background-color: #A78BFA; opacity: 0.8;"></span>
              </span>
            </h1>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button @click="showSettings = true" class="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900" title="设置">
            <div class="i-carbon-settings text-lg"></div>
            <span class="hidden sm:inline">设置</span>
          </button>
          <button @click="createNewPrompt" class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105">
            <div class="i-carbon-add"></div>
            <span>新建 Prompt</span>
          </button>

          <div class="w-px h-6 bg-gray-200/80 ml-3 mr-1"></div>

          <a href="https://github.com/yviscool/Synapse" target="_blank" rel="noopener noreferrer" title="反馈问题或贡献代码" class="p-2 rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <div class="i-carbon-logo-github text-xl"></div>
          </a>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">
      <!-- 优化的搜索和过滤区域 -->
      <div class="mb-8 space-y-6">
        <div class="flex justify-center">
          <div class="relative w-full max-w-2xl z-20">
            <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg i-carbon-search z-10"></div>
            <input
              v-model="searchQuery"
              ref="searchInputRef"
              type="text"
              aria-label="搜索 Prompts"
              placeholder="搜索 Prompts 标题或内容...（Ctrl+K）"
              class="w-full pl-12 pr-40 py-4 text-lg border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            >
            <button v-if="searchQuery" @click="searchQuery = ''" class="absolute right-32 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
              <div class="i-carbon-close"></div>
            </button>
            <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center">
              <div class="w-px h-6 bg-gray-200/80 mr-3"></div>
              <!-- 排序方式下拉菜单 -->
              <div class="relative" ref="sortMenuRef">
                <button @click="showSortMenu = !showSortMenu"
                  class="flex items-center gap-2 text-base text-gray-600 font-medium hover:text-gray-900 transition-colors">
                  <span>{{ currentSortText }}</span>
                  <i class="i-carbon-chevron-down text-sm transition-transform"
                    :class="{ 'rotate-180': showSortMenu }"></i>
                </button>
                <!-- 下拉选项 -->
                <transition enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95">
                  <div v-if="showSortMenu"
                    class="absolute z-30 top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200/80">
                    <div class="py-1">
                      <button v-for="option in sortOptions" :key="option.value" @click="changeSortBy(option.value)"
                        class="w-full text-left px-4 py-2 text-sm flex items-center gap-2" :class="[
                          sortBy === option.value
                            ? 'font-semibold text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-100',
                        ]">
                        <i class="i-carbon-checkmark text-transparent" :class="{ '!text-blue-600': sortBy === option.value }"></i>
                        <span>{{ option.text }}</span>
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <!-- The new Control Shelf -->
          <div class="relative z-10 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/60 space-y-4">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <!-- Category Filters -->
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <button
                  @click="toggleCategory('')"
                  :class="['flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors', selectedCategories.length === 0 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 hover:bg-gray-50']"
                >
                  <div class="i-ph-books"></div>
                  <span>全部分类</span>
                </button>

                <div class="relative group flex-1 min-w-0">
                  <div class="overflow-hidden" ref="shelfViewportRef" @wheel="handleShelfScroll">
                    <div class="flex items-center gap-2 transition-transform duration-300 ease-in-out" ref="shelfContentRef" :style="{ transform: `translateX(-${scrollOffset}px)` }">
                      <button
                        v-for="category in availableCategories"
                        :key="category.id"
                        @click="toggleCategory(category.id)"
                        :class="['flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors', selectedCategories.includes(category.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 hover:bg-gray-50']"
                      >
                        <div v-if="category.icon" :class="[category.icon]"></div>
                        <span>{{ category.name }}</span>
                      </button>
                    </div>
                  </div>
                  <button v-if="canScrollLeft" @click="scrollShelf('left')" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="i-carbon-chevron-left"></div>
                  </button>
                  <button v-if="canScrollRight" @click="scrollShelf('right')" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="i-carbon-chevron-right"></div>
                  </button>
                </div>

                <button 
                  @click="showFavoriteOnly = !showFavoriteOnly" 
                  :class="['flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors', showFavoriteOnly ? 'bg-yellow-100 border-yellow-300 text-yellow-800' : 'bg-white border-gray-200 hover:bg-gray-50']"
                >
                  <div :class="showFavoriteOnly ? 'i-carbon-favorite-filled' : 'i-carbon-favorite'" class="text-yellow-500"></div>
                  <span>仅收藏</span>
                </button>

                <div class="w-px h-6 bg-gray-200/80 ml-2 mr-1"></div>

                <!-- New Category Settings Dropdown -->
                <div class="relative" ref="categorySettingsRef">
                  <button @click="isCategorySettingsOpen = !isCategorySettingsOpen" class="flex-shrink-0 flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 hover:border-gray-400" title="分类设置">
                    <div class="i-carbon-settings-adjust text-lg"></div>
                  </button>
                  <div
                    v-if="isCategorySettingsOpen"
                    class="absolute right-0 top-12 z-30 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                  >
                    <button
                      @click="showCategoryManager = true; isCategorySettingsOpen = false"
                      class="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <div class="i-carbon-edit"></div>
                      <span>分类管理</span>
                    </button>
                    <button
                      @click="showMergeImport = true; isCategorySettingsOpen = false"
                      class="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      <div class="i-carbon-document-import"></div>
                      <span>导入/合并</span>
                    </button>
                    <div class="h-px bg-gray-200 my-1"></div>
                    <button
                      @click="showDeleteCategoryModal = true; isCategorySettingsOpen = false"
                      class="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      <div class="i-carbon-trash-can"></div>
                      <span>批量删除</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tag Filters (now inside the shelf) -->
            <div v-if="selectedCategories.length > 0 && availableTags.length > 0" class="flex items-center justify-start gap-2 flex-wrap border-t border-gray-200 pt-4">
              <button
                @click="toggleTag('')"
                :class="['px-3 py-1 text-sm rounded-md transition-colors', selectedTags.length === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
              >
                全部
              </button>
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                @click="toggleTag(tag.id)"
                :class="['px-3 py-1 text-sm rounded-md transition-colors', selectedTags.includes(tag.id) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300']"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 美化的 Prompt 网格 -->
      <div class="min-h-96 relative">
        <div v-if="prompts.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="mb-6">
            <div class="i-carbon-document-blank text-6xl text-gray-300"></div>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">暂无 Prompts</h3>
          <p class="text-gray-600 mb-6 max-w-md">
            {{ searchQueryDebounced ? '没有找到匹配的 Prompts' : '开始创建你的第一个 AI Prompt 吧！' }}
          </p>
          <button v-if="!searchQuery" @click="createNewPrompt" class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <div class="i-carbon-add"></div>
            创建 Prompt
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="prompt in prompts"
            :key="prompt.id"
            class="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-lg transition-transform duration-200 hover:-translate-y-1"
            @dblclick="editPrompt(prompt)"
            title="双击编辑"
          >
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2" v-html="generateHighlightedHtml(prompt.title, prompt.matches, 'title')"></h3>
                <div class="flex items-center gap-3 text-sm text-gray-500">
                  <span class="card-date">{{ formatDate(prompt.updatedAt) }}</span>

                </div>
              </div>
              
              <div class="flex items-center gap-1 relative">
                <button 
                  @click.stop="toggleFavorite(prompt)" 
                  @dblclick.stop
                  :class="['p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors', { 'text-yellow-500 hover:text-yellow-600': prompt.favorite }]"
                  :title="prompt.favorite ? '取消收藏' : '收藏'"
                >
                  <div :class="prompt.favorite ? 'i-carbon-favorite-filled' : 'i-carbon-favorite'"></div>
                </button>
                <button
                  @click.stop="menuOpenId = menuOpenId === prompt.id ? null : prompt.id"
                  @dblclick.stop
                  class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="更多"
                >
                  <div class="i-carbon-overflow-menu-horizontal"></div>
                </button>
                <div
                  v-if="menuOpenId === prompt.id"
                  class="absolute right-0 top-10 z-10 w-28 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                >
                  <button
                    @click.stop="editPrompt(prompt); menuOpenId = null"
                    class="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    <div class="i-carbon-edit"></div>
                    <span>编辑</span>
                  </button>
                  <button
                    @click.stop="deletePrompt(prompt.id); menuOpenId = null"
                    class="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    <div class="i-carbon-trash-can"></div>
                    <span>删除</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <p class="text-gray-600 leading-relaxed line-clamp-3" @dblclick.stop v-html="generateHighlightedHtml(prompt.content, prompt.matches, 'content')"></p>
            </div>
            
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-wrap">
                <span 
                  v-for="categoryId in prompt.categoryIds" 
                  :key="categoryId" 
                  class="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                >
                  {{ getCategoryName(categoryId) }}
                </span>
                <span 
                  v-for="tagId in prompt.tagIds" 
                  :key="tagId" 
                  class="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-100 text-green-800"
                >
                  {{ getTagNames([tagId])[0] }}
                </span>
              </div>
              <button
                @click.stop="copyPrompt(prompt)"
                @dblclick.stop
                :class="['flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors', copiedId === prompt.id ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700']"
                title="复制内容"
              >
                <div :class="copiedId === prompt.id ? 'i-carbon-checkmark' : 'i-carbon-copy'"></div>
                <span>{{ copiedId === prompt.id ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Loader and Sentinel -->
        <div ref="loaderRef" class="col-span-full mt-6 flex justify-center items-center h-10">
          <div v-if="isLoading && prompts.length > 0" class="flex items-center gap-2 text-gray-500">
            <div class="i-carbon-circle-dash w-6 h-6 animate-spin"></div>
            <span>加载中...</span>
          </div>
          <div v-if="!hasMore && prompts.length > 0" class="text-gray-500">
            --- 已加载全部 ---
          </div>
        </div>
      </div>
    </main>

    <!-- 现代化编辑模态框 -->
    <PromptEditorModal
      v-if="editingPrompt"
      v-model="editingPrompt"
      :available-categories="availableCategories"
      v-model:editingTags="editingTags"
      v-model:changeNote="changeNote"
      :isReadonly="isReadonly"
      :previewingVersion="previewingVersion"
      :baseVersionForEdit="baseVersionForEdit"
      @close="closeEditor"
      @save="savePrompt"
      @content-change="handleContentChange"
      @edit-from-preview="handleEditFromPreview"
      @version-restored="handleVersionRestored"
      @version-deleted="handleVersionDeleted"
      @preview-version="handleVersionPreview"
    />

    <!-- 设置模态框 -->
    <div v-if="showSettings" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" @click="showSettings = false">
      <div class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-4xl w-full" @click.stop>
        <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div class="flex-1">
            <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
              <div class="i-carbon-settings"></div>
              设置
            </h2>
          </div>
          <button @click="showSettings = false" class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors">
            <div class="i-carbon-close"></div>
          </button>
        </div>
        
        <div class="max-h-[70vh] overflow-y-auto">
          <Settings />
        </div>
      </div>
    </div>

    <CategoryManager v-model:visible="showCategoryManager" @updated="loadCategories" />

    <MergeImportModal v-model:visible="showMergeImport" :available-categories="availableCategories" :active-categories="selectedCategories" :active-tags="getTagNames(selectedTags)" @merged="handleMergeSuccess" />

    <DeleteCategoryModal v-model:visible="showDeleteCategoryModal" :categories="categories" @updated="handleCategoryDeletion" />

    <!-- 全局 UI 组件 -->
    <UiToast
      v-if="ui.toast"
      :message="ui.toast.message"
      :type="ui.toast.type"
      @close="hideToast"
    />
    <UiConfirm
      v-model="ui.confirm.visible"
      :message="ui.confirm.message"
      :type="ui.confirm.type"
      @confirm="handleConfirm(true)"
      @cancel="handleConfirm(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ui, useUI } from '@/stores/ui'
import { db, queryPrompts, type PromptWithMatches } from '@/stores/db'
import { repository } from '@/stores/repository'
import type { Prompt, Category, Tag, PromptVersion } from '@/types/prompt'
import { generateHighlightedHtml } from '@/utils/highlighter'
import { nanoid } from 'nanoid'
import { createSafePrompt, validatePrompt, clonePrompt } from '@/utils/promptUtils'
import { useModal } from '@/composables/useModal'
import { onKeyStroke, refDebounced, onClickOutside } from '@vueuse/core'
import { parseQuery } from '@/utils/queryParser'
import PromptEditorModal from '@/options/components/PromptEditorModal.vue'
import Settings from './components/Settings.vue'
import CategoryManager from './components/CategoryManager.vue'
import MergeImportModal from './components/MergeImportModal.vue'
import DeleteCategoryModal from './components/DeleteCategoryModal.vue'

const { showToast, askConfirm, handleConfirm, hideToast } = useUI()

// --- 数据与筛选状态 ---
const prompts = ref<PromptWithMatches[]>([]) // Prompt 列表，包含匹配高亮信息
const categories = ref<Category[]>([]) // 所有分类的列表
const tags = ref<Tag[]>([]) // 所有标签的列表
const availableTags = ref<Tag[]>([]) // 当前可选的标签列表（根据所选分类动态更新）
const searchQuery = ref('') // 原始搜索查询字符串（可包含命令，如 "cat:工作 tag:重要"）
const searchInputRef = ref<HTMLInputElement | null>(null) // 搜索输入框的模板引用
const searchQueryDebounced = refDebounced(searchQuery, 300) // 使用 VueUse 的 refDebounced 实现搜索防抖，减少请求频率
const plainSearchQuery = ref('') // 解析后移除了命令部分的纯文本搜索查询
const parsedCategoryNames = ref<string[]>([]) // 从搜索查询中解析出的分类名称
const parsedTagNames = ref<string[]>([]) // 从搜索查询中解析出的标签名称
const selectedCategories = ref<string[]>([]) // 通过点击按钮选择的分类ID列表
const selectedTags = ref<string[]>([]) // 通过点击按钮选择的标签ID列表
const showFavoriteOnly = ref(false) // 是否只显示收藏的 Prompt
const sortBy = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt') // 当前排序方式

// --- 分页与加载状态 ---
const totalPrompts = ref(0) // 符合当前筛选条件的总 Prompt 数量
const currentPage = ref(1) // 当前加载的页码
const isLoading = ref(false) // 是否正在加载数据
const loaderRef = ref<HTMLElement | null>(null) // 用于无限滚动的加载触发器元素
const hasMore = computed(() => prompts.value.length < totalPrompts.value) // 是否还有更多数据可供加载

// --- UI模态框与菜单状态 ---
const editingPrompt = ref<Partial<Prompt> | null>(null) // 正在编辑的 Prompt 对象，为 null 时表示编辑框关闭
const editingTags = ref<string[]>([]) // 编辑器中正在编辑的标签名称列表
const showCategoryManager = ref(false) // 是否显示分类管理模态框
const showMergeImport = ref(false) // 是否显示导入/合并模态框
const showDeleteCategoryModal = ref(false) // 是否显示批量删除分类模态框
const changeNote = ref('') // Prompt 版本变更的备注信息
const hasContentChanged = ref(false) // 编辑器中的内容是否已发生变化
const showSettings = ref(false) // 是否显示设置模态框
const menuOpenId = ref<string | null>(null) // 当前打开的 Prompt 卡片菜单ID
const copiedId = ref<string | null>(null) // 最近一次复制的 Prompt ID，用于显示“已复制”状态
const isCategorySettingsOpen = ref(false) // 分类设置下拉菜单是否打开
const categorySettingsRef = ref(null) // 分类设置按钮的模板引用，用于点击外部关闭
const showSortMenu = ref(false) // 排序下拉菜单是否打开
const sortMenuRef = ref(null) // 排序菜单的模板引用，用于点击外部关闭

useModal(showSettings, () => { showSettings.value = false })
useModal(showCategoryManager, () => { showCategoryManager.value = false })
useModal(showMergeImport, () => { showMergeImport.value = false })
useModal(showDeleteCategoryModal, () => { showDeleteCategoryModal.value = false })
useModal(computed(() => !!editingPrompt.value), closeEditor) // 监听编辑框状态，在关闭时执行清理操作

// 使用 @vueuse/core 的 onClickOutside 实现点击元素外部时关闭对应的菜单
onClickOutside(categorySettingsRef, () => isCategorySettingsOpen.value = false)
onClickOutside(sortMenuRef, () => (showSortMenu.value = false))

// 监听 Ctrl+K / Cmd+K 快捷键，聚焦到搜索框
onKeyStroke(['Control+k', 'Meta+k'], (e) => {
  e.preventDefault()
  searchInputRef.value?.focus()
})

// --- “时间机器” (版本控制) 功能状态 ---
const isReadonly = ref(false) // 编辑器当前是否为只读模式（预览历史版本时）
const previewingVersion = ref<{ version: PromptVersion, versionNumber: number } | null>(null) // 正在预览的历史版本信息
const baseVersionForEdit = ref<{ version: PromptVersion, versionNumber: number } | null>(null) // 当从一个历史版本开始编辑时，记录其基准版本信息

// --- 数据获取逻辑 ---

/**
 * @description 异步获取 Prompt 列表。
 * 该函数会根据当前的筛选条件（搜索、分类、标签、排序等）和分页状态，
 * 调用数据层方法 `queryPrompts` 来获取数据。
 * 支持无限滚动加载。
 */
async function fetchPrompts() {
  if (isLoading.value) return // 防止重复加载
  isLoading.value = true

  // 确定用于查询的分类名称。优先使用从搜索框命令解析出的名称，
  // 其次使用用户通过点击按钮选择的分类，将其ID转换为名称。
  const categoryNames = parsedCategoryNames.value.length
    ? parsedCategoryNames.value
    : selectedCategories.value.map(id => categories.value.find(c => c.id === id)?.name).filter(Boolean) as string[]

  // 确定用于查询的标签名称，逻辑同上。
  const tagNames = parsedTagNames.value.length
    ? parsedTagNames.value
    : selectedTags.value.map(id => tags.value.find(t => t.id === id)?.name).filter(Boolean) as string[]

  try {
    // 调用数据查询函数
    const { prompts: newPrompts, total } = await queryPrompts({
      page: currentPage.value,
      limit: 20, // 每页加载20条
      sortBy: sortBy.value,
      favoriteOnly: showFavoriteOnly.value,
      searchQuery: plainSearchQuery.value,
      categoryNames, // 将解析好的名称传递给数据层
      tagNames,
    })

    // 根据页码决定是重置列表还是追加数据
    if (currentPage.value === 1) {
      prompts.value = newPrompts // 第一页，直接替换
    }
    else {
      prompts.value.push(...newPrompts) // 后续页，追加到末尾
    }
    totalPrompts.value = total // 更新总数
  }
  catch (error) {
    console.error('Failed to fetch prompts:', error)
    showToast('加载 Prompts 失败', 'error')
  }
  finally {
    isLoading.value = false // 结束加载状态
  }
}

// --- 监听器：用于命令面板和数据获取 ---

/**
 * @description 监听器1: 解析原始搜索查询。
 * 当防抖后的搜索查询 `searchQueryDebounced` 变化时，
 * 调用 `parseQuery` 工具函数来提取纯文本、分类名和标签名。
 * 如果用户在搜索框中使用了 `cat:` 或 `tag:` 命令，则清空按钮选择的筛选，以命令为准。
 */
watch(searchQueryDebounced, (newQuery) => {
  const { text, categoryNames, tagNames } = parseQuery(newQuery)
  plainSearchQuery.value = text
  parsedCategoryNames.value = categoryNames
  parsedTagNames.value = tagNames

  // 如果用户通过文本命令指定了分类，则清空按钮选择的分类，避免冲突
  if (categoryNames.length > 0 && selectedCategories.value.length > 0) {
    selectedCategories.value = []
  }
  // 标签同理
  if (tagNames.length > 0 && selectedTags.value.length > 0) {
    selectedTags.value = []
  }
})

/**
 * @description 监听器2: 触发数据重新获取。
 * 当任何一个筛选条件（包括解析后的文本、按钮选择的分类/标签、
 * 命令解析出的分类/标签、只看收藏、排序方式）发生变化时，
 * 重置分页到第一页，并调用 `fetchPrompts` 重新加载数据。
 */
watch(
  [plainSearchQuery, selectedCategories, selectedTags, parsedCategoryNames, parsedTagNames, showFavoriteOnly, sortBy],
  () => {
    currentPage.value = 1
    totalPrompts.value = 0
    fetchPrompts()
  },
  { deep: true }, // 使用深度监听以响应数组内部的变化
)

// --- Computed Properties ---
const sortOptions = [
  { value: 'updatedAt', text: '最近更新' },
  { value: 'createdAt', text: '创建时间' },
  { value: 'title', text: '标题排序' },
];

const currentSortText = computed(() => {
  return sortOptions.find(o => o.value === sortBy.value)?.text || '排序方式';
});

const getTagNames = (tagIds: string[]): string[] => {
  return tagIds.map(id => tags.value.find(t => t.id === id)?.name || '').filter(Boolean)
}

const availableCategories = computed(() => {
  return categories.value.slice().sort((a: Category, b: Category) => (a.sort || 0) - (b.sort || 0))
})

// --- Category & Tag Management ---
watch(selectedCategories, async (newCategories) => {
  if (newCategories.length === 0) {
    availableTags.value = []
    return
  }
  // This is an expensive operation but necessary to provide context-aware tag filtering.
  // It's efficient because of the multi-entry index on `categoryIds`.
  const relevantPrompts = await db.prompts.where('categoryIds').anyOf(newCategories).toArray()
  const tagIds = new Set<string>()
  relevantPrompts.forEach((p) => {
    p.tagIds.forEach(tagId => tagIds.add(tagId))
  })
  availableTags.value = tags.value.filter(t => tagIds.has(t.id))
}, { deep: true })


// --- Category Shelf Pagination ---
const shelfViewportRef = ref<HTMLElement | null>(null)
const shelfContentRef = ref<HTMLElement | null>(null)
const scrollOffset = ref(0)
const maxScroll = ref(0)
const canScrollLeft = computed(() => scrollOffset.value > 0)
const canScrollRight = computed(() => scrollOffset.value < maxScroll.value)
let shelfObserver: ResizeObserver | null = null

function updateShelfDimensions() {
  if (shelfViewportRef.value && shelfContentRef.value) {
    const viewportWidth = shelfViewportRef.value.offsetWidth
    const contentWidth = shelfContentRef.value.scrollWidth
    maxScroll.value = Math.max(0, contentWidth - viewportWidth)
    if (scrollOffset.value > maxScroll.value) {
      scrollOffset.value = maxScroll.value
    }
  }
}

function scrollShelf(direction: 'left' | 'right') {
  if (!shelfViewportRef.value) return
  const scrollAmount = shelfViewportRef.value.offsetWidth * 0.8
  if (direction === 'right') {
    scrollOffset.value = Math.min(scrollOffset.value + scrollAmount, maxScroll.value)
  } else {
    scrollOffset.value = Math.max(scrollOffset.value - scrollAmount, 0)
  }
}

function handleShelfScroll(event: WheelEvent) {
  if (maxScroll.value <= 0) return
  event.preventDefault()
  const scrollDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (scrollDelta === 0) return
  scrollOffset.value = Math.max(0, Math.min(scrollOffset.value + scrollDelta, maxScroll.value))
}

function changeSortBy(value: 'updatedAt' | 'createdAt' | 'title') {
  sortBy.value = value;
  showSortMenu.value = false;
}

watch(availableCategories, async () => {
  await nextTick()
  updateShelfDimensions()
})
// --- End Pagination ---

/**
 * @description 切换分类筛选。
 * @param {string} categoryId - 被点击的分类ID。如果为空字符串，则表示点击了“全部分类”。
 */
function toggleCategory(categoryId: string) {
  if (categoryId === '') {
    // 点击“全部分类”，清空所选分类
    selectedCategories.value = []
  } else {
    const index = selectedCategories.value.indexOf(categoryId)
    if (index > -1) {
      // 如果该分类已被选中，则取消选中
      selectedCategories.value.splice(index, 1)
    } else {
      // 否则，选中该分类（目前支持多选）
      selectedCategories.value.push(categoryId)
    }
  }
  // 切换分类后，清空已选的标签，因为可用标签集已改变
  selectedTags.value = []
}

/**
 * @description 切换标签筛选。
 * @param {string} tagId - 被点击的标签ID。如果为空字符串，则表示点击了“全部”。
 */
function toggleTag(tagId: string) {
  if (tagId === '') {
    selectedTags.value = []
    return
  }
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

/**
 * @description 加载所有初始化所需的数据。
 * 打开数据库，然后并行加载分类、标签和第一页的 Prompts。
 */
async function loadInitialData() {
  await db.open()
  await Promise.all([loadCategories(), loadTags(), fetchPrompts()])
}

/**
 * @description 从数据库加载分类列表。
 * 如果数据库中没有分类，则会创建并插入一组默认分类。
 */
async function loadCategories() {
  try {
    const allCategories = await db.categories.toArray()
    categories.value = allCategories
    // 如果是首次运行，数据库为空，则植入默认分类
    if (categories.value.length === 0) {
      const defaultCategories: Category[] = [
        { id: 'work', name: '工作', sort: 1, icon: 'i-mdi-work' }, { id: 'coding', name: '编程', sort: 2, icon: 'i-carbon-code' }, { id: 'study', name: '学习', sort: 3, icon: 'i-carbon-book' }, { id: 'writing', name: '写作', sort: 4, icon: 'i-carbon-pen' }, { id: 'creation', name: '创作', sort: 5, icon: 'i-carbon-idea' }, { id: 'teaching', name: '教学', sort: 6, icon: 'i-carbon-presentation-file' }, { id: 'yijing', name: '易经', sort: 7, icon: 'i-simple-icons:taichilang' }, { id: 'life', name: '生活', sort: 8, icon: 'i-carbon-home' }, { id: 'other', name: '其他', sort: 9, icon: 'i-mdi-question-mark-circle' },
      ]
      await db.categories.bulkPut(defaultCategories)
      categories.value = defaultCategories
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
    showToast('加载 Categories 失败', 'error')
  }
}

/**
 * @description 从数据库加载所有标签。
 */
async function loadTags() {
  try {
    tags.value = await db.tags.toArray()
  } catch (error) {
    console.error('Failed to load tags:', error)
    showToast('加载 Tags 失败', 'error')
  }
}

/**
 * @description 根据分类ID获取分类名称。
 * @param {string} categoryId - 分类ID。
 * @returns {string} 分类名称，如果找不到则返回原始ID。
 */
function getCategoryName(categoryId: string): string {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.name || categoryId
}

/**
 * @description 打开新建 Prompt 的编辑器。
 * 使用 `createSafePrompt` 创建一个安全的、包含所有必须字段的空 Prompt 对象，
 * 并重置相关状态。
 */
function createNewPrompt() {
  editingPrompt.value = createSafePrompt({
    title: '', content: '', favorite: false, categoryIds: [], tagIds: [],
  })
  editingTags.value = [] // 清空标签编辑器
  // 重置版本控制相关的状态
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

/**
 * @description 打开编辑指定 Prompt 的编辑器。
 * 使用 `clonePrompt` 创建一个深拷贝副本以避免直接修改列表中的数据，
 * 并初始化标签、重置版本控制状态。
 * @param {Prompt} prompt - 要编辑的 Prompt 对象。
 */
function editPrompt(prompt: Prompt) {
  editingPrompt.value = clonePrompt(prompt)
  editingTags.value = getTagNames(prompt.tagIds || [])
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

/**
 * @description 触发一次数据的完全刷新。
 * 将页码重置为1，然后调用 `fetchPrompts`。
 */
async function triggerRefetch() {
  currentPage.value = 1
  await fetchPrompts()
}

/**
 * @description 切换一个 Prompt 的收藏状态。
 * 调用 repository 方法更新数据库，并进行乐观更新（立即修改UI，如果失败再回滚）。
 * @param {Prompt} prompt - 要操作的 Prompt 对象。
 */
async function toggleFavorite(prompt: Prompt) {
  const newFavoriteState = !prompt.favorite
  const { ok } = await repository.updatePrompt(prompt.id, { favorite: newFavoriteState })
  if (ok) {
    showToast(newFavoriteState ? '已添加到收藏' : '已取消收藏', 'success')
    // 乐观更新UI
    const p = prompts.value.find(p => p.id === prompt.id)
    if (p) p.favorite = newFavoriteState
  } else {
    showToast('操作失败', 'error')
  }
}

/**
 * @description 保存 Prompt（新建或更新）。
 * 该函数会处理标签的创建、版本的记录等复杂逻辑，这些都封装在 `repository.savePrompt` 中。
 */
async function savePrompt() {
  // 基本校验
  if (!editingPrompt.value || !editingPrompt.value.title?.trim()) {
    showToast('请输入标题', 'error')
    return
  }

  try {
    // 从标签输入框获取并清理标签名称
    const tagNames = editingTags.value.map(t => t.trim()).filter(Boolean)

    // 如果内容有变动，则设置版本备注。这被 `repository.savePrompt` 用来决定是否创建新版本。
    const note = hasContentChanged.value ? (changeNote.value || '内容更新') : undefined

    // 调用核心的保存逻辑
    const { ok, error } = await repository.savePrompt(editingPrompt.value, tagNames, note)

    if (ok) {
      await triggerRefetch() // 刷新列表
      await loadTags() // 重新加载标签列表，因为可能创建了新标签
      closeEditor() // 关闭编辑器
      showToast('保存成功', 'success')
    } else {
      throw error || new Error('保存 Prompt 时发生未知错误')
    }
  } catch (error) {
    console.error('Failed to save prompt:', error)
    showToast(`保存失败: ${(error as Error).message}`, 'error')
  }
}

/**
 * @description 删除一个 Prompt。
 * 会弹出确认框防止误操作。`repository.deletePrompt` 会负责删除主条目和所有相关历史版本。
 * @param {string} id - 要删除的 Prompt ID。
 */
async function deletePrompt(id: string) {
  const confirm = await askConfirm('确定要删除这个 Prompt 吗？其所有历史版本也将被删除。', { type: 'danger' })
  if (!confirm) return

  const { ok } = await repository.deletePrompt(id)
  if (ok) {
    await triggerRefetch()
    showToast('删除成功', 'success')
  } else {
    showToast('删除失败', 'error')
  }
}

/**
 * @description 复制 Prompt 内容到剪贴板。
 * 同时会更新其 `lastUsedAt` 时间戳，这是一个“软”更新，不会触发版本变更。
 * @param {Prompt} prompt - 要复制的 Prompt 对象。
 */
async function copyPrompt(prompt: Prompt) {
  // 更新“上次使用时间”，这有助于未来的排序或分析
  repository.updatePrompt(prompt.id, { lastUsedAt: Date.now() })

  try {
    await navigator.clipboard.writeText(prompt.content)
    // UI反馈：显示“已复制”状态，并在1.5秒后消失
    copiedId.value = prompt.id
    setTimeout(() => { if (copiedId.value === prompt.id) copiedId.value = null }, 1500)
    showToast('已复制到剪贴板', 'success')
  } catch (error) {
    console.error('Failed to copy prompt:', error)
    showToast('复制失败', 'error')
  }
}

/**
 * @description 关闭编辑器模态框，并重置所有相关状态。
 */
function closeEditor() {
  editingPrompt.value = null
  hasContentChanged.value = false
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

/**
 * @description 编辑器内容变化时的回调。
 * 用于标记内容已更改，以便在保存时创建新版本。
 */
function handleContentChange() {
  if (isReadonly.value) return
  hasContentChanged.value = true
}

/**
 * @description 处理预览历史版本的事件。
 * 将编辑器的内容替换为历史版本的内容，并进入只读模式。
 * @param {object} payload - 包含版本信息和版本号的对象。
 */
function handleVersionPreview(payload: { version: PromptVersion, versionNumber: number }) {
  if (!editingPrompt.value) return
  editingPrompt.value.content = payload.version.content
  previewingVersion.value = payload
  baseVersionForEdit.value = null
  isReadonly.value = true
  hasContentChanged.value = false
}

/**
 * @description 从预览模式切换到编辑模式。
 * 用户在预览一个历史版本时，点击“基于此版本编辑”时调用。
 */
function handleEditFromPreview() {
  if (!previewingVersion.value) return
  // 将当前预览的版本设为新编辑内容的基准
  baseVersionForEdit.value = previewingVersion.value
  previewingVersion.value = null
  isReadonly.value = false // 退出只读模式
}

/**
 * @description 重新加载并重新编辑当前正在操作的 Prompt。
 * 在版本恢复或删除后，需要用数据库中的最新数据刷新编辑器。
 */
async function reloadAndReEditCurrentPrompt() {
  if (!editingPrompt.value?.id) return
  const promptId = editingPrompt.value.id
  await triggerRefetch() // 刷新整个列表
  const updatedPrompt = prompts.value.find(p => p.id === promptId)
  if (updatedPrompt) {
    editPrompt(updatedPrompt) // 使用新数据重新打开编辑器
  }
}

/**
 * @description 处理版本恢复成功的事件。
 */
async function handleVersionRestored(version: any) {
  showToast('版本已恢复', 'success')
  await reloadAndReEditCurrentPrompt()
}

/**
 * @description 处理版本删除成功的事件。
 */
async function handleVersionDeleted(versionId: string) {
  showToast('版本已删除', 'success')
  // 如果删除的是正在预览的版本，则需要刷新编辑器
  if (previewingVersion.value && previewingVersion.value.version.id === versionId) {
    await reloadAndReEditCurrentPrompt()
  }
}

/**
 * @description 格式化时间戳为易读的日期时间字符串。
 * @param {number} timestamp - Unix时间戳 (毫秒)。
 * @returns {string} 格式化后的字符串，如 "9月 18, 19:00"。
 */
function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

/**
 * @description 处理导入/合并数据成功后的回调。
 * 刷新列表和标签。
 */
async function handleMergeSuccess() {
  await triggerRefetch()
  await loadTags()
}

/**
 * @description 处理批量删除分类成功后的回调。
 * 刷新分类和列表。
 */
async function handleCategoryDeletion() {
  await loadCategories()
  await triggerRefetch()
}

/**
 * @description Vue 组件挂载生命周期钩子。
 * 在这里执行所有初始化操作：
 * 1. 加载初始数据 (分类, 标签, Prompts)。
 * 2. 设置无限滚动加载。
 * 3. 设置分类栏的尺寸监听。
 * 4. 处理从URL参数打开新建窗口的逻辑。
 */
onMounted(async () => {
  try {
    await loadInitialData()

    // 设置无限滚动观察器
    const observer = new IntersectionObserver(
      (entries) => {
        // 当加载触发器元素进入视口，并且有更多数据且不处于加载中时
        if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
          currentPage.value++ // 加载下一页
          fetchPrompts()
        }
      },
      { rootMargin: '200px' }, // 预加载区域
    )
    if (loaderRef.value) {
      observer.observe(loaderRef.value)
    }

    // 设置分类栏的尺寸变化观察器
    await nextTick()
    if (shelfViewportRef.value) {
      shelfObserver = new ResizeObserver(updateShelfDimensions)
      shelfObserver.observe(shelfViewportRef.value)
    }
    updateShelfDimensions() // 立即执行一次以获取初始尺寸

    // 检查URL参数，如果 action=new，则自动打开新建 Prompt 模态框
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('action') === 'new') {
      createNewPrompt()
    }
  } catch (error) {
    console.error('Failed to open database:', error)
    showToast('数据库连接失败，请检查控制台获取详细信息。', 'error')
  }
})

/**
 * @description Vue 组件卸载生命周期钩子。
 * 清理 ResizeObserver，防止内存泄漏。
 */
onUnmounted(() => {
  if (shelfObserver) shelfObserver.disconnect()
})
</script>

<style scoped>
</style>
