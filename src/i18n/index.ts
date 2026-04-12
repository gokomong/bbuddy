// i18n: bbddy supports English (default) and Korean.
// Language is stored in the `settings` table under the key 'language'.
// Strings are organized into catalogs indexed by language code.

import { db } from "../db/schema.js";

export type Lang = "en" | "ko";
export const SUPPORTED_LANGS: Lang[] = ["en", "ko"];
export const DEFAULT_LANG: Lang = "en";

let cachedLang: Lang | null = null;

export function getLang(): Lang {
  if (cachedLang) return cachedLang;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'language'").get() as any;
    if (row?.value === "en" || row?.value === "ko") {
      cachedLang = row.value;
      return cachedLang!;
    }
  } catch { /* table may not exist yet on first run */ }
  cachedLang = DEFAULT_LANG;
  return cachedLang;
}

export function setLang(lang: Lang): void {
  if (!SUPPORTED_LANGS.includes(lang)) throw new Error(`Unsupported language: ${lang}`);
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('language', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(lang);
  cachedLang = lang;
}

// Pick the string for the current language, falling back to English.
export function pick<T>(catalog: Record<Lang, T>, lang: Lang = getLang()): T {
  return catalog[lang] ?? catalog[DEFAULT_LANG];
}
