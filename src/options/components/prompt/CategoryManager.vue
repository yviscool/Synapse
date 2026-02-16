<template>
    <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        @click="close">
        <div class="bg-white dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-xl w-full flex flex-col"
            @click.stop>
            <div class="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700/80">
                <h2 class="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    <div class="i-carbon-folder-details-reference text-xl"></div>
                    {{ t('categories.title') }}
                </h2>
                <button @click="close"
                    class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <div class="i-carbon-close"></div>
                </button>
            </div>

            <div class="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
                <div class="flex gap-3 items-center">
                    <div class="relative flex-1">
                        <div
                            :class="[newCategoryIcon || 'i-carbon-add', 'absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400 dark:text-gray-500']">
                        </div>
                        <input v-model="newCategoryName" type="text" :placeholder="t('categories.createPlaceholder')" @keyup.enter="addCategory"
                            class="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                    </div>
                    <button @click.prevent="toggleIconPicker($event, 'add')"
                        class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors"
                        :title="t('categories.iconTooltip')">
                        <div :class="[newCategoryIcon || 'i-carbon-image-search', 'text-lg']"></div>
                    </button>
                    <button @click="addCategory" :disabled="!newCategoryName.trim()"
                        class="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                        <span class="hidden sm:inline">{{ t('categories.add') }}</span>
                        <div class="i-carbon-arrow-right sm:hidden"></div>
                    </button>
                </div>

                <div class="flex-1 space-y-2 overflow-y-auto -mr-3 pr-3" @dragover.prevent @drop="handleCategoryDrop">
                    <div v-for="category in orderedCategories" :key="category.id"
                        class="group flex items-center justify-between p-3 rounded-lg transition-all duration-300 relative"
                        :class="{
                            'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700': editingCategoryId !== category.id,
                            'opacity-30 scale-95': draggingCategoryId === category.id,
                        }" :draggable="editingCategoryId === null" :data-category-id="category.id"
                        @dragstart="handleCategoryDragStart($event, category)" @dragend="handleCategoryDragEnd"
                        @dragover="handleCategoryDragOver($event, category)" @dragleave="handleCategoryDragLeave">

                        <div v-if="dragOverCategoryId === category.id"
                            class="absolute top-[-2px] left-2 right-2 h-0.5 bg-blue-500 rounded-full transition-all">
                        </div>

                        <template v-if="editingCategoryId === category.id">
                            <div class="flex-1 w-0 flex gap-2 items-stretch">
                                <button @click.prevent="toggleIconPicker($event, category.id)" :title="t('categories.changeIconTooltip')"
                                    class="px-2 py-1 border border-blue-400 rounded-md hover:bg-blue-50 flex items-center gap-2 bg-white dark:bg-gray-900">
                                    <div :class="[editingCategoryIcon || 'i-carbon-image', 'text-lg']"></div>
                                </button>
                                <input v-model="editingCategoryName" type="text" ref="editInputRef"
                                    class="flex-1 w-0 px-2 py-1 border border-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
                                    @keyup.enter="saveCategoryEdit" @keyup.esc.stop="cancelCategoryEdit" />
                            </div>
                            <div class="flex items-center gap-2 ml-4">
                                <button @click="saveCategoryEdit" :title="t('categories.saveTooltip')"
                                    class="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors">
                                    <div class="i-carbon-checkmark"></div>
                                </button>
                                <button @click="cancelCategoryEdit" :title="t('categories.cancelTooltip')"
                                    class="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    <div class="i-carbon-close"></div>
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    class="i-carbon-draggable text-gray-300 cursor-grab group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                </div>
                                <div v-if="category.icon" :class="[category.icon, 'text-xl text-gray-700 dark:text-gray-200']"></div>
                                <div class="flex-1 truncate">
                                    <div class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ category.name }}</div>
                                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('categories.promptCount', { count: getPromptCount(category.id) }) }}</div>
                                </div>
                            </div>
                            <div
                                class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button @click="editCategory(category)" :title="t('categories.editTooltip')"
                                    class="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                                    <div class="i-carbon-edit"></div>
                                </button>
                                <button @click="deleteCategory(category.id)" :title="t('categories.deleteTooltip')"
                                    class="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                                    <div class="i-carbon-trash-can"></div>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div v-if="iconPicker.visible" ref="iconPickerRef"
        class="fixed z-[60] bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        :style="{ top: `${iconPicker.y}px`, left: `${iconPicker.x}px` }">
        <div class="p-3">
            <input v-model="iconSearch" type="text" :placeholder="t('categories.searchIconPlaceholder')" ref="iconSearchInputRef"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
        </div>
        <div class="p-3 grid grid-cols-8 sm:grid-cols-10 gap-2 overflow-y-auto max-h-[40vh]">
            <button v-for="icon in filteredIcons" :key="icon" @click="selectIcon(icon)" :class="[
                'h-12 w-full flex items-center justify-center rounded-md border transition',
                isActiveIcon(icon) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
            ]" :title="icon">
                <div :class="[icon, 'text-2xl']"></div>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { db } from '@/stores/db' // Keep for read-only operations
import { repository } from '@/stores/repository'
import { useUI } from '@/stores/ui'
import type { Category, Prompt } from '@/types/prompt'
import { onClickOutside, useVModel, useFocus, onKeyStroke, useDebounceFn, whenever } from '@vueuse/core'
import { useModal } from '@/composables/useModal'
import { useI18n } from 'vue-i18n'
import { getCategoryNameById, isDefaultCategory } from '@/utils/categoryUtils'

const { t } = useI18n()
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'updated'): void }>()

const isOpen = useVModel(props, 'visible', emit)
// 禁用 useModal 的 Escape 功能
useModal(isOpen, close, { closeOnEsc: false })

// Refined state management
const categories = ref<Category[]>([])
const prompts = ref<Prompt[]>([])
const { showToast, askConfirm } = useUI()
const editInputRef = ref<HTMLInputElement | null>(null)
const { focused: isEditInputFocused } = useFocus(editInputRef, { initialValue: false })
const iconSearchInputRef = ref<HTMLInputElement | null>(null)
const { focused: isIconSearchInputFocused } = useFocus(iconSearchInputRef, { initialValue: false })

// --- 'Add' state ---
const newCategoryName = ref('')
const newCategoryIcon = ref<string>('')

// --- 'Edit' state ---
const editingCategoryId = ref<string | null>(null)
const editingCategoryName = ref<string>('')
const editingCategoryIcon = ref<string>('')

// --- Drag & Drop state ---
const draggingCategoryId = ref<string | null>(null)
const dragOverCategoryId = ref<string | null>(null)

// --- Icon Picker Popover ---
const iconPickerRef = ref(null)
const iconPicker = ref({ visible: false, target: null as 'add' | string | null, x: 0, y: 0 })
const iconSearch = ref('')

onClickOutside(iconPickerRef, () => closeIconPicker())

whenever(isOpen, (isVisible) => {
    if (isVisible) {
        // Load fresh data each time the modal is opened
        Promise.all([loadCategories(), loadPrompts()])
    } else {
        cancelCategoryEdit() // Clean up edit state when closing
    }
}, { immediate: true })

onKeyStroke('Escape', (e) => {
    if (iconPicker.value.visible) {
        e.preventDefault()
        // 使用 stopImmediatePropagation 阻止在 document 上注册的任何其他 'keydown' 监听器被调用
        e.stopImmediatePropagation() 
        closeIconPicker()
        return
    }

    if (isOpen.value) {
        e.preventDefault()
        // 这里也一样，如果这个组件处理了事件，就不应该让其他 useModal 实例再处理
        e.stopImmediatePropagation()
        close()
    }
}, { target: document })


// --- Data & Computed ---
const orderedCategories = computed(() =>
    categories.value.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0)).map(c => ({
        ...c,
        name: isDefaultCategory(c.id) ? getCategoryNameById(c.id) : c.name
    }))
)

const icons = ref<string[]>([
    // --- 核心通用 (Core & General) ---
    'i-carbon-idea', 'i-carbon-chat', 'i-carbon-text-creation', 'i-carbon-folder', 'i-carbon-star',
    'i-carbon-save', 'i-carbon-search', 'i-carbon-list', 'i-carbon-settings', 'i-carbon-bot',
    'i-ph-brain-duotone', 'i-carbon-favorite', 'i-carbon-tag', 'i-carbon-archive', 'i-carbon-rocket',
    'i-carbon-tools', 'i-carbon-phone', 'i-carbon-location', 'i-carbon-map',
    'i-carbon-locked', 'i-carbon-unlocked', 'i-carbon-warning', 'i-carbon-information', 'i-carbon-help',
    'i-carbon-download', 'i-carbon-upload',

    // --- 写作 & 内容创作 (Writing & Content) ---
    'i-carbon-pen', 'i-carbon-edit', 'i-carbon-book', 'i-carbon-document', 'i-carbon-email',
    'i-carbon-bullhorn', 'i-mdi-post-outline', 'i-ph-newspaper-clipping-duotone',
    'i-carbon-closed-caption', 'i-carbon-paragraph', 'i-carbon-quotes',
    'i-simple-icons:x', 'i-simple-icons:medium', 'i-simple-icons:wordpress',

    // --- 编程 & 开发 (Coding & Development) ---
    'i-carbon-code', 'i-carbon-terminal', 'i-mdi-bug-outline', 'i-mdi-database-outline',
    'i-carbon-cloud', 'i-carbon-network-4', 'i-carbon-box', 'i-carbon-function',
    'i-mdi-git', 'i-carbon-data-structured', 'i-ph-selection-background-duotone',
    'i-simple-icons:javascript', 'i-simple-icons:typescript', 'i-simple-icons:python',
    'i-simple-icons:java', 'i-simple-icons:rust', 'i-simple-icons:go', 'i-simple-icons:csharp',
    'i-simple-icons:react', 'i-simple-icons:vuedotjs', 'i-simple-icons:docker',
    'i-simple-icons:github', 'i-simple-icons:visualstudiocode',

    // --- 商业 & 市场 (Business & Marketing) ---
    'i-carbon-briefcase', 'i-carbon-chart-bar', 'i-carbon-chart-line', 'i-carbon-chart-pie',
    'i-mdi-target-arrow', 'i-carbon-currency-dollar', 'i-carbon-shopping-cart',
    'i-mdi-lightbulb-on-outline', 'i-carbon-search-locate-2', 'i-carbon-presentation-file',
    'i-carbon-user-speaker', 'i-carbon-growth',

    // --- 学习 & 教育 (Learning & Education) ---
    'i-carbon-education', 'i-ph-books-duotone', 'i-carbon-translate', 'i-carbon-globe',
    'i-carbon-atom', 'i-carbon-flask', 'i-carbon-calculator', 'i-mdi-compass-rose',
    'i-carbon-summary-kpi', 'i-carbon-spell-check', 'i-carbon-notebook', 'i-mdi-school-outline',

    // --- 创意 & 设计 (Creative & Design) ---
    'i-carbon-color-palette', 'i-carbon-pen-fountain', 'i-carbon-camera', 'i-carbon-video',
    'i-carbon-music', 'i-ph-magic-wand-duotone', 'i-carbon-image', 'i-carbon-cube',
    'i-carbon-layers', 'i-carbon-crop', 'i-mdi-palette-swatch-outline',
    'i-simple-icons:figma', 'i-simple-icons:adobephotoshop', 'i-simple-icons:dribbble',

    // --- 数据 & 分析 (Data & Analysis) ---
    'i-carbon-table', 'i-mdi-function-variant', 'i-carbon-filter', 'i-mdi-google-spreadsheet',
    'i-carbon-ai-results', 'i-carbon-analytics', 'i-carbon-json', 'i-carbon-sql',

    // --- 效率 & 生活 (Productivity & Life) ---
    'i-carbon-calendar', 'i-carbon-time', 'i-carbon-checkbox-checked', 'i-carbon-plane',
    'i-carbon-restaurant', 'i-carbon-home', 'i-carbon-chart-relationship', 'i-carbon-game-console',
    'i-carbon-health-cross', 'i-mdi-scale-balance', 'i-carbon-scooter', 'i-carbon-finance',

    // --- 人物 & 角色 (People & Roles) ---
    'i-carbon-user', 'i-carbon-user-multiple', 'i-carbon-user-avatar', 'i-carbon-health-worker',
    'i-mdi-gavel', 'i-mdi-account-school-outline', 'i-mdi-account-tie', 'i-carbon-user-admin',
]);

const filteredIcons = computed(() => {
    const q = iconSearch.value.trim().toLowerCase()
    if (!q) return icons.value
    return icons.value.filter(i => i.toLowerCase().includes(q))
})

// --- Core Functions ---
function close() {
    emit('update:visible', false)
    // 确保关闭主 modal 时，也一并关闭 icon picker
    closeIconPicker() 
}

// --- Database Operations ---
async function loadCategories() {
    categories.value = await db.categories.toArray()
}
async function loadPrompts() {
    prompts.value = await db.prompts.toArray() as Prompt[]
}
function getPromptCount(categoryId: string) {
    return prompts.value.filter(p => p.categoryIds?.includes(categoryId)).length
}

// --- CRUD Operations (Refactored to use Repository) ---
async function addCategory() {
    const name = newCategoryName.value.trim()
    if (!name) return

    const { ok } = await repository.addCategory({ name, icon: newCategoryIcon.value || '' })
    if (ok) {
        showToast(t('categories.addSuccess'), 'success')
        newCategoryName.value = ''
        newCategoryIcon.value = ''
        await loadCategories() // Reload to get the new category
        emit('updated')
    } else {
        showToast(t('categories.addFailed'), 'error')
    }
}

function editCategory(category: Category) {
    cancelCategoryEdit() // Ensure only one item is edited at a time
    editingCategoryId.value = category.id
    editingCategoryName.value = category.name
    editingCategoryIcon.value = category.icon || ''
    isEditInputFocused.value = true
}

function cancelCategoryEdit() {
    editingCategoryId.value = null
}

async function saveCategoryEdit() {
    const id = editingCategoryId.value
    const name = editingCategoryName.value.trim()
    if (!id || !name) {
        cancelCategoryEdit()
        return
    }
    const { ok } = await repository.updateCategory(id, { name, icon: editingCategoryIcon.value })
    if (ok) {
        showToast(t('categories.updateSuccess'), 'success')
        await loadCategories()
        emit('updated')
    } else {
        showToast(t('categories.updateFailed'), 'error')
    }
    cancelCategoryEdit()
}

async function deleteCategory(id: string) {
    const confirm = await askConfirm(t('categories.deleteConfirm'), { type: 'danger' })
    if (!confirm) return

    const { ok } = await repository.deleteCategory(id)
    if (ok) {
        showToast(t('categories.deleteSuccess'), 'success')
        await loadCategories()
        emit('updated')
    } else {
        showToast(t('categories.deleteFailed'), 'error')
    }
}

// --- Icon Picker Logic ---
function toggleIconPicker(event: MouseEvent, target: 'add' | string) {
    if (iconPicker.value.visible && iconPicker.value.target === target) {
        closeIconPicker()
        return
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    iconPicker.value = {
        visible: true,
        target: target,
        x: rect.left,
        y: rect.bottom + 8
    }
    iconSearch.value = ''
    isIconSearchInputFocused.value = true
}

function closeIconPicker() {
    iconPicker.value.visible = false
}

function selectIcon(icon: string) {
    if (iconPicker.value.target === 'add') {
        newCategoryIcon.value = icon
    } else {
        editingCategoryIcon.value = icon
    }
    closeIconPicker()
}

function isActiveIcon(icon: string) {
    if (iconPicker.value.target === 'add') {
        return newCategoryIcon.value === icon
    }
    return editingCategoryIcon.value === icon
}

// --- Drag & Drop Sorting ---
function handleCategoryDragStart(event: DragEvent, category: Category) {
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', category.id)
    }
    draggingCategoryId.value = category.id
}

function handleCategoryDragEnd() {
    draggingCategoryId.value = null
    dragOverCategoryId.value = null
}

function handleCategoryDragOver(event: DragEvent, category: Category) {
    event.preventDefault()
    if (category.id !== draggingCategoryId.value) {
        dragOverCategoryId.value = category.id
    }
}

function handleCategoryDragLeave() {
    dragOverCategoryId.value = null
}

const debouncedSaveOrder = useDebounceFn(async (updatedCategories: Category[]) => {
    const { ok } = await repository.updateCategoryOrder(updatedCategories)
    if (ok) {
        showToast(t('categories.orderUpdateSuccess'), 'success')
        emit('updated')
    } else {
        showToast(t('categories.orderUpdateFailed'), 'error')
    }
}, 500)

async function handleCategoryDrop(event: DragEvent) {
    const draggedId = draggingCategoryId.value
    const targetId = dragOverCategoryId.value
    dragOverCategoryId.value = null // Reset visual indicator immediately
    draggingCategoryId.value = null

    if (!draggedId || !targetId || draggedId === targetId) return

    const reordered = [...orderedCategories.value]
    const draggedItem = reordered.find(c => c.id === draggedId)
    if (!draggedItem) return

    const fromIndex = reordered.findIndex(c => c.id === draggedId)
    let toIndex = reordered.findIndex(c => c.id === targetId)

    // Adjust index for intuitive placement
    if (fromIndex < toIndex) { toIndex-- }

    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, draggedItem)

    const updated = reordered.map((c, idx) => ({ ...c, sort: idx + 1 }))
    categories.value = updated // Optimistic update for smooth UI
    debouncedSaveOrder(updated)
}

onMounted(() => {
    db.open()
})
</script>