import { createI18n } from "vue-i18n";
import enCommon from "./locales/en/common";
import enMenu from "./locales/en/menu";
import enSettings from "./locales/en/settings";
import enPrompts from "./locales/en/prompts";
import enCategories from "./locales/en/categories";
import enPopup from "./locales/en/popup";
import enContent from "./locales/en/content";
import enTags from "./locales/en/tags";
import enTools from "./locales/en/tools";
import enChat from "./locales/en/chat";
import zhCommon from "./locales/zh-CN/common";
import zhMenu from "./locales/zh-CN/menu";
import zhSettings from "./locales/zh-CN/settings";
import zhPrompts from "./locales/zh-CN/prompts";
import zhCategories from "./locales/zh-CN/categories";
import zhPopup from "./locales/zh-CN/popup";
import zhContent from "./locales/zh-CN/content";
import zhTags from "./locales/zh-CN/tags";
import zhTools from "./locales/zh-CN/tools";
import zhChat from "./locales/zh-CN/chat";
import jaCommon from "./locales/ja-JP/common";
import jaMenu from "./locales/ja-JP/menu";
import jaSettings from "./locales/ja-JP/settings";
import jaPrompts from "./locales/ja-JP/prompts";
import jaCategories from "./locales/ja-JP/categories";
import jaPopup from "./locales/ja-JP/popup";
import jaContent from "./locales/ja-JP/content";
import jaTags from "./locales/ja-JP/tags";
import jaTools from "./locales/ja-JP/tools";
import jaChat from "./locales/ja-JP/chat";
import ruCommon from "./locales/ru-RU/common";
import ruMenu from "./locales/ru-RU/menu";
import ruSettings from "./locales/ru-RU/settings";
import ruPrompts from "./locales/ru-RU/prompts";
import ruCategories from "./locales/ru-RU/categories";
import ruPopup from "./locales/ru-RU/popup";
import ruContent from "./locales/ru-RU/content";
import ruTags from "./locales/ru-RU/tags";
import ruTools from "./locales/ru-RU/tools";
import ruChat from "./locales/ru-RU/chat";
import { resolveSystemLocale } from "./utils/locale";

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
    tags: enTags,
    tools: enTools,
    chat: enChat,
  },
  "zh-CN": {
    common: zhCommon,
    menu: zhMenu,
    settings: zhSettings,
    prompts: zhPrompts,
    categories: zhCategories,
    popup: zhPopup,
    content: zhContent,
    tags: zhTags,
    tools: zhTools,
    chat: zhChat,
  },
  "ja-JP": {
    common: jaCommon,
    menu: jaMenu,
    settings: jaSettings,
    prompts: jaPrompts,
    categories: jaCategories,
    popup: jaPopup,
    content: jaContent,
    tags: jaTags,
    tools: jaTools,
    chat: jaChat,
  },
  "ru-RU": {
    common: ruCommon,
    menu: ruMenu,
    settings: ruSettings,
    prompts: ruPrompts,
    categories: ruCategories,
    popup: ruPopup,
    content: ruContent,
    tags: ruTags,
    tools: ruTools,
    chat: ruChat,
  },
};

const defaultLocale = resolveSystemLocale();

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: defaultLocale,
  fallbackLocale: "en",
  messages,
});

export default i18n;
