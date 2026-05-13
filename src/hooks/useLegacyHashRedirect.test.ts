import { describe, expect, it } from 'vitest';
import { getLegacyHashRedirectPath } from './useLegacyHashRedirect';

describe('getLegacyHashRedirectPath', () => {
  it('redirects legacy tab hashes to path routes', () => {
    expect(getLegacyHashRedirectPath('#/tab/network')).toBe('/network');
    expect(getLegacyHashRedirectPath('/tab/motors')).toBe('/hardware/motors');
  });

  it('redirects legacy company hashes to query URLs', () => {
    expect(getLegacyHashRedirectPath('#/company/tesla')).toBe('/?company=tesla');
  });

  it('ignores empty, unknown, and unmapped hashes', () => {
    expect(getLegacyHashRedirectPath('')).toBeNull();
    expect(getLegacyHashRedirectPath('#/unknown/network')).toBeNull();
    expect(getLegacyHashRedirectPath('#/tab/not-a-real-tab')).toBeNull();
  });
});
