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

const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'year', seconds: 31536000 },
  { unit: 'month', seconds: 2592000 },
  { unit: 'week', seconds: 604800 },
  { unit: 'day', seconds: 86400 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
  { unit: 'second', seconds: 1 },
]

/**
 * Format a timestamp as a locale-aware relative time string (e.g. "3 hours ago").
 * Falls back to a short date for timestamps older than 7 days.
 */
export function formatRelativeTime(
  timestamp: number,
  locale = readI18nLocale(),
  { fallbackAfterDays = 7 }: { fallbackAfterDays?: number } = {},
): string {
  if (!timestamp) return ''
  const diffInSeconds = Math.floor((Date.now() - timestamp) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (fallbackAfterDays > 0 && diffInSeconds >= fallbackAfterDays * 86400) {
    return new Date(timestamp).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
    })
  }

  for (const { unit, seconds } of RELATIVE_TIME_UNITS) {
    const interval = diffInSeconds / seconds
    if (interval >= 1) {
      return rtf.format(-Math.floor(interval), unit)
    }
  }
  return rtf.format(0, 'second')
}
