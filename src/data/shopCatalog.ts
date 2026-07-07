// Atlas Shop catalog — component storefront.
//
// Shop sells humanoid components via supplier partnerships. Each component
// category (MoCap Suits, Harmonic Drives, ...) becomes a Shop tab, but ONLY
// once it has >=1 live product. The full 30-category / 6-group taxonomy below
// mirrors the supplier-outreach CRM (docs/supplier-lists/_MASTER_all.csv) so a
// category can be switched on the moment a supplier signs.
//
// Transaction model: RFQ / broker only. Products may display a price, but there
// is no cart/checkout — buyers place a request that routes to the admin
// dashboard, where Atlas manually brokers the buyer<->supplier introduction.

// ---------------- Taxonomy ----------------

export type ShopGroupId =
  | 'actuation'
  | 'power'
  | 'sensing'
  | 'compute'
  | 'end-effectors'
  | 'capture';

export const SHOP_GROUP_LABELS: Record<ShopGroupId, string> = {
  actuation: 'Actuation',
  power: 'Power',
  sensing: 'Sensing',
  compute: 'Compute',
  'end-effectors': 'End Effectors',
  capture: 'Capture',
};

export interface ShopCategory {
  id: string;          // CRM component id, e.g. "mocap_suit"
  group: ShopGroupId;
  label: string;       // display, e.g. "MoCap Suits"
  slug: string;        // URL, e.g. "mocap-suits"
}

// All 30 CRM components. Order within a group follows the CRM; groups ordered
// Actuation -> Power -> Sensing -> Compute -> End Effectors -> Capture. Nav only
// renders the categories that currently have a live product (see liveCategories).
export const SHOP_CATEGORIES: ShopCategory[] = [
  // Actuation
  { id: 'frameless_bldc', group: 'actuation', label: 'Frameless BLDC Motors', slug: 'frameless-bldc-motors' },
  { id: 'housed_joint_motor', group: 'actuation', label: 'Housed Joint Motors', slug: 'housed-joint-motors' },
  { id: 'qdd_actuator', group: 'actuation', label: 'QDD Actuators', slug: 'qdd-actuators' },
  { id: 'linear_actuator', group: 'actuation', label: 'Linear Actuators', slug: 'linear-actuators' },
  { id: 'harmonic_drive', group: 'actuation', label: 'Harmonic Drives', slug: 'harmonic-drives' },
  { id: 'cycloidal_reducer', group: 'actuation', label: 'Cycloidal Reducers', slug: 'cycloidal-reducers' },
  { id: 'planetary_gearbox', group: 'actuation', label: 'Planetary Gearboxes', slug: 'planetary-gearboxes' },
  { id: 'planetary_roller_screw', group: 'actuation', label: 'Planetary Roller Screws', slug: 'planetary-roller-screws' },
  { id: 'ball_lead_screw', group: 'actuation', label: 'Ball & Lead Screws', slug: 'ball-lead-screws' },
  { id: 'foc_joint_driver', group: 'actuation', label: 'FOC Joint Drivers', slug: 'foc-joint-drivers' },
  { id: 'motor_controller_esc', group: 'actuation', label: 'Motor Controllers / ESCs', slug: 'motor-controllers-esc' },
  { id: 'rotary_encoder', group: 'actuation', label: 'Rotary Encoders', slug: 'rotary-encoders' },
  { id: 'precision_bearing', group: 'actuation', label: 'Precision Bearings', slug: 'precision-bearings' },
  // Power
  { id: 'high_c_cell', group: 'power', label: 'High-C Cells', slug: 'high-c-cells' },
  { id: 'battery_pack', group: 'power', label: 'Battery Packs', slug: 'battery-packs' },
  { id: 'ndfeb_magnet', group: 'power', label: 'NdFeB Magnets', slug: 'ndfeb-magnets' },
  // Sensing
  { id: 'ft_sensor', group: 'sensing', label: 'Force / Torque Sensors', slug: 'force-torque-sensors' },
  { id: 'joint_torque_sensor', group: 'sensing', label: 'Joint Torque Sensors', slug: 'joint-torque-sensors' },
  { id: 'tactile_sensor', group: 'sensing', label: 'Tactile Sensors', slug: 'tactile-sensors' },
  { id: 'imu', group: 'sensing', label: 'IMUs', slug: 'imus' },
  { id: 'lidar_3d', group: 'sensing', label: '3D LiDAR', slug: '3d-lidar' },
  { id: 'depth_camera', group: 'sensing', label: 'Depth Cameras', slug: 'depth-cameras' },
  // Compute
  { id: 'edge_compute', group: 'compute', label: 'Edge Compute', slug: 'edge-compute' },
  { id: 'control_board_sbc', group: 'compute', label: 'Control Boards / SBCs', slug: 'control-boards-sbc' },
  { id: 'pcb_power', group: 'compute', label: 'PCBs / Power Electronics', slug: 'pcbs-power' },
  // End Effectors
  { id: 'dexterous_hand', group: 'end-effectors', label: 'Dexterous Hands', slug: 'dexterous-hands' },
  { id: 'gripper', group: 'end-effectors', label: 'Grippers', slug: 'grippers' },
  // Capture
  { id: 'mocap_suit', group: 'capture', label: 'MoCap Suits', slug: 'mocap-suits' },
  { id: 'mocap_glove', group: 'capture', label: 'MoCap Gloves', slug: 'mocap-gloves' },
  { id: 'teleop_rig', group: 'capture', label: 'Teleop Rigs', slug: 'teleop-rigs' },
];

// ---------------- Product model ----------------

export interface ShopSpec {
  label: string;
  value: string;
}

export interface ShopBundle {
  id: string;
  label: string;
  description?: string;
}

export interface ShopSoftwareTier {
  tier: string;
  description: string;
}

export interface ShopProduct {
  id: string;
  slug: string;                  // URL segment, unique within a category
  category: string;              // ShopCategory.id (CRM component id)
  group: ShopGroupId;
  name: string;
  vendor: string;
  vendorOrigin: string;          // ISO country (NL, JP, US, ...)
  vendorOriginLabel: string;     // human-readable
  tagline: string;
  description: string;
  imageUrl?: string;             // card + hero image (supplied by vendor packages)
  // Price is per-unit. null => "Price on request".
  listPrice: number | null;
  currency: string | null;       // ISO 4217, e.g. "USD", "EUR"
  specs: ShopSpec[];
  bundles?: ShopBundle[];
  software?: ShopSoftwareTier[];
  customers?: string[];          // publicly named OEM/lab customers only
  ndaaStatus?: string;
  heroVideoUrl?: string;         // looping muted hero video (path under /public)
  secondaryVideoUrl?: string;    // click-to-play case-study video
  secondaryVideoCaption?: string;
  vendorUrl: string;
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    id: 'xsens-link',
    slug: 'xsens-link',
    category: 'mocap_suit',
    group: 'capture',
    name: 'Xsens Link',
    vendor: 'Xsens',
    vendorOrigin: 'NL',
    vendorOriginLabel: 'Netherlands',
    tagline: 'Motion capture suits for full-body teleoperation and ML training data collection for humanoid robotics.',
    description:
      'Next-generation inertial motion capture suit launched November 2025. ' +
      'Streams human kinematics directly into ROS 2, NVIDIA Isaac Sim, and MuJoCo ' +
      'with ~20 ms end-to-end latency. Designed for humanoid teleoperation, ' +
      'demonstration data capture, and motion retargeting workflows.',
    imageUrl: '/videos/xsens-link-hero.mp4',
    listPrice: null,
    currency: null,
    specs: [
      { label: 'Sensors', value: '17 body + 1 prop' },
      { label: 'Update rate', value: '240 Hz' },
      { label: 'Latency', value: '~20 ms end-to-end' },
      { label: 'Wireless', value: 'Wi-Fi 6E · 150 m range' },
      { label: 'Battery', value: '7–8 hr hot-swap (USB-C PD)' },
      { label: 'Sizing', value: 'S–XXL washable eSuit' },
      { label: 'Storage', value: 'On-suit recording up to 50 hr' },
      { label: 'Magnetic immunity', value: 'Yes' },
    ],
    bundles: [
      { id: 'suit_only', label: 'Xsens Link suit (hardware only)', description: 'Suit + receivers + Pelican case.' },
      { id: 'suit_gloves', label: 'Xsens Link + Metagloves by Manus', description: 'Adds finger tracking — 120 Hz, 15 m wireless, swappable battery.' },
      { id: 'suit_live', label: 'Xsens Link + Xsens Humanoid Live', description: 'Turnkey teleoperation. ROS 2 / Isaac Sim / MuJoCo native.' },
      { id: 'suit_pro_sdk', label: 'Xsens Link + Xsens Humanoid Pro + SDK', description: 'Fleet-scale data collection with HD reprocessing and batch export.' },
    ],
    software: [
      { tier: 'Live', description: '~20 ms latency teleop streaming. ROS 1/2, NVIDIA Isaac Sim, MuJoCo.' },
      { tier: 'Pro', description: 'HD reprocessing, batch export to MVNX / XLSX / MP4 / BVH.' },
      { tier: 'Academic', description: 'Discounted tier for universities. 1–10 seat network licenses.' },
    ],
    customers: [
      'NVIDIA',
      'Boston Dynamics',
      'Italian Institute of Technology',
      'Kepler Robotics',
      'DEEP Robotics',
      'Mentee Robotics',
    ],
    ndaaStatus: 'NATO-ally sourced (Netherlands). No NDAA covered-foreign-entity flags.',
    heroVideoUrl: '/videos/xsens-link-hero.mp4',
    secondaryVideoUrl: '/videos/xsens-60min.mp4',
    secondaryVideoCaption: '60 Minutes — Boston Dynamics + Xsens humanoid training loop',
    vendorUrl: 'https://www.xsens.com/humanoid-robots',
  },
];

// ---------------- Helpers ----------------

const CATEGORY_BY_ID = new Map(SHOP_CATEGORIES.map((c) => [c.id, c]));
const CATEGORY_BY_SLUG = new Map(SHOP_CATEGORIES.map((c) => [c.slug, c]));

export function categoryById(id: string): ShopCategory | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function categoryBySlug(slug: string): ShopCategory | undefined {
  return CATEGORY_BY_SLUG.get(slug);
}

export function productsByCategory(categoryId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter((p) => p.category === categoryId);
}

export function productBySlug(categoryId: string, slug: string): ShopProduct | undefined {
  return SHOP_PRODUCTS.find((p) => p.category === categoryId && p.slug === slug);
}

// Categories with >=1 live product, in taxonomy order — drives the Shop nav.
export function liveCategories(): ShopCategory[] {
  const live = new Set(SHOP_PRODUCTS.map((p) => p.category));
  return SHOP_CATEGORIES.filter((c) => live.has(c.id));
}

export function formatPrice(listPrice: number | null, currency: string | null): string {
  if (listPrice == null) return 'Price on request';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(listPrice);
  } catch {
    return `${currency || 'USD'} ${listPrice.toLocaleString('en-US')}`;
  }
}
