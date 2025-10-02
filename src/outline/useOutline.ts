import { ref, onMounted, onUnmounted, Ref, watch } from 'vue';
import { useScroll, useDebounceFn } from '@vueuse/core';
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from '@/types/outline';
import { smartTruncate, getIntelligentIcon } from './utils';

export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  const items = ref<OutlineItem[]>([]);
  const highlightedIndex = ref(-1);
  // 核心改动 1: isLoading 只在“硬刷新”时激活，默认为true以处理初始加载。
  const isLoading = ref(true);

  let contentObserver: MutationObserver | null = null;
  let bootstrapObserver: MutationObserver | null = null;
  // 核心改动 2: 引入一个计时器ID，用于处理“暂时性空状态”的判断。
  let emptyStateTimeout: number | null = null;

  // 扫描DOM并返回结果。这是一个纯粹的读取操作。
  const scanDOM = (): OutlineItem[] => {
    if (!targetRef.value) return [];
    
    const userMessages = targetRef.value.querySelectorAll(config.userMessage);
    const newItems: OutlineItem[] = [];
    userMessages.forEach((msg, index) => {
      const textEl = msg.querySelector(config.messageText) || msg;
      let title = (textEl.textContent || '').trim();
      if (!title) return;

      title = smartTruncate(title, 50);
      newItems.push({
        id: index,
        title: title,
        icon: getIntelligentIcon(title),
        element: msg,
      });
    });
    return newItems;
  };

  // 核心改动 3: 这是被 MutationObserver 调用的“软更新”逻辑。
  // 它负责在后台更新数据，而不会触发加载状态，从而解决闪烁问题。
  const softUpdate = useDebounceFn(() => {
    const newItems = scanDOM();

    // 如果计时器存在，清除它。因为我们即将进行一次新的评估。
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);

    // 核心改动 4: “定论延迟”逻辑，解决切换聊天时的短暂空状态问题。
    if (newItems.length === 0 && items.value.length > 0) {
      // 场景：列表之前有内容，但现在突然变空了。
      // 我们不立即清空列表，而是启动一个计时器，给予新内容加载的时间。
      emptyStateTimeout = window.setTimeout(() => {
        items.value = []; // 500ms 后如果依然没有内容，才最终确认清空。
        isLoading.value = false; // 并结束加载状态。
      }, 500); // 500毫秒的宽限期
      return;
    }
    
    if (newItems.length > 0) {
      items.value = newItems;
      // 只有在数据加载成功后，才应将 isLoading 置为 false。
      // 这可以防止在初始加载时，一个空的DOM结构过早地结束了加载状态。
      isLoading.value = false;
    }

    updateHighlight();
  }, 200); // 增加防抖时间，以更好地聚合连续的DOM变化。


  // 公开的更新函数，用于手动或初始加载，这是唯一应该设置 isLoading 的地方。
  const updateItems = () => {
    isLoading.value = true;
    // 在硬刷新时，立即取消任何待定的“清空”操作。
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
    softUpdate();
  };


  // 启动主内容观察者
  const startContentObserver = () => {
    if (contentObserver || !targetRef.value) return;
    
    // MutationObserver 现在只调用“软更新”，不再触碰 isLoading。
    contentObserver = new MutationObserver(softUpdate);
    contentObserver.observe(targetRef.value, {
      childList: true,
      subtree: true,
      // 监听文本内容变化，以应对AI回复的流式更新。
      characterData: true, 
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
        stopObservers();

        const targetElement = document.querySelector<HTMLElement>(config.observeTarget);

        if (targetElement) {
            targetRef.value = targetElement;
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
            // 目标已就绪，调用“硬刷新”来执行首次扫描，并显示骨架屏。
            updateItems();
            startContentObserver();
        } else {
            bootstrapObserver = new MutationObserver((mutations, observer) => {
                const foundTarget = document.querySelector<HTMLElement>(config.observeTarget);
                if (foundTarget) {
                    observer.disconnect();
                    init();
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
      if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
  });

  // --- 滚动高亮逻辑 (无变化) ---
  const getScrollContainer = (): HTMLElement | Window => {
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
    isLoading, // 导出 loading 状态
  };
}
