export const SUPPORTED_LOCALES = [
  "zh-CN",
  "zh-TW",
  "en",
  "es",
  "fr",
  "pt-BR",
  "it",
  "tr",
  "id",
  "de",
  "ja-JP",
  "ko",
  "ru-RU",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalePreference = SupportedLocale | "system";
