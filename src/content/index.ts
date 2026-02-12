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

  // 4. Sync content-script styles into shadow root.
  //    The content build emits inline <style> into document.head, so we mirror owned styles into shadow root.
  const STYLE_MARKERS = [
    '.z-2147483646',
    '.z-2147483647',
    '.prompt-selector-panel',
    '.composer-panel',
    '.milkdown-host',
    '--crepe-color-background',
  ]

  let styleObserver: MutationObserver | null = null

  function isOwnedStyle(styleNode: HTMLStyleElement): boolean {
    if ((styleNode as HTMLElement).dataset.synapseShadowStyle === '1') return true
    const cssText = styleNode.textContent || ''
    return STYLE_MARKERS.some((marker) => cssText.includes(marker))
  }

  function moveOwnedStyleToShadow(styleNode: HTMLStyleElement) {
    if (!isOwnedStyle(styleNode)) return
    if (styleNode.parentNode === shadowRoot) return
    ;(styleNode as HTMLElement).dataset.synapseShadowStyle = '1'
    shadowRoot.appendChild(styleNode)
  }

  function syncOwnedStylesFromHead() {
    const head = document.head
    if (!head) return
    const styleNodes = Array.from(head.querySelectorAll('style'))
    styleNodes.forEach((styleNode) => moveOwnedStyleToShadow(styleNode))
  }

  function enableRuntimeStyleSync() {
    syncOwnedStylesFromHead()
    const head = document.head
    if (!head) return
    styleObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLStyleElement) {
            moveOwnedStyleToShadow(node)
          }
        })
      }
    })

    styleObserver.observe(head, {
      childList: true,
      subtree: true,
    })
  }

  enableRuntimeStyleSync()

  shadowRoot.appendChild(appContainer)

  // =================================================================
  // Robust Theme Logic (健壮的主题逻辑)
  // =================================================================

  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const THEME_DEBUG = (() => {
    try {
      return window.localStorage.getItem('__synapse_theme_debug') === '1'
    } catch {
      return false
    }
  })()
  const THEME_LOG_PREFIX = '[SynapseTheme]'
  const THEME_LOG_LIMIT = 300
  let themeLogCount = 0
  let lastAppliedTheme: 'dark' | 'light' | null = null
  let lastDecisionReason = ''
  let pendingThemeReason = 'init'

  function logTheme(event: string, payload: Record<string, unknown>) {
    if (!THEME_DEBUG) return
    if (themeLogCount >= THEME_LOG_LIMIT) return
    themeLogCount += 1
    console.info(THEME_LOG_PREFIX, {
      event,
      host: window.location.hostname,
      href: window.location.href,
      ...payload,
    })
  }

  /**
   * 更新插件UI的主题
   * @param {boolean} isDark 是否为深色模式
   */
  function applyTheme(isDark: boolean) {
    const mode = isDark ? 'dark' : 'light'
    if (isDark) {
      appContainer.classList.add('dark')
    } else {
      appContainer.classList.remove('dark')
    }
    appContainer.setAttribute('data-theme', mode)
    host.setAttribute('data-theme', mode)
  }

  function tokenizeThemeText(text: string): string[] {
    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
  }

  function hasKeyword(tokens: Set<string>, keywords: string[]): boolean {
    return keywords.some((keyword) => tokens.has(keyword))
  }

  function inferThemeFromColorSchemeValue(value: string | null | undefined): 'dark' | 'light' | null {
    if (!value) return null
    const normalized = value.toLowerCase()
    const hasDark = normalized.includes('dark')
    const hasLight = normalized.includes('light')
    if (hasDark && !hasLight) return 'dark'
    if (hasLight && !hasDark) return 'light'
    return null
  }

  function parseRgb(color: string): [number, number, number] | null {
    const normalized = color.trim().toLowerCase()
    const match = normalized.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (!match) return null
    return [Number(match[1]), Number(match[2]), Number(match[3])]
  }

  function inferThemeFromBackgroundColor(el: Element | null): 'dark' | 'light' | null {
    if (!el) return null
    const rgb = parseRgb(window.getComputedStyle(el).backgroundColor)
    if (!rgb) return null
    const [r, g, b] = rgb
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (luminance <= 92) return 'dark'
    if (luminance >= 168) return 'light'
    return null
  }

  type ThemeComputedSignals = {
    htmlColorScheme: string
    bodyColorScheme: string
    htmlBackground: string
    bodyBackground: string
  }

  const EMPTY_THEME_SIGNALS: ThemeComputedSignals = {
    htmlColorScheme: '',
    bodyColorScheme: '',
    htmlBackground: '',
    bodyBackground: '',
  }

  function readThemeComputedSignals(html: HTMLElement, body: HTMLElement | null): ThemeComputedSignals {
    const htmlStyle = window.getComputedStyle(html)
    const bodyStyle = body ? window.getComputedStyle(body) : null
    return {
      htmlColorScheme: htmlStyle.colorScheme || '',
      bodyColorScheme: bodyStyle?.colorScheme || '',
      htmlBackground: htmlStyle.backgroundColor || '',
      bodyBackground: bodyStyle?.backgroundColor || '',
    }
  }

  type ThemeDetectResult = {
    theme: 'dark' | 'light' | null
    reason: string
    classValues: string[]
    themeAttrValues: string[]
    attrTokens: string[]
    classTokens: string[]
    htmlColorScheme: string
    bodyColorScheme: string
    htmlBackground: string
    bodyBackground: string
  }

  /**
   * 核心检测函数：通过检查宿主页面的 <html> 和 <body> 元素来判断当前主题。
   * @returns {'dark' | 'light' | null}
   */
  function detectHostPageTheme(): ThemeDetectResult {
    const html = document.documentElement
    const body = document.body

    // 关键词列表
    const darkKeywords = ['dark', 'night', 'dim']
    const lightKeywords = ['light', 'day', 'white']
    const systemKeywords = ['system', 'auto']

    // 1. 收集“有意义”的属性值
    const classValues = [html.className, body?.className || '']
    const themeAttrValues: string[] = []

    const elementsToInspect = [html, body]
    for (const element of elementsToInspect) {
      if (!element) continue
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i]
        const attrName = attr.name.toLowerCase()

        // 跳过 class（已收集）和 style（噪声很大）
        if (attrName === 'class' || attrName === 'style') {
          continue
        }

        // 仅检查与主题相关的属性
        if (attrName.includes('theme') || attrName.includes('mode') || attrName.includes('scheme')) {
          themeAttrValues.push(attr.value)
        }
      }
    }

    const attrTokens = new Set(tokenizeThemeText(themeAttrValues.join(' ')))
    const classTokens = new Set(tokenizeThemeText(classValues.join(' ')))
    const attrTokenList = Array.from(attrTokens)
    const classTokenList = Array.from(classTokens)

    function createResult(
      theme: 'dark' | 'light' | null,
      reason: string,
      signals: ThemeComputedSignals = EMPTY_THEME_SIGNALS,
    ): ThemeDetectResult {
      return {
        theme,
        reason,
        classValues,
        themeAttrValues,
        attrTokens: attrTokenList,
        classTokens: classTokenList,
        htmlColorScheme: signals.htmlColorScheme,
        bodyColorScheme: signals.bodyColorScheme,
        htmlBackground: signals.htmlBackground,
        bodyBackground: signals.bodyBackground,
      }
    }

    // 3. 检测优先级
    const attrHasSystem = hasKeyword(attrTokens, systemKeywords)
    const attrHasDark = hasKeyword(attrTokens, darkKeywords)
    const attrHasLight = hasKeyword(attrTokens, lightKeywords)

    if (attrHasSystem && !attrHasDark && !attrHasLight) {
      return createResult(null, 'attr-system')
    }

    if (attrHasDark && !attrHasLight) {
      return createResult('dark', 'attr-dark')
    }

    if (attrHasLight && !attrHasDark) {
      return createResult('light', 'attr-light')
    }

    const classHasDark = hasKeyword(classTokens, darkKeywords)
    const classHasLight = hasKeyword(classTokens, lightKeywords)

    if (classHasDark && !classHasLight) {
      return createResult('dark', 'class-dark')
    }

    if (classHasLight && !classHasDark) {
      return createResult('light', 'class-light')
    }

    // 如果亮暗信号同时存在，优先 dark，避免站点暗色下被“highlight/lightbox”误伤。
    if (attrHasDark || classHasDark) {
      return createResult('dark', 'mixed-prefer-dark')
    }

    const computedSignals = readThemeComputedSignals(html, body)
    const colorSchemeTheme =
      inferThemeFromColorSchemeValue(computedSignals.htmlColorScheme) ||
      inferThemeFromColorSchemeValue(computedSignals.bodyColorScheme)
    if (colorSchemeTheme) {
      return createResult(colorSchemeTheme, 'computed-color-scheme', computedSignals)
    }

    const backgroundTheme =
      inferThemeFromBackgroundColor(html) ||
      inferThemeFromBackgroundColor(body)
    if (backgroundTheme) {
      return createResult(backgroundTheme, 'computed-background', computedSignals)
    }

    return createResult(null, 'fallback-system', computedSignals)
  }

  /**
   * 同步主题：结合页面检测和系统偏好，决定最终主题
   */
  function syncTheme() {
    const detectResult = detectHostPageTheme()
    const hostTheme = detectResult.theme
    const nextTheme = hostTheme === 'dark' ? 'dark' : hostTheme === 'light' ? 'light' : (darkModeMediaQuery.matches ? 'dark' : 'light')
    applyTheme(nextTheme === 'dark')

    const changed = lastAppliedTheme !== nextTheme || lastDecisionReason !== detectResult.reason
    if (changed && THEME_DEBUG) {
      logTheme('sync', {
        trigger: pendingThemeReason,
        finalTheme: nextTheme,
        detectedTheme: hostTheme,
        reason: detectResult.reason,
        mediaDark: darkModeMediaQuery.matches,
        classValues: detectResult.classValues,
        themeAttrValues: detectResult.themeAttrValues,
        attrTokens: detectResult.attrTokens,
        classTokens: detectResult.classTokens,
        htmlColorScheme: detectResult.htmlColorScheme,
        bodyColorScheme: detectResult.bodyColorScheme,
        htmlBackground: detectResult.htmlBackground,
        bodyBackground: detectResult.bodyBackground,
      })
    }

    lastAppliedTheme = nextTheme
    lastDecisionReason = detectResult.reason
  }

  // 使用 requestAnimationFrame 合并同一帧内的多次主题同步请求，避免高频属性变化导致卡顿
  let pendingThemeSyncRaf = 0
  let themeObserver: MutationObserver | null = null
  let domReadyThemeHandler: (() => void) | null = null

  function scheduleThemeSync(reason = 'unknown') {
    pendingThemeReason = reason
    if (pendingThemeSyncRaf) return
    pendingThemeSyncRaf = requestAnimationFrame(() => {
      pendingThemeSyncRaf = 0
      syncTheme()
    })
  }

  // --- 初始化和监听 ---

  // 1. 首次加载时立即同步一次主题
  // 使用 requestAnimationFrame 确保在 body 元素可用后执行
  scheduleThemeSync('init')

  // 2. 监听系统颜色方案的变化 (作为回退方案)
  const handleMediaChange = () => scheduleThemeSync('media-change')
  const handleWindowFocus = () => scheduleThemeSync('window-focus')
  const handleVisibilityChange = () => scheduleThemeSync('visibility-change')

  darkModeMediaQuery.addEventListener('change', handleMediaChange)
  window.addEventListener('focus', handleWindowFocus, true)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 3. 使用 MutationObserver 监听宿主页面 <html> 和 <body> 的属性变化
  // 这是实现对网站自身主题切换进行响应的关键
  themeObserver = new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter((mutation) => {
      const attr = (mutation.attributeName || '').toLowerCase()
      if (!attr) return true
      if (attr === 'class') return true
      return attr.includes('theme') || attr.includes('mode') || attr.includes('scheme')
    })

    if (relevantMutations.length === 0) return

    const mutationSummary = relevantMutations
      .slice(0, 6)
      .map((mutation) => {
        const attr = mutation.attributeName || ''
        const target = mutation.target as Element
        return `${target.tagName.toLowerCase()}.${attr}`
      })
      .join(',')
    scheduleThemeSync(`mutation:${mutationSummary || 'attributes'}`)
  })

  // 等待 body 加载完毕再开始监听，防止 body 为 null
  const observerConfig = { attributes: true }

  if (document.body) {
    themeObserver.observe(document.documentElement, observerConfig)
    themeObserver.observe(document.body, observerConfig)
  } else {
    domReadyThemeHandler = () => {
      if (!themeObserver || !document.body) return
      themeObserver.observe(document.documentElement, observerConfig)
      themeObserver.observe(document.body, observerConfig)
      scheduleThemeSync('dom-content-loaded')
    }
    document.addEventListener('DOMContentLoaded', domReadyThemeHandler, { once: true })
  }

  function cleanupRuntimeResources() {
    if (styleObserver) {
      styleObserver.disconnect()
      styleObserver = null
    }
    if (themeObserver) {
      themeObserver.disconnect()
      themeObserver = null
    }
    if (domReadyThemeHandler) {
      document.removeEventListener('DOMContentLoaded', domReadyThemeHandler)
      domReadyThemeHandler = null
    }
    if (pendingThemeSyncRaf) {
      cancelAnimationFrame(pendingThemeSyncRaf)
      pendingThemeSyncRaf = 0
    }
    darkModeMediaQuery.removeEventListener('change', handleMediaChange)
    window.removeEventListener('focus', handleWindowFocus, true)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }

  window.addEventListener('beforeunload', cleanupRuntimeResources, { once: true })

  // =================================================================
  // End of Theme Logic
  // =================================================================

  // 5. Mount the Vue app onto the container inside the shadow root.
  const app = createApp(App)
  app.use(i18n)
  app.mount(appContainer)
})()
