<template>
    <div>
        <main class="max-w-7xl mx-auto px-6 py-8">
            <!-- 优化的搜索和过滤区域 -->
            <div class="mb-8 space-y-6">
                <div class="flex justify-center">
                    <div class="relative w-full max-w-2xl z-20">
                        <div
                            class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg i-carbon-search z-10"
                        ></div>
                        <input
                            v-model="searchQuery"
                            ref="searchInputRef"
                            type="text"
                            :aria-label="t('prompts.search')"
                            :placeholder="t('prompts.searchPlaceholder')"
                            class="w-full pl-12 pr-40 py-4 text-lg border border-gray-200 rounded-2xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        />
                        <button
                            v-if="searchQuery"
                            @click="searchQuery = ''"
                            class="absolute right-32 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                        >
                            <div class="i-carbon-close"></div>
                        </button>
                        <div
                            class="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center"
                        >
                            <div class="w-px h-6 bg-gray-200/80 mr-3"></div>
                            <!-- 排序方式下拉菜单 -->
                            <div class="relative" ref="sortMenuRef">
                                <button
                                    @click="showSortMenu = !showSortMenu"
                                    class="flex items-center gap-2 text-base text-gray-600 font-medium hover:text-gray-900 transition-colors"
                                >
                                    <span>{{ currentSortText }}</span>
                                    <i
                                        class="i-carbon-chevron-down text-sm transition-transform"
                                        :class="{ 'rotate-180': showSortMenu }"
                                    ></i>
                                </button>
                                <!-- 下拉选项 -->
                                <transition
                                    enter-active-class="transition ease-out duration-100"
                                    enter-from-class="transform opacity-0 scale-95"
                                    enter-to-class="transform opacity-100 scale-100"
                                    leave-active-class="transition ease-in duration-75"
                                    leave-from-class="transform opacity-100 scale-100"
                                    leave-to-class="transform opacity-0 scale-95"
                                >
                                    <div
                                        v-if="showSortMenu"
                                        class="absolute z-30 top-full right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200/80"
                                    >
                                        <div class="py-1">
                                            <button
                                                v-for="option in sortOptions"
                                                :key="option.value"
                                                @click="
                                                    changeSortBy(option.value)
                                                "
                                                class="w-full text-left px-4 py-2 text-sm flex items-center gap-2"
                                                :class="[
                                                    sortBy === option.value
                                                        ? 'font-semibold text-blue-600 bg-blue-50'
                                                        : 'text-gray-700 hover:bg-gray-100',
                                                ]"
                                            >
                                                <i
                                                    class="i-carbon-checkmark text-transparent"
                                                    :class="{
                                                        '!text-blue-600':
                                                            sortBy ===
                                                            option.value,
                                                    }"
                                                ></i>
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
                    <div
                        class="relative z-10 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/60 space-y-4"
                    >
                        <div
                            class="flex items-center justify-between gap-4 flex-wrap"
                        >
                            <!-- Category Filters -->
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <button
                                    @click="toggleCategory('')"
                                    :class="[
                                        'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                                        selectedCategories.length === 0
                                            ? 'bg-blue-600 border-blue-600 text-white'
                                            : 'bg-white border-gray-200 hover:bg-gray-50',
                                    ]"
                                >
                                    <div class="i-ph-books"></div>
                                    <span>{{ t("categories.all") }}</span>
                                </button>

                                <div class="relative group flex-1 min-w-0">
                                    <div
                                        class="overflow-hidden"
                                        ref="shelfViewportRef"
                                        @wheel="handleShelfScroll"
                                    >
                                        <div
                                            class="flex items-center gap-2 transition-transform duration-300 ease-in-out"
                                            ref="shelfContentRef"
                                            :style="{
                                                transform: `translateX(-${scrollOffset}px)`,
                                            }"
                                        >
                                            <button
                                                v-for="category in availableCategories"
                                                :key="category.id"
                                                @click="
                                                    toggleCategory(category.id)
                                                "
                                                :class="[
                                                    'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                                                    selectedCategories.includes(
                                                        category.id,
                                                    )
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-gray-200 hover:bg-gray-50',
                                                ]"
                                            >
                                                <div
                                                    v-if="category.icon"
                                                    :class="[category.icon]"
                                                ></div>
                                                <span>{{ category.name }}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        v-if="canScrollLeft"
                                        @click="scrollShelf('left')"
                                        class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <div
                                            class="i-carbon-chevron-left"
                                        ></div>
                                    </button>
                                    <button
                                        v-if="canScrollRight"
                                        @click="scrollShelf('right')"
                                        class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 h-8 w-8 rounded-full bg-white/80 shadow-md backdrop-blur-sm flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <div
                                            class="i-carbon-chevron-right"
                                        ></div>
                                    </button>
                                </div>

                                <button
                                    @click="
                                        showFavoriteOnly = !showFavoriteOnly
                                    "
                                    :class="[
                                        'flex-shrink-0 flex items-center gap-2 px-4 py-2 h-10 border rounded-lg transition-colors',
                                        showFavoriteOnly
                                            ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                                            : 'bg-white border-gray-200 hover:bg-gray-50',
                                    ]"
                                >
                                    <div
                                        :class="
                                            showFavoriteOnly
                                                ? 'i-carbon-favorite-filled'
                                                : 'i-carbon-favorite'
                                        "
                                        class="text-yellow-500"
                                    ></div>
                                    <span>{{
                                        t("prompts.favoritesOnly")
                                    }}</span>
                                </button>

                                <div
                                    class="w-px h-6 bg-gray-200/80 ml-2 mr-1"
                                ></div>

                                <!-- New Category Settings Dropdown -->
                                <div class="relative" ref="categorySettingsRef">
                                    <button
                                        @click="
                                            isCategorySettingsOpen =
                                                !isCategorySettingsOpen
                                        "
                                        class="flex-shrink-0 flex items-center justify-center w-10 h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 hover:border-gray-400"
                                        :title="t('categories.settings')"
                                    >
                                        <div
                                            class="i-carbon-settings-adjust text-lg"
                                        ></div>
                                    </button>
                                    <div
                                        v-if="isCategorySettingsOpen"
                                        class="absolute right-0 top-12 z-30 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                                    >
                                        <button
                                            @click="
                                                showCategoryManager = true;
                                                isCategorySettingsOpen = false;
                                            "
                                            class="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                                        >
                                            <div class="i-carbon-edit"></div>
                                            <span>{{
                                                t("categories.manage")
                                            }}</span>
                                        </button>
                                        <button
                                            @click="
                                                showMergeImport = true;
                                                isCategorySettingsOpen = false;
                                            "
                                            class="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-100"
                                        >
                                            <div
                                                class="i-carbon-document-import"
                                            ></div>
                                            <span>{{
                                                t("categories.importMerge")
                                            }}</span>
                                        </button>
                                        <div
                                            class="h-px bg-gray-200 my-1"
                                        ></div>
                                        <button
                                            @click="
                                                showDeleteCategoryModal = true;
                                                isCategorySettingsOpen = false;
                                            "
                                            class="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50"
                                        >
                                            <div
                                                class="i-carbon-trash-can"
                                            ></div>
                                            <span>{{
                                                t("categories.batchDelete")
                                            }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Tag Filters (now inside the shelf) -->
                        <div
                            v-if="
                                selectedCategories.length > 0 &&
                                availableTags.length > 0
                            "
                            class="flex items-center justify-start gap-2 flex-wrap border-t border-gray-200 pt-4"
                        >
                            <button
                                @click="toggleTag('')"
                                :class="[
                                    'px-3 py-1 text-sm rounded-md transition-colors',
                                    selectedTags.length === 0
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                                ]"
                            >
                                {{ t("tags.all") }}
                            </button>
                            <button
                                v-for="tag in availableTags"
                                :key="tag.id"
                                @click="toggleTag(tag.id)"
                                :class="[
                                    'px-3 py-1 text-sm rounded-md transition-colors',
                                    selectedTags.includes(tag.id)
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
                                ]"
                            >
                                {{ tag.name }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 美化的 Prompt 网格 -->
            <div class="min-h-96 relative">
                <div
                    v-if="prompts.length === 0 && !isLoading"
                    class="flex flex-col items-center justify-center py-16 text-center"
                >
                    <div class="mb-6">
                        <div
                            class="i-carbon-document-blank text-6xl text-gray-300"
                        ></div>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">
                        {{ t("prompts.noPrompts") }}
                    </h3>
                    <p class="text-gray-600 mb-6 max-w-md">
                        {{
                            searchQueryDebounced
                                ? t("prompts.noMatch")
                                : t("prompts.createYourFirst")
                        }}
                    </p>
                    <button
                        v-if="!searchQuery"
                        @click="createNewPrompt"
                        class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <div class="i-carbon-add"></div>
                        {{ t("prompts.create") }}
                    </button>
                </div>

                <div
                    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    <div
                        v-for="prompt in promptCards"
                        :key="prompt.id"
                        class="bg-white rounded-xl border border-gray-200/50 p-6 hover:shadow-lg transition-transform duration-200 hover:-translate-y-1"
                        @dblclick="editPrompt(prompt)"
                        :title="t('prompts.doubleClickToEdit')"
                    >
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1 min-w-0">
                                <h3
                                    class="font-semibold text-gray-900 mb-2 line-clamp-2"
                                    v-html="prompt.highlightedTitle"
                                ></h3>
                                <div
                                    class="flex items-center gap-3 text-sm text-gray-500"
                                >
                                    <span class="card-date">{{
                                        formatDate(prompt.updatedAt)
                                    }}</span>
                                </div>
                            </div>

                            <div class="flex items-center gap-1 relative">
                                <button
                                    @click.stop="toggleFavorite(prompt)"
                                    @dblclick.stop
                                    :class="[
                                        'p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors',
                                        {
                                            'text-yellow-500 hover:text-yellow-600':
                                                prompt.favorite,
                                        },
                                    ]"
                                    :title="
                                        prompt.favorite
                                            ? t('prompts.unfavorite')
                                            : t('prompts.favorite')
                                    "
                                >
                                    <div
                                        :class="
                                            prompt.favorite
                                                ? 'i-carbon-favorite-filled'
                                                : 'i-carbon-favorite'
                                        "
                                    ></div>
                                </button>
                                <button
                                    @click.stop="
                                        menuOpenId =
                                            menuOpenId === prompt.id
                                                ? null
                                                : prompt.id
                                    "
                                    @dblclick.stop
                                    class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                    :title="t('common.more')"
                                >
                                    <div
                                        class="i-carbon-overflow-menu-horizontal"
                                    ></div>
                                </button>
                                <div
                                    v-if="menuOpenId === prompt.id"
                                    class="absolute right-0 top-10 z-10 w-28 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                                >
                                    <button
                                        @click.stop="
                                            editPrompt(prompt);
                                            menuOpenId = null;
                                        "
                                        class="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50"
                                    >
                                        <div class="i-carbon-edit"></div>
                                        <span>{{ t("common.edit") }}</span>
                                    </button>
                                    <button
                                        @click.stop="
                                            deletePrompt(prompt.id);
                                            menuOpenId = null;
                                        "
                                        class="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
                                    >
                                        <div class="i-carbon-trash-can"></div>
                                        <span>{{ t("common.delete") }}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="mb-4">
                            <p
                                class="text-gray-600 leading-relaxed line-clamp-3"
                                @dblclick.stop
                                v-html="prompt.highlightedContent"
                            ></p>
                        </div>

                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span
                                    v-for="(categoryName, categoryIndex) in prompt.categoryNames"
                                    :key="`${prompt.id}-category-${categoryIndex}`"
                                    class="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                                >
                                    {{ categoryName }}
                                </span>
                                <span
                                    v-for="(tagName, tagIndex) in prompt.tagNames"
                                    :key="`${prompt.id}-tag-${tagIndex}`"
                                    class="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-green-100 text-green-800"
                                >
                                    {{ tagName }}
                                </span>
                            </div>
                            <button
                                @click.stop="copyPrompt(prompt)"
                                @dblclick.stop
                                :class="[
                                    'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                                    copiedId === prompt.id
                                        ? 'bg-green-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700',
                                ]"
                                :title="t('prompts.copyContent')"
                            >
                                <div
                                    :class="
                                        copiedId === prompt.id
                                            ? 'i-carbon-checkmark'
                                            : 'i-carbon-copy'
                                    "
                                ></div>
                                <span>{{
                                    copiedId === prompt.id
                                        ? t("prompts.copied")
                                        : t("prompts.copy")
                                }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Loader and Sentinel -->
                <div
                    ref="loaderRef"
                    class="col-span-full mt-6 flex justify-center items-center h-10"
                >
                    <div
                        v-if="isLoading && prompts.length > 0"
                        class="flex items-center gap-2 text-gray-500"
                    >
                        <div
                            class="i-carbon-circle-dash w-6 h-6 animate-spin"
                        ></div>
                        <span>{{ t("common.loading") }}</span>
                    </div>
                    <div
                        v-if="!hasMore && prompts.length > 0"
                        class="text-gray-500"
                    >
                        --- {{ t("common.allLoaded") }} ---
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
        <!-- 分类管理模态框 -->
        <CategoryManager
            v-model:visible="showCategoryManager"
            @updated="loadCategories"
        />
        <!-- 导入/合并模态框 -->
        <MergeImportModal
            v-model:visible="showMergeImport"
            :available-categories="availableCategories"
            :active-categories="selectedCategories"
            :active-tags="getTagNames(selectedTags)"
            @merged="handleMergeSuccess"
        />
        <!-- 批量删除分类模态框 -->
        <DeleteCategoryModal
            v-model:visible="showDeleteCategoryModal"
            :categories="categories"
            @updated="handleCategoryDeletion"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useUI } from "@/stores/ui";
import { db, type PromptWithMatches } from "@/stores/db";
import { repository } from "@/stores/repository";
import type { Prompt, Category, Tag, PromptVersion } from "@/types/prompt";
import {
    generateHighlightedHtml,
    generateHighlightedPreviewHtml,
} from "@/utils/highlighter";
import {
    createSafePrompt,
    clonePrompt,
} from "@/utils/promptUtils";
import { useModal } from "@/composables/useModal";
import {
    useMagicKeys,
    whenever,
    onClickOutside,
} from "@vueuse/core";
import { getCategoryNameById, isDefaultCategory } from "@/utils/categoryUtils";
import { usePromptQuery } from "@/options/composables/usePromptQuery";
import { useRoute } from "vue-router";

const PromptEditorModal = defineAsyncComponent(
    () => import("@/options/components/PromptEditorModal.vue"),
);
const CategoryManager = defineAsyncComponent(
    () => import("@/options/components/CategoryManager.vue"),
);
const MergeImportModal = defineAsyncComponent(
    () => import("@/options/components/MergeImportModal.vue"),
);
const DeleteCategoryModal = defineAsyncComponent(
    () => import("@/options/components/DeleteCategoryModal.vue"),
);

const { t } = useI18n();
const { showToast, askConfirm } = useUI();
const route = useRoute();

// --- 数据与筛选状态 ---
const categories = ref<Category[]>([]); // 所有分类的列表
const tags = ref<Tag[]>([]); // 所有标签的列表
const searchInputRef = ref<HTMLInputElement | null>(null); // 搜索输入框的模板引用
const loaderRef = ref<HTMLElement | null>(null); // 用于无限滚动的加载触发器元素
const {
    prompts,
    availableTags,
    searchQuery,
    searchQueryDebounced,
    selectedCategories,
    selectedTags,
    showFavoriteOnly,
    sortBy,
    currentPage,
    isLoading,
    hasMore,
    fetchPrompts,
    refetchFromFirstPage,
    toggleCategory,
    toggleTag,
    changeSortBy: setSortBy,
} = usePromptQuery({
    categories,
    tags,
    onLoadError: () => showToast(t("common.toast.loadPromptsFailed"), "error"),
});

// --- UI模态框与菜单状态 ---
const editingPrompt = ref<Partial<Prompt> | null>(null); // 正在编辑的 Prompt 对象，为 null 时表示编辑框关闭
const editingTags = ref<string[]>([]); // 编辑器中正在编辑的标签名称列表
const showCategoryManager = ref(false); // 是否显示分类管理模态框
const showMergeImport = ref(false); // 是否显示导入/合并模态框
const showDeleteCategoryModal = ref(false); // 是否显示批量删除分类模态框
const changeNote = ref(""); // Prompt 版本变更的备注信息
const hasContentChanged = ref(false); // 编辑器中的内容是否已发生变化
const menuOpenId = ref<string | null>(null); // 当前打开的 Prompt 卡片菜单ID
const copiedId = ref<string | null>(null); // 最近一次复制的 Prompt ID，用于显示“已复制”状态
const isCategorySettingsOpen = ref(false); // 分类设置下拉菜单是否打开
const categorySettingsRef = ref(null); // 分类设置按钮的模板引用，用于点击外部关闭
const showSortMenu = ref(false); // 排序下拉菜单是否打开
const sortMenuRef = ref(null); // 排序菜单的模板引用，用于点击外部关闭

useModal(showCategoryManager, () => {
    showCategoryManager.value = false;
});
useModal(showMergeImport, () => {
    showMergeImport.value = false;
});
useModal(showDeleteCategoryModal, () => {
    showDeleteCategoryModal.value = false;
});

// 使用 @vueuse/core 的 onClickOutside 实现点击元素外部时关闭对应的菜单
onClickOutside(
    categorySettingsRef,
    () => (isCategorySettingsOpen.value = false),
);
onClickOutside(sortMenuRef, () => (showSortMenu.value = false));

// 快捷键定位搜索栏
const { Ctrl_K, Meta_K } = useMagicKeys({
    passive: false,
    onEventFired(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
        }
    },
});

whenever(
    () => Ctrl_K.value || Meta_K.value,
    () => {
        searchInputRef.value?.focus();
    },
);

// --- “时间机器” (版本控制) 功能状态 ---
const isReadonly = ref(false); // 编辑器当前是否为只读模式（预览历史版本时）
const previewingVersion = ref<{
    version: PromptVersion;
    versionNumber: number;
} | null>(null); // 正在预览的历史版本信息
const baseVersionForEdit = ref<{
    version: PromptVersion;
    versionNumber: number;
} | null>(null); // 当从一个历史版本开始编辑时，记录其基准版本信息
let listObserver: IntersectionObserver | null = null;

// --- Computed Properties ---
const sortOptions = computed(() => [
    { value: "updatedAt" as const, text: t("settings.sort.updatedAt") },
    { value: "createdAt" as const, text: t("settings.sort.createdAt") },
    { value: "title" as const, text: t("settings.sort.byTitle") },
]);

const currentSortText = computed(() => {
    return (
        sortOptions.value.find((o) => o.value === sortBy.value)?.text ||
        t("settings.sort.label")
    );
});

type PromptCardView = PromptWithMatches & {
    highlightedTitle: string;
    highlightedContent: string;
    categoryNames: string[];
    tagNames: string[];
};

const tagNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const tag of tags.value) {
        map.set(tag.id, tag.name);
    }
    return map;
});

const categoryNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const category of categories.value) {
        map.set(
            category.id,
            isDefaultCategory(category.id)
                ? getCategoryNameById(category.id)
                : category.name,
        );
    }
    return map;
});

const getTagNames = (tagIds: string[]): string[] => {
    return tagIds
        .map((id) => tagNameMap.value.get(id) || "")
        .filter(Boolean);
};

const promptCards = computed<PromptCardView[]>(() => {
    const categoryMap = categoryNameMap.value;
    const tagMap = tagNameMap.value;
    return prompts.value.map((prompt) => ({
        ...prompt,
        highlightedTitle: generateHighlightedHtml(
            prompt.title,
            prompt.matches,
            "title",
        ),
        highlightedContent: generateHighlightedPreviewHtml(
            prompt.content,
            prompt.matches,
            "content",
            280,
        ),
        categoryNames: (prompt.categoryIds || []).map(
            (categoryId) => categoryMap.get(categoryId) || categoryId,
        ),
        tagNames: (prompt.tagIds || [])
            .map((tagId) => tagMap.get(tagId))
            .filter((name): name is string => Boolean(name)),
    }));
});

const availableCategories = computed(() => {
    return categories.value
        .slice()
        .sort((a: Category, b: Category) => (a.sort || 0) - (b.sort || 0))
        .map(c => ({
            ...c,
            name: isDefaultCategory(c.id) ? getCategoryNameById(c.id) : c.name
        }));
});

// --- Category Shelf Pagination ---
const shelfViewportRef = ref<HTMLElement | null>(null);
const shelfContentRef = ref<HTMLElement | null>(null);
const scrollOffset = ref(0);
const maxScroll = ref(0);
const canScrollLeft = computed(() => scrollOffset.value > 0);
const canScrollRight = computed(() => scrollOffset.value < maxScroll.value);
let shelfObserver: ResizeObserver | null = null;

function updateShelfDimensions() {
    if (shelfViewportRef.value && shelfContentRef.value) {
        const viewportWidth = shelfViewportRef.value.offsetWidth;
        const contentWidth = shelfContentRef.value.scrollWidth;
        maxScroll.value = Math.max(0, contentWidth - viewportWidth);
        if (scrollOffset.value > maxScroll.value) {
            scrollOffset.value = maxScroll.value;
        }
    }
}

function scrollShelf(direction: "left" | "right") {
    if (!shelfViewportRef.value) return;
    const scrollAmount = shelfViewportRef.value.offsetWidth * 0.8;
    if (direction === "right") {
        scrollOffset.value = Math.min(
            scrollOffset.value + scrollAmount,
            maxScroll.value,
        );
    } else {
        scrollOffset.value = Math.max(scrollOffset.value - scrollAmount, 0);
    }
}

function handleShelfScroll(event: WheelEvent) {
    if (maxScroll.value <= 0) return;
    event.preventDefault();
    const scrollDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ? event.deltaX
            : event.deltaY;
    if (scrollDelta === 0) return;
    scrollOffset.value = Math.max(
        0,
        Math.min(scrollOffset.value + scrollDelta, maxScroll.value),
    );
}

function changeSortBy(value: "updatedAt" | "createdAt" | "title") {
    setSortBy(value);
    showSortMenu.value = false;
}

watch(availableCategories, async () => {
    await nextTick();
    updateShelfDimensions();
});
// --- End Pagination ---

async function loadInitialData() {
    await db.open();
    await Promise.all([loadCategories(), loadTags(), fetchPrompts()]);
}

async function loadCategories() {
    try {
        await repository.initializeDefaultCategories();
        categories.value = await db.categories.toArray();
    } catch (error) {
        console.error("Failed to load categories:", error);
        showToast(t("common.toast.loadCategoriesFailed"), "error");
    }
}

async function loadTags() {
    try {
        tags.value = await db.tags.toArray();
    } catch (error) {
        console.error("Failed to load tags:", error);
        showToast(t("common.toast.loadTagsFailed"), "error");
    }
}

function createNewPrompt() {
    editingPrompt.value = createSafePrompt({
        title: "",
        content: "",
        favorite: false,
        categoryIds: [],
        tagIds: [],
    });
    editingTags.value = [];
    isReadonly.value = false;
    previewingVersion.value = null;
    baseVersionForEdit.value = null;
}

function editPrompt(prompt: Prompt) {
    editingPrompt.value = clonePrompt(prompt);
    editingTags.value = getTagNames(prompt.tagIds || []);
    isReadonly.value = false;
    previewingVersion.value = null;
    baseVersionForEdit.value = null;
}

async function triggerRefetch() {
    await refetchFromFirstPage();
}

async function toggleFavorite(prompt: Prompt) {
    const newFavoriteState = !prompt.favorite;
    const { ok } = await repository.updatePrompt(prompt.id, {
        favorite: newFavoriteState,
    });
    if (ok) {
        showToast(newFavoriteState ? t("common.toast.addedToFavorites") : t("common.toast.removedFromFavorites"), "success");
        const p = prompts.value.find((p) => p.id === prompt.id);
        if (p) p.favorite = newFavoriteState;
    } else {
        showToast(t("common.toast.operationFailed"), "error");
    }
}

async function savePrompt(modelFromEditor?: Partial<Prompt>) {
    if (modelFromEditor) {
        editingPrompt.value = { ...modelFromEditor };
    }

    if (!editingPrompt.value || !editingPrompt.value.title?.trim()) {
        showToast(t("common.toast.pleaseEnterTitle"), "error");
        return;
    }

    try {
        const tagNames = editingTags.value.map((t) => t.trim()).filter(Boolean);
        const note = hasContentChanged.value
            ? changeNote.value || t("common.defaultContentUpdateNote")
            : undefined;

        const { ok, error } = await repository.savePrompt(
            editingPrompt.value,
            tagNames,
            note,
        );

        if (ok) {
            await triggerRefetch();
            await loadTags();
            closeEditor();
            showToast(t("common.toast.saveSuccess"), "success");
        } else {
            throw error || new Error("保存 Prompt 时发生未知错误");
        }
    } catch (error) {
        console.error("Failed to save prompt:", error);
        showToast(t("common.toast.saveFailed", { message: (error as Error).message }), "error");
    }
}

async function deletePrompt(id: string) {
    const confirm = await askConfirm(
        t("common.confirmMessage.deletePrompt"),
        { type: "danger" },
    );
    if (!confirm) return;

    const { ok } = await repository.deletePrompt(id);
    if (ok) {
        await triggerRefetch();
        showToast(t("common.toast.deleteSuccess"), "success");
    } else {
        showToast(t("common.toast.deleteFailed"), "error");
    }
}

async function copyPrompt(prompt: Prompt) {
    repository.updatePrompt(prompt.id, { lastUsedAt: Date.now() });

    try {
        await navigator.clipboard.writeText(prompt.content);
        copiedId.value = prompt.id;
        setTimeout(() => {
            if (copiedId.value === prompt.id) copiedId.value = null;
        }, 1500);
        showToast(t("common.toast.copySuccess"), "success");
    } catch (error) {
        console.error("Failed to copy prompt:", error);
        showToast(t("common.toast.copyFailed"), "error");
    }
}

function closeEditor() {
    editingPrompt.value = null;
    hasContentChanged.value = false;
    isReadonly.value = false;
    previewingVersion.value = null;
    baseVersionForEdit.value = null;
}

function handleContentChange() {
    if (isReadonly.value) return;
    hasContentChanged.value = true;
}

function handleVersionPreview(payload: {
    version: PromptVersion;
    versionNumber: number;
    isLatest: boolean;
}) {
    if (!editingPrompt.value) return;

    // 点击“当前版本”：保持编辑态；若当前在历史预览中，则退出预览并回到可编辑态
    if (payload.isLatest) {
        if (isReadonly.value && previewingVersion.value) {
            editingPrompt.value.content = payload.version.content;
            hasContentChanged.value = false;
        }
        previewingVersion.value = null;
        baseVersionForEdit.value = null;
        isReadonly.value = false;
        showToast(t("prompts.versionHistory.toast.currentEditing"), "success");
        return;
    }

    editingPrompt.value.content = payload.version.content;
    previewingVersion.value = payload;
    baseVersionForEdit.value = null;
    isReadonly.value = true;
    hasContentChanged.value = false;
}

function handleEditFromPreview() {
    if (!previewingVersion.value) return;
    baseVersionForEdit.value = previewingVersion.value;
    previewingVersion.value = null;
    isReadonly.value = false;
}

async function reloadAndReEditCurrentPrompt() {
    if (!editingPrompt.value?.id) return;
    const promptId = editingPrompt.value.id;
    await triggerRefetch();
    const updatedPrompt = prompts.value.find((p) => p.id === promptId);
    if (updatedPrompt) {
        editPrompt(updatedPrompt);
    }
}

async function handleVersionRestored(version: any) {
    showToast(t("common.toast.versionRestored"), "success");
    await reloadAndReEditCurrentPrompt();
}

async function handleVersionDeleted(versionId: string) {
    showToast(t("common.toast.versionDeleted"), "success");
    if (
        previewingVersion.value &&
        previewingVersion.value.version.id === versionId
    ) {
        await reloadAndReEditCurrentPrompt();
    }
}

function formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat("zh-CN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(timestamp));
}

async function handleMergeSuccess() {
    await triggerRefetch();
    await loadTags();
}

async function handleCategoryDeletion() {
    await loadCategories();
    await triggerRefetch();
}

watch(() => route.query.action, (action) => {
    if (action === 'new') {
        createNewPrompt();
    }
});

// 监听自定义事件以处理重复点击
function handleCreateNewPrompt() {
    createNewPrompt();
}

onMounted(async () => {
    try {
        await loadInitialData();

        listObserver = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMore.value &&
                    !isLoading.value
                ) {
                    currentPage.value++;
                    fetchPrompts();
                }
            },
            { rootMargin: "200px" },
        );
        if (loaderRef.value) {
            listObserver.observe(loaderRef.value);
        }

        await nextTick();
        if (shelfViewportRef.value) {
            shelfObserver = new ResizeObserver(updateShelfDimensions);
            shelfObserver.observe(shelfViewportRef.value);
        }
        updateShelfDimensions();

        if (route.query.action === "new") {
            createNewPrompt();
        }

        // 添加自定义事件监听器
        window.addEventListener('create-new-prompt', handleCreateNewPrompt);
    } catch (error) {
        console.error("Failed to open database:", error);
        showToast(t("common.toast.dbConnectionFailed"), "error");
    }
});

onUnmounted(() => {
    if (listObserver) listObserver.disconnect();
    if (shelfObserver) shelfObserver.disconnect();
    // 移除自定义事件监听器
    window.removeEventListener('create-new-prompt', handleCreateNewPrompt);
});
</script>

<style scoped></style>
