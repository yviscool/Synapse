import { computed, ref, watch, type ComputedRef, type InjectionKey } from 'vue'
import { usePreferredDark } from '@vueuse/core'

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
  const preferredDark = usePreferredDark()

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themePreference.value === 'dark') {
      return 'dark'
    }
    if (themePreference.value === 'light') {
      return 'light'
    }
    return preferredDark.value ? 'dark' : 'light'
  })

  const isDark = computed(() => resolvedTheme.value === 'dark')

  function applyThemePreference(preference: OptionsThemePreference) {
    themePreference.value = normalizeThemePreference(preference)
  }

  async function refreshThemeFromSettings() {
    const settings = await getSettings()
    applyThemePreference(normalizeThemePreference(settings.theme as RawThemePreference))
  }

  async function initTheme() {
    await refreshThemeFromSettings()
  }

  watch(resolvedTheme, (theme) => {
    applyThemeToDocument(theme)
  }, { immediate: true })

  return {
    themePreference,
    resolvedTheme,
    isDark,
    applyThemePreference,
    initTheme,
    refreshThemeFromSettings,
  }
}
