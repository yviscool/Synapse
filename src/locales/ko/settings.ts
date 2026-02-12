import enSettings from "../en/settings";

export default {
  ...enSettings,
  title: "설정",
  sort: {
    label: "정렬",
    updatedAt: "최근 업데이트",
    createdAt: "생성 날짜",
    byTitle: "제목순",
  },
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
