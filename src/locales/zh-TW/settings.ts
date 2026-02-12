import zhCNSettings from "../zh-CN/settings";

export default {
  ...zhCNSettings,
  title: "設定",
  language: {
    ...zhCNSettings.language,
    title: "語言",
    localeNames: {
      zhCN: "简体中文",
      zhTW: "繁體中文",
      en: "English",
      de: "Deutsch",
      jaJP: "日本語",
      ko: "한국어",
      ruRU: "Русский",
    },
    followSystem: "跟隨系統",
    currentSystem: "目前系統語言為 {lang}",
  },
  sort: {
    label: "排序方式",
    updatedAt: "最近更新",
    createdAt: "建立時間",
    byTitle: "標題排序",
  },
};
