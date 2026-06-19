import { useLocale } from './locale';

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="locale-toggle" aria-label="Language selector">
      {(['en', 'ja'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={`locale-toggle__btn${locale === option ? ' locale-toggle__btn--active' : ''}`}
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
