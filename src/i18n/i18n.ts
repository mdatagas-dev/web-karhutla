import { i18n, type Messages } from '@lingui/core';
import { CATALOGS, DEFAULT_LOCALE, LOCALES, type Locale } from './catalog';

const STORAGE_KEY = 'cleared-language';

export { i18n };

for (const locale of LOCALES) {
  // `as const` makes the compiled message tuples readonly; Lingui wants the
  // mutable tuple type.
  i18n.load(locale, CATALOGS[locale] as unknown as Messages);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * `?lang=` wins, then the remembered choice, then the browser language.
 */
export function detectLocale(): Locale {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(fromQuery)) return fromQuery;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage can be blocked; fall through to the browser language */
  }
  return window.navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function activateLocale(locale: Locale): void {
  i18n.activate(locale);
  document.documentElement.lang = locale;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage can be blocked; the URL still carries the choice */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  window.history.replaceState(window.history.state, '', url);
}

export { DEFAULT_LOCALE, LOCALES, type Locale };
