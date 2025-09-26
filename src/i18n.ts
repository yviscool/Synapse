import { createI18n } from 'vue-i18n'
import enCommon from './locales/en/common.json'
import enMenu from './locales/en/menu.json'
import enSettings from './locales/en/settings.json'
import enPrompts from './locales/en/prompts.json'
import enCategories from './locales/en/categories.json'
import enPopup from './locales/en/popup.json'
import enContent from './locales/en/content.json'
import zhCommon from './locales/zh-CN/common.json'
import zhMenu from './locales/zh-CN/menu.json'
import zhSettings from './locales/zh-CN/settings.json'
import zhPrompts from './locales/zh-CN/prompts.json'
import zhCategories from './locales/zh-CN/categories.json'
import zhPopup from './locales/zh-CN/popup.json'
import zhContent from './locales/zh-CN/content.json'

// Combine messages
const messages = {
  en: {
    common: enCommon,
    menu: enMenu,
    settings: enSettings,
    prompts: enPrompts,
    categories: enCategories,
    popup: enPopup,
    content: enContent,
  },
  'zh-CN': {
    common: zhCommon,
    menu: zhMenu,
    settings: zhSettings,
    prompts: zhPrompts,
    categories: zhCategories,
    popup: zhPopup,
    content: zhContent,
  },
}

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: 'zh-CN', // Default locale
  fallbackLocale: 'en',
  messages,
})

export default i18n