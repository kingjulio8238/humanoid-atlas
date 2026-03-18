export type Country = 'US' | 'CN' | 'JP' | 'DE' | 'CH' | 'KR' | 'TW' | 'NL' | 'IL' | 'NO' | 'AU' | 'CA' | 'GLOBAL';

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
