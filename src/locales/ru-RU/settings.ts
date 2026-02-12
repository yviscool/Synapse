import enSettings from "../en/settings";

export default {
  ...enSettings,
  title: "Настройки",
  sort: {
    label: "Сортировка",
    updatedAt: "Последнее обновление",
    createdAt: "Дата создания",
    byTitle: "По заголовку",
  },
  language: {
    title: "Язык",
    localeNames: {
      zhCN: "中文",
      zhTW: "繁體中文",
      en: "English",
      de: "Deutsch",
      jaJP: "日本語",
      ko: "한국어",
      ruRU: "Русский",
    },
    followSystem: "Следовать системному",
    currentSystem: "Текущий язык системы: {lang}",
  },
};
