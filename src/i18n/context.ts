import { createContext, useContext } from 'react';
import type { Locale } from './core';
import type { MessageKey } from './messages';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  tx: (text: string, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
