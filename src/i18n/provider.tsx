import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LOCALE_STORAGE_KEY, getInitialLocale, normalizeLocale, translate, translateText } from './core';
import type { Locale } from './core';
import type { MessageKey } from './messages';
import { I18nContext } from './context';
import { zhCNTranslatedTexts } from './textMessages';

const textNodeOriginals = new WeakMap<Text, string>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();
const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'placeholder', 'title'] as const;

function preserveOuterWhitespace(original: string, translated: string) {
  const leading = original.match(/^\s*/)?.[0] ?? '';
  const trailing = original.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

function translateNodeText(text: string, locale: Locale) {
  if (locale === 'en') return text;
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return text;
  const translated = translateText(locale, normalized);
  return translated === normalized ? text : preserveOuterWhitespace(text, translated);
}

function getOriginalAttribute(element: Element, attr: string, value: string) {
  let originals = attrOriginals.get(element);
  if (!originals) {
    originals = new Map();
    attrOriginals.set(element, originals);
  }
  if (!originals.has(attr)) {
    originals.set(attr, value);
  }
  return originals.get(attr) ?? value;
}

function restoreOrTrackTextNode(textNode: Text) {
  const current = textNode.nodeValue ?? '';
  const original = textNodeOriginals.get(textNode);
  if (!original) {
    textNodeOriginals.set(textNode, current);
    return;
  }
  if (original === current) return;
  if (zhCNTranslatedTexts.has(original.trim())) {
    textNodeOriginals.set(textNode, current);
    return;
  }
  textNode.nodeValue = original;
}

function restoreOrTrackAttribute(element: Element, attr: string, value: string) {
  const originals = attrOriginals.get(element);
  const original = originals?.get(attr);
  if (!original) {
    getOriginalAttribute(element, attr, value);
    return;
  }
  if (original === value) return;
  if (zhCNTranslatedTexts.has(original.trim())) {
    originals?.set(attr, value);
    return;
  }
  element.setAttribute(attr, original);
}

function translateElement(element: Element, locale: Locale) {
  TRANSLATABLE_ATTRIBUTES.forEach((attr) => {
    const value = element.getAttribute(attr);
    if (!value) return;
    if (locale === 'en') {
      restoreOrTrackAttribute(element, attr, value);
      return;
    }
    const original = getOriginalAttribute(element, attr, value);
    const translated = translateNodeText(original, locale);
    if (value !== translated) {
      element.setAttribute(attr, translated);
    }
  });
}

function translateTree(root: ParentNode, locale: Locale) {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let textNode = textWalker.nextNode() as Text | null;
  while (textNode) {
    if (locale === 'en') {
      restoreOrTrackTextNode(textNode);
      textNode = textWalker.nextNode() as Text | null;
      continue;
    }
    if (!textNodeOriginals.has(textNode)) {
      textNodeOriginals.set(textNode, textNode.nodeValue ?? '');
    }
    const original = textNodeOriginals.get(textNode) ?? '';
    const translated = translateNodeText(original, locale);
    if (textNode.nodeValue !== translated) {
      textNode.nodeValue = translated;
    }
    textNode = textWalker.nextNode() as Text | null;
  }

  if (root instanceof Element) {
    translateElement(root, locale);
  }
  root.querySelectorAll?.('*').forEach((element) => translateElement(element, locale));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(normalizeLocale(nextLocale));
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const tx = useCallback(
    (text: string, vars?: Record<string, string | number>) => translateText(locale, text, vars),
    [locale],
  );

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    translateTree(root, locale);
    const observer = new MutationObserver(() => {
      translateTree(root, locale);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
    return () => observer.disconnect();
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale, t, tx }), [locale, setLocale, t, tx]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
