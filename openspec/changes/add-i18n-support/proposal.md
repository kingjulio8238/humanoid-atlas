## Why

Humanoid Atlas currently has bilingual README files, but the product UI itself is English-only with hardcoded labels, tab names, and SEO metadata. Adding a real multilingual foundation lets the application switch between English and Simplified Chinese without changing routes or duplicating pages.

## What Changes

- Add an application-level locale model with supported locales for English and Simplified Chinese.
- Add a lightweight translation dictionary and runtime helpers for resolving localized strings with English fallback.
- Add locale persistence and a visible language switcher in the app shell.
- Localize navigation groups, tab labels, core shell copy, SEO metadata, and the extracted OEM, funding, and factory pages.
- Add phrase-level translation support for remaining large UI surfaces, including Arena, API docs, CLI docs, Sample Explorer, Data Brokerage, and remaining Atlas app views.
- Add tests that verify fallback behavior, locale normalization, and representative translations.
- Preserve existing routes, public data schemas, API contracts, and environment variables.

## Capabilities

### New Capabilities
- `multilingual-ui`: Application UI can render supported languages from locale-aware translation resources and switch languages at runtime.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/app/tabs.ts`, `src/app/seo.ts`, `src/pages/AtlasAppView.tsx`, extracted page modules, large UI components with static copy, and new `src/i18n/` modules.
- Affected UI: header, language switcher, tab navigation, SEO tags, All OEMs, Funding, Factories, Arena, API docs, CLI docs, Sample Explorer, Data Brokerage, and remaining Atlas app sections.
- Dependencies: no new runtime package is required.
- Compatibility: existing URLs, data models, and API payloads remain unchanged.
