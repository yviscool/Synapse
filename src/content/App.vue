<template>
    <!-- 主容器：包含提示词选择器和消息提示组件 -->
    <div :class="{ dark: isDark }">
        <!-- 提示词选择器面板 -->
        <PromptSelector
            v-if="visible"
            ref="selectorRef"
            v-model:searchQuery="searchQuery"
            v-model:selectedCategory="selectedCategory"
            :prompts="allPrompts"
            :categories="categoryOptions"
            :highlightIndex="highlightIndex"
            :isLoading="isLoading"
            :hasMore="hasMore"
            :totalPrompts="totalPrompts"
            :isComposerVisible="editorVisible"
            :activePromptTitle="editorPromptTitle"
            :isDark="isDark"
            @select="handleSelect"
            @copy="handleCopy"
            @close="closePanel"
            @load-more="handleLoadMore"
        />
        <PromptComposerPanel
            ref="composerRef"
            v-model="editorContent"
            :visible="visible && editorVisible"
            :promptTitle="editorPromptTitle"
            :isDark="isDark"
            @close="collapseComposer"
            @insert="handleInsert"
        />
        <!-- 大纲侧边栏 -->
        <!-- 仅在配置存在时渲染大纲组件 -->
        <!-- 统一面板：整合大纲 + 采集 + 设置 -->
        <SynapsePanel
            v-if="showSynapsePanel"
            :outlineConfig="outlineConfig"
            :key="outlineKey"
        />
        <!-- 消息提示组件 -->
        <UiToast
            v-if="ui.toast"
            :message="ui.toast.message"
            :type="ui.toast.type"
            @close="hideToast"
        />
    </div>
</template>

<script setup lang="ts">
// === 导入依赖 ===
import { ui, useUI } from "@/stores/ui";
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import {
    refDebounced,
    useEventListener,
    useMagicKeys,
    whenever,
    useScrollLock,
} from "@vueuse/core";

import { getSiteConfigByUrl } from "@/content/site-configs";
import { SynapsePanel } from "./components/synapse-panel";
import PromptSelector from "./components/PromptSelector.vue";
import PromptComposerPanel from "./components/PromptComposerPanel.vue";
import { canCollect } from "@/content/collect";
import { detectPlatformFromUrl } from "@/content/site-configs";
import { findActiveInput } from "@/utils/inputAdapter";
import {
    createInsertTrace,
    insertWithRetry,
    type OpenerFingerprint,
} from "./composables/usePromptInserter";
import {
    MSG,
    type RequestMessage,
    type ResponseMessage,
    type PromptDTO,
    type GetPromptsPayload,
    type DataUpdatedPayload,
} from "@/utils/messaging";
import type { FuseResultMatch } from "fuse.js";
import { getCategoryNameById, isDefaultCategory } from "@/utils/categoryUtils";
import type { LocalePreference } from "@/types/i18n";
import { resolveLocalePreference } from "@/utils/locale";
import { getNavigationApi } from "@/types/navigation";

const INPUT_SELECTOR_HINTS = [
    "#prompt-textarea.ProseMirror[contenteditable='true']",
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    '.ProseMirror[contenteditable="true"]',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="发送"]',
];

type ContentSettingsPayload = {
    locale: LocalePreference;
    theme?: "light" | "dark" | "system";
};

const outlineKey = ref(window.location.href);

// Logic to select the correct config for the current site
const outlineConfig = computed(() => {
    return getSiteConfigByUrl(outlineKey.value);
});

// 是否显示统一面板（有大纲配置或在 AI 平台时显示）
const showSynapsePanel = computed(() => {
    return outlineConfig.value !== null || canCollect() || detectPlatformFromUrl(outlineKey.value) !== 'other';
});

// === UI 控制 ===
const { showToast, hideToast } = useUI();
const { t, locale } = useI18n();

// --- SPA Navigation Handling ---
const navigationApi = getNavigationApi();
const handleNavigateSuccess = () => {
    outlineKey.value = window.location.href;
};
if (navigationApi) {
    useEventListener(navigationApi, "navigatesuccess", handleNavigateSuccess);
}

// === i18n & Theme & Real-time Sync ---
const theme = ref("light");

const isDark = computed(() => {
    if (theme.value === "dark") return true;
    if (theme.value === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
});

async function initSettings() {
    try {
        const res: ResponseMessage<ContentSettingsPayload> = await chrome.runtime.sendMessage({
            type: MSG.GET_SETTINGS,
        });
        const settings = res?.data;
        if (!res?.ok || !settings) return;
        
        // Handle Locale
        locale.value = resolveLocalePreference(settings.locale);

        // Handle Theme
        theme.value = settings.theme || "system";
    } catch (e) {
        console.error("获取设置失败:", e);
    }
}

// === 组件引用和状态 ===
/** 提示词选择器组件引用 */
const selectorRef = ref<InstanceType<typeof PromptSelector> | null>(null);
type PromptComposerExpose = { getCurrentContent?: () => string }
const composerRef = ref<PromptComposerExpose | null>(null);
/** 面板是否可见 */
const visible = ref(false);
const editorVisible = ref(false);
const editorContent = ref("");
const editorPromptTitle = ref("");
const selectedPromptId = ref<string | null>(null);

// 当面板显示时锁定页面滚动，提升用户体验
const isLocked = useScrollLock(document.body);
watch(visible, (v) => (isLocked.value = v));

// === 数据和过滤状态 ===
/** 所有提示词数据（包含搜索匹配信息） */
const allPrompts = ref<
    (PromptDTO & { matches?: readonly FuseResultMatch[] })[]
>([]);
/** 分类选项列表 */
const categoryOptions = ref<string[]>([t("content.allCategories")]);
const categoryNameIdMap = ref<Record<string, string>>({});
/** 当前选中的分类 */
const selectedCategory = ref<string>(t("content.allCategories"));
/** 搜索查询字符串 */
const searchQuery = ref("");
/** 防抖处理的搜索查询，避免频繁请求 */
const searchQueryDebounced = refDebounced(searchQuery, 200);
const isResettingFilters = ref(false);

// === 分页状态 ===
/** 当前页码 */
const currentPage = ref(1);
/** 提示词总数 */
const totalPrompts = ref(0);
/** 是否正在加载数据 */
const isLoading = ref(false);
/** 是否还有更多数据可加载 */
const hasMore = computed(() => allPrompts.value.length < totalPrompts.value);
/** 当前高亮的提示词索引 */
const highlightIndex = ref(0);
/** 数据版本号，用于检测数据更新 */
let dataVersion = "0";

// === 输入元素状态 ===
/** 触发面板时的输入元素信息 */
let opener: ReturnType<typeof findActiveInput> | null = null;
/** 上一个活跃的元素，用于关闭面板后恢复焦点 */
let lastActiveEl: HTMLElement | null = null;

let openerFingerprint: OpenerFingerprint | null = null;

// === 数据获取函数 ===

/**
 * 获取提示词数据
 * 支持搜索、分类过滤和分页加载
 */
async function fetchData() {
    // 防止重复请求
    if (isLoading.value) return;
    isLoading.value = true;

    try {
        // 构建请求参数
        const payload: GetPromptsPayload = {
            q: searchQueryDebounced.value, // 搜索关键词
            page: currentPage.value, // 当前页码
            limit: 50, // 每页数量
        };

        // 只有在没有搜索关键词时才应用分类过滤
        // 这样可以确保搜索结果不受分类限制
        if (!searchQueryDebounced.value) {
            payload.category = selectedCategory.value;
        }

        // 发送消息到后台脚本获取数据
        const res: ResponseMessage<
            (PromptDTO & { matches?: readonly FuseResultMatch[] })[]
        > & { total?: number } = await chrome.runtime.sendMessage({
            type: MSG.GET_PROMPTS,
            data: payload,
        });

        if (res.ok && res.data) {
            const processedData = res.data.map(p => {
                if (p.categoryName) {
                    const catId = categoryNameIdMap.value[p.categoryName];
                    if (catId && isDefaultCategory(catId)) {
                        return { ...p, categoryName: getCategoryNameById(catId) };
                    }
                }
                return p;
            });

            if (currentPage.value === 1) {
                // 第一页：替换所有数据
                allPrompts.value = processedData;
            } else {
                // 后续页：追加数据（无限滚动）
                allPrompts.value.push(...processedData);
            }
            totalPrompts.value = res.total || 0;
            dataVersion = res.version || "0";
        }
    } catch (e) {
        console.error("获取提示词失败:", e);
    } finally {
        isLoading.value = false;
    }
}

/**
 * 获取分类列表
 */
async function fetchCategories() {
    try {
        const res: ResponseMessage<{ id: string; name: string; sort?: number }[]> =
            await chrome.runtime.sendMessage({ type: MSG.GET_CATEGORIES });

        if (res.ok && res.data) {
            const nameIdMap: Record<string, string> = {};

            const sortedData = res.data.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));

            sortedData.forEach(c => { nameIdMap[c.name] = c.id; });
            categoryNameIdMap.value = nameIdMap;

            // 在分类列表前添加"全部"选项
            categoryOptions.value = [
                t("content.allCategories"),
                ...sortedData.map((c) => isDefaultCategory(c.id) ? getCategoryNameById(c.id) : c.name),
            ];
        }
    } catch (e) {
        console.error("获取分类失败:", e);
    }
}

/**
 * 重置状态并重新获取数据
 * 在搜索条件或分类改变时调用
 */
function resetAndFetch() {
    currentPage.value = 1;
    totalPrompts.value = 0;
    allPrompts.value = [];
    highlightIndex.value = 0;
    fetchData();
}

// 监听搜索关键词和分类变化，自动重新获取数据
watch([searchQueryDebounced, selectedCategory], () => {
    if (isResettingFilters.value) return;
    resetAndFetch();
});

// === 面板控制函数 ===

/**
 * 打开提示词选择面板
 */
async function openPanel() {
    if (visible.value) return;

    // 记录当前焦点元素，用于关闭面板后恢复
    lastActiveEl = document.activeElement as HTMLElement | null;

    // 查找并记录触发面板的输入元素
    const currentOpener = findActiveInput(INPUT_SELECTOR_HINTS);
    if (currentOpener && currentOpener.el) {
        opener = currentOpener;
        openerFingerprint = {
            id: currentOpener.el.id,
            className: currentOpener.el.className,
            tagName: currentOpener.el.tagName,
        };
    } else {
        opener = null;
        openerFingerprint = null;
    }

    visible.value = true;
    resetComposerState();

    // 重置搜索和分类状态
    isResettingFilters.value = true;
    selectedCategory.value = t("content.allCategories");
    searchQuery.value = "";

    try {
        await fetchCategories();
        resetAndFetch();
    } finally {
        isResettingFilters.value = false;
    }
}

/**
 * 关闭提示词选择面板
 */
function closePanel() {
    visible.value = false;
    resetComposerState();

    // 恢复之前的焦点元素
    if (lastActiveEl) {
        void nextTick(() => lastActiveEl?.focus());
    }
}

function collapseComposer() {
    editorVisible.value = false;
}

function resetComposerState() {
    editorVisible.value = false;
    editorContent.value = "";
    editorPromptTitle.value = "";
    selectedPromptId.value = null;
}

/**
 * 限制高亮索引在有效范围内
 */
function clampHighlight() {
    const n = allPrompts.value.length;
    if (n === 0) {
        highlightIndex.value = 0;
    } else {
        highlightIndex.value = Math.max(
            0,
            Math.min(highlightIndex.value, n - 1),
        );
    }
}

// 监听高亮索引变化，自动滚动到对应项目
watch(highlightIndex, (newIndex) => {
    selectorRef.value?.scrollToItem(newIndex);
});

// === 键盘导航控制 ===

/**
 * 魔法按键配置
 * 用于处理面板显示时的键盘快捷键
 */
const keys = useMagicKeys({
    passive: false,
    onEventFired(e) {
        // 当面板显示时，阻止某些按键的默认行为
        if (
            visible.value &&
            !editorVisible.value &&
            (e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "Tab" ||
                e.key === "Enter")
        ) {
            e.preventDefault();
            e.stopPropagation();
            // 终极武器：立即停止同一元素上其他同类事件监听器的执行
            e.stopImmediatePropagation();
        }
    },
});

// 向下箭头：移动到下一个提示词
whenever(keys.ArrowDown, () => {
    if (!visible.value || editorVisible.value) return;
    highlightIndex.value++;
    clampHighlight();
});

// 向上箭头：移动到上一个提示词
whenever(keys.ArrowUp, () => {
    if (!visible.value || editorVisible.value) return;
    highlightIndex.value--;
    clampHighlight();
});

// 回车键：选择当前高亮的提示词
whenever(keys.Enter, () => {
    if (!visible.value || editorVisible.value) return;
    const cur = allPrompts.value[highlightIndex.value];
    if (cur) handleSelect(cur);
});

// ESC键：关闭面板
whenever(keys.Escape, () => {
    if (!visible.value) return;
    if (editorVisible.value) {
        collapseComposer();
        return;
    }
    closePanel();
});

// Tab键：切换到下一个分类
whenever(keys.Tab, () => {
    if (!visible.value || editorVisible.value || !!searchQueryDebounced.value.trim()) return;
    const idx = categoryOptions.value.indexOf(selectedCategory.value);
    const next =
        (idx + 1 + categoryOptions.value.length) % categoryOptions.value.length;
    selectedCategory.value = categoryOptions.value[next];
});

// Shift+Tab：切换到上一个分类
whenever(keys["Shift+Tab"], () => {
    if (!visible.value || editorVisible.value || !!searchQueryDebounced.value.trim()) return;
    const idx = categoryOptions.value.indexOf(selectedCategory.value);
    const next =
        (idx - 1 + categoryOptions.value.length) % categoryOptions.value.length;
    selectedCategory.value = categoryOptions.value[next];
});

// Ctrl+C：复制当前高亮的提示词
whenever(keys.Ctrl_C, () => {
    if (!visible.value || editorVisible.value) return;
    const cur = allPrompts.value[highlightIndex.value];
    if (cur) handleCopy(cur);
});

// === 事件处理函数 ===

/**
 * 处理提示词选择事件
 * @param p 选中的提示词对象
 */
function handleSelect(p: PromptDTO) {
    editorPromptTitle.value = p.title;
    editorContent.value = p.content;
    selectedPromptId.value = p.id;
    editorVisible.value = true;
}

async function handleInsert() {
    const promptId = selectedPromptId.value || "";
    const hasLiveComposerReader = typeof composerRef.value?.getCurrentContent === "function";
    const liveComposerContent = hasLiveComposerReader
        ? (composerRef.value?.getCurrentContent?.() ?? "")
        : "";
    const modelContent = editorContent.value || "";
    const contentToInsert = hasLiveComposerReader ? liveComposerContent : modelContent;
    const trace = createInsertTrace({
        hostname: window.location.hostname,
        promptId,
        contentLength: contentToInsert.length,
        liveComposerLength: liveComposerContent.length,
        modelLength: modelContent.length,
        contentSource: hasLiveComposerReader ? "live" : "model",
    });

    if (!contentToInsert.trim()) {
        trace("insert.skip.emptyContent");
        showToast(t("common.toast.operationFailed"), "error");
        closePanel();
        return;
    }

    try {
        if (promptId) {
            chrome.runtime.sendMessage({
                type: MSG.UPDATE_PROMPT_LAST_USED,
                data: { promptId },
            });
        }
        trace("prompt.lastUsed.sent", { hasPromptId: !!promptId });

        // 先关闭面板并恢复宿主焦点，再执行插入，降低宿主编辑器重建导致的随机失败。
        closePanel();
        trace("panel.closed.beforeInsert");
        await nextTick();

        const attemptDelays = [0, 36, 72, 120, 180];
        let inserted = false;
        for (let i = 0; i < attemptDelays.length; i += 1) {
            const delayMs = attemptDelays[i];
            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
            inserted = insertWithRetry(contentToInsert, opener, openerFingerprint, INPUT_SELECTOR_HINTS, trace);
            trace("insert.result.attempt", { attempt: i + 1, delayMs, inserted });
            if (inserted) break;
        }

        // 如果没有找到输入元素，则复制到剪贴板
        if (!inserted) {
            try {
                trace("clipboard.fallback.start");
                await navigator.clipboard.writeText(contentToInsert);
                trace("clipboard.fallback.ok");
                // 更加明确的提示，消除“神奇”感
                showToast(t("content.composer.fallbackCopy"), "success");
            } catch {
                trace("clipboard.fallback.fail");
                showToast(t("common.toast.operationFailed"), "error");
            }
            return;
        }

        showToast(t("common.toast.operationSuccess"), "success");
    } catch (error) {
        trace("insert.exception", {
            error: error instanceof Error ? error.message : String(error),
        });
        if (visible.value) {
            closePanel();
            trace("insert.exception.closePanel");
        }
        console.error("处理提示词选择时出错:", error);
        showToast(t("common.toast.operationFailed"), "error");
    }
}

/**
 * 处理提示词复制事件
 * @param p 要复制的提示词对象
 */
async function handleCopy(p: PromptDTO) {
    // 更新提示词的最后使用时间
    chrome.runtime.sendMessage({
        type: MSG.UPDATE_PROMPT_LAST_USED,
        data: { promptId: p.id },
    });

    try {
        await navigator.clipboard.writeText(p.content);
        showToast(t("common.toast.copySuccess"), "success");
    } catch {
        showToast(t("common.toast.operationFailed"), "error");
    }

    closePanel();
}

/**
 * 处理加载更多数据事件
 * 实现无限滚动功能
 */
function handleLoadMore() {
    if (hasMore.value && !isLoading.value) {
        currentPage.value++;
        fetchData();
    }
}

// === 全局事件监听 ===

// Alt+K 快捷键：打开面板
whenever(keys.alt_k, () => {
    if (!visible.value) openPanel();
});

// === 组件生命周期 ===

/**
 * 组件挂载后的初始化操作
 */
onMounted(() => {
    initSettings();
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
});

function handleRuntimeMessage(msg: RequestMessage<unknown>) {
    // 处理打开面板的消息
    if (msg?.type === MSG.OPEN_PANEL) {
        openPanel();
    }

    // 处理数据更新的消息
    if (msg?.type === MSG.DATA_UPDATED) {
        const payload = msg.data as DataUpdatedPayload | undefined;
        if (!payload) return;
        const { scope, version } = payload;
        if (scope === "settings") {
            initSettings();
        }
        // 如果面板正在显示且数据版本不同，则刷新数据
        if (visible.value && version !== dataVersion) {
            fetchCategories().then(() => {
                resetAndFetch();
            });
        }
    }
}

onUnmounted(() => {
    chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
});
</script>
