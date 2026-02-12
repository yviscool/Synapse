/**
 * =================================================================================
 * useOutline.ts - 大纲组件的“数据大脑” (Vue Composition API Hook)
 * =================================================================================
 *
 * 致未来的开发者（也包括 10 年后的我）:
 *
 * 你好！这个文件是 Outline.vue 组件的核心逻辑。它的职责是：
 * 1.  **侦测 (Observe):** 像一个“侦察兵”，使用 MutationObserver 监视 AI 聊天网站的 DOM 变化。
 * 2.  **适配 (Adapt):** 读取 `site-configs.ts` 里的配置，知道要去“看”哪里。
 * 3.  **解析 (Scan):** 读取 DOM，抓取所有用户消息，生成大纲条目。
 * 4.  **响应 (React):** 当用户滚动页面时，自动高亮当前可见的条目。
 *
 * 维护这个文件时，最棘手的部分是 `scanDOM` 和 `init` 函数。
 * 不同的 AI 网站有不同的页面结构，尤其是“虚拟滚动”技术，会给 DOM 抓取带来极大麻烦。
 *
 * 我们已经设计了一个“适配器模式”来应对：
 * -   **模式 A (虚拟化):** 针对 AI Studio 这类网站。它们会把滚出屏幕的 DOM 内容删除！
 * 我们的对策是去读取它们在“别处”（如滚动条）暴露的元数据。
 * -   **模式 B (传统):** 针对 ChatGPT 这类网站。DOM 结构稳定，直接抓取即可。
 *
 * 如果未来出现了“模式 C”，你只需要：
 * 1.  在 `site-configs.ts` 的 `SiteConfig` 接口中添加新配置（比如 `jsVariable: '...'`）。
 * 2.  在 `scanDOM` 函数里加一个 `else if (config.jsVariable)` 分支。
 *
 * 祝你好运！
 *
 * =================================================================================
 */

import { ref, onMounted, onUnmounted, Ref, watch } from 'vue';
import { useScroll, useDebounceFn } from '@vueuse/core';
// 导入配置文件的“类型”，而不是实体，这样 hook 保持纯净
import type { SiteConfig } from './site-configs';
import type { OutlineItem } from './types';
import { smartTruncate, getIntelligentIcon } from './utils';

type NavigationApi = {
  addEventListener: (type: 'navigatesuccess', listener: () => void) => void;
  removeEventListener: (type: 'navigatesuccess', listener: () => void) => void;
};

/**
 * useOutline - 驱动大纲功能的核心 Vue Composition API 钩子
 * @param config - 当前网站的“适配器”配置对象，来自 `site-configs.ts`
 * @param targetRef - 一个 Ref，用于存储聊天内容容器的 DOM 元素。这个 Ref 由 `init` 函数动态填充。
 * @returns 暴露给 Vue 组件的响应式状态和方法
 */
export function useOutline(config: SiteConfig, targetRef: Ref<HTMLElement | null>) {
  // --- 核心状态 ---

  // 1. 大纲条目列表：这是“真相的唯一来源”，UI 将根据它来渲染
  const items = ref<OutlineItem[]>([]);
  // 2. 滚动高亮索引：当前在视口中“最突出”的条目索引
  const highlightedIndex = ref(-1);
  // 3. 加载状态：用于在 `init` 和 `updateItems` 时显示加载指示
  const isLoading = ref(true);

  // --- 内部状态与观察器 ---

  // DOM 变化“侦察兵”：监视聊天内容的增删改
  let contentObserver: MutationObserver | null = null;
  // 引导“侦察兵”：用于在 `init` 阶段查找目标
  let bootstrapObserver: MutationObserver | null = null;
  // 上次的 URL：用于在 SPA 路由切换时，判断是否需要“重启”
  let lastUrl = window.location.href;
  // 防闪烁计时器：防止在页面刷新中途，大纲列表短暂变空导致的 UI 闪烁
  let emptyStateTimeout: number | null = null;
  let navigationSuccessHandler: (() => void) | null = null;

  /**
   * --------------------------------------------------------------------------
   * 核心中的核心：DOM 扫描器 (scanDOM)
   * --------------------------------------------------------------------------
   *
   * 这个函数被设计为“双引擎”模式，以应对两种截然不同的网站架构。
   * 它只负责“读取” DOM 并返回一个标准化的 `OutlineItem[]` 数组。
   */
  const scanDOM = (): OutlineItem[] => {
    const newItems: OutlineItem[] = [];

    /**
     * 模式 A: 虚拟化列表逻辑 (例如 aistudio.google.com)
     * ----------------------------------------------------------------
     * @problem 这类网站为了极致的性能，会把滚出屏幕的聊天内容从 DOM 中 *删除*！
     * 我们无法再从聊天容器 `targetRef` 中抓取内容。
     * @solution 幸运的是，这类网站通常会在“别处”（比如自定义滚动条）暴露一个“元数据”列表。
     * 我们就去扫描这个“元数据”列表（`config.virtualizedList`）。
     * 这个列表中的每个元素（如 <button>）都包含了：
     * 1.  标题 (如 `aria-label`)
     * 2.  指向真实聊天 DOM 元素的 ID (如 `aria-controls`)
     */
    if (config.virtualizedList) {
      const { scrollBarButton, titleAttribute, idLinkAttribute } = config.virtualizedList;

      // 注意：我们从全局 `document` 查找，因为滚动条不一定在 `targetRef` 内部
      const scrollbarButtons = document.querySelectorAll(scrollBarButton);

      scrollbarButtons.forEach((btn, index) => {
        // 1. 从按钮属性获取标题
        const title = (btn.getAttribute(titleAttribute) || '').trim();
        // 2. 从按钮属性获取目标聊天元素的 ID
        const targetId = btn.getAttribute(idLinkAttribute);

        // 如果缺少关键信息，则跳过
        if (!title || !targetId) return;

        // 3. 使用 ID 找到页面上对应的聊天元素
        //    (即使这个元素是“空的”，我们也需要它来进行点击滚动)
        const element = document.getElementById(targetId);
        if (!element) return; // 找不到对应的聊天元素则跳过

        newItems.push({
          id: index, // 使用按钮的索引作为id
          title: smartTruncate(title, 50),
          icon: getIntelligentIcon(title),
          element: element, // 关键：element 指向 <ms-chat-turn> 这类“空壳”
        });
      });
    }
    /**
     * 模式 B: 传统 DOM 扫描逻辑 (例如 chatgpt.com)
     * ----------------------------------------------------------------
     * @problem 这是标准网站，DOM 结构稳定。
     * @solution 直接在 `targetRef` 容器中查找所有用户消息 (`config.userMessage`)，
     * 并提取其内部的文本 (`config.messageText`)。
     *
     * 这是我们的“默认兜底”方案。
     */
    else {
      // 如果连 `targetRef` 都没有，那什么也做不了
      if (!targetRef.value) return [];

      const userMessages = targetRef.value.querySelectorAll(config.userMessage);
      userMessages.forEach((msg, index) => {
        // 优先在消息元素(msg)内部查找文本节点(config.messageText)
        // 如果找不到，就退而求其次，使用 msg 自身的文本
        const textEl = msg.querySelector(config.messageText) || msg;
        let title = (textEl.textContent || '').trim();

        // 忽略空消息
        if (!title) return;

        title = smartTruncate(title, 50);
        newItems.push({
          id: index,
          title: title,
          icon: getIntelligentIcon(title),
          element: msg, // element 指向消息元素本身
        });
      });
    }

    return newItems;
  };

  /**
   * "轻量级" 更新（防抖）
   *
   * 这是由 `MutationObserver`（DOM侦察兵）触发的函数。
   * 我们使用防抖 (debounce) 来避免在 DOM 频繁变动时（比如 AI 正在打字）造成性能崩溃。
   */
  const softUpdate = useDebounceFn(() => {
    // 【重要】双重保险检查：
    // 在 SPA 路由切换时，`targetRef` 可能已经被 Vue 卸载（但 DOM 侦察兵的回调可能还在队列中）。
    // 在执行扫描前，必须确认 `targetRef` 对应的 DOM 元素还在页面上。
    if (targetRef.value && !document.body.contains(targetRef.value)) {
      console.warn('Outline softUpdate: Target element is detached from DOM. Aborting.');
      return; // 如果目标已失效，则不执行更新，等待 `init` 重启。
    }

    // 无论哪种模式，都调用 scanDOM
    const newItems = scanDOM();

    // 清除上一个“防闪烁”计时器
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);

    // 【体验优化】防闪烁逻辑：
    // 如果新列表是空的，但旧列表 *有* 内容（这经常发生在 SPA 路由切换的瞬间），
    // 我们不立即清空 `items.value`，而是启动一个计时器。
    if (newItems.length === 0 && items.value.length > 0) {
      emptyStateTimeout = window.setTimeout(() => {
        // 400ms 后，如果 `scanDOM` 仍然没有找到内容，我们才“确认”列表是真的空了。
        items.value = [];
        isLoading.value = false;
      }, 400); // 400ms 是一个经验值，足够 SPA 渲染
      return;
    }

    // 如果找到了新条目，则正常更新列表
    if (newItems.length > 0) {
      items.value = newItems;
      isLoading.value = false;
    }

    // 每次更新完数据，都重新计算一次滚动高亮
    updateHighlight();
  }, 200); // 200ms 防抖：在密集的 DOM 变动停止后 200ms 再执行扫描

  /**
   * "重量级" 更新（手动）
   *
   * 这是由用户点击“刷新”按钮调用的。
   * 它会立即显示加载状态，并触发一次 `softUpdate`。
   */
  const updateItems = () => {
    isLoading.value = true;
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
    softUpdate();
  };

  /**
   * 启动 DOM“侦察兵”
   */
  const startContentObserver = () => {
    // 防止重复启动
    if (contentObserver || !targetRef.value) return;

    // `MutationObserver` 是一个高性能的浏览器 API，用于监视 DOM 树的变化。
    contentObserver = new MutationObserver(softUpdate); // 当变化发生时，调用我们的轻量级更新

    // 我们监视 `targetRef`（聊天容器）的：
    // - childList: 子节点增删（比如新增了一条消息）
    // - subtree:   所有后代节点的变化（比如 AI 消息在某个深层 div 里更新了文本）
    // - characterData: 文本内容的变化
    contentObserver.observe(targetRef.value, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  };

  /**
   * 停止所有“侦察兵”
   *
   * 在 `init` 重启或组件卸载时调用，防止内存泄漏。
   */
  const stopObservers = () => {
    bootstrapObserver?.disconnect();
    contentObserver?.disconnect();
    contentObserver = null;
    bootstrapObserver = null;
  }

  /**
   * --------------------------------------------------------------------------
   * 核心初始化逻辑 (init)
   * --------------------------------------------------------------------------
   *
   * 这是本 hook 的“重启程序”。
   * 在 SPA 网站（如 Kimi, Gemini）上，切换聊天时，旧的聊天 DOM 会被销毁，新的会创建。
   * `init` 负责在每次页面“貌似”刷新后，重新找到监视目标并启动“侦察兵”。
   */
  const init = async () => {
    // 1. 立即重置状态，显示加载中
    items.value = [];
    isLoading.value = true;

    // 2. 停止所有旧的“侦察兵”，防止它们操作旧的 DOM
    stopObservers();

    // 3. 异步、带重试地查找新页面的“聊天容器” (`config.observeTarget`)
    await new Promise<void>(resolve => {
      let attempts = 0;
      const interval = setInterval(() => {
        const targetElement = document.querySelector<HTMLElement>(config.observeTarget);
        // 如果找到了，或者重试了 50 次（5秒）后，就停止
        if (targetElement || attempts > 50) {
          clearInterval(interval);
          targetRef.value = targetElement; // 将找到的元素存入 Ref
          resolve();
        }
        attempts++;
      }, 100); // 每 100ms 试一次
    });

    // 4. 检查是否成功找到了容器
    if (targetRef.value) {
      // 5. （可选）等待“第一个用户消息” (`config.waitForElement`) 出现
      //    这用于修复：容器 `div` 先出现，但内容是后加载的
      if (config.waitForElement) {
        await new Promise<void>(resolve => {
          let attempts = 0;
          const interval = setInterval(() => {
            // 如果在容器内找到了“等待元素”，或重试了 50 次（2.5秒）
            if (targetRef.value?.querySelector(config.waitForElement!) || attempts > 50) {
              clearInterval(interval);
              resolve();
            }
            attempts++;
          }, 50);
        });
      }

      // 6. （可选）为某些“极其棘手”的网站（如 AI Studio）提供一个“最终手段”
      //    强制等待一段时间，确保所有东西（比如滚动条按钮）都渲染完毕。
      if (config.initDelay) {
        await new Promise(resolve => setTimeout(resolve, config.initDelay));
      }

      // 7. 执行首次扫描
      softUpdate();

      // 8. 启动“侦察兵”，开始监视后续变化
      startContentObserver();
    } else {
      // 彻底失败：5秒后还是没找到容器，停止加载，显示空状态
      isLoading.value = false;
      console.warn("Outline Generator: Observe target not found after URL change.");
    }
  };

  // --- Vue 生命周期钩子 ---

  onMounted(() => {
    // 1. 组件挂载时，执行首次初始化
    init();

    // 2. 【SPA 路由切换的“终极”监听方案】
    //    使用现代浏览器的 `Navigation API` 来监听“软导航”（即 SPA 内部的页面跳转）。
    if ('navigation' in window) {
      const navigation = (window as Window & { navigation?: NavigationApi }).navigation;
      if (!navigation) {
        return;
      }

      // `navigatesuccess` 事件在 SPA 路由成功切换后触发
      navigationSuccessHandler = () => {
        // 给 SPA 框架一点时间（200ms）来销毁旧 DOM、创建新 DOM
        setTimeout(() => {
          // 确认 URL 真的变了（防止误触）
          if (window.location.href !== lastUrl) {
            console.log('Outline: URL changed, re-initializing...');
            lastUrl = window.location.href;
            init(); // 触发“重启程序”
          }
        }, 200);
      };
      navigation.addEventListener('navigatesuccess', navigationSuccessHandler);
    } else {
      // 如果浏览器太老（不太可能），此功能将在 SPA 切换时失效
      console.warn('Navigation API not supported. SPA navigation may not trigger outline updates.');
    }
  });

  // 组件卸载时，清理所有侦察兵和计时器
  onUnmounted(() => {
    stopObservers();
    if (emptyStateTimeout) clearTimeout(emptyStateTimeout);
    const navigation = (window as Window & { navigation?: NavigationApi }).navigation;
    if (navigation && navigationSuccessHandler) {
      navigation.removeEventListener('navigatesuccess', navigationSuccessHandler);
      navigationSuccessHandler = null;
    }
  });

  // =================================================================================
  // 滚动自动高亮逻辑
  // =================================================================================

  /**
   * 辅助函数：获取真正的滚动容器
   *
   * @why 因为 Kimi, OpenRouter 这类网站会“劫持”滚动，
   * 它们使用自定义的 `<div class="...scroll-wrapper...">` 来滚动，
   * 而不是标准的 `window`。
   * `config.scrollContainer` 让我们能适配这种情况。
   */
  const getScrollContainer = (): HTMLElement | Window => {
    if (config.scrollContainer === window) return window;
    if (typeof config.scrollContainer === 'string') {
      const el = document.querySelector<HTMLElement>(config.scrollContainer);
      // 如果找到了配置的滚动容器，就用它
      if (el) return el;
    }
    // 兜底方案：使用 `targetRef`（聊天容器），或 `document`，或 `window`
    return targetRef.value || document.documentElement || window;
  }

  // 创建一个 Ref 来存储滚动容器
  const scrollContainerRef = ref<HTMLElement | Window>(window);
  onMounted(() => {
    // 挂载后，立即查找并设置滚动容器
    scrollContainerRef.value = getScrollContainer();
  });

  // 使用 vueuse 的 `useScroll` 来高性能地监听滚动事件
  const { y: scrollY } = useScroll(scrollContainerRef as Ref<HTMLElement | Window>, {
    throttle: 150 // 节流：每 150ms 最多触发一次
  });

  /**
   * 核心算法：更新高亮条目
   *
   * 在所有大纲条目中，找到那个在视口中“占比最大”的条目。
   */
  const updateHighlight = useDebounceFn(() => {
    // 如果 `targetRef` 还没准备好，或已从 DOM 移除，则不计算
    if (!targetRef.value || !document.body.contains(targetRef.value)) return;

    const container = scrollContainerRef.value;
    const isWindow = container === window;

    // 获取视口（滚动容器）的高度
    const containerHeight = isWindow ? window.innerHeight : (container as HTMLElement).clientHeight;

    if (!containerHeight) return; // 容器高度为 0，无法计算

    let mostVisibleIndex = -1;
    let maxVisibility = 0; // 存储最大的“可见比例”

    items.value.forEach((item, index) => {
      const el = item.element; // 获取条目对应的 DOM 元素
      if (!el) return;

      // getBoundingClientRect() 是获取元素位置的“神器”
      const rect = el.getBoundingClientRect();

      // 1. 快速排除：如果元素完全在视口上方 (rect.bottom < 0) 或
      //    完全在视口下方 (rect.top > containerHeight)，则它不可见，跳过。
      if (rect.bottom < 0 || rect.top > containerHeight) return;

      // 2. 计算可见高度：
      //    - 可见的顶部 = max(元素顶部, 0)
      //    - 可见的底部 = min(元素底部, 视口高度)
      const top = Math.max(rect.top, 0);
      const bottom = Math.min(rect.bottom, containerHeight);
      const visibleHeight = bottom - top;

      // 3. 计算可见比例
      if (visibleHeight > 0) {
        // 可见比例 = 可见高度 / 元素总高度
        const visibility = visibleHeight / rect.height;

        // 4. 找出“赢家”：
        //    - 必须比当前的“赢家”可见比例更高
        //    - 且可见比例必须超过 30%（避免一个元素刚露出 1 像素就高亮）
        if (visibility > maxVisibility && visibility > 0.3) {
          maxVisibility = visibility;
          mostVisibleIndex = index;
        }
      }
    });

    // 如果找到了一个“赢家”，就更新高亮索引
    if (mostVisibleIndex !== -1) {
      highlightedIndex.value = mostVisibleIndex;
    }
  }, 50); // 防抖 50ms，提供平滑的响应

  // --- 侦听器 (Watchers) ---

  // 1. 当 `scrollY`（滚动位置）变化时，触发高亮计算
  watch(scrollY, updateHighlight);

  // 2. 当 `items` 列表本身发生变化时（例如 `scanDOM` 重新运行时），
  //    也立即触发一次高亮计算
  watch(items, updateHighlight, { deep: true, immediate: true });

  // --- 最终暴露 ---
  return {

    items,

    highlightedIndex,

    updateItems,

    isLoading,

  }

}
