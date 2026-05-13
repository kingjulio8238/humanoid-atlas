import {
  companies,
  relationships,
  componentCategories,
  vlaModels,
  rewardModels,
  worldModels,
  vizTools,
  headDesigns,
  simPlatforms,
  safetyStandards,
  oemSafetyProfiles,
  companyFunding,
  factoryDirectory,
  companyProduction,
} from '../data';
import type {
  FaceDisplayType,
  OemSafetyProfile,
  RewardModelType,
  SafetyComplianceLevel,
  SimPlatformType,
  VizToolType,
  WorldModelType,
  FundingStatus,
  FactoryStatus,
} from '../data';

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

const SOVEREIGNTY_COMPONENTS = [
  'motors', 'reducers', 'screws', 'bearings', 'batteries', 'compute',
  'sensors_general', 'end_effectors', 'pcbs',
];

export function getSovereigntyData() {
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

export function getScoreboardData() {
  const groups: ('US' | 'CN' | 'OTHER')[] = ['US', 'CN', 'OTHER'];
  const oemList = companies.filter((c) => c.type === 'oem');

  return groups.map((group) => {
    const groupOems = oemList.filter((c) => getCountryGroup(c.country) === group);
    const groupSuppliers = companies.filter((c) => c.type !== 'oem' && getCountryGroup(c.country) === group);

    const totalShipments = groupOems.reduce((s, c) => s + (c.robotSpecs?.shipments2025 || 0), 0);

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

export function getOemNationalityData() {
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

export const oems = companies.filter((c) => c.type === 'oem');

const totalOems = oems.length;
const oemIds = new Set(oems.map((c) => c.id));

function countOemCustomers(supplierId: string) {
  return [...new Set(relationships.filter((r) => r.from === supplierId && oemIds.has(r.to)).map((r) => r.to))].length;
}

export const SCENARIOS = [
  {
    id: 'taiwan_strait',
    label: 'Taiwan Strait Crisis',
    description: 'TSMC goes offline - NVIDIA and Intel lose chip fabrication, cascading to the majority of humanoid OEMs.',
    cutCompanies: ['tsmc'],
    cutCountries: [] as string[],
  },
  {
    id: 'harmonic_shortage',
    label: 'Harmonic Drive Shortage',
    description: `Japan's Harmonic Drive Systems cannot ship - the single most expensive actuator component disappears from ${countOemCustomers('harmonic_drive')} of ${totalOems} OEMs.`,
    cutCompanies: ['harmonic_drive'],
    cutCountries: [],
  },
  {
    id: 'china_export_ban',
    label: 'China Export Ban',
    description: 'All Chinese suppliers cut off - batteries, motors, LiDAR, depth sensors, and rare earth magnets disrupted.',
    cutCompanies: [],
    cutCountries: ['CN'],
  },
  {
    id: 'rare_earth_embargo',
    label: 'Rare Earth Embargo',
    description: 'All rare earth suppliers disrupted - every BLDC motor in every humanoid depends on NdFeB magnets.',
    cutCompanies: ['mp_materials', 'lynas', 'jl_mag'],
    cutCountries: [],
  },
  {
    id: 'nvidia_blacklist',
    label: 'NVIDIA Blacklist',
    description: `NVIDIA cut from supply chain - ${countOemCustomers('nvidia')} of ${totalOems} OEMs lose their primary compute platform.`,
    cutCompanies: ['nvidia'],
    cutCountries: [],
  },
];

export function getUnifiedImpact(cutCountries: Set<string>, cutCompanyIds: Set<string>) {
  if (cutCountries.size === 0 && cutCompanyIds.size === 0) return null;

  const localOemIds = new Set(companies.filter((c) => c.type === 'oem').map((c) => c.id));
  const disruptedIds = new Set<string>();
  const cascadeChains: { source: string; sourceName: string; affected: { id: string; name: string }[] }[] = [];

  companies.forEach((c) => {
    if (!localOemIds.has(c.id) && cutCountries.has(getCountryGroup(c.country))) {
      disruptedIds.add(c.id);
    }
  });

  cutCompanyIds.forEach((id) => disruptedIds.add(id));

  const directCuts = new Set(disruptedIds);
  let changed = true;
  while (changed) {
    changed = false;
    companies.forEach((c) => {
      if (disruptedIds.has(c.id) || localOemIds.has(c.id)) return;
      const incomingRels = relationships.filter((r) => r.to === c.id);
      if (incomingRels.length === 0) return;
      const byComponent = new Map<string, string[]>();
      incomingRels.forEach((r) => {
        const list = byComponent.get(r.component) || [];
        list.push(r.from);
        byComponent.set(r.component, list);
      });
      for (const [, supplierIds] of byComponent) {
        if (supplierIds.every((sid) => disruptedIds.has(sid))) {
          disruptedIds.add(c.id);
          changed = true;
          return;
        }
      }
    });
  }

  directCuts.forEach((cutId) => {
    const cutCompany = companies.find((c) => c.id === cutId);
    if (!cutCompany) return;
    const affected = companies.filter((c) => {
      if (c.id === cutId || localOemIds.has(c.id) || directCuts.has(c.id)) return false;
      if (!disruptedIds.has(c.id)) return false;
      return relationships.some((r) => r.to === c.id && r.from === cutId);
    });
    if (affected.length > 0) {
      cascadeChains.push({
        source: cutId,
        sourceName: cutCompany.name,
        affected: affected.map((a) => ({ id: a.id, name: a.name })),
      });
    }
  });

  const oemImpacts = companies.filter((c) => c.type === 'oem').map((oem) => {
    const allRels = relationships.filter((r) => r.to === oem.id);
    const cutRels = allRels.filter((r) => disruptedIds.has(r.from));
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

  const componentImpacts = SOVEREIGNTY_COMPONENTS.map((compId) => {
    const keywords = COMPONENT_KEYWORDS[compId] || [];
    const category = componentCategories.find((c) => c.id === compId);
    const rels = relationships.filter((r) =>
      keywords.some((kw) => r.component.toLowerCase().includes(kw))
    );
    const supplierIds = [...new Set(rels.map((r) => r.from))];
    const totalSuppliers = supplierIds.length;
    const remainingSuppliers = supplierIds.filter((id) => !disruptedIds.has(id)).length;

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

  return { oemImpacts, componentImpacts, cascadeChains };
}

export function getComponentChain(componentId: string) {
  const keywords = COMPONENT_KEYWORDS[componentId] || [];
  const rels = relationships.filter((r) =>
    keywords.some((kw) => r.component.toLowerCase().includes(kw))
  );
  const supplierIds = [...new Set(rels.map((r) => r.from))];
  const componentOemIds = [...new Set(rels.map((r) => r.to))];
  const upstreamRels = relationships.filter(
    (r) => supplierIds.includes(r.to) && !supplierIds.includes(r.from)
  );
  const upstreamIds = [...new Set(upstreamRels.map((r) => r.from))];

  return {
    upstream: upstreamIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    suppliers: supplierIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    oems: componentOemIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean),
    rels,
    upstreamRels,
  };
}

export function getCompanyVlaLinks(companyId: string) {
  return vlaModels.flatMap((model) =>
    model.companyLinks
      .filter((link) => link.companyId === companyId)
      .map((link) => ({ model, link }))
  );
}

export function getVlaRelationshipTypeLabel(type: 'proprietary' | 'partner' | 'open' | 'ecosystem') {
  if (type === 'proprietary') return 'Proprietary / In-House';
  if (type === 'partner') return 'Partner Integration';
  if (type === 'open') return 'Open Model';
  return 'Ecosystem';
}

export function getVlaCompanyRelationshipLabel(type: 'proprietary' | 'partner') {
  if (type === 'proprietary') return 'Proprietary / In-House';
  return 'Partner Integration';
}

export const VIZ_CAPABILITIES = [
  'ROS 1', 'ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab',
] as const;

export const VIZ_CAPABILITY_MAP: Record<string, Set<string>> = {
  foxglove: new Set(['ROS 1', 'ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab']),
  rerun: new Set(['ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video']),
  formant: new Set(['ROS 1', 'ROS 2', 'Web', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab']),
  rviz2: new Set(['ROS 2', 'Desktop', '3D']),
  meshcat: new Set(['Web', 'Python', '3D']),
  viser: new Set(['Web', 'Python', '3D']),
  vuer: new Set(['Web', 'Python', '3D', 'Video']),
  plotjuggler: new Set(['ROS 1', 'ROS 2', 'MCAP', 'Desktop', 'Time Series']),
  datatamer: new Set(['ROS 2', 'Time Series']),
  roboto_ai: new Set(['ROS 2', 'MCAP', 'Web', 'Python', 'Time Series', 'Video', 'Fleet']),
};

export function getRewardModelTypeLabel(type: RewardModelType) {
  if (type === 'trained') return 'Trained Model';
  if (type === 'zero-shot') return 'Zero-Shot';
  return 'Code Generation';
}

export function getRewardModelOverview() {
  return {
    trackedModels: rewardModels.length,
    trainedModels: rewardModels.filter((m) => m.modelType === 'trained').length,
    zeroShotModels: rewardModels.filter((m) => m.modelType === 'zero-shot').length,
    codeGenModels: rewardModels.filter((m) => m.modelType === 'code-gen').length,
    developerCount: new Set(rewardModels.map((m) => m.developer)).size,
  };
}

export function getWorldModelTypeLabel(type: WorldModelType) {
  if (type === 'video-generation') return 'Video Generation';
  if (type === 'latent-dynamics') return 'Latent Dynamics';
  if (type === 'rl-imagination') return 'RL / Imagination';
  return 'Foundation Platform';
}

export function getWorldModelOverview() {
  return {
    trackedModels: worldModels.length,
    videoGenModels: worldModels.filter((m) => m.modelType === 'video-generation').length,
    latentDynModels: worldModels.filter((m) => m.modelType === 'latent-dynamics').length,
    rlImaginModels: worldModels.filter((m) => m.modelType === 'rl-imagination').length,
    foundationModels: worldModels.filter((m) => m.modelType === 'foundation-platform').length,
    developerCount: new Set(worldModels.map((m) => m.developer)).size,
  };
}

export function getFaceDisplayTypeLabel(type: FaceDisplayType) {
  if (type === 'oled-screen') return 'OLED Screen';
  if (type === 'status-screen') return 'Status Screen';
  if (type === 'led-indicator') return 'LED Indicator';
  if (type === 'no-display') return 'No Display';
  return 'Concealed';
}

export function getHeadDesignOverview() {
  return {
    trackedDesigns: headDesigns.length,
    oledScreens: headDesigns.filter((d) => d.faceType === 'oled-screen').length,
    statusScreens: headDesigns.filter((d) => d.faceType === 'status-screen').length,
    ledIndicators: headDesigns.filter((d) => d.faceType === 'led-indicator').length,
    noDisplay: headDesigns.filter((d) => d.faceType === 'no-display').length,
    concealed: headDesigns.filter((d) => d.faceType === 'concealed').length,
  };
}

export function getVizToolTypeLabel(type: VizToolType) {
  if (type === 'platform') return 'Platform';
  if (type === '3d-viewer') return '3D Viewer';
  if (type === 'time-series') return 'Time Series';
  return 'Data & Analytics';
}

export function getVizToolOverview() {
  return {
    trackedTools: vizTools.length,
    platformTools: vizTools.filter((t) => t.toolType === 'platform').length,
    viewerTools: vizTools.filter((t) => t.toolType === '3d-viewer').length,
    timeSeriesTools: vizTools.filter((t) => t.toolType === 'time-series').length,
    analyticsTools: vizTools.filter((t) => t.toolType === 'data-analytics').length,
    developerCount: new Set(vizTools.map((t) => t.developer)).size,
  };
}

export const SIM_CAPABILITIES = [
  'GPU Accel', 'Open Source', 'Humanoid', 'Sim-to-Real', 'Differentiable', 'Multi-Physics', 'ROS 2',
] as const;

export function getSimCapabilities(p: { gpuAccelerated: boolean; openSource: boolean; humanoidModels: boolean; simToReal: boolean; differentiable: boolean; multiPhysics: boolean; ros2: boolean }): Set<string> {
  const s = new Set<string>();
  if (p.gpuAccelerated) s.add('GPU Accel');
  if (p.openSource) s.add('Open Source');
  if (p.humanoidModels) s.add('Humanoid');
  if (p.simToReal) s.add('Sim-to-Real');
  if (p.differentiable) s.add('Differentiable');
  if (p.multiPhysics) s.add('Multi-Physics');
  if (p.ros2) s.add('ROS 2');
  return s;
}

export function getSimPlatformTypeLabel(type: SimPlatformType) {
  if (type === 'physics-engine') return 'Physics Engine';
  if (type === 'rl-framework') return 'RL Framework';
  if (type === 'environment') return 'Environment';
  return 'World Model';
}

export function getSimPlatformOverview() {
  return {
    trackedPlatforms: simPlatforms.length,
    physicsEngines: simPlatforms.filter((p) => p.platformType === 'physics-engine').length,
    rlFrameworks: simPlatforms.filter((p) => p.platformType === 'rl-framework').length,
    environments: simPlatforms.filter((p) => p.platformType === 'environment').length,
    worldModels: simPlatforms.filter((p) => p.platformType === 'world-model').length,
    developerCount: new Set(simPlatforms.map((p) => p.developer)).size,
    withOemLinks: simPlatforms.filter((p) => p.companyLinks.length > 0).length,
  };
}

export const SAFETY_CAPABILITIES = [
  'Force Limit', 'E-Stop', 'Speed Limit', 'Collision Det.', 'Compliant Act.', 'Fall Protect', 'Cyber',
] as const;

export function getSafetyCapabilities(p: OemSafetyProfile): Set<string> {
  const s = new Set<string>();
  if (p.forceLimiting) s.add('Force Limit');
  if (p.eStop) s.add('E-Stop');
  if (p.speedLimiting) s.add('Speed Limit');
  if (p.collisionDetection) s.add('Collision Det.');
  if (p.compliantActuators) s.add('Compliant Act.');
  if (p.fallProtection) s.add('Fall Protect');
  if (p.cyberSecurity) s.add('Cyber');
  return s;
}

export function getComplianceLevelLabel(level: SafetyComplianceLevel) {
  switch (level) {
    case 'certified': return 'Certified';
    case 'in-progress': return 'In Progress';
    case 'claimed': return 'Claimed';
    case 'not-disclosed': return 'Not Disclosed';
  }
}

export function getSafetyOverview() {
  return {
    trackedStandards: safetyStandards.length,
    publishedStandards: safetyStandards.filter((s) => s.status === 'published' || s.status === 'in-force').length,
    inProgressStandards: safetyStandards.filter((s) => s.status === 'working-draft' || s.status === 'fdis' || s.status === 'framework').length,
    trackedOems: oemSafetyProfiles.length,
    certifiedOems: oemSafetyProfiles.filter((p) => p.complianceLevel === 'certified').length,
    inProgressOems: oemSafetyProfiles.filter((p) => p.complianceLevel === 'in-progress').length,
  };
}

export function getVLAOverview() {
  const linkedOemIds = new Set(
    vlaModels.flatMap((model) => model.companyLinks.map((link) => link.companyId))
  );
  const creatorCount = new Set(vlaModels.map((model) => model.developer)).size;
  const standaloneModels = vlaModels.filter((model) => model.companyLinks.length === 0).length;

  return {
    trackedModels: vlaModels.length,
    linkedOems: linkedOemIds.size,
    creatorCount,
    standaloneModels,
  };
}

export type CountryGroup = 'US' | 'CN' | 'JP' | 'KR' | 'OTHER' | null;

export function getCountryGroup(country: string): 'US' | 'CN' | 'OTHER' {
  if (country === 'US') return 'US';
  if (country === 'CN') return 'CN';
  return 'OTHER';
}

export function getCountryFilterGroup(country: string): 'US' | 'CN' | 'JP' | 'KR' | 'OTHER' {
  if (country === 'US') return 'US';
  if (country === 'CN') return 'CN';
  if (country === 'JP') return 'JP';
  if (country === 'KR') return 'KR';
  return 'OTHER';
}

export const SUPPLIER_COMPONENT_LABEL: Record<string, string> = {
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

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseLaunchDate(s: string): number {
  const monthMatch = s.match(/^(\w{3})\s+(\d{4})$/);
  if (monthMatch) {
    const month = MONTH_MAP[monthMatch[1]] ?? 0;
    return parseInt(monthMatch[2]) + month / 12;
  }
  const qMatch = s.match(/^Q(\d)\s+(\d{4})$/);
  if (qMatch) {
    return parseInt(qMatch[2]) + (parseInt(qMatch[1]) - 1) * 0.25;
  }
  const yearMatch = s.match(/(\d{4})/);
  if (yearMatch) {
    return parseInt(yearMatch[1]);
  }
  return 2025;
}

const TIMELINE_START = 2018.5;
const TIMELINE_END = 2026.5;
export const TIMELINE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function getTimelineData() {
  const oemList = companies.filter((c) => c.type === 'oem');

  const rows = oemList.map((oem) => {
    const dateStr = oem.robotSpecs?.launchDate || '2025';
    const dateNum = parseLaunchDate(dateStr);
    const pct = ((dateNum - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;
    return {
      id: oem.id,
      name: oem.name,
      country: oem.country,
      countryGroup: getCountryFilterGroup(oem.country),
      dateStr,
      dateNum,
      pct: Math.max(0, Math.min(100, pct)),
      inProduction: oem.robotSpecs?.status === 'In Production',
      shipments: oem.robotSpecs?.shipments2025 || 0,
    };
  }).sort((a, b) => a.dateNum - b.dateNum);

  const lanes: { group: string; label: string; rows: typeof rows }[] = [
    { group: 'US', label: 'United States', rows: rows.filter((r) => r.countryGroup === 'US') },
    { group: 'CN', label: 'China', rows: rows.filter((r) => r.countryGroup === 'CN') },
    { group: 'JP', label: 'Japan', rows: rows.filter((r) => r.countryGroup === 'JP') },
    { group: 'KR', label: 'South Korea', rows: rows.filter((r) => r.countryGroup === 'KR') },
    { group: 'OTHER', label: 'Rest of World', rows: rows.filter((r) => r.countryGroup === 'OTHER') },
  ].filter((l) => l.rows.length > 0);

  const maxShipments = Math.max(...rows.map((r) => r.shipments), 1);
  const totalShipments = rows.reduce((s, r) => s + r.shipments, 0);
  const shipmentsByGroup = lanes.map((l) => {
    const total = l.rows.reduce((s, r) => s + r.shipments, 0);
    return {
      group: l.group,
      label: l.label,
      total,
      pct: totalShipments > 0 ? Math.round((total / totalShipments) * 100) : 0,
      barPct: maxShipments > 0 ? (total / maxShipments) * 100 : 0,
    };
  });

  const now = new Date().getFullYear() + new Date().getMonth() / 12;
  const nowPct = ((now - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;

  return { lanes, shipmentsByGroup, totalShipments, nowPct, maxShipments };
}

export const COUNTRY_GROUP_COLORS: Record<string, string> = {
  US: '#3b82f6',
  CN: '#ef4444',
  OTHER: '#888',
};

export const BOTTLENECK_COMPONENTS = new Set(['Reducers', 'Screws']);

const ACTUATOR_BREAKDOWN = [
  { id: 'reducer', label: 'Harmonic Reducer', pct: 36 },
  { id: 'torque', label: 'Torque Sensor', pct: 30 },
  { id: 'motor', label: 'BLDC Motor', pct: 13.5 },
  { id: 'encoder', label: 'Encoders', pct: 7 },
  { id: 'other', label: 'Housing & Other', pct: 13.5 },
];

function parseCostK(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/\$\s*([\d.]+)\s*K/i);
  if (m) return parseFloat(m[1]);
  const range = s.match(/\$\s*([\d.]+)\s*K?\s*[-–]/i);
  if (range) return parseFloat(range[1]);
  return null;
}

export function getBOMData() {
  const oemList = companies.filter((c) => c.type === 'oem');

  const rows = oemList.map((oem) => {
    const bomK = parseCostK(oem.robotSpecs?.bom);
    const priceK = parseCostK(oem.robotSpecs?.price);
    const margin = (bomK !== null && priceK !== null && priceK > 0)
      ? Math.round(((priceK - bomK) / priceK) * 100)
      : null;
    return {
      id: oem.id,
      name: oem.name,
      country: oem.country,
      bomK,
      priceK,
      bomRaw: oem.robotSpecs?.bom || null,
      priceRaw: oem.robotSpecs?.price || null,
      margin,
      sortValue: priceK ?? bomK ?? 999,
    };
  })
    .filter((r) => r.bomK !== null || r.priceK !== null)
    .sort((a, b) => a.sortValue - b.sortValue);

  const maxK = Math.max(...rows.map((r) => Math.max(r.bomK || 0, r.priceK || 0)));
  const econRows = rows.filter((r) => r.bomK !== null && r.priceK !== null);

  return { rows, maxK, econRows, actuatorBreakdown: ACTUATOR_BREAKDOWN };
}

export function getFilteredFunding(status: 'all' | FundingStatus) {
  if (status === 'all') return companyFunding;
  return companyFunding.filter((f) => f.status === status);
}

export function getFundingSortedByRaised(items = companyFunding) {
  return [...items].sort((a, b) => {
    const valDiff = (b.latestValuationM ?? 0) - (a.latestValuationM ?? 0);
    if (valDiff !== 0) return valDiff;
    return (b.totalRaisedM ?? 0) - (a.totalRaisedM ?? 0);
  });
}

export function getFilteredFactories(status: 'all' | FactoryStatus) {
  if (status === 'all') return factoryDirectory;
  return factoryDirectory.filter((f) => f.status === status);
}

export function getProductionSorted() {
  return [...companyProduction]
    .filter((p) => p.shipped2025 != null || p.annualCapacity != null)
    .sort((a, b) => (b.annualCapacity ?? 0) - (a.annualCapacity ?? 0));
}

export function getSPOFData() {
  const oemList = companies.filter((c) => c.type === 'oem');
  const totalOemsForSpof = oemList.length;
  const oemIdsForSpof = new Set(oemList.map((c) => c.id));
  const supplierList = companies.filter((c) => c.type !== 'oem');

  const spofRows = supplierList.map((supplier) => {
    const directRels = relationships.filter(
      (r) => r.from === supplier.id && oemIdsForSpof.has(r.to)
    );
    const dependentOemIds = [...new Set(directRels.map((r) => r.to))];
    const dependentOems = dependentOemIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean) as typeof companies;

    const componentLabel = SUPPLIER_COMPONENT_LABEL[supplier.id] || 'Other';
    const isBottleneck = BOTTLENECK_COMPONENTS.has(componentLabel);

    const alternatives = supplierList.filter((s) => {
      if (s.id === supplier.id) return false;
      if (SUPPLIER_COMPONENT_LABEL[s.id] !== componentLabel) return false;
      return relationships.some((r) => r.from === s.id && oemIdsForSpof.has(r.to));
    });

    const oemFraction = totalOemsForSpof > 0 ? dependentOemIds.length / totalOemsForSpof : 0;
    const altScarcity = 1 / (1 + alternatives.length);
    const bottleneckMultiplier = isBottleneck ? 1.5 : 1;
    const rawScore = oemFraction * altScarcity * bottleneckMultiplier;
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
      totalOems: totalOemsForSpof,
      dependentOems,
      alternatives: alternatives.map((a) => ({ id: a.id, name: a.name, country: a.country })),
      score,
      level,
    };
  })
    .filter((row) => row.oemCount >= 2)
    .sort((a, b) => b.score - a.score || b.oemCount - a.oemCount)
    .slice(0, 6);

  return { spofRows };
}
