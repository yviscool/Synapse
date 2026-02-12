import enSettings from "../en/settings";

export default {
  ...enSettings,
  title: "Einstellungen",
  language: {
    ...enSettings.language,
    title: "Sprache",
    localeNames: {
      zhCN: "简体中文",
      zhTW: "繁體中文",
      en: "English",
      de: "Deutsch",
      jaJP: "日本語",
      ko: "한국어",
      ruRU: "Русский",
    },
    followSystem: "Systemsprache folgen",
    currentSystem: "Aktuelle Systemsprache ist {lang}",
  },
};
