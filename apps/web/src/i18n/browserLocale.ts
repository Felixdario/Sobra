import { resolveLocale, type Locale } from '@sobra/shared';

/** Before sign-in (and for the sign-up body): the browser's languages, resolved to ours. */
export function browserLocale(): Locale {
  return resolveLocale(typeof navigator === 'undefined' ? null : navigator.languages);
}

export function subscribeToLanguages(onChange: () => void) {
  window.addEventListener('languagechange', onChange);
  return () => window.removeEventListener('languagechange', onChange);
}
