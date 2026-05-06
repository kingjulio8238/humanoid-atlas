import { useCallback, useEffect, useState } from 'react';
import { JA_OVERRIDES } from './ja-overrides';

export type Locale = 'en' | 'ja';

const STORAGE_KEY = 'humanoid-atlas-locale';
const EVENT_NAME = 'humanoid-atlas-locale-change';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'ja' ? 'ja' : 'en';
}

function applyLocale(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.locale = locale;
    document.documentElement.lang = locale;
  }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: locale }));
  }
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    applyLocale(locale);
    const onLocaleChange = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (next === 'en' || next === 'ja') setLocaleState(next);
    };
    window.addEventListener(EVENT_NAME, onLocaleChange);
    return () => window.removeEventListener(EVENT_NAME, onLocaleChange);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    applyLocale(next);
  }, []);

  const tx = useCallback(
    (key: string, enFallback: string) => {
      if (locale === 'ja') return JA_OVERRIDES[key] ?? enFallback;
      return enFallback;
    },
    [locale],
  );

  return { locale, setLocale, tx };
}
