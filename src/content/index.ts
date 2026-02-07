import { createApp } from 'vue'
import App from './App.vue'
import i18n from '@/i18n'
import "@/styles"

(function () {
  const id = 'prompt-master-root-host'
  if (document.getElementById(id)) return

  // 1. Create a host element that will contain our shadow root.
  const host = document.createElement('div')
  host.id = id
  document.documentElement.appendChild(host)

  // 2. Create a shadow root.
  const shadowRoot = host.attachShadow({ mode: 'open' })

  // 3. Create the element to mount the Vue app on, inside the shadow root.
  const appContainer = document.createElement('div')

  // 4. Inject styles into shadow root.
  //    Newer content builds may inline styles into JS (style tags in document.head),
  //    while older builds emit dist/content.css.
  const STYLE_MARKERS = [
    '.z-2147483646',
    '.z-2147483647',
    '.milkdown .ProseMirror',
    '--crepe-color-background',
    '$vite$:',
    '.prompt-selector-panel',
    '.composer-panel',
  ]
  let hasInjectedStyle = false
  let hasFallbackCssLink = false
  let styleObserver: MutationObserver | null = null
  let pendingStyleScan = 0

  const isOwnedStyle = (styleNode: HTMLStyleElement) => {
    if ((styleNode as HTMLElement).dataset.synapseStyle === '1') return true
    const cssText = styleNode.textContent || ''
    return STYLE_MARKERS.some((marker) => cssText.includes(marker))
  }

  const stopStyleObserver = () => {
    if (styleObserver) {
      styleObserver.disconnect()
      styleObserver = null
    }
  }

  const moveStyleToShadow = (styleNode: HTMLStyleElement) => {
    if (!isOwnedStyle(styleNode)) return
    if (styleNode.parentNode === shadowRoot) return
    ;(styleNode as HTMLElement).dataset.synapseStyle = '1'
    shadowRoot.appendChild(styleNode)
    hasInjectedStyle = true
  }

  const moveExistingStyles = () => {
    const headStyles = Array.from(document.head.querySelectorAll('style'))
    headStyles.forEach((styleNode) => moveStyleToShadow(styleNode))
  }

  const attachFallbackCssIfNeeded = () => {
    if (hasInjectedStyle || hasFallbackCssLink) return
    const fallbackCssUrl = chrome.runtime.getURL('content.css')
    fetch(fallbackCssUrl)
      .then((res) => {
        if (!res.ok || hasInjectedStyle || hasFallbackCssLink) return
        const styleEl = document.createElement('link')
        styleEl.setAttribute('rel', 'stylesheet')
        styleEl.setAttribute('href', fallbackCssUrl)
        shadowRoot.appendChild(styleEl)
        hasFallbackCssLink = true
      })
      .catch(() => {
        // ignore
      })
  }

  moveExistingStyles()

  const scheduleStyleScan = () => {
    if (pendingStyleScan) return
    pendingStyleScan = window.setTimeout(() => {
      pendingStyleScan = 0
      moveExistingStyles()
    }, 0)
  }

  styleObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLStyleElement) {
          moveStyleToShadow(node)
        }
      })
    })
    // 某些运行时会先插入空 style，再异步填充 textContent。
    scheduleStyleScan()
  })
  styleObserver.observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true,
  })

  // 给运行时样式注入留一点时间窗口，再回退到静态 CSS 文件。
  setTimeout(() => {
    moveExistingStyles()
    attachFallbackCssIfNeeded()
  }, 200)

  setTimeout(() => {
    moveExistingStyles()
    attachFallbackCssIfNeeded()
  }, 2500)

  window.addEventListener('beforeunload', stopStyleObserver, { once: true })

  shadowRoot.appendChild(appContainer)

  // =================================================================
  // Robust Theme Logic (健壮的主题逻辑)
  // =================================================================

  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  /**
   * 更新插件UI的主题
   * @param {boolean} isDark 是否为深色模式
   */
  function applyTheme(isDark) {
    if (isDark) {
      appContainer.classList.add('dark');
    } else {
      appContainer.classList.remove('dark');
    }
  }

  /**
    * 核心检测函数：通过检查宿主页面的 <html> 和 <body> 元素来判断当前主题。
    * @returns {'dark' | 'light' | null} 返回检测到的主题，如果未检测到则返回 null。
    */
  function detectHostPageTheme() {
    const html = document.documentElement;
    const body = document.body;

    // 关键词列表
    const darkKeywords = ['dark', 'night', 'dim'];
    const lightKeywords = ['light', 'day', 'white'];
    const systemKeywords = ['system', 'auto']; // 新增：用于检测“跟随系统”

    // 1. 我们只收集“有意义”的属性值
    // 首先包含 class
    let attributeValues = [html.className, body.className];

    const elementsToInspect = [html, body];
    for (const element of elementsToInspect) {
      if (!element) continue; // 确保元素存在
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const attrName = attr.name.toLowerCase();

        // 【关键修复】跳过 class（已添加）和 style（Bug 来源）
        if (attrName === 'class' || attrName === 'style') {
          continue;
        }

        // 【关键优化】只检查与主题相关的属性
        // 我们只关心属性名包含 'theme' 或 'mode' 的属性
        if (attrName.includes('theme') || attrName.includes('mode')) {
          attributeValues.push(attr.value);
        }
      }
    }

    // 2. 将所有相关值合并为一个搜索字符串
    const searchString = attributeValues.join(' ').toLowerCase();

    // 如果没有找到任何相关的类或属性，则返回 null
    if (!searchString.trim()) {
      return null;
    }

    // 3. 重新排序检测逻辑

    // 【优先级 1】: 检查是否明确设置了“跟随系统”
    // 这将正确处理 yb-theme-mode="system"
    if (systemKeywords.some(keyword => searchString.includes(keyword))) {
      return null; // 返回 null，syncTheme 将回退到系统媒体查询
    }

    // 【优先级 2】: 检查是否为浅色模式
    if (lightKeywords.some(keyword => searchString.includes(keyword))) {
      return 'light';
    }

    // 【优先级 3】: 检查是否为深色模式
    if (darkKeywords.some(keyword => searchString.includes(keyword))) {
      return 'dark';
    }

    // 4. 如果在相关属性中未找到任何关键词，返回 null
    return null;
  }

  /**
   * 同步主题：结合页面检测和系统偏好，决定最终主题
   */
  function syncTheme() {
    // 1. 优先使用从宿主页面检测到的主题
    const hostTheme = detectHostPageTheme();

    if (hostTheme === 'dark') {
      applyTheme(true);
      return; // 找到明确设置，任务结束
    }

    if (hostTheme === 'light') {
      applyTheme(false);
      return; // 找到明确设置，任务结束
    }

    // 2. 如果页面没有明确主题，则回退到系统偏好设置
    applyTheme(darkModeMediaQuery.matches);
  }

  // 使用 requestAnimationFrame 合并同一帧内的多次主题同步请求，避免高频属性变化导致卡顿
  let pendingThemeSyncRaf = 0;
  function scheduleThemeSync() {
    if (pendingThemeSyncRaf) return;
    pendingThemeSyncRaf = requestAnimationFrame(() => {
      pendingThemeSyncRaf = 0;
      syncTheme();
    });
  }

  // 仅处理与主题高度相关的属性变化，跳过滚动期间频繁变更的无关属性（尤其是 style）
  const THEME_ATTR_WHITELIST = new Set([
    'class',
    'data-theme',
    'theme',
    'data-mode',
    'mode',
    'color-scheme',
    'data-color-scheme',
    'data-color-mode',
    'yb-theme-mode',
  ]);
  function isThemeRelatedAttribute(attributeName: string | null): boolean {
    if (!attributeName) return false;
    const name = attributeName.toLowerCase();
    if (THEME_ATTR_WHITELIST.has(name)) return true;
    return name.includes('theme') || name.includes('mode');
  }

  // --- 初始化和监听 ---

  // 1. 首次加载时立即同步一次主题
  // 使用 requestAnimationFrame 确保在 body 元素可用后执行
  scheduleThemeSync();

  // 2. 监听系统颜色方案的变化 (作为回退方案)
  darkModeMediaQuery.addEventListener('change', scheduleThemeSync);

  // 3. 使用 MutationObserver 监听宿主页面 <html> 和 <body> 的属性变化
  // 这是实现对网站自身主题切换进行响应的关键
  const observer = new MutationObserver((mutations) => {
    const hasThemeSignal = mutations.some((mutation) => isThemeRelatedAttribute(mutation.attributeName));
    if (!hasThemeSignal) return;
    scheduleThemeSync();
  });

  // 等待 body 加载完毕再开始监听，防止 body 为 null
  const observerConfig = { attributes: true }; // 监听属性变化，回调内部会过滤无关属性

  if (document.body) {
    observer.observe(document.documentElement, observerConfig);
    observer.observe(document.body, observerConfig);
  } else {
    // 如果脚本在 DOM ready 之前运行，则等待
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, observerConfig);
      observer.observe(document.body, observerConfig);
      // DOM ready 后也需要再同步一次
      scheduleThemeSync();
    });
  }

  // =================================================================
  // End of Theme Logic
  // =================================================================

  // 5. Mount the Vue app onto the container inside the shadow root.
  const app = createApp(App)
  app.use(i18n)
  app.mount(appContainer)
})()
