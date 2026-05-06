/** Stable ASCII slug for i18n keys derived from English labels. */
export function slugKey(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}
