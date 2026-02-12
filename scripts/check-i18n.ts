import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const LOCALES_ROOT = path.resolve("src/locales");
const BASE_LOCALE = "en";

function walkTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const name of readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkTsFiles(fullPath));
      continue;
    }
    if (name.endsWith(".ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

function flattenKeys(source: unknown, prefix = "", out = new Set<string>()): Set<string> {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    if (prefix) out.add(prefix);
    return out;
  }

  const entries = Object.entries(source as Record<string, unknown>);
  if (entries.length === 0 && prefix) {
    out.add(prefix);
    return out;
  }

  for (const [key, value] of entries) {
    const next = prefix ? `${prefix}.${key}` : key;
    flattenKeys(value, next, out);
  }

  return out;
}

async function loadLocaleModule(fullPath: string): Promise<unknown> {
  const mod = await import(pathToFileURL(fullPath).href);
  return mod.default;
}

async function main() {
  const localeDirs = readdirSync(LOCALES_ROOT).filter((name) =>
    statSync(path.join(LOCALES_ROOT, name)).isDirectory(),
  );

  if (!localeDirs.includes(BASE_LOCALE)) {
    throw new Error(`Base locale "${BASE_LOCALE}" not found under ${LOCALES_ROOT}`);
  }

  const baseDir = path.join(LOCALES_ROOT, BASE_LOCALE);
  const baseFiles = walkTsFiles(baseDir).map((fullPath) =>
    path.relative(baseDir, fullPath),
  );

  let hasError = false;
  for (const locale of localeDirs) {
    if (locale === BASE_LOCALE) continue;
    const localeDir = path.join(LOCALES_ROOT, locale);
    const localeFiles = new Set(
      walkTsFiles(localeDir).map((fullPath) => path.relative(localeDir, fullPath)),
    );

    for (const relativeFile of baseFiles) {
      if (!localeFiles.has(relativeFile)) {
        hasError = true;
        console.error(`[i18n] Missing file: ${locale}/${relativeFile}`);
      }
    }

    for (const relativeFile of localeFiles) {
      if (!baseFiles.includes(relativeFile)) {
        hasError = true;
        console.error(`[i18n] Extra file: ${locale}/${relativeFile}`);
      }
    }

    for (const relativeFile of baseFiles) {
      const basePath = path.join(baseDir, relativeFile);
      const localePath = path.join(localeDir, relativeFile);
      if (!localeFiles.has(relativeFile)) continue;

      const [baseData, localeData] = await Promise.all([
        loadLocaleModule(basePath),
        loadLocaleModule(localePath),
      ]);

      const baseKeys = flattenKeys(baseData);
      const targetKeys = flattenKeys(localeData);

      const missingKeys = [...baseKeys].filter((key) => !targetKeys.has(key));
      const extraKeys = [...targetKeys].filter((key) => !baseKeys.has(key));

      if (missingKeys.length > 0) {
        hasError = true;
        console.error(`[i18n] Missing keys in ${locale}/${relativeFile}: ${missingKeys.join(", ")}`);
      }
      if (extraKeys.length > 0) {
        hasError = true;
        console.error(`[i18n] Extra keys in ${locale}/${relativeFile}: ${extraKeys.join(", ")}`);
      }
    }
  }

  if (hasError) {
    process.exitCode = 1;
    return;
  }

  console.log("[i18n] Locale files and keys are consistent.");
}

main().catch((error) => {
  console.error("[i18n] Check failed:", error);
  process.exitCode = 1;
});
