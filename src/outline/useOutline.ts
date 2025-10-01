import { ref, onMounted, onUnmounted, Ref, watch } from 'vue';
import { useScroll, useDebounceFn } from '@vueuse/core';
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from '@/types/outline';
import { _smartTruncate, _getMessageIcon } from './utils';

export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  const items = ref<OutlineItem[]>([]);
  const highlightedIndex = ref(-1);

  let contentObserver: MutationObserver | null = null;
  let bootstrapObserver: MutationObserver | null = null;

  // 核心功能：扫描 DOM 并更新 items 数组
  const updateItems = useDebounceFn(() => {
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
    // 初始加载后也更新一次高亮
    updateHighlight();
  }, 50); // 添加防抖，避免过于频繁的更新

  // 启动主内容观察者
  const startContentObserver = () => {
    if (contentObserver || !targetRef.value) return;
    
    contentObserver = new MutationObserver(updateItems);
    contentObserver.observe(targetRef.value, {
      childList: true,
      subtree: true,
    });
  };
  
  // 停止所有观察者
  const stopObservers = () => {
      bootstrapObserver?.disconnect();
      contentObserver?.disconnect();
      contentObserver = null;
      bootstrapObserver = null;
  }

  // 组件挂载时启动引导程序
  onMounted(() => {
    const init = async () => {
        // 停止任何可能存在的旧观察者（在SPA导航时很重要）
        stopObservers();

        // 检查目标是否已存在
        const targetElement = document.querySelector<HTMLElement>(config.observeTarget);

        if (targetElement) {
            targetRef.value = targetElement;
            // 如果需要等待特定子元素或延迟
            if (config.waitForElement) {
                await new Promise<void>(resolve => {
                    const check = () => {
                        if (targetRef.value?.querySelector(config.waitForElement!)) {
                            resolve();
                        } else {
                            setTimeout(check, 50);
                        }
                    };
                    check();
                });
            }
            // 目标已就绪，立即执行首次扫描并启动内容观察
            updateItems();
            startContentObserver();
        } else {
            // 如果目标不存在，启动引导观察者来寻找它
            bootstrapObserver = new MutationObserver((mutations, observer) => {
                const foundTarget = document.querySelector<HTMLElement>(config.observeTarget);
                if (foundTarget) {
                    observer.disconnect(); // 找到后立即停止引导观察者
                    init(); // 重新调用init函数，此时会进入上面的if分支
                }
            });

            bootstrapObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    };
    
    init();
  });

  // 组件卸载时清理
  onUnmounted(() => {
      stopObservers();
  });

  // --- 滚动高亮逻辑 (基本保持不变) ---
  const getScrollContainer = (): HTMLElement | Window => {
    // ... (这部分逻辑可以保持不变)
    if (config.scrollContainer === window) return window;
    if (typeof config.scrollContainer === 'string') {
        const el = document.querySelector<HTMLElement>(config.scrollContainer);
        if (el) return el;
    }
    return targetRef.value || document.documentElement || window;
  }

  const scrollContainerRef = ref<HTMLElement | Window>(window);
  onMounted(() => {
      scrollContainerRef.value = getScrollContainer();
  });
  const { y: scrollY } = useScroll(scrollContainerRef as Ref<HTMLElement | Window>, { throttle: 150 });

  const updateHighlight = useDebounceFn(() => {
    // ... (这部分逻辑可以保持不变)
    const container = scrollContainerRef.value;
    const isWindow = container === window;
    const containerHeight = isWindow ? window.innerHeight : (container as HTMLElement).clientHeight;

    if (!containerHeight) return;

    let mostVisibleIndex = -1;
    let maxVisibility = 0;

    items.value.forEach((item, index) => {
        const el = item.element;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > containerHeight) return;

        const top = Math.max(rect.top, 0);
        const bottom = Math.min(rect.bottom, containerHeight);
        const visibleHeight = bottom - top;
        
        if (visibleHeight > 0) {
            const visibility = visibleHeight / rect.height;
            if (visibility > maxVisibility && visibility > 0.3) {
                maxVisibility = visibility;
                mostVisibleIndex = index;
            }
        }
    });

    if (mostVisibleIndex !== -1) {
        highlightedIndex.value = mostVisibleIndex;
    }
  }, 50);
  
  watch(scrollY, updateHighlight);
  watch(items, updateHighlight, { deep: true, immediate: true });

  return {
    items,
    highlightedIndex,
    updateItems,
  };
}