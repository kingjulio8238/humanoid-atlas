import { enMessages, zhCNMessages } from './messages';
import type { MessageKey } from './messages';
import { zhCNTextMessages } from './textMessages';

export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'humanoid_atlas_locale';

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en: enMessages,
  'zh-CN': zhCNMessages,
};

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.toLowerCase().replace('_', '-');
  if (normalized === 'zh' || normalized === 'zh-cn' || normalized === 'zh-hans' || normalized.startsWith('zh-hans-')) {
    return 'zh-CN';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  return DEFAULT_LOCALE;
}

export function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored) return normalizeLocale(stored);
  return normalizeLocale(window.navigator.language);
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>) {
  const template = messages[locale][key] ?? enMessages[key] ?? key;
  return interpolate(template, vars);
}

export function translateText(locale: Locale, text: string, vars?: Record<string, string | number>) {
  let template = text;
  if (locale === 'zh-CN') {
    template = zhCNTextMessages[text] ?? text;
    if (template === text && text.endsWith(':')) {
      const base = text.slice(0, -1);
      const translatedBase = zhCNTextMessages[base];
      if (translatedBase) {
        template = `${translatedBase}：`;
      }
    }
    if (template === text) {
      const decorated = text.match(/^([←→‹›\s]*)(.*?)([←→‹›\s]*)$/);
      if (decorated) {
        const [, prefix, body, suffix] = decorated;
        const translatedBody = zhCNTextMessages[body.trim()];
        if (translatedBody) {
          template = `${prefix}${translatedBody}${suffix}`;
        }
      }
    }
  }
  return interpolate(template, vars);
}

export function getTabLabelKey(tabId: string) {
  return `tabs.${tabId}` as MessageKey;
}

export function getTabGroupLabelKey(groupId: string) {
  return `tabGroups.${groupId}` as MessageKey;
}
