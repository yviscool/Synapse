import enSettings from "../en/settings";

export default {
  ...enSettings,
  title: "설정",
  language: {
    ...enSettings.language,
    title: "언어",
    localeNames: {
      zhCN: "简体中文",
      zhTW: "繁體中文",
      en: "English",
      de: "Deutsch",
      jaJP: "日本語",
      ko: "한국어",
      ruRU: "Русский",
    },
    followSystem: "시스템 언어 따르기",
    currentSystem: "현재 시스템 언어: {lang}",
  },
};
