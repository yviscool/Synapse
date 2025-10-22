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
   * 这是“终极方案”的关键所在。
   * @returns {'dark' | 'light' | null} 返回检测到的主题，如果未检测到则返回 null。
   */
  function detectHostPageTheme() {
    const html = document.documentElement;
    const body = document.body;

    // 关键词列表，可以根据需要扩展
    const darkKeywords = ['dark', 'night', 'dim'];
    const lightKeywords = ['light', 'day', 'white'];

    // 将 <html> 和 <body> 的 class 和所有 data-* 属性拼接成一个长字符串，便于搜索
    // 这覆盖了 class="dark", data-theme="dark" 等绝大多数情况
    let attributesString = `${html.className} ${body.className}`;
    
    // 遍历所有属性，寻找主题相关的线索
    const elementsToInspect = [html, body];
    for (const element of elementsToInspect) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        // 我们关心属性名和属性值中包含关键词的情况
        // 例如：<html yb-theme-mode="dark">
        attributesString += ` ${attr.name}=${attr.value}`;
      }
    }

    attributesString = attributesString.toLowerCase();

    // 优先判断页面是否明确为浅色模式
    // 这样做可以避免一些误判，例如 class="not-dark"
    if (lightKeywords.some(keyword => attributesString.includes(keyword))) {
      return 'light';
    }

    // 然后判断页面是否为深色模式
    if (darkKeywords.some(keyword => attributesString.includes(keyword))) {
      return 'dark';
    }

    // 如果在页面上找不到任何明确的线索，返回 null
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
