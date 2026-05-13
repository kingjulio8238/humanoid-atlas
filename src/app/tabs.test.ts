import { describe, expect, it } from 'vitest';
import { PATH_TO_TAB, TABS, TAB_TO_PATH } from './tabs';

describe('tab route maps', () => {
  it('keeps every visible tab path reversible', () => {
    for (const tab of TABS.filter((item) => !item.hidden)) {
      expect(TAB_TO_PATH[tab.id], tab.id).toBeTruthy();
      expect(PATH_TO_TAB[TAB_TO_PATH[tab.id]], tab.id).toBe(tab.id);
    }
  });

  it('preserves core public routes', () => {
    expect(PATH_TO_TAB['/']).toBe('skeleton');
    expect(PATH_TO_TAB['/oems']).toBe('all_oems');
    expect(PATH_TO_TAB['/network']).toBe('network');
    expect(PATH_TO_TAB['/industry/geopolitics']).toBe('geopolitics');
    expect(PATH_TO_TAB['/hardware/motors']).toBe('motors');
    expect(PATH_TO_TAB['/software/vla']).toBe('vlas');
    expect(PATH_TO_TAB['/shop/equipment']).toBe('equipment');
    expect(PATH_TO_TAB['/data/buy']).toBe('buy_data');
    expect(PATH_TO_TAB['/arena/humanoids']).toBe('arena_oems');
  });

  it('keeps legacy plain paths mapped to the modern tab ids', () => {
    expect(PATH_TO_TAB['/geopolitics']).toBe('geopolitics');
    expect(PATH_TO_TAB['/buildout']).toBe('timeline');
    expect(PATH_TO_TAB['/shop']).toBe('equipment');
    expect(PATH_TO_TAB['/shop/data']).toBe('buy_data');
  });
});
