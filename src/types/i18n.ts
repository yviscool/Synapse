export const SUPPORTED_LOCALES = ["zh-CN", "en", "ja-JP", "ru-RU"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocalePreference = SupportedLocale | "system";
