import i18n from "@/i18n";

function readI18nLocale(): string {
  const locale = i18n.global.locale;
  return typeof locale === "string" ? locale : locale.value;
}

export function compareLocalizedText(
  left: string,
  right: string,
  locale = readI18nLocale(),
): number {
  return left.localeCompare(right, locale, {
    numeric: true,
    sensitivity: "base",
  });
}
