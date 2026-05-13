## Context

The app has bilingual README files but does not have a runtime locale model. User-facing application copy is currently embedded in React components and app config, while SEO metadata and tab labels are centralized enough to be localized first without changing routes or data contracts.

The first multilingual slice should establish a durable pattern that future page-level extraction can continue using. It must avoid a large dependency or wholesale UI rewrite because `AtlasAppView` and `DataBrokerage` still contain substantial hardcoded JSX.

## Goals / Non-Goals

**Goals:**
- Introduce a typed, dependency-free i18n runtime for English and Simplified Chinese.
- Persist the user's language choice and expose a visible language switcher.
- Localize navigation groups, tab labels, SEO metadata, app shell copy, and extracted core pages.
- Localize remaining static UI chrome in large views with a phrase-level dictionary while leaving raw data and examples untouched.
- Provide English fallback for missing translation keys so partial adoption is safe.
- Add tests around locale normalization, fallback behavior, and representative localized content.

**Non-Goals:**
- Translate all product data descriptions in `src/data/**`.
- Translate API examples, CLI commands, code snippets, company/model descriptions, or dataset-provided content.
- Change URLs, API schemas, persisted data formats, or environment variables.
- Add a third-party i18n dependency.

## Decisions

- Use a small local i18n runtime instead of `react-i18next` or `react-intl`.
  - Rationale: the current need is two locales and static dictionaries; avoiding a dependency keeps the change small and easy to test.
  - Alternative considered: adding `i18next`; deferred until pluralization, ICU formatting, or external translation workflows are needed.

- Store translation dictionaries in `src/i18n/messages.ts` and expose helpers from `src/i18n/index.tsx`.
  - Rationale: React components need a provider/hook, while config and tests also need pure helpers.
  - Alternative considered: separate JSON files; TypeScript dictionaries give key-level autocomplete and compile-time shape checking.

- Keep tab IDs and route paths stable while deriving labels through translation keys.
  - Rationale: localized routing would be a larger SEO and migration change; users should be able to switch language without leaving the current URL.

- Localize SEO through a helper that resolves metadata per locale.
  - Rationale: the tab metadata is already centralized, so the document title and meta tags can reflect the selected language with low risk.

- Localize the already extracted pages first.
  - Rationale: `AllOemsPage`, `FundingPage`, and `FactoriesPage` are small, typed modules and provide a clear pattern before migrating the remaining large view sections.

- Add phrase-level translation for large UI surfaces that still contain dense JSX.
  - Rationale: `AtlasAppView`, `Arena`, `ApiDocs`, `CliDocs`, `SampleExplorer`, and `DataBrokerage` contain substantial embedded UI copy. A phrase-level bridge lets the app localize headings, labels, buttons, placeholders, empty states, and status copy without a high-risk component rewrite.
  - Alternative considered: extracting every section into keyed components immediately; deferred because it would mix i18n with a large page-level refactor.

## Risks / Trade-offs

- Phrase-level localization depends on dictionary coverage → Mitigation: use English fallback and keep raw data/code examples outside the dictionary.
- Language state in localStorage can differ from browser preference → Mitigation: explicit user choice wins; initial locale falls back to browser language, then English.
- SEO language changes occur client-side → Mitigation: preserve current client-rendered Helmet behavior and add localized `html lang` updates.
- Translation key drift can happen as copy moves → Mitigation: tests cover key helpers and representative UI strings; TypeScript enforces dictionary shape.
