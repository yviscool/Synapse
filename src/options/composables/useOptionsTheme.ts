import { computed, onBeforeUnmount, ref, type ComputedRef, type InjectionKey } from 'vue'

import { getSettings } from '@/stores/db'

type RawThemePreference = 'light' | 'dark' | 'auto' | 'system' | undefined
export type OptionsThemePreference = 'light' | 'dark' | 'auto'
export type ResolvedTheme = 'light' | 'dark'

export interface OptionsThemeContext {
  isDark: ComputedRef<boolean>
  resolvedTheme: ComputedRef<ResolvedTheme>
  applyThemePreference: (preference: OptionsThemePreference) => void
}

export const optionsThemeKey: InjectionKey<OptionsThemeContext> = Symbol('options-theme')

function normalizeThemePreference(raw: RawThemePreference): OptionsThemePreference {
  if (raw === 'light' || raw === 'dark' || raw === 'auto') {
    return raw
  }
  if (raw === 'system') {
    return 'auto'
  }
  return 'auto'
}

function applyThemeToDocument(theme: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
}

export function useOptionsTheme() {
  const themePreference = ref<OptionsThemePreference>('auto')
  const mediaDark = ref(false)

  let mediaQuery: MediaQueryList | null = null
  let removeMediaListener: (() => void) | null = null

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themePreference.value === 'dark') {
      return 'dark'
    }
    if (themePreference.value === 'light') {
      return 'light'
    }
    return mediaDark.value ? 'dark' : 'light'
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')

  const updateMediaTheme = () => {
    if (!mediaQuery) {
      mediaDark.value = false
      return
    }
    mediaDark.value = mediaQuery.matches
  }

  const setupMediaListener = () => {
    if (mediaQuery || typeof window === 'undefined') {
      return
    }

    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    updateMediaTheme()

    const handleMediaChange = (event: MediaQueryListEvent) => {
      mediaDark.value = event.matches
      if (themePreference.value === 'auto') {
        applyThemeToDocument(event.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)
    removeMediaListener = () => {
      mediaQuery?.removeEventListener('change', handleMediaChange)
    }
  }

  const disposeMediaListener = () => {
    if (removeMediaListener) {
      removeMediaListener()
      removeMediaListener = null
    }
    mediaQuery = null
  }

  function applyThemePreference(preference: OptionsThemePreference) {
    themePreference.value = normalizeThemePreference(preference)
    updateMediaTheme()
    applyThemeToDocument(resolvedTheme.value)
  }

  async function refreshThemeFromSettings() {
    const settings = await getSettings()
    applyThemePreference(normalizeThemePreference(settings.theme as RawThemePreference))
  }

  async function initTheme() {
    setupMediaListener()
    await refreshThemeFromSettings()
  }

  onBeforeUnmount(() => {
    disposeMediaListener()
  })

  return {
    themePreference,
    resolvedTheme,
    isDark,
    applyThemePreference,
    initTheme,
    refreshThemeFromSettings,
  }
}
