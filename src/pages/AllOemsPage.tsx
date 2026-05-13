import { getBOMData, getCountryFilterGroup } from '../domain/atlasAnalytics';
import type { CountryGroup } from '../domain/atlasAnalytics';
import type { Company } from '../data';
import { useI18n } from '../i18n';

interface AllOemsPageProps {
  sortedOems: Company[];
  likes: Record<string, number>;
  likedByMe: Set<string>;
  countryFilter: CountryGroup;
  onSelectCompany: (id: string) => void;
  onLike: (id: string) => void;
}

export default function AllOemsPage({
  sortedOems,
  likes,
  likedByMe,
  countryFilter,
  onSelectCompany,
  onLike,
}: AllOemsPageProps) {
  const { t } = useI18n();
  const bomData = getBOMData();

  return (
    <div className="oems-view">
      <div className="oem-image-grid">
        {sortedOems.map((c) => (
          <div key={c.id} className={`oem-image-card ${countryFilter && getCountryFilterGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`} onClick={() => onSelectCompany(c.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onSelectCompany(c.id); }}>
            <div className="oem-image-card__img">
              {c.robotImage ? (
                <img src={c.robotImage} alt={c.name} />
              ) : (
                <div className="oem-image-card__placeholder" />
              )}
            </div>
            <div className="oem-image-card__info">
              <span className="oem-image-card__name">{c.name}</span>
              <button
                className={`oem-heart oem-heart--inline ${likedByMe.has(c.id) ? 'liked' : ''}`}
                onClick={(e) => { e.stopPropagation(); onLike(c.id); }}
                aria-label={likedByMe.has(c.id) ? t('allOems.liked') : t('allOems.like')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={likedByMe.has(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="oem-heart__count">{likes[c.id] || 0}</span>
              </button>
              <span className="oem-image-card__country">{c.country}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bom-section">
        <h3 className="section-title">{t('allOems.bomTitle')}</h3>

        <div className="bom-subsection">
          <h4 className="cut-subtitle">{t('allOems.priceComparison')}</h4>
          <div className="bom-list">
            {bomData.rows.map((row) => (
              <div key={row.id} className="bom-row" onClick={() => onSelectCompany(row.id)}>
                <span className="bom-row__country">{row.country}</span>
                <span className="bom-row__name">{row.name}</span>
                <div className="bom-row__bars">
                  {row.bomK !== null && (
                    <div
                      className="bom-row__bom"
                      style={{ width: `${(row.bomK / bomData.maxK) * 100}%` }}
                    />
                  )}
                  {row.priceK !== null && (
                    <div
                      className="bom-row__price"
                      style={{ left: `${(row.priceK / bomData.maxK) * 100}%` }}
                    />
                  )}
                </div>
                <div className="bom-row__labels">
                  {row.bomK !== null && (
                    <span className="bom-row__bom-label">${row.bomK}K {t('allOems.bom')}</span>
                  )}
                  {row.priceK !== null && (
                    <span className="bom-row__price-label">${row.priceK}K {t('allOems.price')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="bom-legend">
            <span className="bom-legend__item"><span className="bom-legend__bar bom-legend__bar--bom" /> {t('allOems.bom')}</span>
            <span className="bom-legend__item"><span className="bom-legend__bar bom-legend__bar--price" /> {t('allOems.price')}</span>
          </div>
        </div>

        <div className="bom-subsection">
          <h4 className="cut-subtitle">{t('allOems.rotaryBreakdown')}</h4>
          <p className="bom-note">{t('allOems.rotaryNote')}</p>
          <div className="actuator-waterfall">
            <div className="actuator-bar">
              {bomData.actuatorBreakdown.map((seg) => (
                <div
                  key={seg.id}
                  className={`actuator-seg actuator-seg--${seg.id}`}
                  style={{ width: `${seg.pct}%` }}
                >
                  {seg.pct >= 10 && `${seg.pct}%`}
                </div>
              ))}
            </div>
            <div className="actuator-legend">
              {bomData.actuatorBreakdown.map((seg) => (
                <span key={seg.id} className="actuator-legend__item">
                  <span className={`actuator-legend__dot actuator-seg--${seg.id}`} />
                  {seg.label} ({seg.pct}%)
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
