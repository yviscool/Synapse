<template>
  <!-- 主容器 -->
  <div
    ref="containerRef"
    :style="containerStyle"
    :class="[
      'sp-root fixed z-[9999] overflow-hidden',
      'transition-[width,height,border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      isCollapsed
        ? [
            'w-[52px] h-[52px] rounded-full cursor-grab active:cursor-grabbing',
            'bg-white/85 dark:bg-[#202127]/90 backdrop-blur-xl',
            'border border-gray-200/50 dark:border-white/20',
          ]
        : [
            'w-[340px] min-h-[480px] max-h-[min(80vh,800px)] rounded-2xl shadow-2xl flex flex-col',
            'bg-white/90 dark:bg-[#1e1e2e]/95 backdrop-blur-xl',
            'border border-gray-200/60 dark:border-white/10',
          ],
      isMounted ? 'opacity-100' : 'opacity-0'
    ]"
    @mousedown="handleDragStart"
    @touchstart.passive="handleDragStart"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- ===== 折叠态：呼吸的神经元 ===== -->
    <div
      v-if="isCollapsed"
      class="w-full h-full flex items-center justify-center cursor-pointer group"
      @click="handleCollapsedClick"
    >
      <span
        :class="[
          collapsedIcon,
          'text-xl transition-all duration-300 flex-shrink-0',
          isHovered ? 'scale-110 -rotate-12' : '',
        ]"
        :style="{
          color: syncStatus === 'syncing'
            ? 'rgb(168, 85, 247)'
            : isHovered
              ? 'rgb(59, 130, 246)'
              : 'var(--sp-icon-color)'
        }"
      ></span>
    </div>

    <!-- ===== 展开态 ===== -->
    <template v-else>
      <!-- 头部 60px -->
      <div class="relative flex-shrink-0 h-[60px] px-5 flex items-center justify-between border-b border-gray-200/50 dark:border-white/15 bg-gray-50/50 dark:bg-white/[0.02]">
        <!-- 左：品牌标识 -->
        <div class="flex items-center gap-3 overflow-hidden">
          <span class="i-ph-brain-bold text-xl flex-shrink-0" style="color: rgb(59, 130, 246)"></span>
          <Transition name="content-bloom">
            <h3
              v-show="true"
              class="font-semibold text-[15px] tracking-wide whitespace-nowrap"
              :style="{ color: 'var(--sp-text-primary)' }"
            >
              Synapse
            </h3>
          </Transition>
        </div>

        <!-- 右：控制按钮 -->
        <Transition name="content-bloom">
          <div class="flex items-center gap-1">
            <!-- 设置按钮 -->
            <div class="relative group/btn">
              <button
                @click.stop="showSettings = true"
                class="control-btn"
                :style="{ color: 'var(--sp-icon-color)' }"
                aria-label="Settings"
              >
                <span class="i-ph-gear-bold text-lg"></span>
              </button>
              <ElegantTooltip :text="t('content.panel.settings')" />
            </div>
            <!-- 刷新按钮（仅大纲模式） -->
            <div v-if="activeMode === 'outline'" class="relative group/btn">
              <button
                @click.stop="handleRefresh"
                class="control-btn"
                :style="{ color: 'var(--sp-icon-color)' }"
                aria-label="Refresh"
              >
                <span
                  :class="[
                    'i-ph-arrows-clockwise-bold text-lg transition-transform duration-700',
                    isRefreshing ? 'animate-spin-fast' : ''
                  ]"
                ></span>
              </button>
              <ElegantTooltip :text="t('common.refresh')" />
            </div>
            <!-- 折叠按钮 -->
            <div class="relative group/btn">
              <button
                @click.stop="toggleCollapse"
                class="control-btn"
                :style="{ color: 'var(--sp-icon-color)' }"
                aria-label="Collapse"
              >
                <span class="i-ph-minus-bold text-lg"></span>
              </button>
              <ElegantTooltip :text="t('common.collapse')" />
            </div>
          </div>
        </Transition>
      </div>

      <!-- 内容区域 -->
      <div class="flex-1 overflow-hidden min-h-0">
        <Transition name="tab-fade" mode="out-in">
          <OutlineContent
            v-if="activeMode === 'outline'"
            key="outline"
            :config="outlineConfig!"
            @hint="handleHint"
            @refresh-request="handleRefresh"
          />
          <CollectPanel
            v-else-if="activeMode === 'collect'"
            key="collect"
            :syncEngine="syncEngine"
            @sync-status-change="handleSyncStatusChange"
          />
        </Transition>
      </div>

      <!-- 底部模式指示器（多模式时显示） -->
      <div
        v-if="availableModes.length > 1"
        class="flex-shrink-0 flex items-center justify-center gap-2 py-2.5 border-t border-gray-200/50 dark:border-white/15 bg-gray-50/30 dark:bg-transparent"
      >
        <button
          v-for="mode in availableModes"
          :key="mode.id"
          @click="activeMode = mode.id"
          class="group/dot flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-200"
          :style="{
            backgroundColor: activeMode === mode.id ? 'var(--sp-indicator-active-bg)' : undefined
          }"
        >
          <span
            class="block rounded-full transition-all duration-300"
            :style="{
              width: activeMode === mode.id ? '8px' : '6px',
              height: activeMode === mode.id ? '8px' : '6px',
              backgroundColor: activeMode === mode.id ? 'rgb(59, 130, 246)' : 'var(--sp-dot-inactive)',
              boxShadow: activeMode === mode.id ? '0 0 6px rgba(59,130,246,0.5)' : 'none'
            }"
          ></span>
          <span
            class="text-[11px] font-medium transition-colors duration-200"
            :style="{
              color: activeMode === mode.id ? 'rgb(59, 130, 246)' : 'var(--sp-text-tertiary)'
            }"
          >
            {{ mode.label }}
          </span>
        </button>
      </div>
    </template>

    <!-- ===== 设置 Overlay ===== -->
    <Transition name="settings-overlay">
      <div
        v-if="showSettings && !isCollapsed"
        class="absolute inset-0 z-10"
      >
        <!-- 面板（全覆盖） -->
        <div class="absolute inset-0 overflow-y-auto settings-drawer" :style="{ backgroundColor: 'var(--sp-settings-bg)' }">
          <!-- 设置头部 -->
          <div
            class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-white/15 backdrop-blur-md"
            :style="{ backgroundColor: 'var(--sp-settings-header-bg)' }"
          >
            <div class="flex items-center gap-2">
              <span
                class="i-ph-arrow-left-bold text-base cursor-pointer hover:opacity-70 transition-opacity"
                :style="{ color: 'var(--sp-text-secondary)' }"
                @click="showSettings = false"
                role="button"
              ></span>
              <span class="text-sm font-semibold" :style="{ color: 'var(--sp-text-primary)' }">{{ t('content.panel.settings') }}</span>
            </div>
            <button
              @click="showSettings = false"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              :style="{ color: 'var(--sp-text-tertiary)' }"
            >
              <span class="i-ph-x-bold text-sm"></span>
            </button>
          </div>
          <SettingsPanel />
        </div>
      </div>
    </Transition>
  </div>

  <!-- ===== 全局 Hint 提示 ===== -->
  <Transition name="overlay-fade">
    <div
      v-if="hint.visible"
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9998] pointer-events-none"
    >
      <div
        class="px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pop-in"
        style="background: rgba(15,23,42,0.88); color: #fff !important"
      >
        <span :class="[hint.icon, 'text-2xl']" style="color: rgb(96, 165, 250)"></span>
        <span class="text-base font-medium tracking-wide">{{ hint.text }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  nextTick,
  defineComponent,
  h,
  Transition,
  type CSSProperties,
} from 'vue'
import { useDraggable, useWindowSize } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { canCollect } from '@/content/collect'
import { detectPlatformFromUrl } from '@/content/site-configs'
import type { SiteConfig } from '@/content/site-configs'

import CollectPanel from './CollectPanel.vue'
import OutlineContent from './OutlineContent.vue'
import SettingsPanel from './SettingsPanel.vue'
import { useSyncEngine, STORAGE_KEY_SYNC_ENABLED } from './useSyncEngine'

type PanelMode = 'outline' | 'collect'

const props = defineProps<{
  outlineConfig: SiteConfig | null
}>()

const { t } = useI18n()
const { height: windowHeight } = useWindowSize()

// --- 状态 ---
const containerRef = ref<HTMLElement | null>(null)
const STORAGE_KEY_COLLAPSED = 'synapse-panel-collapsed'
const isCollapsed = ref(false)
const isHovered = ref(false)
const isMounted = ref(false)
const isRefreshing = ref(false)
const showSettings = ref(false)
const wasDragged = ref(false)
const activeMode = ref<PanelMode>('outline')

// 同步状态
const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')

// 同步引擎（在面板层级初始化，不依赖 CollectPanel 挂载）
const syncEngine = useSyncEngine({
  onSyncSuccess: () => { syncStatus.value = 'success' },
  onSyncError: () => { syncStatus.value = 'error' },
})

// Hint 状态
const hint = ref<{ visible: boolean; text: string; icon: string }>({
  visible: false,
  text: '',
  icon: '',
})
let hintTimeout: number | null = null

// --- 是否在 AI 平台 ---
const isAIPlatform = computed(() => canCollect() || detectPlatformFromUrl(window.location.href) !== 'other')

// --- 可用模式 ---
const availableModes = computed(() => {
  const modes: { id: PanelMode; label: string }[] = []
  if (props.outlineConfig) {
    modes.push({ id: 'outline', label: t('content.panel.outline') })
  }
  if (isAIPlatform.value) {
    modes.push({ id: 'collect', label: t('content.panel.collect') })
  }
  return modes
})

// --- 折叠态图标 ---
const collapsedIcon = computed(() => {
  if (syncStatus.value === 'syncing') {
    return 'i-ph-circle-notch-bold animate-spin'
  }
  if (isAIPlatform.value) {
    return 'i-ph-brain-bold'
  }
  return 'i-ph-list-bullets-bold'
})

// --- 拖拽 ---
const { y: dragY, isDragging } = useDraggable(containerRef, {
  initialValue: { x: 0, y: 100 },
  preventDefault: true,
  disabled: computed(() => !isCollapsed.value),
  onStart: () => { wasDragged.value = false },
  onMove(p) {
    wasDragged.value = true
    p.y = Math.max(20, Math.min(p.y, windowHeight.value - 80))
  },
})

const containerStyle = computed<CSSProperties>(() => ({
  top: `${dragY.value}px`,
  right: '24px',
  transition: isDragging.value ? 'none' : undefined,
  transform: isDragging.value
    ? 'scale(1.08)'
    : isCollapsed.value && isHovered.value
      ? 'scale(1.05)'
      : 'scale(1)',
  boxShadow: isCollapsed.value
    ? syncStatus.value === 'syncing'
      ? '0 0 20px rgba(168,85,247,0.35), 0 4px 15px rgba(0,0,0,0.1)'
      : isHovered.value
        ? '0 0 20px rgba(59,130,246,0.3), 0 8px 25px rgba(0,0,0,0.1)'
        : '0 4px 15px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)'
    : undefined,
}))

// --- 方法 ---
function handleDragStart(e: MouseEvent | TouchEvent) {
  if (!isCollapsed.value) e.stopPropagation()
}

function persistCollapsed(value: boolean) {
  chrome.storage?.local?.set({ [STORAGE_KEY_COLLAPSED]: value })
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
  persistCollapsed(isCollapsed.value)
  if (isCollapsed.value) {
    showSettings.value = false
  }
}

function handleCollapsedClick() {
  if (wasDragged.value) return
  isCollapsed.value = false
  persistCollapsed(false)
}

function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
  }, 800)
}

function handleSyncStatusChange(status: 'idle' | 'syncing' | 'success' | 'error') {
  syncStatus.value = status
}

function handleHint(data: { text: string; icon: string }) {
  if (hintTimeout) clearTimeout(hintTimeout)
  if (!data.text) {
    hintTimeout = window.setTimeout(() => {
      hint.value = { visible: false, text: '', icon: '' }
    }, 100)
    return
  }
  hint.value = { visible: true, text: data.text, icon: data.icon }
  hintTimeout = window.setTimeout(() => {
    hint.value = { visible: false, text: '', icon: '' }
  }, 1500)
}

// --- 全局样式注入 ---
function injectGlobalStyles() {
  const STYLE_ID = 'synapse-panel-global-styles'
  if (document.getElementById(STYLE_ID)) return

  const css = `
    .outline-hover-highlight {
      position: relative;
      outline: 2px solid rgba(59, 130, 246, 0.4);
      outline-offset: 4px;
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 8px;
      transition: outline 0.2s ease-out, background-color 0.2s ease-out;
    }
    .outline-active-highlight {
      position: relative;
      border-radius: 8px;
    }
    .outline-active-highlight::after {
      content: ''; position: absolute; inset: -4px;
      border: 2px solid rgba(59, 130, 246, 0.5);
      background-color: rgba(59, 130, 246, 0.05);
      border-radius: 12px; pointer-events: none;
      animation: synapse-pulse-border 2s infinite;
    }
    @keyframes synapse-pulse-border {
      0% { border-color: rgba(59, 130, 246, 0.5); }
      50% { border-color: rgba(59, 130, 246, 0.2); }
      100% { border-color: rgba(59, 130, 246, 0.5); }
    }
    .outline-flash-highlight { animation: synapse-flash-bg 2s ease-out forwards; }
    @keyframes synapse-flash-bg {
      0% { background-color: rgba(59, 130, 246, 0.3) !important; }
      100% { background-color: transparent !important; }
    }
  `
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}

// --- ElegantTooltip 内联组件 ---
const ElegantTooltip = defineComponent({
  props: { text: String },
  setup(props) {
    return () =>
      h(Transition, { name: 'tooltip-fade' }, {
        default: () => h('div', {
          class: [
            'absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1',
            'bg-white dark:bg-gray-800 text-gray-700 dark:text-white/90',
            'border border-gray-200/80 dark:border-transparent',
            'text-xs font-medium rounded-md shadow-lg whitespace-nowrap',
            'pointer-events-none z-50 backdrop-blur-sm',
            'opacity-0 translate-y-[-4px] group-hover/btn:opacity-100 group-hover/btn:translate-y-0',
            'transition-all duration-200 ease-out delay-300',
          ],
        }, props.text),
      })
  },
})

// --- 初始化 ---
onMounted(async () => {
  // 从扩展存储恢复状态（跨域共享）
  try {
    const result = await chrome.storage?.local?.get([STORAGE_KEY_COLLAPSED, STORAGE_KEY_SYNC_ENABLED])
    if (result?.[STORAGE_KEY_COLLAPSED] === true) {
      isCollapsed.value = true
    }
    // 恢复实时同步状态
    if (result?.[STORAGE_KEY_SYNC_ENABLED] === true && syncEngine.canSync.value && !syncEngine.isEnabled.value) {
      syncEngine.enable()
    }
  } catch { /* ignore */ }

  await nextTick()
  isMounted.value = true
  containerRef.value?.classList.add('animate-slide-in-right')
  injectGlobalStyles()

  // 默认入口策略（产品约定）：有大纲能力时始终优先大纲，否则进入采集
  if (props.outlineConfig) {
    activeMode.value = 'outline'
  } else if (isAIPlatform.value) {
    activeMode.value = 'collect'
  }
})

onUnmounted(() => {
  if (hintTimeout) clearTimeout(hintTimeout)
})
</script>

<style scoped>
.sp-root {
  --sp-text-primary: #1e293b;
  --sp-text-secondary: #64748b;
  --sp-text-tertiary: #94a3b8;
  --sp-icon-color: #6b7280;
  --sp-dot-inactive: #d1d5db;
  --sp-indicator-active-bg: rgba(239, 246, 255, 1);
  --sp-settings-bg: rgba(255, 255, 255, 0.97);
  --sp-settings-header-bg: rgba(255, 255, 255, 0.92);
  --sp-item-bg: #f8fafc;
  --sp-border: #e2e8f0;
  --sp-select-bg: white;
  --sp-toggle-bg: #cbd5e1;
}

:global(.dark .sp-root) {
  --sp-text-primary: rgba(255, 255, 255, 0.95);
  --sp-text-secondary: rgba(255, 255, 255, 0.6);
  --sp-text-tertiary: rgba(255, 255, 255, 0.4);
  --sp-icon-color: rgba(255, 255, 255, 0.85);
  --sp-dot-inactive: rgba(255, 255, 255, 0.3);
  --sp-indicator-active-bg: rgba(59, 130, 246, 0.1);
  --sp-settings-bg: rgba(30, 30, 46, 0.98);
  --sp-settings-header-bg: rgba(30, 30, 46, 0.92);
  --sp-item-bg: rgba(255, 255, 255, 0.04);
  --sp-border: rgba(255, 255, 255, 0.1);
  --sp-select-bg: rgba(255, 255, 255, 0.08);
  --sp-toggle-bg: rgba(255, 255, 255, 0.15);
}

/* 控制按钮 */
.control-btn {
  @apply p-2 rounded-lg transition-colors duration-200 flex items-center justify-center;
  @apply hover:bg-gray-200/50 dark:hover:bg-gray-700/50;
}

/* 刷新旋转 */
@keyframes spin-fast {
  to { transform: rotate(360deg); }
}
.animate-spin-fast {
  animation: spin-fast 0.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

/* 旋转动画 */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

/* 滑入动画 */
@keyframes slideInRight {
  from { transform: translateX(120%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in-right {
  animation: slideInRight 0.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
}

/* 弹出动画 */
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.9) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
.animate-pop-in {
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

/* content-bloom 过渡 */
.content-bloom-enter-active {
  transition: all 0.3s ease-out 0.1s;
}
.content-bloom-leave-active {
  transition: all 0.2s ease-in;
}
.content-bloom-enter-from,
.content-bloom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Tab 切换动画 */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 设置 Overlay 动画 */
.settings-overlay-enter-active {
  transition: opacity 0.25s ease;
}
.settings-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.settings-overlay-enter-from,
.settings-overlay-leave-to {
  opacity: 0;
}
.settings-overlay-enter-active .settings-drawer {
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}
.settings-overlay-leave-active .settings-drawer {
  transition: transform 0.2s ease-in;
}
.settings-overlay-enter-from .settings-drawer {
  transform: translateX(100%);
}
.settings-overlay-leave-to .settings-drawer {
  transform: translateX(100%);
}

/* Hint overlay 淡入淡出 */
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* Tooltip 淡入淡出 */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
