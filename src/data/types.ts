export type Country = 'US' | 'CN' | 'JP' | 'DE' | 'CH' | 'KR' | 'TW' | 'NL' | 'IL' | 'NO' | 'AU' | 'CA' | 'PL' | 'SE' | 'GLOBAL';

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
