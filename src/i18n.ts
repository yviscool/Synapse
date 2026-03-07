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
import zhTWCommon from "./locales/zh-TW/common";
import zhTWMenu from "./locales/zh-TW/menu";
import zhTWSettings from "./locales/zh-TW/settings";
import zhTWPrompts from "./locales/zh-TW/prompts";
import zhTWCategories from "./locales/zh-TW/categories";
import zhTWPopup from "./locales/zh-TW/popup";
import zhTWContent from "./locales/zh-TW/content";
import zhTWTags from "./locales/zh-TW/tags";
import zhTWTools from "./locales/zh-TW/tools";
import zhTWChat from "./locales/zh-TW/chat";
import esCommon from "./locales/es/common";
import esMenu from "./locales/es/menu";
import esSettings from "./locales/es/settings";
import esPrompts from "./locales/es/prompts";
import esCategories from "./locales/es/categories";
import esPopup from "./locales/es/popup";
import esContent from "./locales/es/content";
import esTags from "./locales/es/tags";
import esTools from "./locales/es/tools";
import esChat from "./locales/es/chat";
import frCommon from "./locales/fr/common";
import frMenu from "./locales/fr/menu";
import frSettings from "./locales/fr/settings";
import frPrompts from "./locales/fr/prompts";
import frCategories from "./locales/fr/categories";
import frPopup from "./locales/fr/popup";
import frContent from "./locales/fr/content";
import frTags from "./locales/fr/tags";
import frTools from "./locales/fr/tools";
import frChat from "./locales/fr/chat";
import ptBRCommon from "./locales/pt-BR/common";
import ptBRMenu from "./locales/pt-BR/menu";
import ptBRSettings from "./locales/pt-BR/settings";
import ptBRPrompts from "./locales/pt-BR/prompts";
import ptBRCategories from "./locales/pt-BR/categories";
import ptBRPopup from "./locales/pt-BR/popup";
import ptBRContent from "./locales/pt-BR/content";
import ptBRTags from "./locales/pt-BR/tags";
import ptBRTools from "./locales/pt-BR/tools";
import ptBRChat from "./locales/pt-BR/chat";
import itCommon from "./locales/it/common";
import itMenu from "./locales/it/menu";
import itSettings from "./locales/it/settings";
import itPrompts from "./locales/it/prompts";
import itCategories from "./locales/it/categories";
import itPopup from "./locales/it/popup";
import itContent from "./locales/it/content";
import itTags from "./locales/it/tags";
import itTools from "./locales/it/tools";
import itChat from "./locales/it/chat";
import trCommon from "./locales/tr/common";
import trMenu from "./locales/tr/menu";
import trSettings from "./locales/tr/settings";
import trPrompts from "./locales/tr/prompts";
import trCategories from "./locales/tr/categories";
import trPopup from "./locales/tr/popup";
import trContent from "./locales/tr/content";
import trTags from "./locales/tr/tags";
import trTools from "./locales/tr/tools";
import trChat from "./locales/tr/chat";
import idCommon from "./locales/id/common";
import idMenu from "./locales/id/menu";
import idSettings from "./locales/id/settings";
import idPrompts from "./locales/id/prompts";
import idCategories from "./locales/id/categories";
import idPopup from "./locales/id/popup";
import idContent from "./locales/id/content";
import idTags from "./locales/id/tags";
import idTools from "./locales/id/tools";
import idChat from "./locales/id/chat";
import deCommon from "./locales/de/common";
import deMenu from "./locales/de/menu";
import deSettings from "./locales/de/settings";
import dePrompts from "./locales/de/prompts";
import deCategories from "./locales/de/categories";
import dePopup from "./locales/de/popup";
import deContent from "./locales/de/content";
import deTags from "./locales/de/tags";
import deTools from "./locales/de/tools";
import deChat from "./locales/de/chat";
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
import koCommon from "./locales/ko/common";
import koMenu from "./locales/ko/menu";
import koSettings from "./locales/ko/settings";
import koPrompts from "./locales/ko/prompts";
import koCategories from "./locales/ko/categories";
import koPopup from "./locales/ko/popup";
import koContent from "./locales/ko/content";
import koTags from "./locales/ko/tags";
import koTools from "./locales/ko/tools";
import koChat from "./locales/ko/chat";
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
  "zh-TW": {
    common: zhTWCommon,
    menu: zhTWMenu,
    settings: zhTWSettings,
    prompts: zhTWPrompts,
    categories: zhTWCategories,
    popup: zhTWPopup,
    content: zhTWContent,
    tags: zhTWTags,
    tools: zhTWTools,
    chat: zhTWChat,
  },
  es: {
    common: esCommon,
    menu: esMenu,
    settings: esSettings,
    prompts: esPrompts,
    categories: esCategories,
    popup: esPopup,
    content: esContent,
    tags: esTags,
    tools: esTools,
    chat: esChat,
  },
  fr: {
    common: frCommon,
    menu: frMenu,
    settings: frSettings,
    prompts: frPrompts,
    categories: frCategories,
    popup: frPopup,
    content: frContent,
    tags: frTags,
    tools: frTools,
    chat: frChat,
  },
  "pt-BR": {
    common: ptBRCommon,
    menu: ptBRMenu,
    settings: ptBRSettings,
    prompts: ptBRPrompts,
    categories: ptBRCategories,
    popup: ptBRPopup,
    content: ptBRContent,
    tags: ptBRTags,
    tools: ptBRTools,
    chat: ptBRChat,
  },
  it: {
    common: itCommon,
    menu: itMenu,
    settings: itSettings,
    prompts: itPrompts,
    categories: itCategories,
    popup: itPopup,
    content: itContent,
    tags: itTags,
    tools: itTools,
    chat: itChat,
  },
  tr: {
    common: trCommon,
    menu: trMenu,
    settings: trSettings,
    prompts: trPrompts,
    categories: trCategories,
    popup: trPopup,
    content: trContent,
    tags: trTags,
    tools: trTools,
    chat: trChat,
  },
  id: {
    common: idCommon,
    menu: idMenu,
    settings: idSettings,
    prompts: idPrompts,
    categories: idCategories,
    popup: idPopup,
    content: idContent,
    tags: idTags,
    tools: idTools,
    chat: idChat,
  },
  de: {
    common: deCommon,
    menu: deMenu,
    settings: deSettings,
    prompts: dePrompts,
    categories: deCategories,
    popup: dePopup,
    content: deContent,
    tags: deTags,
    tools: deTools,
    chat: deChat,
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
  ko: {
    common: koCommon,
    menu: koMenu,
    settings: koSettings,
    prompts: koPrompts,
    categories: koCategories,
    popup: koPopup,
    content: koContent,
    tags: koTags,
    tools: koTools,
    chat: koChat,
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
