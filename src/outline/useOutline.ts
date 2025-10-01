// src/outline/useOutline.ts

import { ref, watch, onMounted, Ref } from 'vue';
import { useMutationObserver, useScroll, useDebounceFn, until } from '@vueuse/core';
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from '@/types/outline';
import { _smartTruncate, _getMessageIcon } from './utils';

// 传入配置和目标元素的 Ref
export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  const items = ref<OutlineItem[]>([]);
  const highlightedIndex = ref(-1);
  const isReady = ref(false); // A flag to ensure we only run when the page is ready

  // 核心功能：扫描 DOM 并更新 items 数组
  const updateItems = () => {
    if (!targetRef.value) return;
    const userMessages = targetRef.value.querySelectorAll(config.userMessage);
    const newItems: OutlineItem[] = [];
    userMessages.forEach((msg, index) => {
      const textEl = msg.querySelector(config.messageText) || msg;
      let title = (textEl.textContent || '').trim();
      if (!title) return;

      title = _smartTruncate(title, 35);
      newItems.push({
        id: index,
        title: title,
        icon: _getMessageIcon(title),
        element: msg,
      });
    });
    items.value = newItems;
  };

  // Set up the observer. It will only call updateItems if isReady is true.
  useMutationObserver(targetRef, () => {
    if (isReady.value) {
      updateItems();
    }
  }, {
    childList: true,
    subtree: true,
  });

  onMounted(async () => {
    // Wait until the main observation target is available in the DOM.
    await until(targetRef).not.toBeNull({ timeout: 10000, throwOnTimeout: false });
    if (!targetRef.value) {
      console.error("Synapse Outline: observeTarget not found", config.observeTarget);
      return;
    }

    // If a specific element needs to be ready, wait for it.
    if (config.waitForElement) {
      const readyEl = await until(() => document.querySelector(config.waitForElement!)).not.toBeNull({ timeout: 10000, throwOnTimeout: false });
      if (!readyEl) {
        console.error("Synapse Outline: waitForElement not found", config.waitForElement);
        return;
      }
    }

    // If an additional delay is needed for certain sites
    if (config.initDelay) {
      await new Promise(resolve => setTimeout(resolve, config.initDelay));
    }

    // Now that everything is loaded, perform the initial scan and allow the observer to work.
    isReady.value = true;
    updateItems();
  });


  // 滚动高亮逻辑
  const getScrollContainer = (): HTMLElement | Window => {
    if (config.scrollContainer === window) {
      return window
    }
    if (typeof config.scrollContainer === 'string') {
      const el = document.querySelector<HTMLElement>(config.scrollContainer)
      if (el) return el
    }
    // Fallback to main element or window
    return document.querySelector<HTMLElement>('main') || window
  }

  const scrollContainer = getScrollContainer()
  const { y: scrollY } = useScroll(scrollContainer, { throttle: 150 });

  const updateHighlight = useDebounceFn(() => {
    const isWindow = scrollContainer === window
    const containerHeight = isWindow
      ? window.innerHeight
      : (scrollContainer as HTMLElement).clientHeight

    if (!containerHeight) return

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

  return {
    items,
    highlightedIndex,
    updateItems,
  };
}