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
          <div class="relative w-full max-w-2xl">
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
              <select v-model="sortBy" class="text-base border-none bg-transparent focus:ring-0 text-gray-600 font-medium">
                <option value="updatedAt">最近更新</option>
                <option value="createdAt">创建时间</option>
                <option value="title">标题排序</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="space-y-4">
          <!-- The new Control Shelf -->
          <div class="p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/60 space-y-4">
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

                <button @click="showMergeImport = true" class="flex-shrink-0 flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 hover:border-gray-400" title="导入并合并">
                    <div class="i-carbon-document-import text-lg"></div>
                  </button>

                  <button @click="showCategoryManager = true" class="flex-shrink-0 flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 hover:border-gray-400" title="分类管理">
                    <div class="i-carbon-edit text-lg"></div>
                  </button>
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
                <h3 class="font-semibold text-gray-900 mb-2 line-clamp-2">{{ prompt.title }}</h3>
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
              <p class="text-gray-600 leading-relaxed line-clamp-3" @dblclick.stop>{{ getPreview(prompt.content) }}</p>
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
import { db, queryPrompts } from '@/stores/db'
import { MSG } from '@/utils/messaging'
import type { Prompt, Category, Tag, PromptVersion } from '@/types/prompt'
import { nanoid } from 'nanoid'
import { createSafePrompt, validatePrompt, clonePrompt } from '@/utils/promptUtils'
import { createVersion } from '@/utils/versionUtils'
import PromptEditorModal from '@/options/components/PromptEditorModal.vue'
import Settings from './components/Settings.vue'
import CategoryManager from './components/CategoryManager.vue'
import MergeImportModal from './components/MergeImportModal.vue'

const { showToast, askConfirm, handleConfirm, hideToast } = useUI()

// --- State for Data and Filters ---
const prompts = ref<Prompt[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const availableTags = ref<Tag[]>([])
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQueryDebounced = ref('')
const selectedCategories = ref<string[]>([])
const selectedTags = ref<string[]>([])
const showFavoriteOnly = ref(false)
const sortBy = ref<'updatedAt' | 'createdAt' | 'title'>('updatedAt')

// --- State for Pagination and Loading ---
const totalPrompts = ref(0)
const currentPage = ref(1)
const isLoading = ref(false)
const loaderRef = ref<HTMLElement | null>(null)
const hasMore = computed(() => prompts.value.length < totalPrompts.value)

// --- State for UI Modals and Menus ---
const editingPrompt = ref<Partial<Prompt> | null>(null)
const editingTags = ref<string[]>([])
const showCategoryManager = ref(false)
const showMergeImport = ref(false)
const changeNote = ref('')
const hasContentChanged = ref(false)
const showSettings = ref(false)
const menuOpenId = ref<string | null>(null)
const copiedId = ref<string | null>(null)

// --- State for Time Machine Feature ---
const isReadonly = ref(false)
const previewingVersion = ref<{ version: PromptVersion, versionNumber: number } | null>(null)
const baseVersionForEdit = ref<{ version: PromptVersion, versionNumber: number } | null>(null)

// --- Debounce Search Query ---
let searchDebounceTimer: number | undefined
watch(searchQuery, (val) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = window.setTimeout(() => {
    searchQueryDebounced.value = val
  }, 300)
})

// --- Body Overflow Lock for Modals ---
watch(() => editingPrompt.value || showSettings.value || showCategoryManager.value, (isModalOpen) => {
  document.body.style.overflow = isModalOpen ? 'hidden' : ''
})

// --- Data Fetching Logic ---
async function fetchPrompts() {
  if (isLoading.value) return
  isLoading.value = true

  try {
    // ====== PR 代码：一次传多个品类 ======
    const { prompts: newPrompts, total } = await queryPrompts({
      page: currentPage.value,
      limit: 20,
      sortBy: sortBy.value,
      favoriteOnly: showFavoriteOnly.value,
      searchQuery: searchQueryDebounced.value,
      categories: selectedCategories.value,   // 多品类数组
      tags: selectedTags.value,
    });

    if (currentPage.value === 1) {
      prompts.value = newPrompts;
    } else {
      prompts.value.push(...newPrompts);
    }
    totalPrompts.value = total;
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    showToast('加载 Prompts 失败', 'error');
  } finally {
    isLoading.value = false;
  }
}

// --- Watch for Filter Changes to Reset and Refetch ---
watch(
  [searchQueryDebounced, selectedCategories, selectedTags, showFavoriteOnly, sortBy],
  () => {
    currentPage.value = 1
    totalPrompts.value = 0
    // prompts.value = [] // Do not clear here, it causes a flicker. Let fetchPrompts replace it.
    fetchPrompts()
  },
  { deep: true },
)

// --- Computed Properties ---
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

watch(availableCategories, async () => {
  await nextTick()
  updateShelfDimensions()
})
// --- End Pagination ---

function toggleCategory(categoryId: string) {
  if (categoryId === '') {
    selectedCategories.value = []
  } else {
    const index = selectedCategories.value.indexOf(categoryId)
    if (index > -1) {
      selectedCategories.value.splice(index, 1)
    } else {
      // For now, allow multi-select in UI, but query logic might be limited
      selectedCategories.value.push(categoryId)
    }
  }
  selectedTags.value = []
}

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

async function loadInitialData() {
  await db.open()
  await Promise.all([loadCategories(), loadTags(), fetchPrompts()])
}

async function loadCategories() {
  try {
    const allCategories = await db.categories.toArray()
    categories.value = allCategories
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

async function loadTags() {
  try {
    tags.value = await db.tags.toArray()
  } catch (error) {
    console.error('Failed to load tags:', error)
    showToast('加载 Tags 失败', 'error')
  }
}

function getCategoryName(categoryId: string): string {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.name || categoryId
}

function createNewPrompt() {
  editingPrompt.value = createSafePrompt({
    title: '', content: '', favorite: false, categoryIds: [], tagIds: [],
  })
  editingTags.value = []
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

function editPrompt(prompt: Prompt) {
  editingPrompt.value = clonePrompt(prompt)
  editingTags.value = getTagNames(prompt.tagIds || [])
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

async function triggerRefetch() {
  currentPage.value = 1
  await fetchPrompts()
}

async function toggleFavorite(prompt: Prompt) {
  try {
    await db.prompts.update(prompt.id, { favorite: !prompt.favorite, updatedAt: Date.now() })
    showToast(!prompt.favorite ? '已添加到收藏' : '已取消收藏', 'success')
    // Optimistic update
    const p = prompts.value.find(p => p.id === prompt.id)
    if (p) p.favorite = !p.favorite
  } catch (error) {
    console.error('Failed to toggle favorite:', error)
    showToast('操作失败', 'error')
  }
}

async function savePrompt() {
  if (!editingPrompt.value || !editingPrompt.value.title?.trim()) {
    showToast('请输入标题', 'error')
    return
  }
  try {
    const tagNames = editingTags.value.map(t => t.trim()).filter(Boolean)
    const tagIds: string[] = []
    if (tagNames.length > 0) {
      const existingTags = await db.tags.where('name').anyOf(tagNames).toArray()
      for (const name of tagNames) {
        const existingTag = existingTags.find(t => t.name === name)
        if (existingTag) {
          tagIds.push(existingTag.id)
        } else {
          const newTag = { id: nanoid(), name }
          await db.tags.put(newTag)
          tagIds.push(newTag.id)
        }
      }
      await loadTags()
    }
    const isNewPrompt = !editingPrompt.value.id
    const now = Date.now()
    const promptData = { ...editingPrompt.value, categoryIds: editingPrompt.value?.categoryIds || [], tagIds, updatedAt: now }
    if (!promptData.id) {
      promptData.id = nanoid()
      promptData.createdAt = now
    }
    const safePrompt = createSafePrompt(promptData)
    const validationError = validatePrompt(safePrompt)
    if (validationError) {
      showToast(`数据验证失败: ${validationError}`, 'error')
      return
    }
    if (!isNewPrompt && hasContentChanged.value) {
      const version = await createVersion(safePrompt.id, safePrompt.content, changeNote.value || '内容更新', safePrompt.currentVersionId)
      safePrompt.currentVersionId = version.id
    }
    await db.prompts.put(safePrompt)
    await triggerRefetch()
    closeEditor()
    showToast('保存成功', 'success')
    chrome.runtime.sendMessage({ type: MSG.DATA_UPDATED, data: { scope: 'prompts', version: Date.now().toString() } })
  } catch (error) {
    console.error('Failed to save prompt:', error)
    showToast(`保存失败: ${(error as Error).message}`, 'error')
  }
}

async function deletePrompt(id: string) {
  const ok = await askConfirm('确定要删除这个 Prompt 吗？其所有历史版本也将被删除。', { type: 'danger' })
  if (!ok) return
  try {
    await db.transaction('rw', db.prompts, db.prompt_versions, async () => {
      await db.prompt_versions.where('promptId').equals(id).delete()
      await db.prompts.delete(id)
    })
    await triggerRefetch()
    showToast('删除成功', 'success')
    chrome.runtime.sendMessage({ type: MSG.DATA_UPDATED, data: { scope: 'prompts', version: Date.now().toString() } })
  } catch (error) {
    console.error('Failed to delete prompt:', error)
    showToast('删除失败', 'error')
  }
}

async function copyPrompt(prompt: Prompt) {
  try {
    await db.prompts.update(prompt.id, { lastUsedAt: Date.now() })
    await navigator.clipboard.writeText(prompt.content)
    copiedId.value = prompt.id
    setTimeout(() => { if (copiedId.value === prompt.id) copiedId.value = null }, 1500)
    showToast('已复制到剪贴板', 'success')
  } catch (error) {
    console.error('Failed to copy prompt:', error)
    showToast('复制失败', 'error')
  }
}

function closeEditor() {
  editingPrompt.value = null
  hasContentChanged.value = false
  isReadonly.value = false
  previewingVersion.value = null
  baseVersionForEdit.value = null
}

function handleContentChange() {
  if (isReadonly.value) return
  hasContentChanged.value = true
}

function handleVersionPreview(payload: { version: PromptVersion, versionNumber: number }) {
  if (!editingPrompt.value) return
  editingPrompt.value.content = payload.version.content
  previewingVersion.value = payload
  baseVersionForEdit.value = null
  isReadonly.value = true
  hasContentChanged.value = false
}

function handleEditFromPreview() {
  if (!previewingVersion.value) return
  baseVersionForEdit.value = previewingVersion.value
  previewingVersion.value = null
  isReadonly.value = false
}

async function reloadAndReEditCurrentPrompt() {
  if (!editingPrompt.value?.id) return
  const promptId = editingPrompt.value.id
  await triggerRefetch() // This re-fetches the whole list
  const updatedPrompt = prompts.value.find(p => p.id === promptId)
  if (updatedPrompt) {
    editPrompt(updatedPrompt)
  }
}

async function handleVersionRestored(version: any) {
  showToast('版本已恢复', 'success')
  await reloadAndReEditCurrentPrompt()
}

async function handleVersionDeleted(versionId: string) {
  showToast('版本已删除', 'success')
  if (previewingVersion.value && previewingVersion.value.version.id === versionId) {
    await reloadAndReEditCurrentPrompt()
  }
}

function getPreview(content: string): string {
  const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return textContent.length > 120 ? textContent.substring(0, 120) + '...' : textContent
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))
}

async function handleMergeSuccess() {
  await triggerRefetch()
  await loadTags()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (ui.confirm.visible) return
  if (editingPrompt.value && (event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    savePrompt()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInputRef.value?.focus()
    return
  }
  if (event.key === 'Escape') {
    if (editingPrompt.value) closeEditor()
    else if (showCategoryManager.value) showCategoryManager.value = false
    else if (showSettings.value) showSettings.value = false
    else if (menuOpenId.value) menuOpenId.value = null
  }
}

onMounted(async () => {
  try {
    await loadInitialData()

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore.value && !isLoading.value) {
          currentPage.value++
          fetchPrompts()
        }
      },
      { rootMargin: '200px' },
    )
    if (loaderRef.value) {
      observer.observe(loaderRef.value)
    }

    await nextTick()
    if (shelfViewportRef.value) {
      shelfObserver = new ResizeObserver(updateShelfDimensions)
      shelfObserver.observe(shelfViewportRef.value)
    }
    updateShelfDimensions()

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('action') === 'new') {
      createNewPrompt()
    }
  } catch (error) {
    console.error('Failed to open database:', error)
    showToast('数据库连接失败，请检查控制台获取详细信息。', 'error')
  }

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (shelfObserver) shelfObserver.disconnect()
})
</script>

<style scoped>
</style>
