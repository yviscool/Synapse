<template>
  <div
    ref="el"
    :style="style"
    :class="[
      'fixed z-[9999] flex flex-col transition-all duration-300',
      isCollapsed
        ? 'w-16 h-16 rounded-full cursor-grab active:cursor-grabbing hover:scale-105 hover:shadow-lg'
      : 'w-80 max-h-[calc(100vh-100px)] rounded-2xl shadow-2xl cursor-default'
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
        <span :class="['text-lg transition-transform', { 'rotate-15': isCollapsed && isHovering }]" v-html="ICONS.title">
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
        <li
          v-for="(item, index) in filteredItems"
          :key="item.id"
          @click="scrollToElement(item.element)"
          :class="{ 'bg-blue-100 dark:bg-blue-900': index === highlightedIndex }"
          class="p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-200/60 dark:hover:bg-gray-700/60 rounded-lg transition-colors duration-150"
        >
          <span class="text-lg" v-html="item.icon"></span>
          <span class="truncate text-sm text-gray-800 dark:text-gray-200">{{ item.title }}</span>
        </li>
        <li v-if="filteredItems.length === 0" class="text-center text-gray-500 p-4 text-sm">
          {{ t('content.outline.empty') }}
        </li>
      </ul>

      <div class="p-2 text-xs text-center text-gray-500 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        {{ stats }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDraggable, useElementHover } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useOutline } from './useOutline';
import type { SiteConfig } from './site-configs';

const ICONS = {
  title: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L20.5 10a5 5 0 0 0-7.83-4.39M3.5 14a5 5 0 0 0 7.83 4.39l2.17 2.64A9 9 0 0 1 3.51 15"/></svg>',
  collapse: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
};

const props = defineProps<{ config: SiteConfig }>();
const { t } = useI18n();

// --- UI State ---
const el = ref<HTMLElement | null>(null);
const targetRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const isCollapsed = ref(false);
const isHovering = useElementHover(el);

// --- Composable Logic ---
onMounted(() => {
  targetRef.value = document.querySelector(props.config.observeTarget);
});

const { items, highlightedIndex, updateItems } = useOutline(props.config, targetRef);

// --- Draggable ---
// Only allow dragging when collapsed
const { style } = useDraggable(el, {
  initialValue: { x: window.innerWidth - 340, y: 80 },
  onStart: () => isCollapsed.value, // Prevent dragging when expanded
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
  if (total === 0) {
    return t('content.outline.empty');
  }
  if (total === visible) {
    return t('content.outline.total', { count: total });
  }
  return t('content.outline.filtered', { visible, total });
});

// --- Actions ---
function scrollToElement(element: Element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}

function handleRefresh() {
  updateItems();
}
</script>