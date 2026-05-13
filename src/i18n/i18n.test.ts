import { describe, expect, it } from 'vitest';
import { normalizeLocale, translate, translateText } from './index';

describe('i18n helpers', () => {
  it('normalizes supported language inputs', () => {
    expect(normalizeLocale('zh')).toBe('zh-CN');
    expect(normalizeLocale('zh-Hans')).toBe('zh-CN');
    expect(normalizeLocale('zh_CN')).toBe('zh-CN');
    expect(normalizeLocale('en-US')).toBe('en');
  });

  it('falls back to English for unsupported locales', () => {
    expect(normalizeLocale('fr-FR')).toBe('en');
  });

  it('returns representative Chinese translations', () => {
    expect(translate('zh-CN', 'tabs.funding')).toBe('融资');
    expect(translate('zh-CN', 'funding.title')).toBe('融资与估值');
  });

  it('interpolates variables in translated strings', () => {
    expect(translate('zh-CN', 'app.footer.oems', { count: 29 })).toBe('29 家 OEM');
    expect(translate('en', 'app.footer.oems', { count: 29 })).toBe('29 OEMs');
  });

  it('translates phrase-level UI copy and preserves unmapped fallbacks', () => {
    expect(translateText('zh-CN', 'Loading matchup...')).toBe('正在加载对局...');
    expect(translateText('zh-CN', '← Back to Catalog')).toBe('← 返回目录');
    expect(translateText('zh-CN', 'Analytics:')).toBe('分析：');
    expect(translateText('zh-CN', 'Unmapped phrase')).toBe('Unmapped phrase');
    expect(translateText('en', 'Loading matchup...')).toBe('Loading matchup...');
  });
});
