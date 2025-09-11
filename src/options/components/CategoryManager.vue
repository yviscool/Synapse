<template>
    <div v-if="visible" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        @click="close">
        <div class="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden max-w-xl w-full flex flex-col"
            @click.stop>
            <div class="flex items-center justify-between p-5 border-b border-gray-200/80">
                <h2 class="flex items-center gap-3 text-lg font-semibold text-gray-900">
                    <div class="i-carbon-folder-details-reference text-xl"></div>
                    整理你的灵感集
                </h2>
                <button @click="close"
                    class="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-200/70 transition-colors">
                    <div class="i-carbon-close"></div>
                </button>
            </div>

            <div class="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
                <div class="flex gap-3 items-center">
                    <div class="relative flex-1">
                        <div
                            :class="[newCategoryIcon || 'i-carbon-add', 'absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400']">
                        </div>
                        <input v-model="newCategoryName" type="text" placeholder="创建一个新分类..." @keyup.enter="addCategory"
                            class="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition">
                    </div>
                    <button @click.prevent="toggleIconPicker($event, 'add')"
                        class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
                        title="选择图标">
                        <div :class="[newCategoryIcon || 'i-carbon-image-search', 'text-lg']"></div>
                    </button>
                    <button @click="addCategory" :disabled="!newCategoryName.trim()"
                        class="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none">
                        <span class="hidden sm:inline">添加</span>
                        <div class="i-carbon-arrow-right sm:hidden"></div>
                    </button>
                </div>

                <div class="flex-1 space-y-2 overflow-y-auto -mr-3 pr-3" @dragover.prevent @drop="handleCategoryDrop">
                    <div v-for="category in orderedCategories" :key="category.id"
                        class="group flex items-center justify-between p-3 rounded-lg transition-all duration-300 relative"
                        :class="{
                            'bg-gray-50 hover:bg-gray-100': editingCategoryId !== category.id,
                            'opacity-30 scale-95': draggingCategoryId === category.id,
                        }" :draggable="editingCategoryId === null" :data-category-id="category.id"
                        @dragstart="handleCategoryDragStart($event, category)" @dragend="handleCategoryDragEnd"
                        @dragover="handleCategoryDragOver($event, category)" @dragleave="handleCategoryDragLeave">

                        <div v-if="dragOverCategoryId === category.id"
                            class="absolute top-[-2px] left-2 right-2 h-0.5 bg-blue-500 rounded-full transition-all">
                        </div>

                        <template v-if="editingCategoryId === category.id">
                            <div class="flex-1 w-0 flex gap-2 items-stretch">
                                <button @click.prevent="toggleIconPicker($event, category.id)" title="更换图标"
                                    class="px-2 py-1 border border-blue-400 rounded-md hover:bg-blue-50 flex items-center gap-2 bg-white">
                                    <div :class="[editingCategoryIcon || 'i-carbon-image', 'text-lg']"></div>
                                </button>
                                <input v-model="editingCategoryName" type="text" ref="editInputRef"
                                    class="flex-1 w-0 px-2 py-1 border border-blue-400 rounded-md focus:ring-2 focus:ring-blue-500 bg-white"
                                    @keyup.enter="saveCategoryEdit" @keyup.esc="cancelCategoryEdit" />
                            </div>
                            <div class="flex items-center gap-2 ml-4">
                                <button @click="saveCategoryEdit" title="保存"
                                    class="p-2 text-green-600 hover:bg-green-100 rounded-full transition-colors">
                                    <div class="i-carbon-checkmark"></div>
                                </button>
                                <button @click="cancelCategoryEdit" title="取消"
                                    class="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                                    <div class="i-carbon-close"></div>
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div
                                    class="i-carbon-draggable text-gray-300 cursor-grab group-hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                </div>
                                <div v-if="category.icon" :class="[category.icon, 'text-xl text-gray-700']"></div>
                                <div class="flex-1 truncate">
                                    <div class="font-medium text-gray-800 truncate">{{ category.name }}</div>
                                    <div class="text-sm text-gray-500">{{ getPromptCount(category.id) }} 个灵感</div>
                                </div>
                            </div>
                            <div
                                class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button @click="editCategory(category)" title="编辑"
                                    class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                                    <div class="i-carbon-edit"></div>
                                </button>
                                <button @click="deleteCategory(category.id)" title="删除"
                                    class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
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
        class="fixed z-[60] bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        :style="{ top: `${iconPicker.y}px`, left: `${iconPicker.x}px` }">
        <div class="p-3">
            <input v-model="iconSearch" type="text" placeholder="搜索图标..." ref="iconSearchInputRef"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" />
        </div>
        <div class="p-3 grid grid-cols-8 sm:grid-cols-10 gap-2 overflow-y-auto max-h-[40vh]">
            <button v-for="icon in filteredIcons" :key="icon" @click="selectIcon(icon)" :class="[
                'h-12 w-full flex items-center justify-center rounded-md border transition',
                isActiveIcon(icon) ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-transparent hover:bg-gray-100 text-gray-700'
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
import { onClickOutside, useVModel, useFocus, useDebounceFn, whenever } from '@vueuse/core'
import { useModal } from '@/composables/useModal'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void; (e: 'updated'): void }>()

const isOpen = useVModel(props, 'visible', emit)
useModal(isOpen, close)

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

// --- Data & Computed ---
const orderedCategories = computed(() =>
    categories.value.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0))
)

const icons = ref<string[]>([
    'i-carbon-code', 'i-carbon-book', 'i-carbon-pen', 'i-carbon-idea', 'i-carbon-presentation-file', 'i-carbon-home', 'i-carbon-search', 'i-carbon-folder', 'i-carbon-settings', 'i-carbon-star',
    'i-carbon-favorite', 'i-carbon-time', 'i-carbon-calendar', 'i-carbon-download', 'i-carbon-upload', 'i-carbon-cloud', 'i-carbon-database', 'i-carbon-document', 'i-carbon-bot', 'i-carbon-terminal',
    'i-carbon-bug', 'i-carbon-tools', 'i-carbon-phone', 'i-carbon-email', 'i-carbon-chat', 'i-carbon-user', 'i-carbon-user-multiple', 'i-carbon-location', 'i-carbon-map', 'i-carbon-globe',
    'i-carbon-translate', 'i-carbon-locked', 'i-carbon-unlocked', 'i-carbon-warning', 'i-carbon-information', 'i-carbon-help', 'i-carbon-camera', 'i-carbon-video', 'i-carbon-music', 'i-carbon-game-console',
    // --- 核心通用 (Core & General) ---
    'i-carbon-idea',               // 想法
    'i-carbon-chat',               // 对话/聊天
    'i-carbon-text-creation',      // 文本创作
    'i-carbon-folder',             // 文件夹/分类
    'i-carbon-star',               // 收藏
    'i-carbon-save',               // 保存
    'i-carbon-search',             // 搜索
    'i-carbon-list',               // 列表
    'i-carbon-settings',           // 设置
    'i-carbon-bot',                // 机器人/助手
    'i-ph-brain-duotone',          // 大脑/思考
    'i-carbon-favorite',           // 喜欢
    'i-carbon-tag',                // 标签
    'i-carbon-archive',            // 归档
    'i-carbon-rocket',             // 启动/高效

    // --- 写作 & 内容创作 (Writing & Content) ---
    'i-carbon-pen',                // 写作/笔
    'i-carbon-edit',               // 编辑
    'i-carbon-book',               // 书籍/长文
    'i-carbon-document',           // 文档
    'i-carbon-email',              // 邮件
    'i-carbon-bullhorn',           // 公告/营销文案
    'i-mdi-post-outline',          // 社交媒体帖子
    'i-ph-newspaper-clipping-duotone', // 新闻稿/文章
    'i-carbon-closed-caption',     // 字幕/脚本
    'i-carbon-paragraph',          // 段落/润色
    'i-carbon-quotes',             // 引用
    'i-simple-icons:x',            // X / Twitter
    'i-simple-icons:medium',       // Medium
    'i-simple-icons:wordpress',    // WordPress

    // --- 编程 & 开发 (Coding & Development) ---
    'i-carbon-code',               // 代码
    'i-carbon-terminal',           // 终端/命令行
    'i-carbon-bug',                // Debug
    'i-carbon-database',           // 数据库
    'i-carbon-cloud',              // 云服务/部署
    'i-carbon-network-4',          // API/网络
    'i-carbon-box',                // 组件/模块
    'i-carbon-function',           // 函数
    'i-mdi-git',                   // Git 版本控制
    'i-carbon-data-structured',    // 数据结构
    'i-ph-selection-background-duotone',// 前端/UI
    'i-simple-icons:javascript',   // JavaScript
    'i-simple-icons:typescript',   // TypeScript
    'i-simple-icons:python',       // Python
    'i-simple-icons:java',         // Java
    'i-simple-icons:rust',         // Rust
    'i-simple-icons:go',           // Go
    'i-simple-icons:csharp',       // C#
    'i-simple-icons:react',        // React
    'i-simple-icons:vuedotjs',     // Vue.js
    'i-simple-icons:docker',       // Docker
    'i-simple-icons:github',       // GitHub
    'i-simple-icons:visualstudiocode', // VS Code

    // --- 商业 & 市场 (Business & Marketing) ---
    'i-carbon-briefcase',          // 商业/公文包
    'i-carbon-chart-bar',          // 数据分析/图表
    'i-carbon-chart-line',         // 趋势分析
    'i-carbon-chart-pie',          // 市场份额
    'i-mdi-target-arrow',          // 市场目标
    'i-carbon-currency-dollar',    // 金融/货币
    'i-carbon-shopping-cart',      // 电商
    'i-mdi-lightbulb-on-outline',  // 市场策略/点子
    'i-carbon-search-locate-2',    // SEO/定位
    'i-carbon-presentation-file',  // 报告/PPT
    'i-carbon-user-speaker',       // 客户画像 (Persona)
    'i-carbon-growth',             // 增长

    // --- 学习 & 教育 (Learning & Education) ---
    'i-carbon-education',          // 学位帽/教育
    'i-ph-books-duotone',          // 书本/知识
    'i-carbon-translate',          // 翻译
    'i-carbon-globe',              // 语言/地理
    'i-carbon-atom',               // 科学
    'i-carbon-flask',              // 化学/实验
    'i-carbon-calculator',         // 数学
    'i-mdi-compass-rose',          // 历史/地理
    'i-carbon-summary-kpi',        // 总结/摘要
    'i-carbon-spell-check',        // 拼写检查
    'i-carbon-notebook',           // 笔记
    'i-mdi-school-outline',        // 学校/课程

    // --- 创意 & 设计 (Creative & Design) ---
    'i-carbon-color-palette',      // 调色板/设计
    'i-carbon-pen-fountain',       // 艺术/绘画
    'i-carbon-camera',             // 摄影
    'i-carbon-video',              // 视频
    'i-carbon-music',              // 音乐
    'i-ph-magic-wand-duotone',     // 创意生成
    'i-carbon-image',              // 图片/Midjourney
    'i-carbon-cube',               // 3D/模型
    'i-carbon-layers',             // 图层/设计稿
    'i-carbon-crop',               // 裁剪/构图
    'i-mdi-palette-swatch-outline',// 色板
    'i-simple-icons:figma',        // Figma
    'i-simple-icons:adobephotoshop', // Photoshop
    'i-simple-icons:dribbble',     // Dribbble

    // --- 数据 & 分析 (Data & Analysis) ---
    'i-carbon-table',              // 表格
    'i-mdi-function-variant',      // 公式/函数
    'i-carbon-filter',             // 筛选
    'i-mdi-google-spreadsheet',    // 电子表格
    'i-carbon-ai-results',         // AI 分析结果
    'i-carbon-analytics',          // 分析
    'i-carbon-json',               // JSON
    'i-carbon-sql',                // SQL

    // --- 效率 & 生活 (Productivity & Life) ---
    'i-carbon-calendar',           // 日历/计划
    'i-carbon-time',               // 时间管理
    'i-carbon-checkbox-checked',   // 待办事项
    'i-carbon-plane',              // 旅行
    'i-carbon-restaurant',         // 餐饮/食谱
    'i-carbon-home',               // 生活/日常
    'i-carbon-chart-relationship', // 人际关系
    'i-carbon-game-console',       // 游戏/娱乐
    'i-carbon-health-cross',       // 健康/医疗
    'i-mdi-scale-balance',         // 法律/权衡
    'i-carbon-scooter',            // 交通
    'i-carbon-finance',            // 理财

    // --- 人物 & 角色 (People & Roles) ---
    'i-carbon-user',               // 用户/个人
    'i-carbon-user-multiple',      // 团队/多人
    'i-carbon-user-avatar',        // 角色扮演
    'i-carbon-health-worker',      // 医生/心理学家
    'i-mdi-gavel',                 // 律师/法官
    'i-mdi-account-school-outline',// 老师/学生
    'i-mdi-account-tie',           // 经理/顾问
    'i-carbon-user-admin',         // 管理员
]);

const filteredIcons = computed(() => {
    const q = iconSearch.value.trim().toLowerCase()
    if (!q) return icons.value
    return icons.value.filter(i => i.toLowerCase().includes(q))
})

// --- Core Functions ---
function close() {
    emit('update:visible', false)
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
        showToast('分类添加成功', 'success')
        newCategoryName.value = ''
        newCategoryIcon.value = ''
        await loadCategories() // Reload to get the new category
        emit('updated')
    } else {
        showToast('添加失败', 'error')
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
        showToast('分类更新成功', 'success')
        await loadCategories()
        emit('updated')
    } else {
        showToast('更新失败', 'error')
    }
    cancelCategoryEdit()
}

async function deleteCategory(id: string) {
    const confirm = await askConfirm('确定要删除这个分类吗？相关的灵感不会被删除。', { type: 'danger' })
    if (!confirm) return

    const { ok } = await repository.deleteCategory(id)
    if (ok) {
        showToast('分类删除成功', 'success')
        await loadCategories()
        emit('updated')
    } else {
        showToast('删除失败', 'error')
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
        showToast('顺序已更新', 'success')
        emit('updated')
    } else {
        showToast('顺序更新失败', 'error')
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