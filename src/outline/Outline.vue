<template>
  <div
    ref="el"
    :style="style"
    :class="[
      'fixed z-[9999] flex flex-col transition-all duration-300',
      isCollapsed
        ? 'w-16 h-16 rounded-full cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-lg'
        : 'w-80 max-h-[calc(100vh-100px)] rounded-2xl shadow-2xl'
    ]"
    class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
  >
    <!-- Header -->
    <div
      :class="[
        'flex justify-between items-center flex-shrink-0',
        isCollapsed ? 'p-0 justify-center h-full' : 'p-4 border-b border-gray-200 dark:border-gray-700'
      ]"
      class="bg-gray-100/80 dark:bg-gray-800/80"
      @click="isCollapsed && toggleCollapse()"
    >
      <h3
        :class="['font-semibold dark:text-white flex items-center gap-2', { 'cursor-pointer': isCollapsed }]"
      >
        <span :class="['transition-transform', { 'rotate-15': isCollapsed && isHovering }]" v-html="ICONS.title">
        </span>
        <span v-if="!isCollapsed">{{ t('content.outline.title') }}</span>
      </h3>
      <div v-if="!isCollapsed" class="flex items-center gap-2">
        <button @click.stop="handleRefresh" :title="t('common.refresh')" class="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" v-html="ICONS.refresh">
        </button>
        <button @click.stop="toggleCollapse" :title="t('common.collapse')" class="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" v-html="ICONS.collapse">
        </button>
      </div>
    </div>

    <!-- Content (only when expanded) -->
    <template v-if="!isCollapsed">
      <input
        v-model="searchQuery"
        :placeholder="t('content.outline.searchPlaceholder')"
        class="p-2 m-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
      />

      <ul class="overflow-y-auto flex-grow px-2 pb-2">
        <TransitionGroup name="fade">
          <li
            v-for="(item, index) in filteredItems"
            :key="item.id"
            @click="handleItemClick($event, item.element)"
            @mousemove="handleItemHover($event, index)"
            @mouseleave="handleItemLeave"
            :class="{ 'bg-blue-100 dark:bg-blue-900': index === highlightedIndex }"
            class="p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200/60 dark:hover:bg-gray-700/60 rounded-lg transition-colors duration-150"
          >
            <span class="text-lg w-5 h-5 flex items-center justify-center" v-html="getDisplayIcon(item, index)"></span>
            <span class="truncate text-sm text-gray-800 dark:text-gray-200">{{ item.title }}</span>
          </li>
        </TransitionGroup>
        <li v-if="filteredItems.length === 0" class="text-center text-gray-500 p-4 text-sm">
          {{ t('content.outline.empty') }}
        </li>
      </ul>

      <div class="p-2 text-xs text-center text-gray-500 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        {{ stats }}
      </div>
    </template>
  </div>

  <!-- Hint Overlay using Teleport -->
  <Teleport to="body">
    <div
      :class="['scroll-hint-overlay', { 'visible': hint.visible }]"
    >
      <span class="scroll-hint-text">{{ hint.text }}</span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDraggable, useElementHover, until } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useOutline } from './useOutline';
import type { SiteConfig } from './site-configs';

type HoverZone = 'start' | 'center' | 'end' | '';

const ICONS = {
  title: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L20.5 10a5 5 0 0 0-7.83-4.39M3.5 14a5 5 0 0 0 7.83 4.39l2.17 2.64A9 9 0 0 1 3.51 15"/></svg>',
  collapse: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  scrollUp: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  scrollDown: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
  scrollCenter: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="9"/></svg>',
};

const props = defineProps<{ config: SiteConfig }>();
const { t } = useI18n();

// --- UI State ---
const el = ref<HTMLElement | null>(null);
const targetRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const isCollapsed = ref(false);
const isHovering = useElementHover(el);
const hoveredItem = ref<{ index: number, zone: HoverZone }>({ index: -1, zone: '' });
const hint = ref<{ visible: boolean, text: string }>({ visible: false, text: '' });

// --- Composable Logic ---
onMounted(async () => {
  // Wait until the target element for observation is present in the DOM
  const target = await until(() => document.querySelector<HTMLElement>(props.config.observeTarget))
    .not.toBeNull({ timeout: 10000, throwOnTimeout: false });

  if (target) {
    targetRef.value = target;
  } else {
    console.error(`Synapse Outline: observeTarget not found: ${props.config.observeTarget}`);
  }
});

const { items, highlightedIndex, updateItems } = useOutline(props.config, targetRef);

// --- Draggable ---
const { style } = useDraggable(el, {
  initialValue: { x: window.innerWidth - 340, y: 80 },
  disabled: computed(() => !isCollapsed.value),
});

// --- Filtering & Stats ---
const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return items.value.filter(item =>
    item.title.toLowerCase().includes(lowerCaseQuery)
  );
});

const stats = computed(() => {
  const total = items.value.length;
  const visible = filteredItems.value.length;
  if (total === 0) return t('content.outline.empty');
  if (total === visible) return t('content.outline.total', { count: total });
  return t('content.outline.filtered', { visible, total });
});

// --- Actions & Event Handlers ---
function getHoverZone(event: MouseEvent): HoverZone {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const hoverX = event.clientX - rect.left;
  const width = rect.width;
  if (hoverX < width / 3) return 'start';
  if (hoverX > (width * 2) / 3) return 'end';
  return 'center';
}

function handleItemHover(event: MouseEvent, index: number) {
  const zone = getHoverZone(event);
  hoveredItem.value = { index, zone };

  hint.value.visible = true;
  if (zone === 'start') hint.text = t('content.outline.scrollToTop');
  else if (zone === 'center') hint.text = t('content.outline.scrollToCenter');
  else if (zone === 'end') hint.text = t('content.outline.scrollToBottom');
}

function handleItemLeave() {
  hoveredItem.value = { index: -1, zone: '' };
  hint.value.visible = false;
}

function handleItemClick(event: MouseEvent, element: Element) {
  const zone = getHoverZone(event);
  element.scrollIntoView({ behavior: 'smooth', block: zone, inline: 'nearest' });
}

function getDisplayIcon(item: typeof items.value[0], index: number): string {
  if (hoveredItem.value.index === index) {
    if (hoveredItem.value.zone === 'start') return ICONS.scrollUp;
    if (hoveredItem.value.zone === 'center') return ICONS.scrollCenter;
    if (hoveredItem.value.zone === 'end') return ICONS.scrollDown;
  }
  return item.icon;
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function handleRefresh() {
  updateItems();
}
</script>

<style>
/* Hint Overlay Styles - Not Scoped */
.scroll-hint-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9998;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.25s ease;
  opacity: 0;
  pointer-events: none;
}
.scroll-hint-overlay.visible {
  opacity: 1;
}
.scroll-hint-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
</style>

<style scoped>
/* Main container slide-in animation */
.slide-right-enter-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

/* List item fade-in animation */
.fade-enter-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
}
</style>