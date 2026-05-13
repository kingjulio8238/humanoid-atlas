import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { TAB_TO_PATH } from '../app/tabs';

export function getLegacyHashRedirectPath(hash: string) {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalizedHash) return null;
  if (normalizedHash.startsWith('/tab/')) {
    const tabId = normalizedHash.slice(5);
    return TAB_TO_PATH[tabId] || null;
  }
  if (normalizedHash.startsWith('/company/')) {
    const companyId = normalizedHash.slice(9);
    return `/?company=${companyId}`;
  }
  return null;
}

export function useLegacyHashRedirect(navigate: NavigateFunction) {
  useEffect(() => {
    const path = getLegacyHashRedirectPath(window.location.hash);
    if (path) navigate(path, { replace: true });
  }, [navigate]);
}
