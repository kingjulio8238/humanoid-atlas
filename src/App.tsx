import { useState, useMemo, useEffect } from 'react';
import PLYViewer, { preloadPLY } from './components/PLYViewer';
import { companies, relationships, componentCategories } from './data';
import './App.css';

// Start fetching the skeleton model immediately on module load
preloadPLY('/models/skeleton.ply');

const TABS = [
  { id: 'skeleton', label: 'Skeleton' },
  { id: 'all_oems', label: 'All OEMs' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'sensors_general', label: 'Sensors' },
  { id: 'compute', label: 'Compute' },
  { id: 'batteries', label: 'Battery' },
  { id: 'motors', label: 'Motors' },
  { id: 'reducers', label: 'Reducers' },
  { id: 'bearings', label: 'Bearings' },
  { id: 'actuators_rotary', label: 'Actuators' },
  { id: 'screws', label: 'Screws' },
  { id: 'end_effectors', label: 'Hands' },
  { id: 'pcbs', label: 'PCBs' },
];

// Per-model spin speed multipliers (normalize perceived rotation speed)
const MODEL_SPIN: Record<string, number> = {
  '/models/skeleton.ply': 2.2,
  '/models/battery.ply': 1.5,
  '/models/bldc-motor.ply': 1.3,
  '/models/harmonic-reducer.ply': 1.15,
  '/models/bearings.ply': 1.3,
  '/models/linear-actuator.ply': 1.043,
  '/models/planetary-screw.ply': 1.13,
  '/models/end-effector.ply': 1.44,
};

// Per-model scale overrides (default is 1.05 in PLYViewer)
const MODEL_SCALE: Record<string, number> = {
  '/models/harmonic-reducer.ply': 0.9,
  '/models/bearings.ply': 0.9,
  '/models/linear-actuator.ply': 1.5,
  '/models/planetary-screw.ply': 1.3,
};

// Per-model orientation fixes (most models are fine, these need correction)
const MODEL_ROTATIONS: Record<string, [number, number, number]> = {
  '/models/skeleton.ply': [-Math.PI / 2, 0, 0],
  '/models/end-effector.ply': [-Math.PI / 2, 0, 0],
  '/models/planetary-screw.ply': [0, 0, 0],
  '/models/linear-actuator.ply': [0, 0, -Math.PI / 2],
  '/models/rotary-actuator.ply': [Math.PI / 2, 0, 0],
  '/models/compute.ply': [-Math.PI / 2, 0, 0],
  '/models/battery.ply': [-Math.PI / 2, 0, 0],
  '/models/camera-sensor.ply': [Math.PI / 2, 0, 0],
  '/models/bearings.ply': [Math.PI / 2, 0, 0],
};

const ACTUATOR_INFO = {
  linear: {
    description: 'Linear actuators convert rotary motion into push/pull force using planetary roller screws. They provide the high-force movements needed in legs and torso — extending and retracting to walk, squat, and lift. Tesla Optimus uses 14 linear actuators across three force classes. The planetary roller screw is the critical precision component, and a key supply chain bottleneck.',
    keyMetrics: {
      'Tesla Optimus Count': '14 linear actuators',
      'Force Classes (Tesla)': '500N, 3900N, 8000N',
      'Key Component': 'Planetary roller screw',
      'Screw Ratio (Tesla)': '1:14',
      'Bottleneck': 'Precision grinding for screws',
      'Transmission': 'Motor → Planetary Roller Screw → Linear output',
    },
  },
  rotary: {
    description: 'Rotary actuators handle all joint movements — shoulders, elbows, hips, knees, wrists. Each is a self-contained module combining a frameless BLDC motor + harmonic reducer + dual encoders + torque sensor. The harmonic reducer alone accounts for ~36% of the actuator cost, making it the most expensive single component. Unitree achieves ~$300/unit through Chinese supply chain optimization.',
    keyMetrics: {
      'Tesla Optimus Count': '20 rotary actuators',
      'Torque Classes (Tesla)': '20Nm, 110Nm, 180Nm',
      'Cost Breakdown': 'Reducer 36%, Torque sensor 30%, Motor 13.5%',
      'Unitree Cost': '~$300/unit',
      'Encoders': '2 per rotary actuator',
      'Design Trend': 'Quasi-Direct Drive (QDD)',
      'Alt Approach': 'Tendon drive (1X Neo — no gearboxes)',
    },
  },
};

const COMPONENT_KEYWORDS: Record<string, string[]> = {
  motors: ['bldc motors', 'motors', 'servo motors'],
  reducers: ['harmonic reducer', 'strain wave reducer', 'cycloidal reducer'],
  compute: ['jetson', 'nvidia gpu', 'cpu', 'soc', 'n97', 'ai chips', 'ai/ml models'],
  sensors_general: ['lidar', 'image sensors', 'depth cameras', 'imu'],
  end_effectors: ['dexterous hands'],
  pcbs: ['motor drivers', 'analog ics', 'power semiconductors', 'mlcc', 'passive components', 'chip fabrication', 'mems'],
  batteries: ['battery cells', 'battery pack'],
  bearings: ['cross-roller bearings', 'ball bearings', 'bearings'],
  actuators_rotary: ['actuator modules', 'servo actuators'],
  actuators_rotary_only: ['servo actuators'],
  actuators_linear_only: ['actuator modules'],
  actuators_linear: ['actuator modules'],
  screws: ['planetary roller screws', 'roller screws'],
  sensors_tactile: [],
  skeleton: [],
};

// Component IDs that map to the TABS for sovereignty analysis
const SOVEREIGNTY_COMPONENTS = [
  'motors', 'reducers', 'screws', 'bearings', 'batteries', 'compute',
  'sensors_general', 'end_effectors', 'pcbs',
];

function getSovereigntyData() {
  return SOVEREIGNTY_COMPONENTS.map((compId) => {
    const keywords = COMPONENT_KEYWORDS[compId] || [];
    const category = componentCategories.find((c) => c.id === compId);
    const rels = relationships.filter((r) =>
      keywords.some((kw) => r.component.toLowerCase().includes(kw))
    );
    const supplierIds = [...new Set(rels.map((r) => r.from))];
    const suppliers = supplierIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean) as typeof companies;

    const groups: Record<string, typeof companies> = { US: [], CN: [], OTHER: [] };
    suppliers.forEach((s) => {
      groups[getCountryGroup(s.country)].push(s);
    });
    const total = suppliers.length;
    return {
      id: compId,
      name: category?.name || compId,
      bottleneck: category?.bottleneck || false,
      groups,
      total,
      pctUS: total ? Math.round((groups.US.length / total) * 100) : 0,
      pctCN: total ? Math.round((groups.CN.length / total) * 100) : 0,
      pctOther: total ? Math.round((groups.OTHER.length / total) * 100) : 0,
    };
  });
}

function getScoreboardData() {
  const groups: ('US' | 'CN' | 'OTHER')[] = ['US', 'CN', 'OTHER'];
  const oemList = companies.filter((c) => c.type === 'oem');

  return groups.map((group) => {
    const groupOems = oemList.filter((c) => getCountryGroup(c.country) === group);
    const groupSuppliers = companies.filter((c) => c.type !== 'oem' && getCountryGroup(c.country) === group);

    const totalShipments = groupOems.reduce((s, c) => s + (c.robotSpecs?.shipments2025 || 0), 0);

    // Self-sufficiency: for each OEM in this group, what % of their suppliers are also in this group?
    let selfSufficiencySum = 0;
    let selfSufficiencyCount = 0;
    groupOems.forEach((oem) => {
      const supplierRels = relationships.filter((r) => r.to === oem.id);
      if (supplierRels.length === 0) return;
      const domesticCount = supplierRels.filter((r) => {
        const supplier = companies.find((c) => c.id === r.from);
        return supplier && getCountryGroup(supplier.country) === group;
      }).length;
      selfSufficiencySum += (domesticCount / supplierRels.length) * 100;
      selfSufficiencyCount++;
    });
    const selfSufficiency = selfSufficiencyCount ? Math.round(selfSufficiencySum / selfSufficiencyCount) : 0;

    // Bottleneck exposure: how many bottleneck component categories have NO supplier from this group?
    const bottleneckCategories = componentCategories.filter((c) => c.bottleneck);
    let bottleneckExposed = 0;
    bottleneckCategories.forEach((cat) => {
      const keywords = COMPONENT_KEYWORDS[cat.id] || [];
      const rels = relationships.filter((r) =>
        keywords.some((kw) => r.component.toLowerCase().includes(kw))
      );
      const supplierIds = [...new Set(rels.map((r) => r.from))];
      const hasGroupSupplier = supplierIds.some((id) => {
        const s = companies.find((c) => c.id === id);
        return s && getCountryGroup(s.country) === group;
      });
      if (!hasGroupSupplier) bottleneckExposed++;
    });

    return {
      group,
      label: group === 'US' ? 'United States' : group === 'CN' ? 'China' : 'Rest of World',
      oemCount: groupOems.length,
      supplierCount: groupSuppliers.length,
      totalShipments,
      selfSufficiency,
      bottleneckExposed,
      bottleneckTotal: bottleneckCategories.length,
    };
  });
}

function getOemNationalityData() {
  const oemList = companies.filter((c) => c.type === 'oem');
  return oemList.map((oem) => {
    const supplierRels = relationships.filter((r) => r.to === oem.id);
    const supplierCompanies = supplierRels
      .map((r) => companies.find((c) => c.id === r.from))
      .filter(Boolean) as typeof companies;

    const groups: Record<string, number> = { US: 0, CN: 0, OTHER: 0 };
    supplierCompanies.forEach((s) => {
      groups[getCountryGroup(s.country)]++;
    });
    const total = supplierCompanies.length;
    return {
      id: oem.id,
      name: oem.name,
      country: oem.country,
      countryGroup: getCountryGroup(oem.country),
      total,
      pctUS: total ? Math.round((groups.US / total) * 100) : 0,
      pctCN: total ? Math.round((groups.CN / total) * 100) : 0,
      pctOther: total ? Math.round((groups.OTHER / total) * 100) : 0,
    };
  });
}

function getCutWireImpact(cutSet: Set<string>) {
  if (cutSet.size === 0) return null;

  const oemList = companies.filter((c) => c.type === 'oem');
  const oemImpacts = oemList.map((oem) => {
    const allRels = relationships.filter((r) => r.to === oem.id);
    const cutRels = allRels.filter((r) => {
      const supplier = companies.find((c) => c.id === r.from);
      return supplier && cutSet.has(getCountryGroup(supplier.country));
    });
    return {
      id: oem.id,
      name: oem.name,
      country: oem.country,
      totalSuppliers: allRels.length,
      lostSuppliers: cutRels.length,
      lostComponents: [...new Set(cutRels.map((r) => r.component))],
      pctLost: allRels.length ? Math.round((cutRels.length / allRels.length) * 100) : 0,
    };
  }).filter((o) => o.lostSuppliers > 0)
    .sort((a, b) => b.pctLost - a.pctLost);

  // Component categories affected
  const componentImpacts = SOVEREIGNTY_COMPONENTS.map((compId) => {
    const keywords = COMPONENT_KEYWORDS[compId] || [];
    const category = componentCategories.find((c) => c.id === compId);
    const rels = relationships.filter((r) =>
      keywords.some((kw) => r.component.toLowerCase().includes(kw))
    );
    const supplierIds = [...new Set(rels.map((r) => r.from))];
    const totalSuppliers = supplierIds.length;
    const remainingSuppliers = supplierIds.filter((id) => {
      const s = companies.find((c) => c.id === id);
      return s && !cutSet.has(getCountryGroup(s.country));
    }).length;

    return {
      id: compId,
      name: category?.name || compId,
      bottleneck: category?.bottleneck || false,
      totalSuppliers,
      remainingSuppliers,
      lostCount: totalSuppliers - remainingSuppliers,
      pctRemaining: totalSuppliers ? Math.round((remainingSuppliers / totalSuppliers) * 100) : 100,
    };
  }).filter((c) => c.lostCount > 0);

  return { oemImpacts, componentImpacts };
}

function getComponentChain(componentId: string) {
  const keywords = COMPONENT_KEYWORDS[componentId] || [];
  const rels = relationships.filter((r) =>
    keywords.some((kw) => r.component.toLowerCase().includes(kw))
  );
  const supplierIds = [...new Set(rels.map((r) => r.from))];
  const oemIds = [...new Set(rels.map((r) => r.to))];
  const upstreamRels = relationships.filter(
    (r) => supplierIds.includes(r.to) && !supplierIds.includes(r.from)
  );
  const upstreamIds = [...new Set(upstreamRels.map((r) => r.from))];

  return {
    upstream: upstreamIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    suppliers: supplierIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    oems: oemIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    rels,
    upstreamRels,
  };
}

type CountryGroup = 'US' | 'CN' | 'OTHER' | null;

function getCountryGroup(country: string): 'US' | 'CN' | 'OTHER' {
  if (country === 'US') return 'US';
  if (country === 'CN') return 'CN';
  return 'OTHER';
}

// Map supplier → component category label based on what they supply
const SUPPLIER_COMPONENT_LABEL: Record<string, string> = {
  nvidia: 'Compute', intel: 'Compute', horizon_robotics: 'Compute',
  harmonic_drive: 'Reducers', nabtesco: 'Reducers', leaderdrive: 'Reducers',
  maxon: 'Motors', kollmorgen: 'Motors', cubemars: 'Motors', nidec: 'Motors', estun: 'Motors', moons: 'Motors',
  sony_sensors: 'Sensors', hesai: 'Sensors', ouster: 'Sensors', orbbec: 'Sensors', bosch_sensortec: 'IMU',
  thk: 'Bearings', skf: 'Bearings', nsk: 'Bearings',
  rollvis: 'Screws', ewellix: 'Screws', nanjing_kgm: 'Screws',
  catl: 'Batteries', panasonic_energy: 'Batteries', byd_battery: 'Batteries', lg_energy: 'Batteries', samsung_sdi: 'Batteries',
  tsmc: 'Chip Fab', texas_instruments: 'PCBs', infineon: 'PCBs', samsung_electro: 'PCBs', stmicro: 'PCBs',
  psyonic: 'Hands', sharpa: 'Hands',
  google_deepmind: 'AI/ML',
  mp_materials: 'Rare Earths', lynas: 'Rare Earths', jl_mag: 'Rare Earths',
};

// Component categories that are bottlenecks (from componentCategories data)
const BOTTLENECK_COMPONENTS = new Set(['Reducers', 'Screws']);

function getSPOFData() {
  const oemList = companies.filter((c) => c.type === 'oem');
  const totalOems = oemList.length;
  const oemIds = new Set(oemList.map((c) => c.id));

  // For each non-OEM company, find direct OEM relationships
  const supplierList = companies.filter((c) => c.type !== 'oem');

  const spofRows = supplierList.map((supplier) => {
    // Direct relationships where this supplier feeds an OEM
    const directRels = relationships.filter(
      (r) => r.from === supplier.id && oemIds.has(r.to)
    );
    const dependentOemIds = [...new Set(directRels.map((r) => r.to))];
    const dependentOems = dependentOemIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean) as typeof companies;

    const componentLabel = SUPPLIER_COMPONENT_LABEL[supplier.id] || 'Other';
    const isBottleneck = BOTTLENECK_COMPONENTS.has(componentLabel);

    // Find alternative suppliers: other companies that supply the same component label and have OEM relationships
    const alternatives = supplierList.filter((s) => {
      if (s.id === supplier.id) return false;
      if (SUPPLIER_COMPONENT_LABEL[s.id] !== componentLabel) return false;
      // Must have at least one direct OEM relationship
      return relationships.some((r) => r.from === s.id && oemIds.has(r.to));
    });

    const oemFraction = totalOems > 0 ? dependentOemIds.length / totalOems : 0;
    const altScarcity = 1 / (1 + alternatives.length);
    const bottleneckMultiplier = isBottleneck ? 1.5 : 1;
    const rawScore = oemFraction * altScarcity * bottleneckMultiplier;
    // Normalize: max possible is 1.0 * 1.0 * 1.5 = 1.5
    const score = Math.round((rawScore / 1.5) * 100);

    const level: 'HIGH' | 'MEDIUM' | 'LOW' =
      score >= 25 ? 'HIGH' : score >= 12 ? 'MEDIUM' : 'LOW';

    return {
      id: supplier.id,
      name: supplier.name,
      country: supplier.country,
      componentLabel,
      isBottleneck,
      oemCount: dependentOemIds.length,
      totalOems,
      dependentOems,
      alternatives: alternatives.map((a) => ({ id: a.id, name: a.name, country: a.country })),
      score,
      level,
    };
  })
    .filter((row) => row.oemCount >= 2)
    .sort((a, b) => b.score - a.score || b.oemCount - a.oemCount)
    .slice(0, 6);

  // Tier 2 chokepoints: suppliers that don't supply OEMs directly but supply critical suppliers
  const tier2 = supplierList
    .filter((s) => {
      const directOemCount = relationships.filter(
        (r) => r.from === s.id && oemIds.has(r.to)
      ).length;
      if (directOemCount > 2) return false; // Already in the main list
      // Find suppliers this company feeds
      const downstreamSuppliers = relationships
        .filter((r) => r.from === s.id && !oemIds.has(r.to))
        .map((r) => r.to);
      if (downstreamSuppliers.length === 0) return false;
      // Count how many OEMs those downstream suppliers reach
      const cascadeOemIds = new Set<string>();
      downstreamSuppliers.forEach((dsId) => {
        relationships
          .filter((r) => r.from === dsId && oemIds.has(r.to))
          .forEach((r) => cascadeOemIds.add(r.to));
      });
      return cascadeOemIds.size >= 5; // Significant cascade
    })
    .map((s) => {
      const downstreamSuppliers = relationships
        .filter((r) => r.from === s.id && !oemIds.has(r.to))
        .map((r) => {
          const ds = companies.find((c) => c.id === r.to);
          return ds ? { id: ds.id, name: ds.name } : null;
        })
        .filter(Boolean) as { id: string; name: string }[];

      const cascadeOemIds = new Set<string>();
      downstreamSuppliers.forEach((ds) => {
        relationships
          .filter((r) => r.from === ds.id && oemIds.has(r.to))
          .forEach((r) => cascadeOemIds.add(r.to));
      });

      return {
        id: s.id,
        name: s.name,
        country: s.country,
        componentLabel: SUPPLIER_COMPONENT_LABEL[s.id] || 'Other',
        feedsInto: downstreamSuppliers,
        cascadeOemCount: cascadeOemIds.size,
        totalOems,
      };
    });

  return { spofRows, tier2 };
}

export default function App() {
  const [activeTab, setActiveTab] = useState('skeleton');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [actuatorType, setActuatorType] = useState<'linear' | 'rotary'>('linear');
  const [chainFocus, setChainFocus] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<CountryGroup>(null);
  const [cutCountries, setCutCountries] = useState<Set<string>>(new Set());
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/views', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setViewCount(d.views))
      .catch(() => {});
  }, []);

  const selectedComponent = useMemo(
    () => (activeTab !== 'skeleton' ? componentCategories.find((c) => c.id === activeTab) : null),
    [activeTab]
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companyId]
  );

  const chain = useMemo(() => {
    if (activeTab === 'skeleton' || activeTab === 'all_oems' || activeTab === 'geopolitics') return null;
    if (activeTab === 'actuators_rotary') {
      return getComponentChain(actuatorType === 'linear' ? 'actuators_linear_only' : 'actuators_rotary_only');
    }
    return getComponentChain(activeTab);
  }, [activeTab, actuatorType]);

  const oems = companies.filter((c) => c.type === 'oem');

  // Compute which entities are connected to the focused entity in the chain
  const connectedIds = useMemo(() => {
    if (!chainFocus || !chain) return null;
    const ids = new Set<string>();
    ids.add(chainFocus);
    // If focused entity is a supplier, find its OEMs and upstream
    chain.rels.forEach((r) => {
      if (r.from === chainFocus) ids.add(r.to);
      if (r.to === chainFocus) ids.add(r.from);
    });
    chain.upstreamRels.forEach((r) => {
      if (r.from === chainFocus) ids.add(r.to);
      if (r.to === chainFocus) ids.add(r.from);
    });
    return ids;
  }, [chainFocus, chain]);

  const handleSelectCompany = (id: string) => {
    setCompanyId(id);
  };

  const handleBackFromCompany = () => {
    setCompanyId(null);
  };

  // ==================== COMPANY VIEW ====================
  if (companyId && selectedCompany) {
    const specs = selectedCompany.robotSpecs;
    const supplierRels = relationships.filter((r) => r.to === selectedCompany.id);
    const customerRels = relationships.filter((r) => r.from === selectedCompany.id);

    return (
      <div className="app">
        <header className="header">
          <button className="back-btn" onClick={handleBackFromCompany}>&larr;</button>
          <span className="header-title">{selectedCompany.name}</span>
          {selectedCompany.ticker && <span className="header-ticker">{selectedCompany.ticker}</span>}
          <span className="header-badge">{selectedCompany.country}</span>
        </header>

        <main className="company-view">
          <div className="company-top">
            <div className="company-model">
              {selectedCompany.robotImage ? (
                <div className="company-image">
                  <img src={selectedCompany.robotImage} alt={selectedCompany.name} />
                </div>
              ) : selectedCompany.plyModel ? (
                <PLYViewer
                  modelUrl={selectedCompany.plyModel}
                  color="#1a1a1a"
                  initialRotation={MODEL_ROTATIONS[selectedCompany.plyModel]}
                />
              ) : (
                <div className="model-placeholder" />
              )}
            </div>
            <div className="company-info">
              <p className="company-desc">{selectedCompany.description}</p>
              {selectedCompany.marketShare && (
                <div className="company-share">Market Share: {selectedCompany.marketShare}</div>
              )}
            </div>
          </div>

          {supplierRels.length > 0 && (
            <div className="company-section">
              <h3 className="section-title">Suppliers ({supplierRels.length})</h3>
              <div className="rel-list">
                {supplierRels.map((rel) => {
                  const supplier = companies.find((c) => c.id === rel.from);
                  if (!supplier) return null;
                  return (
                    <button key={rel.id} className="rel-row" onClick={() => handleSelectCompany(rel.from)}>
                      <span className="rel-name">{supplier.name}</span>
                      <span className="rel-component">{rel.component}</span>
                      {rel.bomPercent && <span className="rel-pct">{rel.bomPercent}%</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customerRels.length > 0 && (
            <div className="company-section">
              <h3 className="section-title">Customers ({customerRels.length})</h3>
              <div className="rel-list">
                {customerRels.map((rel) => {
                  const customer = companies.find((c) => c.id === rel.to);
                  if (!customer) return null;
                  return (
                    <button key={rel.id} className="rel-row" onClick={() => handleSelectCompany(rel.to)}>
                      <span className="rel-name">{customer.name}</span>
                      <span className="rel-component">{rel.component}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {specs && (
            <div className="company-section">
              <h3 className="section-title">Specifications</h3>
              <div className="specs-grid">
                <Spec label="Status" value={specs.status} />
                <Spec label="Launch" value={specs.launchDate} />
                {specs.shipments2025 && (
                  <Spec label="2025 Shipments" value={`${specs.shipments2025.toLocaleString()} (${specs.shipmentShare})`} />
                )}
                <Spec label="Target" value={specs.targetUse.join(', ')} />
                <Spec label="Mass" value={specs.mass} />
                <Spec label="Height" value={specs.height} />
                <Spec label="Speed" value={specs.speed} />
                <Spec label="DOF" value={specs.totalDOF} />
                <Spec label="Runtime" value={specs.operatingTime} />
                <Spec label="Payload" value={specs.payloadCapacity} />
                <Spec label="End Effector" value={specs.endEffector} />
                <Spec label="Locomotion" value={specs.locomotion} />
                <Spec label="Materials" value={specs.materials} />
                <Spec label="Motor" value={specs.motor} />
                <Spec label="Body Actuator" value={specs.actuatorBody} />
                <Spec label="Hand Actuator" value={specs.actuatorHand} />
                <Spec label="Transmission" value={specs.transmission} />
                <Spec label="Ext. Sensors" value={specs.externalSensors} />
                <Spec label="Int. Sensors" value={specs.internalSensors} />
                <Spec label="Compute" value={specs.compute} />
                <Spec label="Battery" value={specs.battery} />
                <Spec label="Charging" value={specs.charging} />
                <Spec label="AI Partner" value={specs.aiPartner} />
                <Spec label="Software" value={specs.software} />
                <Spec label="Data Collection" value={specs.dataCollection} />
                {specs.bom && <Spec label="BOM" value={specs.bom} />}
                {specs.price && <Spec label="Price" value={specs.price} highlight />}
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <span>Data: Humanity's Last Machine + RoboStrategy · Maintained by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
        </footer>
      </div>
    );
  }

  // ==================== MAIN VIEW (tabs) ====================
  return (
    <div className="app">
      <header className="header">
        <span className="header-title">Humanoid Atlas</span>
        <span className="header-sub">Humanoid Supply Chain & Landscape Explorer</span>
      </header>

      <div className="country-filter">
          <button
            className={`country-pill ${countryFilter === null ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(null)}
          >All</button>
          <button
            className={`country-pill ${countryFilter === 'US' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'US' ? null : 'US')}
          >US</button>
          <button
            className={`country-pill ${countryFilter === 'CN' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'CN' ? null : 'CN')}
          >China</button>
          <button
            className={`country-pill ${countryFilter === 'OTHER' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'OTHER' ? null : 'OTHER')}
          >Other</button>
        </div>

      <nav className="component-nav">
        {TABS.map((t) => {
          return (
            <button
              key={t.id}
              className={`component-btn ${activeTab === t.id ? 'component-btn--active' : ''}`}
              onClick={() => { setActiveTab(t.id); setChainFocus(null); }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <main className={activeTab === 'skeleton' ? 'skeleton-view' : activeTab === 'geopolitics' ? 'geo-view' : 'component-view'}>
        {/* Skeleton tab */}
        {activeTab === 'skeleton' && (
          <div className="skeleton-center">
            <PLYViewer modelUrl="/models/skeleton.ply" color="#1a1a1a" initialRotation={MODEL_ROTATIONS['/models/skeleton.ply']} spinSpeed={MODEL_SPIN['/models/skeleton.ply']} />
          </div>
        )}

        {/* All OEMs tab */}
        {activeTab === 'all_oems' && (
          <div className="oems-view">
            <div className="oem-image-grid">
              {oems.map((c) => (
                <button key={c.id} className={`oem-image-card ${countryFilter && getCountryGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`} onClick={() => handleSelectCompany(c.id)}>
                  {c.robotImage && (
                    <div className="oem-image-card__img">
                      <img src={c.robotImage} alt={c.name} />
                    </div>
                  )}
                  <div className="oem-image-card__info">
                    <span className="oem-image-card__name">{c.name}</span>
                    <span className="oem-image-card__country">{c.country}</span>
                    {c.robotSpecs?.status === 'In Production' && (
                      <span className="oem-image-card__status">In Production</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Geopolitics tab */}
        {activeTab === 'geopolitics' && (() => {
          const sovereignty = getSovereigntyData();
          const oemNationality = getOemNationalityData();
          const scoreboard = getScoreboardData();
          const cutImpact = getCutWireImpact(cutCountries);
          const { spofRows } = getSPOFData();
          return (
            <div className="geo-content">
              <section className="geo-section">
                <h3 className="section-title">US vs China vs Rest — Scoreboard</h3>
                <div className="scoreboard-grid">
                  {scoreboard.map((col) => (
                    <div key={col.group} className={`scoreboard-col scoreboard-col--${col.group.toLowerCase()}`}>
                      <div className="scoreboard-header">{col.label}</div>
                      <div className="scoreboard-stats">
                        <div className="scoreboard-stat">
                          <span className="scoreboard-stat__value">{col.oemCount}</span>
                          <span className="scoreboard-stat__label">OEMs</span>
                        </div>
                        <div className="scoreboard-stat">
                          <span className="scoreboard-stat__value">{col.supplierCount}</span>
                          <span className="scoreboard-stat__label">Suppliers</span>
                        </div>
                        <div className="scoreboard-stat">
                          <span className="scoreboard-stat__value">{col.totalShipments.toLocaleString()}</span>
                          <span className="scoreboard-stat__label">2025 Shipments</span>
                        </div>
                        <div className="scoreboard-stat">
                          <span className="scoreboard-stat__value">{col.selfSufficiency}%</span>
                          <span className="scoreboard-stat__label">Self-Sufficiency</span>
                        </div>
                        <div className="scoreboard-stat">
                          <span className="scoreboard-stat__value">{col.bottleneckExposed}/{col.bottleneckTotal}</span>
                          <span className="scoreboard-stat__label">Bottleneck Exposed</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="geo-section">
                <h3 className="section-title">Stack Sovereignty — Supplier Origin by Component</h3>
                <div className="sovereignty-stack">
                  {sovereignty.map((row) => (
                    <div key={row.id} className="sovereignty-row">
                      <div className="sovereignty-label">
                        <span>{row.name}</span>
                        {row.bottleneck && <span className="sovereignty-bottleneck">!</span>}
                      </div>
                      <div className="sovereignty-bar">
                        {row.pctUS > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--us" style={{ width: `${row.pctUS}%` }}>
                            <span className="sovereignty-seg__label">{row.pctUS}%</span>
                          </div>
                        )}
                        {row.pctCN > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--cn" style={{ width: `${row.pctCN}%` }}>
                            <span className="sovereignty-seg__label">{row.pctCN}%</span>
                          </div>
                        )}
                        {row.pctOther > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--other" style={{ width: `${row.pctOther}%` }}>
                            <span className="sovereignty-seg__label">{row.pctOther}%</span>
                          </div>
                        )}
                      </div>
                      <div className="sovereignty-count">{row.total}</div>
                    </div>
                  ))}
                </div>
                <div className="sovereignty-legend">
                  <span className="sovereignty-legend__item"><span className="sovereignty-dot sovereignty-dot--us" /> US</span>
                  <span className="sovereignty-legend__item"><span className="sovereignty-dot sovereignty-dot--cn" /> China</span>
                  <span className="sovereignty-legend__item"><span className="sovereignty-dot sovereignty-dot--other" /> Other</span>
                  <span className="sovereignty-legend__item sovereignty-legend__count">Count = total suppliers</span>
                </div>
              </section>

              <section className="geo-section">
                <h3 className="section-title">Critical Suppliers — Single Points of Failure</h3>
                <div className="spof-list">
                  {spofRows.map((row) => (
                    <div
                      key={row.id}
                      className="spof-row"
                      onClick={() => handleSelectCompany(row.id)}
                    >
                      <div className="spof-row__header">
                        <span className={`spof-badge spof-badge--${row.level.toLowerCase()}`}>
                          {row.level}
                        </span>
                        <span className="spof-name">{row.name}</span>
                        <span className="spof-country">{row.country}</span>
                        <span className="spof-component">
                          {row.componentLabel}
                          {row.isBottleneck && <span className="sovereignty-bottleneck">!</span>}
                        </span>
                      </div>
                      <div className="spof-bar-row">
                        <div className="spof-bar">
                          <div
                            className="spof-bar__fill"
                            style={{ width: `${(row.oemCount / row.totalOems) * 100}%` }}
                          />
                        </div>
                        <span className="spof-bar__label">{row.oemCount}/{row.totalOems} OEMs</span>
                      </div>
                      <div className={`spof-alts ${row.alternatives.length === 0 ? 'spof-alts--none' : ''}`}>
                        Alts: {row.alternatives.length === 0
                          ? 'None in dataset — sole supplier'
                          : row.alternatives.map((a) => `${a.name} (${a.country})`).join(', ')}
                      </div>
                      <div className="spof-oems">
                        Customers: {row.dependentOems.map((o) => o.name).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>

              </section>

              <section className="geo-section">
                <h3 className="section-title">OEM Supply Chain Dependency — Supplier Origin per OEM</h3>
                <div className="oem-nationality-grid">
                  {oemNationality.map((oem) => (
                    <div key={oem.id} className="oem-nat-card" onClick={() => handleSelectCompany(oem.id)}>
                      <div className="oem-nat-header">
                        <span className="oem-nat-name">{oem.name}</span>
                        <span className={`oem-nat-flag oem-nat-flag--${oem.countryGroup.toLowerCase()}`}>{oem.country}</span>
                      </div>
                      <div className="oem-nat-bar">
                        {oem.pctUS > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--us" style={{ width: `${oem.pctUS}%` }} />
                        )}
                        {oem.pctCN > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--cn" style={{ width: `${oem.pctCN}%` }} />
                        )}
                        {oem.pctOther > 0 && (
                          <div className="sovereignty-seg sovereignty-seg--other" style={{ width: `${oem.pctOther}%` }} />
                        )}
                      </div>
                      <div className="oem-nat-stats">
                        <span>US {oem.pctUS}%</span>
                        <span>CN {oem.pctCN}%</span>
                        <span>Other {oem.pctOther}%</span>
                        <span className="oem-nat-total">{oem.total} suppliers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="geo-section">
                <h3 className="section-title">Cut the Wire — Sanction Simulator</h3>
                <div className="cut-controls">
                  <span className="cut-label">Remove suppliers from:</span>
                  {(['US', 'CN', 'OTHER'] as const).map((g) => (
                    <button
                      key={g}
                      className={`cut-toggle ${cutCountries.has(g) ? 'cut-toggle--active' : ''}`}
                      onClick={() => {
                        const next = new Set(cutCountries);
                        if (next.has(g)) next.delete(g); else next.add(g);
                        setCutCountries(next);
                      }}
                    >
                      {g === 'US' ? 'US' : g === 'CN' ? 'China' : 'Other'}
                    </button>
                  ))}
                  {cutCountries.size > 0 && (
                    <button className="cut-reset" onClick={() => setCutCountries(new Set())}>Reset</button>
                  )}
                </div>

                {cutImpact && (
                  <div className="cut-impact">
                    {cutImpact.componentImpacts.length > 0 && (
                      <div className="cut-subsection">
                        <h4 className="cut-subtitle">Component Impact</h4>
                        <div className="cut-comp-list">
                          {cutImpact.componentImpacts.map((c) => (
                            <div key={c.id} className="cut-comp-row">
                              <span className="cut-comp-name">
                                {c.name}
                                {c.bottleneck && <span className="sovereignty-bottleneck">!</span>}
                              </span>
                              <div className="cut-comp-bar">
                                <div
                                  className={`cut-comp-fill ${c.pctRemaining === 0 ? 'cut-comp-fill--zero' : ''}`}
                                  style={{ width: `${c.pctRemaining}%` }}
                                />
                              </div>
                              <span className={`cut-comp-stat ${c.remainingSuppliers === 0 ? 'cut-comp-stat--zero' : ''}`}>
                                {c.remainingSuppliers}/{c.totalSuppliers}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {cutImpact.oemImpacts.length > 0 && (
                      <div className="cut-subsection">
                        <h4 className="cut-subtitle">OEM Impact</h4>
                        <div className="cut-oem-list">
                          {cutImpact.oemImpacts.map((o) => (
                            <div key={o.id} className="cut-oem-row" onClick={() => handleSelectCompany(o.id)}>
                              <span className="cut-oem-name">{o.name}</span>
                              <span className="cut-oem-country">{o.country}</span>
                              <span className={`cut-oem-loss ${o.pctLost > 50 ? 'cut-oem-loss--severe' : ''}`}>
                                -{o.lostSuppliers} suppliers ({o.pctLost}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {cutCountries.size > 0 && !cutImpact && (
                  <p className="cut-no-impact">No impact — no suppliers from the selected region(s) in the dataset.</p>
                )}
              </section>
            </div>
          );
        })()}

        {/* Component tab */}
        {activeTab !== 'skeleton' && activeTab !== 'all_oems' && activeTab !== 'geopolitics' && selectedComponent && (
          <>
            <div className="component-top">
              <div className="component-model">
                {activeTab === 'actuators_rotary' ? (
                  <>
                    <PLYViewer
                      modelUrl={actuatorType === 'linear' ? '/models/linear-actuator.ply' : '/models/rotary-actuator.ply'}
                      color="#1a1a1a"
                      initialRotation={MODEL_ROTATIONS[actuatorType === 'linear' ? '/models/linear-actuator.ply' : '/models/rotary-actuator.ply']}
                      spinSpeed={MODEL_SPIN[actuatorType === 'linear' ? '/models/linear-actuator.ply' : '/models/rotary-actuator.ply']}
                      scale={MODEL_SCALE[actuatorType === 'linear' ? '/models/linear-actuator.ply' : '/models/rotary-actuator.ply']}
                    />
                    <div className="model-toggle">
                      <button
                        className={`model-toggle__btn ${actuatorType === 'linear' ? 'model-toggle__btn--active' : ''}`}
                        onClick={() => setActuatorType('linear')}
                      >
                        Linear
                      </button>
                      <button
                        className={`model-toggle__btn ${actuatorType === 'rotary' ? 'model-toggle__btn--active' : ''}`}
                        onClick={() => setActuatorType('rotary')}
                      >
                        Rotary
                      </button>
                    </div>
                  </>
                ) : selectedComponent.plyModel ? (
                  <PLYViewer modelUrl={selectedComponent.plyModel} color="#1a1a1a" initialRotation={MODEL_ROTATIONS[selectedComponent.plyModel]} spinSpeed={MODEL_SPIN[selectedComponent.plyModel]} scale={MODEL_SCALE[selectedComponent.plyModel]} />
                ) : (
                  <div className="model-placeholder">No 3D model</div>
                )}
              </div>

              <div className="component-info">
                {(() => {
                  const isActuator = activeTab === 'actuators_rotary';
                  const desc = isActuator ? ACTUATOR_INFO[actuatorType].description : selectedComponent.description;
                  const metrics = isActuator ? ACTUATOR_INFO[actuatorType].keyMetrics : selectedComponent.keyMetrics;

                  return (
                    <>
                      <p className="component-desc">{desc}</p>

                      {selectedComponent.bottleneck && (
                        <div className="bottleneck-alert">
                          <span className="bottleneck-icon">!</span>
                          <div>
                            <div className="bottleneck-title">Supply Chain Bottleneck</div>
                            <p className="bottleneck-reason">{selectedComponent.bottleneckReason}</p>
                          </div>
                        </div>
                      )}

                      {metrics && (
                        <div className="metrics">
                          {Object.entries(metrics).map(([k, v]) => (
                            <div key={k} className="metric-row">
                              <span className="metric-label">{k}</span>
                              <span className="metric-value">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {chain && (chain.upstream.length > 0 || chain.suppliers.length > 0 || chain.oems.length > 0) && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Supply Chain</h3>
                  {chainFocus && (
                    <button className="chain-clear" onClick={() => setChainFocus(null)}>
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="chain-flow">
                  {chain.upstream.length > 0 && (
                    <div className="chain-tier">
                      <div className="chain-tier-label">Raw Materials</div>
                      {chain.upstream.map((c) => c && (
                        <button
                          key={c.id}
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
                          onClick={(e) => {
                            if (chainFocus === c.id) { setChainFocus(null); }
                            else if (chainFocus) { setChainFocus(c.id); }
                            else { e.stopPropagation(); handleSelectCompany(c.id); }
                          }}
                          onDoubleClick={() => handleSelectCompany(c.id)}
                        >
                          <span className="chain-name">{c.name}</span>
                          <span className="chain-country">{c.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {chain.upstream.length > 0 && chain.suppliers.length > 0 && (
                    <div className="chain-arrow">&rarr;</div>
                  )}
                  {chain.suppliers.length > 0 && (
                    <div className="chain-tier">
                      <div className="chain-tier-label">Suppliers</div>
                      {chain.suppliers.map((c) => c && (
                        <button
                          key={c.id}
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
                          onClick={() => {
                            if (chainFocus === c.id) { setChainFocus(null); }
                            else { setChainFocus(c.id); }
                          }}
                          onDoubleClick={() => handleSelectCompany(c.id)}
                        >
                          <span className="chain-name">{c.name}</span>
                          <span className="chain-country">{c.country}</span>
                          {c.marketShare && <span className="chain-share">{c.marketShare}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {chain.suppliers.length > 0 && chain.oems.length > 0 && (
                    <div className="chain-arrow">&rarr;</div>
                  )}
                  {chain.oems.length > 0 && (
                    <div className="chain-tier">
                      <div className="chain-tier-label">OEMs</div>
                      {chain.oems.map((c) => c && (
                        <button
                          key={c.id}
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
                          onClick={() => {
                            if (chainFocus === c.id) { setChainFocus(null); }
                            else { setChainFocus(c.id); }
                          }}
                          onDoubleClick={() => handleSelectCompany(c.id)}
                        >
                          <span className="chain-name">{c.name}</span>
                          <span className="chain-country">{c.country}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </>
        )}
      </main>

      <footer className="footer">
        <span>{oems.length} OEMs</span>
        <span className="footer-sep" />
        <span>{companies.filter((c) => c.type !== 'oem').length} Suppliers</span>
        <span className="footer-sep" />
        <span>
          {oems.reduce((s, c) => s + (c.robotSpecs?.shipments2025 || 0), 0).toLocaleString()} units shipped (2025)
        </span>
        <span className="footer-right">Data: Humanity's Last Machine + RoboStrategy · Maintained by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
      </footer>
    </div>
  );
}

function Spec({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  if (!value || value === 'Not disclosed') return null;
  return (
    <div className={`spec-row ${highlight ? 'spec-row--hl' : ''}`}>
      <span className="spec-label">{label}</span>
      <span className="spec-value">{value}</span>
    </div>
  );
}
