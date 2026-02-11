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
};

const i18n = createI18n({
  legacy: false, // Use Composition API
  locale: "zh-CN", // Default locale
  fallbackLocale: "en",
  messages,
});

export default i18n;
