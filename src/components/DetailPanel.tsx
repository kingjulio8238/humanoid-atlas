import { companies, relationships, componentCategories, companyFunding } from '../data';
import PLYViewer from './PLYViewer';
import { useLocale } from '../i18n';
import { slugKey } from '../i18n/slugKey';

interface DetailPanelProps {
  selectedId: string | null;
  onNavigate: (id: string) => void;
  onClose: () => void;
}

const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', CN: '🇨🇳', JP: '🇯🇵', DE: '🇩🇪', CH: '🇨🇭',
  KR: '🇰🇷', TW: '🇹🇼', NL: '🇳🇱', IL: '🇮🇱', NO: '🇳🇴', AU: '🇦🇺',
  CA: '🇨🇦', PL: '🇵🇱',
};

const COMPANY_TYPES = ['oem', 'tier1_supplier', 'component_maker', 'raw_material', 'ai_compute'] as const;

function txSupplyComponent(tx: (k: string, en: string) => string, en: string) {
  return tx(`supply.comp.${slugKey(en)}`, en);
}

export default function DetailPanel({ selectedId, onNavigate, onClose }: DetailPanelProps) {
  const { tx } = useLocale();

  if (!selectedId) {
    return (
      <div className="detail-panel detail-panel--empty">
        <div className="detail-empty">
          <div className="detail-empty__icon">◎</div>
          <div className="detail-empty__text">{tx('detail.empty.title', 'SELECT A NODE')}</div>
          <div className="detail-empty__sub">{tx('detail.empty.sub', 'Click any entity in the graph to view supply chain details')}</div>
        </div>
      </div>
    );
  }

  const company = companies.find((c) => c.id === selectedId);

  const component = componentCategories.find((c) => c.id === selectedId);
  if (component && !company) {
    const displayName = tx(`hwcat.${component.id}.name`, component.name);
    const displayDesc = tx(`hwcat.${component.id}.desc`, component.description);
    const displayBottleneckReason = component.bottleneckReason
      ? tx(`hwcat.${component.id}.bottleneck`, component.bottleneckReason)
      : '';
    const metricsEntries = component.keyMetrics
      ? Object.entries(component.keyMetrics).map(([key, val]) => ({
          label: tx(`hwcat.${component.id}.mk.${slugKey(key)}`, key),
          value: tx(`hwcat.${component.id}.mv.${slugKey(key)}`, String(val)),
        }))
      : [];

    return (
      <div className="detail-panel">
        <div className="detail-header">
          <button className="detail-close" onClick={onClose}>✕</button>
          <div className="detail-type-badge detail-type-badge--component">
            {tx('detail.badge.component', 'COMPONENT')}
          </div>
          <h2 className="detail-name">{displayName}</h2>
          <p className="detail-desc">{displayDesc}</p>
        </div>
        {component.plyModel && (
          <div className="detail-model">
            <PLYViewer modelUrl={component.plyModel} />
          </div>
        )}
        {component.bottleneck && (
          <div className="detail-alert">
            <span className="detail-alert__icon">⚠</span>
            <span>{tx('detail.bottleneck.title', 'SUPPLY CHAIN BOTTLENECK')}</span>
            <p className="detail-alert__reason">{displayBottleneckReason}</p>
          </div>
        )}
        {metricsEntries.length > 0 && (
          <div className="detail-section">
            <h3 className="detail-section__title">{tx('detail.section.keyMetrics', 'KEY METRICS')}</h3>
            <div className="detail-specs">
              {metricsEntries.map(({ label, value }) => (
                <div key={label} className="detail-spec-row">
                  <span className="detail-spec-label">{label}</span>
                  <span className="detail-spec-value">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!company) return null;

  const suppliers = relationships.filter((r) => r.to === selectedId);
  const customers = relationships.filter((r) => r.from === selectedId);
  const specs = company.robotSpecs;
  const companyDesc = tx(`company.${company.id}.desc`, company.description);

  const typeLabel =
    (COMPANY_TYPES.includes(company.type as (typeof COMPANY_TYPES)[number])
      ? tx(`detail.type.${company.type}`, {
          oem: 'OEM',
          tier1_supplier: 'TIER 1',
          component_maker: 'COMPONENT',
          raw_material: 'RAW MATERIAL',
          ai_compute: 'AI / COMPUTE',
        }[company.type as (typeof COMPANY_TYPES)[number]])
      : company.type);

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-header__top">
          <div className={`detail-type-badge detail-type-badge--${company.type}`}>
            {typeLabel}
          </div>
          <span className="detail-country">
            {COUNTRY_FLAGS[company.country] || ''} {company.country}
          </span>
        </div>
        <h2 className="detail-name">{company.name}</h2>
        {company.ticker && <span className="detail-ticker">{company.ticker}</span>}
        {company.marketShare && (
          <span className="detail-market-share">
            {tx('detail.marketShare', 'Market Share: {pct}').replace('{pct}', company.marketShare)}
          </span>
        )}
        <p className="detail-desc">{companyDesc}</p>
      </div>

      {company.plyModel && (
        <div className="detail-model">
          <PLYViewer modelUrl={company.plyModel} />
        </div>
      )}

      {(() => {
        const funding = companyFunding.find((f) => f.companyId === selectedId);
        if (!funding || funding.rounds.length === 0) return null;
        const maxRound = Math.max(...funding.rounds.filter((r) => r.amountM).map((r) => r.amountM!));
        const formatAmt = (m: number) => (m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${Math.round(m)}M`);
        return (
          <div className="detail-section">
            <h3 className="detail-section__title">{tx('detail.section.funding', 'FUNDING')}</h3>
            {funding.totalRaisedM && (
              <div className="detail-spec-row detail-spec-row--highlight">
                <span className="detail-spec-label">{tx('detail.funding.totalRaised', 'Total Raised')}</span>
                <span className="detail-spec-value">{formatAmt(funding.totalRaisedM)}</span>
              </div>
            )}
            {funding.latestValuationM && (
              <div className="detail-spec-row">
                <span className="detail-spec-label">{tx('detail.funding.valuation', 'Valuation')}</span>
                <span className="detail-spec-value">
                  {formatAmt(funding.latestValuationM)}
                  {funding.latestValuationNote ? ` (${funding.latestValuationNote})` : ''}
                </span>
              </div>
            )}
            {funding.ipoPlans && (
              <div className="detail-spec-row">
                <span className="detail-spec-label">{tx('detail.funding.ipoPlans', 'IPO Plans')}</span>
                <span className="detail-spec-value">{funding.ipoPlans}</span>
              </div>
            )}
            <div className="detail-funding-rounds">
              {funding.rounds.map((r, i) => (
                <div key={i} className="detail-funding-round">
                  <div className="detail-funding-round__info">
                    <span className="detail-funding-round__name">{r.name}</span>
                    <span className="detail-funding-round__date">{r.date}</span>
                  </div>
                  {r.amountM ? (
                    <>
                      <div className="detail-funding-round__bar-wrap">
                        <div
                          className="detail-funding-round__bar"
                          style={{ width: `${(r.amountM / maxRound) * 100}%` }}
                        />
                      </div>
                      <span className="detail-funding-round__amount">{formatAmt(r.amountM)}</span>
                    </>
                  ) : (
                    <span className="detail-funding-round__amount detail-funding-round__amount--dim">
                      {tx('detail.funding.undisclosed', 'undisclosed')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {funding.keyInvestors.length > 0 && (
              <>
                <h4 className="detail-funding-subtitle">{tx('detail.funding.keyInvestors', 'KEY INVESTORS')}</h4>
                <div className="detail-funding-investors">
                  {funding.keyInvestors.map((inv) => (
                    <span key={inv} className="detail-funding-investor">{inv}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {suppliers.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section__title">
            {tx('detail.section.suppliers', '▲ SUPPLIERS ({n})').replace('{n}', String(suppliers.length))}
          </h3>
          <div className="detail-relationships">
            {suppliers.map((rel) => {
              const supplier = companies.find((c) => c.id === rel.from);
              if (!supplier) return null;
              return (
                <button
                  key={rel.id}
                  className="detail-rel-row"
                  onClick={() => onNavigate(rel.from)}
                >
                  <div className="detail-rel-info">
                    <span className="detail-rel-name">{supplier.name}</span>
                    <span className="detail-rel-component">{txSupplyComponent(tx, rel.component)}</span>
                  </div>
                  {rel.bomPercent && (
                    <div className="detail-rel-metric">
                      <div
                        className="detail-rel-bar"
                        style={{ width: `${rel.bomPercent}%` }}
                      />
                      <span>{tx('detail.bomPercent', '{n}% BOM').replace('{n}', String(rel.bomPercent))}</span>
                    </div>
                  )}
                  <span className="detail-rel-arrow">→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {customers.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section__title">
            {tx('detail.section.customers', '▼ CUSTOMERS ({n})').replace('{n}', String(customers.length))}
          </h3>
          <div className="detail-relationships">
            {customers.map((rel) => {
              const customer = companies.find((c) => c.id === rel.to);
              if (!customer) return null;
              return (
                <button
                  key={rel.id}
                  className="detail-rel-row"
                  onClick={() => onNavigate(rel.to)}
                >
                  <div className="detail-rel-info">
                    <span className="detail-rel-name">{customer.name}</span>
                    <span className="detail-rel-component">{txSupplyComponent(tx, rel.component)}</span>
                  </div>
                  <span className="detail-rel-arrow">→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {specs && (
        <div className="detail-section">
          <h3 className="detail-section__title">{tx('detail.section.specifications', 'SPECIFICATIONS')}</h3>
          <div className="detail-specs">
            <SpecRow tx={tx} label={tx('detail.spec.Status', 'Status')} value={specs.status} highlight={specs.status === 'In Production'} />
            <SpecRow tx={tx} label={tx('detail.spec.Launch', 'Launch')} value={specs.launchDate} />
            {specs.shipments2025 && (
              <SpecRow
                tx={tx}
                label={tx('detail.spec.2025_Shipments', '2025 Shipments')}
                value={`${specs.shipments2025.toLocaleString()} (${specs.shipmentShare})`}
              />
            )}
            <SpecRow tx={tx} label={tx('detail.spec.Target_Use', 'Target Use')} value={specs.targetUse.join(', ')} />
            <SpecRow tx={tx} label={tx('detail.spec.Mass', 'Mass')} value={specs.mass} />
            <SpecRow tx={tx} label={tx('detail.spec.Height', 'Height')} value={specs.height} />
            <SpecRow tx={tx} label={tx('detail.spec.Speed', 'Speed')} value={specs.speed} />
            <SpecRow tx={tx} label={tx('detail.spec.Total_DOF', 'Total DOF')} value={specs.totalDOF} />
            <SpecRow tx={tx} label={tx('detail.spec.Operating_Time', 'Operating Time')} value={specs.operatingTime} />
            <SpecRow tx={tx} label={tx('detail.spec.Payload', 'Payload')} value={specs.payloadCapacity} />
            <SpecRow tx={tx} label={tx('detail.spec.End_Effector', 'End Effector')} value={specs.endEffector} />
            <SpecRow tx={tx} label={tx('detail.spec.Locomotion', 'Locomotion')} value={specs.locomotion} />
            <SpecRow tx={tx} label={tx('detail.spec.Materials', 'Materials')} value={specs.materials} />
            <SpecRow tx={tx} label={tx('detail.spec.Motor', 'Motor')} value={specs.motor} />
            <SpecRow tx={tx} label={tx('detail.spec.Actuator_Body', 'Actuator (Body)')} value={specs.actuatorBody} />
            <SpecRow tx={tx} label={tx('detail.spec.Transmission', 'Transmission')} value={specs.transmission} />
            <SpecRow tx={tx} label={tx('detail.spec.Ext_Sensors', 'Ext. Sensors')} value={specs.externalSensors} />
            <SpecRow tx={tx} label={tx('detail.spec.Compute', 'Compute')} value={specs.compute} />
            <SpecRow tx={tx} label={tx('detail.spec.Battery', 'Battery')} value={specs.battery} />
            <SpecRow tx={tx} label={tx('detail.spec.AI_Partner', 'AI Partner')} value={specs.aiPartner} />
            <SpecRow tx={tx} label={tx('detail.spec.Software', 'Software')} value={specs.software} />
            <SpecRow tx={tx} label={tx('detail.spec.Data_Collection', 'Data Collection')} value={specs.dataCollection} />
            {specs.bom && <SpecRow tx={tx} label={tx('detail.spec.BOM', 'BOM')} value={specs.bom} />}
            {specs.price && <SpecRow tx={tx} label={tx('detail.spec.Price', 'Price')} value={specs.price} highlight />}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({
  tx,
  label,
  value,
  highlight,
}: {
  tx: (key: string, en: string) => string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const ndEn = 'Not disclosed';
  const nd = tx('detail.spec.notDisclosed', ndEn);
  if (!value || value === ndEn || value === nd) return null;
  return (
    <div className={`detail-spec-row ${highlight ? 'detail-spec-row--highlight' : ''}`}>
      <span className="detail-spec-label">{label}</span>
      <span className="detail-spec-value">{value}</span>
    </div>
  );
}
