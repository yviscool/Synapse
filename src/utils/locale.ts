import type { LocalePreference, SupportedLocale } from "@/types/i18n";
import { SUPPORTED_LOCALES } from "@/types/i18n";

const DEFAULT_LOCALE: SupportedLocale = "en";

const LOCALE_PREFIX_MAP: Array<{ prefix: string; locale: SupportedLocale }> = [
  { prefix: "zh", locale: "zh-CN" },
  { prefix: "ja", locale: "ja-JP" },
  { prefix: "ru", locale: "ru-RU" },
  { prefix: "en", locale: "en" },
];

function normalizeLocaleCode(locale: string): string {
  return locale.toLowerCase();
}

export function resolveSystemLocale(
  preferredLanguages?: readonly string[],
): SupportedLocale {
  const locales = preferredLanguages && preferredLanguages.length > 0
    ? preferredLanguages
    : (typeof navigator !== "undefined"
        ? navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language]
        : []);

  for (const rawLocale of locales) {
    const normalized = normalizeLocaleCode(rawLocale);
    const exactMatch = SUPPORTED_LOCALES.find((item) =>
      normalizeLocaleCode(item) === normalized,
    );
    if (exactMatch) return exactMatch;
    const matched = LOCALE_PREFIX_MAP.find((item) =>
      normalized.startsWith(item.prefix),
    );
    if (matched) return matched.locale;
  }

  return DEFAULT_LOCALE;
}

export function resolveLocalePreference(
  preference?: LocalePreference | string | null,
  preferredLanguages?: readonly string[],
): SupportedLocale {
  if (typeof preference === "string" && preference !== "system") {
    const normalized = normalizeLocaleCode(preference);
    const exactMatch = SUPPORTED_LOCALES.find((item) =>
      normalizeLocaleCode(item) === normalized,
    );
    if (exactMatch) {
      return exactMatch;
    }
  }
  return resolveSystemLocale(preferredLanguages);
}
