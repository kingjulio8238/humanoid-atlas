import { companyFunding, topInvestors } from '../data';
import type { FundingStatus } from '../data';
import {
  getCountryFilterGroup,
  getFilteredFunding,
  getFundingSortedByRaised,
} from '../domain/atlasAnalytics';
import type { CountryGroup } from '../domain/atlasAnalytics';
import { useI18n } from '../i18n';
import type { MessageKey } from '../i18n/messages';

interface FundingPageProps {
  fundingStatusFilter: 'all' | FundingStatus;
  countryFilter: CountryGroup;
  onFundingStatusFilterChange: (filter: 'all' | FundingStatus) => void;
  onSelectCompany: (id: string) => void;
}

function getFundingStatusLabel(s: FundingStatus, t: (key: MessageKey) => string) {
  switch (s) {
    case 'private': return t('funding.private');
    case 'public': return t('funding.public');
    case 'ipo-filed': return t('funding.ipoFiled');
    case 'acquired': return t('funding.acquired');
    case 'subsidiary': return t('funding.subsidiary');
  }
}

function formatAmount(m: number) {
  if (m >= 1000000) return `$${(m / 1000000).toFixed(1)}T`;
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${Math.round(m)}M`;
}

export default function FundingPage({
  fundingStatusFilter,
  countryFilter,
  onFundingStatusFilterChange,
  onSelectCompany,
}: FundingPageProps) {
  const { t } = useI18n();
  const filteredFunding = getFilteredFunding(fundingStatusFilter);
  const fundingSortedByRaised = getFundingSortedByRaised(filteredFunding);
  const scaleMax = Math.max(
    ...filteredFunding.map((f) => f.totalRaisedM ?? 0),
    ...filteredFunding
      .filter((f) => (f.latestValuationM ?? 0) <= 100000)
      .map((f) => f.latestValuationM ?? 0),
  );
  const pct = (v: number) => Math.min((v / scaleMax) * 100, 99);

  return (
    <div className="geo-content">
      <section className="geo-section">
        <div className="supply-chain__header">
          <h3 className="section-title">{t('funding.title')}</h3>
          <div className="vla-filters">
            <button className={`country-pill ${fundingStatusFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => onFundingStatusFilterChange('all')}>{t('funding.all')}</button>
            <button className={`country-pill ${fundingStatusFilter === 'private' ? 'country-pill--active' : ''}`} onClick={() => onFundingStatusFilterChange(fundingStatusFilter === 'private' ? 'all' : 'private')}>{t('funding.private')}</button>
            <button className={`country-pill ${fundingStatusFilter === 'public' ? 'country-pill--active' : ''}`} onClick={() => onFundingStatusFilterChange(fundingStatusFilter === 'public' ? 'all' : 'public')}>{t('funding.public')}</button>
            <button className={`country-pill ${fundingStatusFilter === 'subsidiary' ? 'country-pill--active' : ''}`} onClick={() => onFundingStatusFilterChange(fundingStatusFilter === 'subsidiary' ? 'all' : 'subsidiary')}>{t('funding.subsidiary')}</button>
            <button className={`country-pill ${fundingStatusFilter === 'acquired' ? 'country-pill--active' : ''}`} onClick={() => onFundingStatusFilterChange(fundingStatusFilter === 'acquired' ? 'all' : 'acquired')}>{t('funding.acquired')}</button>
          </div>
        </div>
        <div className="funding-list">
          {fundingSortedByRaised.map((f) => (
            <div
              key={f.companyId}
              className={`funding-row ${countryFilter && getCountryFilterGroup(f.country) !== countryFilter ? 'geo-dim' : ''}`}
              onClick={() => onSelectCompany(f.companyId)}
            >
              <span className="funding-row__country">{f.country}</span>
              <span className="funding-row__name">{f.name}</span>
              <span className="funding-row__status">{getFundingStatusLabel(f.status, t)}</span>
              <div className="funding-row__bars">
                {f.totalRaisedM != null && (
                  <div
                    className="funding-row__raised"
                    style={{ width: `${pct(f.totalRaisedM)}%` }}
                  />
                )}
                {f.latestValuationM != null && (
                  <div
                    className="funding-row__valuation"
                    style={{ left: `${pct(f.latestValuationM)}%` }}
                  />
                )}
              </div>
              <div className="funding-row__labels">
                {f.totalRaisedM != null && (
                  <span className="funding-row__raised-label">{formatAmount(f.totalRaisedM)} {t('funding.raised')}</span>
                )}
                {f.latestValuationM != null && (
                  <span className="funding-row__val-label">{formatAmount(f.latestValuationM)} {t('funding.valuationShort')}{f.latestValuationNote ? '*' : ''}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="funding-legend">
          <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--raised" /> {t('funding.raisedLegend')}</span>
          <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--val" /> {t('funding.valuationLegend')}</span>
        </div>
        <div className="funding-footnote">{t('funding.footnote')}</div>
      </section>

      <section className="geo-section">
        <div className="supply-chain__header">
          <h3 className="section-title">{t('funding.topInvestors')}</h3>
        </div>
        <div className="funding-investors">
          {topInvestors.map((inv) => (
            <div key={inv.id} className="funding-investor-card">
              <div className="funding-investor-card__header">
                <span className="funding-investor-card__name">{inv.name}</span>
                <span className="funding-investor-card__meta">{inv.country} / {inv.type}</span>
              </div>
              <div className="funding-investor-card__portfolio">
                {inv.portfolioCompanyIds.map((cid) => {
                  const cf = companyFunding.find((f) => f.companyId === cid);
                  return (
                    <button
                      key={cid}
                      className="funding-investor-card__company"
                      onClick={() => onSelectCompany(cid)}
                    >
                      {cf?.name || cid}
                    </button>
                  );
                })}
              </div>
              <p className="funding-investor-card__desc">{inv.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
