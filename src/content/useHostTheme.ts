/**
 * 宿主页面主题检测与同步
 *
 * 手术记录：
 * 原实现包含 ~250 行内联在 index.ts IIFE 中的主题逻辑，含完整的 debug 日志系统
 * （logTheme、themeLogCount、THEME_LOG_LIMIT、lastDecisionReason 等）。
 * 删除 debug 系统原因：开发期调试工具不应留在生产代码中，需要时用 console.debug + 浏览器过滤即可。
 * 删除 ThemeDetectResult 诊断字段原因：classValues/attrTokens 等仅服务于 debug 日志。
 *
 * 检测优先级：
 * 1. html/body 属性中的 theme/mode/scheme 关键词
 * 2. html/body class 中的 dark/light 关键词
 * 3. computed color-scheme CSS 属性
 * 4. 背景色亮度推断
 * 5. 回退到系统 prefers-color-scheme
 */

import { useEventListener } from '@vueuse/core'

type ThemeMode = 'dark' | 'light'

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter(Boolean),
  )
}

const DARK_KEYWORDS = ['dark', 'night', 'dim']
const LIGHT_KEYWORDS = ['light', 'day', 'white']
const SYSTEM_KEYWORDS = ['system', 'auto']

function hasAny(tokens: Set<string>, keywords: string[]): boolean {
  return keywords.some((k) => tokens.has(k))
}

function inferFromColorScheme(value: string | null | undefined): ThemeMode | null {
  if (!value) return null
  const v = value.toLowerCase()
  const hasDark = v.includes('dark')
  const hasLight = v.includes('light')
  if (hasDark && !hasLight) return 'dark'
  if (hasLight && !hasDark) return 'light'
  return null
}

function inferFromThemeClassNames(classNameText: string): ThemeMode | null {
  const classes = classNameText
    .toLowerCase()
    .split(/\s+/g)
    .filter(Boolean)

  let hasDark = false
  let hasLight = false

  for (const cls of classes) {
    // 忽略 Tailwind 等变体类（如 dark:bg-black），避免误判。
    if (cls.includes(':')) continue

    if (cls === 'dark' || cls === 'night' || cls === 'dim') {
      hasDark = true
      continue
    }
    if (cls === 'light' || cls === 'day') {
      hasLight = true
      continue
    }

    // 仅将语义化主题类名视为信号（theme-dark / dark-theme / mode_light 等）。
    if (
      /(?:^|[-_])(theme|mode|scheme)(?:[-_])?(dark|light|night|day|dim)(?:$|[-_])/.test(cls)
      || /(?:^|[-_])(dark|light|night|day|dim)(?:[-_])?(theme|mode|scheme)(?:$|[-_])/.test(cls)
      || /(?:^|[-_])is[-_](dark|light)(?:$|[-_])/.test(cls)
    ) {
      if (/(dark|night|dim)/.test(cls)) hasDark = true
      if (/light|day/.test(cls)) hasLight = true
    }
  }

  if (hasDark && !hasLight) return 'dark'
  if (hasLight && !hasDark) return 'light'
  if (hasDark) return 'dark'
  return null
}

function inferFromBackground(el: Element | null): ThemeMode | null {
  if (!el) return null
  const color = window.getComputedStyle(el).backgroundColor.trim().toLowerCase()
  if (color === 'transparent') return null

  const nums = color.match(/[\d.]+/g)
  if (!nums || nums.length < 3) return null

  const [r, g, b, alphaRaw] = nums.map(Number)
  if ([r, g, b].some((n) => Number.isNaN(n))) return null
  if (typeof alphaRaw === 'number' && !Number.isNaN(alphaRaw) && alphaRaw === 0) return null

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (luminance <= 92) return 'dark'
  if (luminance >= 168) return 'light'
  return null
}

function detectHostTheme(): ThemeMode | null {
  const html = document.documentElement
  const body = document.body

  // 收集属性值（theme/mode/scheme 相关）
  const themeAttrValues: string[] = []
  for (const el of [html, body]) {
    if (!el) continue
    for (let i = 0; i < el.attributes.length; i++) {
      const name = el.attributes[i].name.toLowerCase()
      if (name === 'class' || name === 'style') continue
      if (name.includes('theme') || name.includes('mode') || name.includes('scheme')) {
        themeAttrValues.push(el.attributes[i].value)
      }
    }
  }

  const attrTokens = tokenize(themeAttrValues.join(' '))
  const classTheme = inferFromThemeClassNames([html.className, body?.className || ''].join(' '))

  // 属性中有 system/auto 且无明确 dark/light → 回退系统
  if (hasAny(attrTokens, SYSTEM_KEYWORDS) && !hasAny(attrTokens, DARK_KEYWORDS) && !hasAny(attrTokens, LIGHT_KEYWORDS)) {
    return null
  }

  // 属性优先
  if (hasAny(attrTokens, DARK_KEYWORDS) && !hasAny(attrTokens, LIGHT_KEYWORDS)) return 'dark'
  if (hasAny(attrTokens, LIGHT_KEYWORDS) && !hasAny(attrTokens, DARK_KEYWORDS)) return 'light'

  // class 次之
  if (classTheme === 'dark') return 'dark'
  if (classTheme === 'light') return 'light'

  // 混合信号优先 dark
  if (hasAny(attrTokens, DARK_KEYWORDS)) return 'dark'

  // computed color-scheme
  const htmlScheme = inferFromColorScheme(window.getComputedStyle(html).colorScheme)
  if (htmlScheme) return htmlScheme
  if (body) {
    const bodyScheme = inferFromColorScheme(window.getComputedStyle(body).colorScheme)
    if (bodyScheme) return bodyScheme
  }

  // 背景色亮度
  return inferFromBackground(body) || inferFromBackground(html)
}

/**
 * 初始化主题同步：检测宿主页面主题并持续监听变化
 * @returns cleanup 函数
 */
export function setupHostThemeSync(appContainer: HTMLElement, host: HTMLElement): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  let lastTheme: ThemeMode | null = null
  let rafId = 0
  let themeObserver: MutationObserver | null = null
  let stopDomReadyListener: (() => void) | null = null

  function applyTheme(isDark: boolean) {
    const mode: ThemeMode = isDark ? 'dark' : 'light'
    appContainer.classList.toggle('dark', isDark)
    appContainer.setAttribute('data-theme', mode)
    host.setAttribute('data-theme', mode)
  }

  function syncTheme() {
    const detected = detectHostTheme()
    const resolved: ThemeMode = detected ?? (mediaQuery.matches ? 'dark' : 'light')
    if (resolved !== lastTheme) {
      lastTheme = resolved
      applyTheme(resolved === 'dark')
    }
  }

  function scheduleSync() {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      syncTheme()
    })
  }

  // 初始同步
  scheduleSync()

  // 系统主题变化
  const onMediaChange = () => scheduleSync()
  const onFocus = () => scheduleSync()
  const onVisibility = () => scheduleSync()

  const stopMediaListener = useEventListener(mediaQuery, 'change', onMediaChange)
  const stopFocusListener = useEventListener(window, 'focus', onFocus, { capture: true })
  const stopVisibilityListener = useEventListener(document, 'visibilitychange', onVisibility)

  // 监听 html/body 属性变化
  const observerConfig = { attributes: true }
  themeObserver = new MutationObserver((mutations) => {
    const relevant = mutations.some((m) => {
      const attr = (m.attributeName || '').toLowerCase()
      return !attr || attr === 'class' || attr.includes('theme') || attr.includes('mode') || attr.includes('scheme')
    })
    if (relevant) scheduleSync()
  })

  if (document.body) {
    themeObserver.observe(document.documentElement, observerConfig)
    themeObserver.observe(document.body, observerConfig)
  } else {
    stopDomReadyListener = useEventListener(document, 'DOMContentLoaded', () => {
      if (!themeObserver || !document.body) return
      themeObserver.observe(document.documentElement, observerConfig)
      themeObserver.observe(document.body, observerConfig)
      scheduleSync()
    }, { once: true })
  }

  return () => {
    themeObserver?.disconnect()
    themeObserver = null
    if (rafId) cancelAnimationFrame(rafId)
    stopDomReadyListener?.()
    stopDomReadyListener = null
    stopMediaListener()
    stopFocusListener()
    stopVisibilityListener()
  }
}
