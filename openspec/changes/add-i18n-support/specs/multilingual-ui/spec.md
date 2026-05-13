## ADDED Requirements

### Requirement: Locale Selection
The system SHALL support English and Simplified Chinese as application locales and SHALL allow users to switch between supported locales at runtime.

#### Scenario: Switch language from the app shell
- **WHEN** a user selects a different supported language from the language switcher
- **THEN** the application updates localized UI copy without changing the current route

#### Scenario: Persist selected language
- **WHEN** a user changes the language and reloads the application
- **THEN** the application restores the previously selected supported locale

### Requirement: Locale Fallback
The system MUST fall back to English for missing or unsupported locale values.

#### Scenario: Unsupported browser locale
- **WHEN** the browser reports an unsupported locale
- **THEN** the application uses English as the active locale

#### Scenario: Missing translation key
- **WHEN** a localized string is missing for the active locale
- **THEN** the application renders the English string for that key

### Requirement: Localized Navigation And SEO
The system SHALL render tab group labels, tab labels, core shell copy, document title, and meta description using the active locale.

#### Scenario: Chinese locale active
- **WHEN** Simplified Chinese is active
- **THEN** navigation labels and SEO metadata render Simplified Chinese copy for translated keys

### Requirement: Localized Core Pages
The system SHALL localize the extracted All OEMs, Funding, and Factories page copy using the active locale.

#### Scenario: Core page labels update
- **WHEN** the active locale changes
- **THEN** headings, filter labels, legends, and status labels on the extracted core pages update to the selected language

### Requirement: Localized Remaining UI Surfaces
The system SHALL localize remaining user-facing UI chrome in Arena, API docs, CLI docs, Sample Explorer, Data Brokerage, and the remaining Atlas app views while preserving raw company/model/dataset data and code examples.

#### Scenario: Remaining UI surfaces update
- **WHEN** the active locale changes
- **THEN** page titles, section headings, buttons, form labels, placeholders, empty states, status messages, and explanatory UI copy in remaining UI surfaces update to the selected language

#### Scenario: Raw technical content remains stable
- **WHEN** a page displays API examples, CLI commands, code snippets, company descriptions, model descriptions, or dataset-provided content
- **THEN** the system preserves that source content without automatic translation
