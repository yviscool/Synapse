import enSettings from "../en/settings";

export default {
  ...enSettings,
  title: "設定",
  sort: {
    label: "並び替え",
    updatedAt: "最近更新",
    createdAt: "作成日時",
    byTitle: "タイトル順",
  },
  language: {
    title: "言語",
    localeNames: {
      zhCN: "中文",
      zhTW: "繁體中文",
      en: "English",
      de: "Deutsch",
      jaJP: "日本語",
      ko: "한국어",
      ruRU: "Русский",
    },
    followSystem: "システムに従う",
    currentSystem: "現在のシステム言語: {lang}",
  },
};
