import { ref, onMounted, onUnmounted, Ref, watch } from 'vue';
import { useScroll, useDebounceFn } from '@vueuse/core';
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from '@/types/outline';
import { smartTruncate, getIntelligentIcon } from './utils';

export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  const items = ref<OutlineItem[]>([]);
  const highlightedIndex = ref(-1);
  const isLoading = ref(true);

  let contentObserver: MutationObserver | null = null;
  let bootstrapObserver: MutationObserver | null = null;
  // ★ 核心改动 1: 移除 reinitObserver，因为它不可靠。
  // let reinitObserver: MutationObserver | null = null;
  let emptyStateTimeout: number | null = null;
  
  // ★ 核心改动 2: 引入一个变量来存储上一次的 URL，用于对比。
  let lastUrl = window.location.href;

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

  const softUpdate = useDebounceFn(() => {
    // 在开始扫描之前，再次检查目标元素是否还存在于页面上，作为双重保险。
    if (targetRef.value && !document.body.contains(targetRef.value)) {
        return; // 如果目标已失效，则不执行更新，等待 init 重启。
    }
      
    const newItems = scanDOM();

    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);

    if (newItems.length === 0 && items.value.length > 0) {
      emptyStateTimeout = window.setTimeout(() => {
        items.value = [];
        isLoading.value = false;
      }, 400);
      return;
    }
    
    if (newItems.length > 0) {
      items.value = newItems;
      isLoading.value = false;
    }

    updateHighlight();
  }, 200);

  const updateItems = () => {
    isLoading.value = true;
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
    softUpdate();
  };

  const startContentObserver = () => {
    if (contentObserver || !targetRef.value) return;
    
    contentObserver = new MutationObserver(softUpdate);
    contentObserver.observe(targetRef.value, {
      childList: true,
      subtree: true,
      characterData: true, 
    });
  };
  
  const stopObservers = () => {
      bootstrapObserver?.disconnect();
      contentObserver?.disconnect();
      // reinitObserver 已移除
      contentObserver = null;
      bootstrapObserver = null;
  }

  const init = async () => {
      // 每次初始化时，都立刻重置状态，防止闪回
      items.value = [];
      isLoading.value = true;
      
      stopObservers();

      // 使用一个延迟和重试机制来等待新页面的目标元素渲染完成
      await new Promise<void>(resolve => {
        let attempts = 0;
        const interval = setInterval(() => {
            const targetElement = document.querySelector<HTMLElement>(config.observeTarget);
            if (targetElement || attempts > 50) { // 最多等待 5 秒
                clearInterval(interval);
                targetRef.value = targetElement;
                resolve();
            }
            attempts++;
        }, 100);
      });

      if (targetRef.value) {
          if (config.waitForElement) {
              // 此处的等待逻辑也需要健壮
              await new Promise<void>(resolve => {
                let attempts = 0;
                const interval = setInterval(() => {
                    if (targetRef.value?.querySelector(config.waitForElement!) || attempts > 50) {
                        clearInterval(interval);
                        resolve();
                    }
                    attempts++;
                }, 50);
              });
          }
          softUpdate();
          startContentObserver();
      } else {
          // 如果最终还是没找到目标，则显示错误或空状态
          isLoading.value = false;
          console.warn("Outline Generator: Observe target not found after URL change.");
      }
  };

  // ★ 核心改动 3: 在 onMounted 中设置 URL 变更的监听器。
  onMounted(() => {
    // 首次加载时，直接运行 init
    init();

    // 监听 'navigatesuccess' 事件，这是处理SPA路由最可靠的方式
    if ('navigation' in window) {
      (window as any).navigation.addEventListener('navigatesuccess', () => {
        // 使用一个短暂的延迟，以确保SPA框架完成DOM操作
        setTimeout(() => {
          if (window.location.href !== lastUrl) {
            console.log('URL changed, re-initializing outline...');
            lastUrl = window.location.href;
            init();
          }
        }, 200); // 200ms的延迟通常足够
      });
    } else {
      // 如果浏览器不支持 Navigation API，可以回退到其他方案，但对于现代网站来说，它已广泛支持。
      console.warn('Navigation API not supported.');
    }
  });

  onUnmounted(() => {
      stopObservers();
      if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
      // 注意：理论上组件卸载时也应移除 navigation 的监听器，但在油猴脚本场景下，通常与页面同生共死，问题不大。
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
    if (!targetRef.value || !document.body.contains(targetRef.value)) return;

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
    isLoading, 
  }
}