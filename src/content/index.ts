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

  // 4. Inject CSS into the shadow root.
  const styleEl = document.createElement('link')
  styleEl.setAttribute('rel', 'stylesheet')
  styleEl.setAttribute('href', chrome.runtime.getURL('content.css'))
  shadowRoot.appendChild(styleEl)

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

  // --- 初始化和监听 ---

  // 1. 首次加载时立即同步一次主题
  // 使用 requestAnimationFrame 确保在 body 元素可用后执行
  requestAnimationFrame(syncTheme);

  // 2. 监听系统颜色方案的变化 (作为回退方案)
  darkModeMediaQuery.addEventListener('change', syncTheme);

  // 3. 使用 MutationObserver 监听宿主页面 <html> 和 <body> 的属性变化
  // 这是实现对网站自身主题切换进行响应的关键
  const observer = new MutationObserver((mutations) => {
    // 任何属性变化都可能意味着主题切换，所以我们重新同步
    syncTheme();
  });

  // 等待 body 加载完毕再开始监听，防止 body 为 null
  const observerConfig = { attributes: true }; // 我们只关心属性（包括class, style, data-* 等）的变化

  if (document.body) {
    observer.observe(document.documentElement, observerConfig);
    observer.observe(document.body, observerConfig);
  } else {
    // 如果脚本在 DOM ready 之前运行，则等待
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, observerConfig);
      observer.observe(document.body, observerConfig);
      // DOM ready 后也需要再同步一次
      syncTheme();
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
