export type Country = 'US' | 'CN' | 'JP' | 'DE' | 'CH' | 'KR' | 'TW' | 'NL' | 'IL' | 'NO' | 'AU' | 'CA' | 'PL' | 'SE' | 'IN' | 'ES' | 'FR' | 'GB' | 'GLOBAL';

export type EntityType = 'oem' | 'tier1_supplier' | 'component_maker' | 'raw_material' | 'ai_compute';

export interface RobotSpecs {
  status: 'Prototype' | 'In Production';
  launchDate: string;
  shipments2025?: number;
  shipmentShare?: string;
  targetUse: string[];
  mass: string;
  height: string;
  speed: string;
  totalDOF: string;
  operatingTime: string;
  payloadCapacity: string;
  endEffector: string;
  tactileSensing: boolean | null;
  locomotion: string;
  materials: string;
  motor: string;
  actuatorBody: string;
  actuatorHand: string;
  transmission: string;
  externalSensors: string;
  internalSensors: string;
  compute: string;
  battery: string;
  charging: string;
  aiPartner: string;
  software: string;
  dataCollection: string;
  bom?: string;
  price?: string;
}

export interface Company {
  id: string;
  name: string;
  type: EntityType;
  country: Country;
  description: string;
  marketShare?: string;
  plyModel?: string;
  robotImage?: string;
  robotSpecs?: RobotSpecs;
  website?: string;
  ticker?: string;
}

export interface SupplyRelationship {
  id: string;
  from: string;
  to: string;
  component: string;
  bomPercent?: number;
  costPercent?: number;
  description?: string;
}

export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  plyModel?: string;
  plyModel2?: string;
  avgCostPercent?: number;
  bottleneck: boolean;
  bottleneckReason?: string;
  keyMetrics?: Record<string, string>;
}

export type RewardModelType = 'trained' | 'zero-shot' | 'code-gen';

export interface RewardModelSourceRef {
  label: string;
  url: string;
}

export interface RewardModel {
  id: string;
  name: string;
  developer: string;
  country: Country;
  modelType: RewardModelType;
  description: string;
  backbone: string;
  params: string;
  release: string;
  venue: string;
  availability: string;
  focus: string;
  sources: RewardModelSourceRef[];
}

export interface VLASourceRef {
  label: string;
  url: string;
}

export type VLAEntryRelationshipType = 'proprietary' | 'partner' | 'open' | 'ecosystem';
export type VLACompanyRelationshipType = 'proprietary' | 'partner';

export interface VLACompanyLink {
  companyId: string;
  relationship: VLACompanyRelationshipType;
  sources: VLASourceRef[];
}

export type WorldModelType = 'video-generation' | 'latent-dynamics' | 'rl-imagination' | 'foundation-platform';

export interface WorldModelSourceRef {
  label: string;
  url: string;
}

export interface WorldModel {
  id: string;
  name: string;
  developer: string;
  country: Country;
  modelType: WorldModelType;
  description: string;
  backbone?: string;
  params?: string;
  trainingData?: string;
  release: string;
  venue: string;
  availability: string;
  focus: string;
  sources: WorldModelSourceRef[];
}

export type FaceDisplayType = 'oled-screen' | 'status-screen' | 'led-indicator' | 'no-display' | 'concealed';

export interface HeadDesignSourceRef {
  label: string;
  url: string;
}

export interface HeadDesign {
  id: string;
  name: string;
  developer: string;
  country: Country;
  faceType: FaceDisplayType;
  description: string;
  displayTech: string;
  headCameras: string;
  totalCameras: string;
  depthApproach: string;
  lidar: string;
  audioSystem: string;
  interactiveFeatures: string;
  sources: HeadDesignSourceRef[];
}

export type VizToolType = 'platform' | '3d-viewer' | 'time-series' | 'data-analytics';

export interface VizToolSourceRef {
  label: string;
  url: string;
}

export interface VizTool {
  id: string;
  name: string;
  developer: string;
  country: Country;
  toolType: VizToolType;
  description: string;
  language: string;
  frameworks: string;
  deployment: string;
  license: string;
  release: string;
  focus: string;
  sources: VizToolSourceRef[];
}

// ── Funding ──────────────────────────────────────────────────

export type FundingStatus = 'private' | 'public' | 'ipo-filed' | 'acquired' | 'subsidiary';

export interface FundingSourceRef {
  label: string;
  url: string;
}

export interface FundingRound {
  name: string;          // e.g. "Series B", "Seed", "IPO"
  date: string;          // e.g. "2025-02", "2024-01"
  amountM?: number;      // amount in millions USD (null if undisclosed)
  valuationM?: number;   // post-money valuation in millions USD
  lead?: string;         // lead investor name
  notes?: string;        // e.g. "oversubscribed from $350M"
}

export interface CompanyFunding {
  companyId: string;           // matches Company.id
  name: string;                // display name
  country: Country;
  status: FundingStatus;
  ticker?: string;             // e.g. "9880.HK", "TSLA"
  totalRaisedM?: number;       // total raised in millions USD
  latestValuationM?: number;   // latest valuation in millions USD
  latestValuationNote?: string; // e.g. "IPO target", "analyst est."
  ipoPlans?: string;           // e.g. "STAR Market Q2 2026"
  ipoRaiseTargetM?: number;    // IPO raise target in millions USD
  revenue2025M?: number;       // 2025 revenue in millions USD
  netProfit2025M?: number;     // 2025 net profit in millions USD
  keyInvestors: string[];      // top investor names
  rounds: FundingRound[];
  sources: FundingSourceRef[];
}

export interface InvestorProfile {
  id: string;
  name: string;
  country: Country;
  type: string;               // e.g. "Corporate VC", "VC", "Sovereign Wealth", "Personal"
  portfolioCompanyIds: string[]; // matches companyFunding[].companyId
  description: string;
  sources: FundingSourceRef[];
}

// ── Factories ─────────────────────────────────────────────────

export type FactoryStatus = 'operational' | 'under-construction' | 'planned' | 'pre-production' | 'trials';

export type MfgModel = 'in-house' | 'contract' | 'partner' | 'vertically-integrated';

export interface FactorySourceRef {
  label: string;
  url: string;
}

export interface Factory {
  id: string;
  name: string;                // e.g. "RoboFab", "BotQ", "Giga Texas Optimus"
  companyId: string;           // matches Company.id or descriptive id
  companyName: string;
  country: Country;
  location: string;            // e.g. "Salem, OR", "Shanghai"
  status: FactoryStatus;
  sizeSqft?: string;           // e.g. "70,000 sqft", "10,000+ sqm"
  mfgModel: MfgModel;
  notes?: string;
  sources: FactorySourceRef[];
}

export interface CompanyProduction {
  companyId: string;
  name: string;
  country: Country;
  mfgModel: MfgModel;
  annualCapacity?: number;     // announced capacity in units/year
  capacityNote?: string;       // e.g. "by 2028", "target"
  shipped2025?: number;        // actual 2025 shipments
  shipped2025Note?: string;    // e.g. "internal use only", "estimate"
  target2026?: string;         // e.g. "20,000", "scale to 10K/yr"
  target2027?: string;
  sources: FactorySourceRef[];
}

export interface ManufacturingPartner {
  id: string;
  name: string;
  country: Country;
  type: string;               // e.g. "EMS", "Automotive", "Industrial"
  partnerCompanyIds: string[];
  description: string;
  sources: FactorySourceRef[];
}

// ── Sim Platforms ─────────────────────────────────────────────

export type SimPlatformType = 'physics-engine' | 'rl-framework' | 'environment' | 'world-model';

export interface SimPlatformSourceRef {
  label: string;
  url: string;
}

export interface SimCompanyLink {
  companyId: string;
  notes?: string;
}

export interface SimPlatform {
  id: string;
  name: string;
  developer: string;
  country: Country;
  platformType: SimPlatformType;
  description: string;
  physicsEngine: string;
  license: string;           // e.g. "Apache 2.0", "BSD 3-Clause", "Proprietary"
  language: string;          // e.g. "Python, C++"
  latestVersion?: string;
  // Capability flags
  gpuAccelerated: boolean;
  openSource: boolean;
  humanoidModels: boolean;
  simToReal: boolean;
  differentiable: boolean;
  multiPhysics: boolean;
  ros2: boolean;
  sources: SimPlatformSourceRef[];
  companyLinks: SimCompanyLink[];
}

// ── Safety & Standards ────────────────────────────────────────

export type StandardStatus = 'published' | 'in-force' | 'fdis' | 'working-draft' | 'framework' | 'released';

export interface SafetySourceRef {
  label: string;
  url: string;
}

export interface SafetyStandard {
  id: string;
  name: string;
  scope: string;
  issuingBody: string;
  region: string;          // e.g. "International", "US", "EU", "CN"
  status: StandardStatus;
  statusLabel: string;     // e.g. "Published Oct 2025", "Working Draft"
  expectedDate?: string;   // e.g. "2026-2027", "Jan 2027"
  description: string;
  sources: SafetySourceRef[];
}

export type SafetyComplianceLevel = 'certified' | 'in-progress' | 'claimed' | 'not-disclosed';

export interface OemSafetyProfile {
  id: string;
  companyId: string;
  name: string;
  country: Country;
  complianceLevel: SafetyComplianceLevel;
  complianceSummary: string;  // e.g. "NRTL certified · CAT1 stop · Safety PLC"
  description: string;
  // Safety design capability flags
  forceLimiting: boolean;
  eStop: boolean;
  speedLimiting: boolean;
  collisionDetection: boolean;
  compliantActuators: boolean;
  fallProtection: boolean;
  cyberSecurity: boolean;
  sources: SafetySourceRef[];
}

export interface VLAModel {
  id: string;
  name: string;
  developer: string;
  country: Country;
  relationshipType: VLAEntryRelationshipType;
  description: string;
  release: string;
  focus: string;
  availability: string;
  sources: VLASourceRef[];
  companyLinks: VLACompanyLink[];
}
