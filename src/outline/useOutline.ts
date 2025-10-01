// src/outline/useOutline.ts

import { ref, watch, onMounted, onUnmounted, Ref } from 'vue';
import { useMutationObserver, useScroll, useDebounceFn } from '@vueuse/core';
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from '@/types/outline';
import { _smartTruncate, _getMessageIcon } from './utils'; // 将旧的工具函数移到这里

// 传入配置和目标元素的 Ref
export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  const items = ref<OutlineItem[]>([]);
  const highlightedIndex = ref(-1);

  // 核心功能：扫描 DOM 并更新 items 数组
  const updateItems = () => {
    if (!targetRef.value) return;
    const userMessages = targetRef.value.querySelectorAll(config.userMessage);
    const newItems: OutlineItem[] = [];
    userMessages.forEach((msg, index) => {
      const textEl = msg.querySelector(config.messageText) || msg;
      let title = (textEl.textContent || '').trim();
      if (!title) return;

      title = _smartTruncate(title, 35); // 复用逻辑
      newItems.push({
        id: index,
        title: title,
        icon: _getMessageIcon(title), // 复用逻辑
        element: msg,
      });
    });
    items.value = newItems;
  };

  // 使用 useMutationObserver 监听 DOM 变化，自动更新
  useMutationObserver(targetRef, updateItems, {
    childList: true,
    subtree: true,
  });

  // 滚动高亮逻辑
  const scrollContainer = config.scrollContainer === window ? window : (document.querySelector(config.scrollContainer || 'main') || window);
  const { y: scrollY } = useScroll(scrollContainer as any, { throttle: 150 });

  const updateHighlight = useDebounceFn(() => {
    const containerEl = scrollContainer === window ? document.documentElement : scrollContainer as HTMLElement;
    if (!containerEl) return;

    const containerHeight = containerEl.clientHeight;
    let mostVisibleIndex = -1;
    let maxVisibility = 0;

    items.value.forEach((item, index) => {
        const el = item.element;
        if (!el) return;

        const rect = el.getBoundingClientRect();

        // Element is completely out of view
        if (rect.bottom < 0 || rect.top > containerHeight) {
            return;
        }

        const top = Math.max(rect.top, 0);
        const bottom = Math.min(rect.bottom, containerHeight);
        const visibleHeight = bottom - top;

        if (visibleHeight > 0) {
            const visibility = visibleHeight / rect.height;
            // Find the item with the most visible area, with a minimum threshold
            if (visibility > maxVisibility && visibility > 0.3) {
                maxVisibility = visibility;
                mostVisibleIndex = index;
            }
        }
    });

    if (mostVisibleIndex !== -1) {
        highlightedIndex.value = mostVisibleIndex;
    }
  }, 100);


  watch(scrollY, updateHighlight);

  // 挂载后立即执行一次扫描
  onMounted(updateItems);

  return {
    items,
    highlightedIndex,
  };
}