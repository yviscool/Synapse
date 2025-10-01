<template>
  <div ref="el" :style="style" class="fixed z-[9999] flex flex-col w-80 max-h-[calc(100vh-100px)] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
    <div class="flex justify-between items-center p-4 bg-gray-100/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <h3 class="font-semibold dark:text-white flex items-center gap-2">
        <span class="text-lg">💬</span>
        <span>{{ t('outline.title') }}</span>
      </h3>
    </div>

    <input
      v-model="searchQuery"
      :placeholder="t('outline.searchPlaceholder')"
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
        <span class="text-lg">{{ item.icon }}</span>
        <span class="truncate text-sm text-gray-800 dark:text-gray-200">{{ item.title }}</span>
      </li>
    </ul>

    <div class="p-2 text-xs text-center text-gray-500 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
      {{ t('outline.total', { count: items.length }) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDraggable } from '@vueuse/core';
import { useI18n } from 'vue-i18n';
import { useOutline } from './useOutline';
import type { SiteConfig } from './site-configs';

const props = defineProps<{ config: SiteConfig }>();
const { t } = useI18n();

// UI State
const el = ref<HTMLElement | null>(null);
const targetRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');

onMounted(() => {
  targetRef.value = document.querySelector(props.config.observeTarget);
});

// Composable Logic
const { items, highlightedIndex } = useOutline(props.config, targetRef);

// Draggable
const { style } = useDraggable(el, {
  initialValue: { x: window.innerWidth - 340, y: 80 },
  handle: el, // Use the whole element as the handle
});

// Filtering
const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value;
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return items.value.filter(item =>
    item.title.toLowerCase().includes(lowerCaseQuery)
  );
});

// Actions
function scrollToElement(element: Element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
</script>