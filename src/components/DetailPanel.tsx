import { companies, relationships, componentCategories } from '../data';
import PLYViewer from './PLYViewer';

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

const TYPE_LABELS: Record<string, string> = {
  oem: 'OEM',
  tier1_supplier: 'TIER 1',
  component_maker: 'COMPONENT',
  raw_material: 'RAW MATERIAL',
  ai_compute: 'AI / COMPUTE',
};

export default function DetailPanel({ selectedId, onNavigate, onClose }: DetailPanelProps) {
  if (!selectedId) {
    return (
      <div className="detail-panel detail-panel--empty">
        <div className="detail-empty">
          <div className="detail-empty__icon">◎</div>
          <div className="detail-empty__text">SELECT A NODE</div>
          <div className="detail-empty__sub">Click any entity in the graph to view supply chain details</div>
        </div>
      </div>
    );
  }

  const company = companies.find((c) => c.id === selectedId);

  // Check if it's a component category
  const component = componentCategories.find((c) => c.id === selectedId);
  if (component && !company) {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <button className="detail-close" onClick={onClose}>✕</button>
          <div className="detail-type-badge detail-type-badge--component">COMPONENT</div>
          <h2 className="detail-name">{component.name}</h2>
          <p className="detail-desc">{component.description}</p>
        </div>
        {component.plyModel && (
          <div className="detail-model">
            <PLYViewer modelUrl={component.plyModel} />
          </div>
        )}
        {component.bottleneck && (
          <div className="detail-alert">
            <span className="detail-alert__icon">⚠</span>
            <span>SUPPLY CHAIN BOTTLENECK</span>
            <p className="detail-alert__reason">{component.bottleneckReason}</p>
          </div>
        )}
        {component.keyMetrics && (
          <div className="detail-section">
            <h3 className="detail-section__title">KEY METRICS</h3>
            <div className="detail-specs">
              {Object.entries(component.keyMetrics).map(([key, val]) => (
                <div key={key} className="detail-spec-row">
                  <span className="detail-spec-label">{key}</span>
                  <span className="detail-spec-value">{val}</span>
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

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <button className="detail-close" onClick={onClose}>✕</button>
        <div className="detail-header__top">
          <div className={`detail-type-badge detail-type-badge--${company.type}`}>
            {TYPE_LABELS[company.type] || company.type}
          </div>
          <span className="detail-country">
            {COUNTRY_FLAGS[company.country] || ''} {company.country}
          </span>
        </div>
        <h2 className="detail-name">{company.name}</h2>
        {company.ticker && <span className="detail-ticker">{company.ticker}</span>}
        {company.marketShare && (
          <span className="detail-market-share">Market Share: {company.marketShare}</span>
        )}
        <p className="detail-desc">{company.description}</p>
      </div>

      {company.plyModel && (
        <div className="detail-model">
          <PLYViewer modelUrl={company.plyModel} />
        </div>
      )}

      {/* SPLC-Style Supply Chain View */}
      {suppliers.length > 0 && (
        <div className="detail-section">
          <h3 className="detail-section__title">
            ▲ SUPPLIERS ({suppliers.length})
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
                    <span className="detail-rel-component">{rel.component}</span>
                  </div>
                  {rel.bomPercent && (
                    <div className="detail-rel-metric">
                      <div
                        className="detail-rel-bar"
                        style={{ width: `${rel.bomPercent}%` }}
                      />
                      <span>{rel.bomPercent}% BOM</span>
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
            ▼ CUSTOMERS ({customers.length})
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
                    <span className="detail-rel-component">{rel.component}</span>
                  </div>
                  <span className="detail-rel-arrow">→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Robot Specs (for OEMs) */}
      {specs && (
        <div className="detail-section">
          <h3 className="detail-section__title">SPECIFICATIONS</h3>
          <div className="detail-specs">
            <SpecRow label="Status" value={specs.status} highlight={specs.status === 'In Production'} />
            <SpecRow label="Launch" value={specs.launchDate} />
            {specs.shipments2025 && (
              <SpecRow label="2025 Shipments" value={`${specs.shipments2025.toLocaleString()} (${specs.shipmentShare})`} />
            )}
            <SpecRow label="Target Use" value={specs.targetUse.join(', ')} />
            <SpecRow label="Mass" value={specs.mass} />
            <SpecRow label="Height" value={specs.height} />
            <SpecRow label="Speed" value={specs.speed} />
            <SpecRow label="Total DOF" value={specs.totalDOF} />
            <SpecRow label="Operating Time" value={specs.operatingTime} />
            <SpecRow label="Payload" value={specs.payloadCapacity} />
            <SpecRow label="End Effector" value={specs.endEffector} />
            <SpecRow label="Locomotion" value={specs.locomotion} />
            <SpecRow label="Materials" value={specs.materials} />
            <SpecRow label="Motor" value={specs.motor} />
            <SpecRow label="Actuator (Body)" value={specs.actuatorBody} />
            <SpecRow label="Transmission" value={specs.transmission} />
            <SpecRow label="Ext. Sensors" value={specs.externalSensors} />
            <SpecRow label="Compute" value={specs.compute} />
            <SpecRow label="Battery" value={specs.battery} />
            <SpecRow label="AI Partner" value={specs.aiPartner} />
            <SpecRow label="Software" value={specs.software} />
            <SpecRow label="Data Collection" value={specs.dataCollection} />
            {specs.bom && <SpecRow label="BOM" value={specs.bom} />}
            {specs.price && <SpecRow label="Price" value={specs.price} highlight />}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  if (!value || value === 'Not disclosed') return null;
  return (
    <div className={`detail-spec-row ${highlight ? 'detail-spec-row--highlight' : ''}`}>
      <span className="detail-spec-label">{label}</span>
      <span className="detail-spec-value">{value}</span>
    </div>
  );
}
