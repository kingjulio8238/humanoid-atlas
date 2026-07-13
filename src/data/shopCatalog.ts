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
  { id: 'harmonic_joint_motor', group: 'actuation', label: 'Harmonic Joint Motors', slug: 'harmonic-joint-motors' },
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
  { id: 'egocentric_capture', group: 'capture', label: 'Egocentric Capture', slug: 'egocentric-capture' },
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

// ---------------- Series (variant-matrix) products ----------------
// Some products are a whole SERIES with a size × option matrix rather than a
// single SKU (e.g. Honpine HPJM harmonic joint motors: 14 frame sizes, each with
// 2–5 gear-ratio options and 4 build variants). A product with a `series` block
// renders a frame comparison table + a configurator instead of the flat layout.

export interface ShopSeriesRatio {
  ratio: number;          // reduction ratio, e.g. 51
  ratedTorqueNm: number;  // @ rated speed
  maxTorqueNm: number;    // max allowable at average load
  impactTorqueNm: number;
  ratedSpeedRpm: number;
  peakSpeedRpm: number;
  backlashArcsec: number;
}

// Per-frame price by build variant. Each value is [1–99 pcs, 100+ pcs] USD/pc.
// Build = encoder (single/dual) × brake (none/with).
export interface ShopSeriesBuildPrice {
  seNb: [number, number]; // single encoder, no brake
  seWb: [number, number]; // single encoder, with brake
  deNb: [number, number]; // dual encoder, no brake
  deWb: [number, number]; // dual encoder, with brake
}

export interface ShopSeriesFrame {
  code: string;           // frame code, e.g. "RE30-40"
  odMm: number;           // flange outer diameter (2nd number in the code)
  pilotDiaMm: number;     // pilot/register diameter
  boreMm: number;         // hollow-shaft through-bore
  lengthMm: number;       // overall length
  ratedPowerW: number;
  ratedCurrentA: number;
  maxContCurrentA: number;
  torqueConstant: number; // N.m/A
  weightG: number | null; // null => "On request"
  ratios: ShopSeriesRatio[];
  price: ShopSeriesBuildPrice;
  imageUrl?: string;
  drawingPdfUrl?: string;
  stepUrl?: string;
  // Mounting + electrical interface (from dimensioned drawings)
  boltPattern?: string;   // output-flange bolt pattern, e.g. "12×M2.5 (thru ⌀12)"
  motorPattern?: string;  // motor/secondary mounting pattern
  fit?: string;           // register fits, e.g. "OD ⌀40 h7 · pilot ⌀31 h7"
  connector?: string;     // connector set / interface summary
}

export interface ShopSeriesLeadTime {
  qty: string;             // e.g. "1–5 units"
  time: string;            // e.g. "1–10 days"
  maxQty: number | null;   // upper bound of this tier (null = unbounded)
}

export interface ShopSeriesOrdering {
  format: string;                                  // part-number template
  segments: { code: string; meaning: string }[];  // legend
  note?: string;
}

export interface ShopSeries {
  common: ShopSpec[];        // specs shared across every frame (voltage, encoder, bus…)
  customization: string[];   // optional build customizations (brake, protocol, low-temp…)
  fromPrice: number;         // headline "From $X" (lowest per-unit price in the matrix)
  currency: string;          // ISO 4217, e.g. "USD"
  buildLabels: {
    encoder: { se: string; de: string };
    brake: { nb: string; wb: string };
  };
  frames: ShopSeriesFrame[];
  leadTimes?: ShopSeriesLeadTime[];  // qty-based delivery schedule
  ordering?: ShopSeriesOrdering;     // part-number decode / ordering guide
  qc?: string;                       // quality / trust signal
  skuBase?: (frameCode: string, ratio: number) => string; // base catalog SKU builder
}

// ---------------- Variant-table products (RFQ series, no price matrix) ----------------
// Some products are a whole SERIES of closely-related SKUs that vary along a few
// axes (e.g. a gripper family scaling by stroke / force / size) and sell RFQ-only.
// Unlike `series` (motor size × gear-ratio × build with a full price matrix), a
// `variants` block renders shared specs + a plain model-comparison table, and the
// request modal adds a model picker. No prices.

export interface ShopVariantColumn {
  key: string;   // matches a key in ShopVariantRow.values
  label: string; // column header, e.g. "Gripping force"
}

export interface ShopVariantRow {
  model: string;                   // catalog SKU, e.g. "CTPM2F14"
  label?: string;                  // short descriptor, e.g. "2-finger"
  imageUrl?: string;               // optional per-variant thumbnail
  values: Record<string, string>;  // keyed by ShopVariantColumn.key
  note?: string;
  detail?: ShopSpec[];             // extra specs shown when the row is expanded
}

export interface ShopVariantTable {
  common: ShopSpec[];         // specs shared across every model in the family
  columns: ShopVariantColumn[];
  rows: ShopVariantRow[];
  customization?: string[];   // optional control/interface chips
  note?: string;              // family-wide note (e.g. "fingers not included")
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
  posterUrl?: string;            // still image for cards when imageUrl is a video
  cardImages?: string[];         // card-only carousel (photos); detail hero unaffected
  gallery?: string[];            // optional hero carousel (multiple product photos)
  // Price is per-unit. null => "Price on request".
  listPrice: number | null;
  currency: string | null;       // ISO 4217, e.g. "USD", "EUR"
  shippingUsd?: number;          // flat shipping estimate (USD), shown under price
  leadTime?: string;             // delivery lead time, shown in the hero meta (e.g. "8 weeks (made to order)")
  specs: ShopSpec[];
  bundles?: ShopBundle[];
  software?: ShopSoftwareTier[];
  customers?: string[];          // publicly named OEM/lab customers only
  ndaaStatus?: string;
  heroVideoUrl?: string;         // looping muted hero video (path under /public)
  secondaryVideoUrl?: string;    // click-to-play case-study video
  secondaryVideoCaption?: string;
  vendorUrl: string;
  // Optional single-product detail sections (flat layout only). Populated when a
  // vendor package gives us richer distributor info than a bare spec strip.
  inBox?: string[];                     // "In the box" package contents
  connector?: {                         // pinout + interface notes
    pins: { pin: string; color: string; signal: string }[];
    note?: string;
  };
  modes?: { name: string; description: string }[]; // control/operating modes
  photos?: string[];                    // "In use" photo gallery (kept-background shots)
  // Present for series products (size × option matrix); renders a comparison
  // table + configurator instead of the flat specs/bundles layout.
  series?: ShopSeries;
  // Present for RFQ variant families (many SKUs, no price matrix); renders shared
  // specs + a model-comparison table, and adds a model picker to the request modal.
  variants?: ShopVariantTable;
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
    posterUrl: '/videos/xsens-link-poster.jpg',
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
  {
    // Tesollo Delto Gripper DG-3F-M — 3-finger modular robotic gripper. Data
    // sourced from the vendor package: DG-3F-M Hardware Manual EN v2.0.0
    // (mechanical/electrical/comm spec, connector pinout, package contents) and
    // the company overview deck (product copy). Tesollo shipped info for this one
    // model only, so the rest of the Delto line is intentionally not listed.
    // No pricing, lead time, numeric outer dimensions, or CAD were provided
    // (RFQ model) — listPrice stays null ("Price on request").
    id: 'tesollo-dg-3f-m',
    slug: 'tesollo-dg-3f-m',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-3F-M',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Modular 3-finger robotic gripper with 12 DoF and independently driven ' +
      'fingers for pick-and-place, bin picking, assembly, and machine tending.',
    description:
      'A next-generation 3-finger robotic gripper with a modular design. It ' +
      'delivers strong, stable grasping while minimizing interference in confined ' +
      'spaces. Improved gear reduction and motor output enable precise, consistent ' +
      'grip control, with each finger operating independently. Module-level ' +
      'servicing and a standard bolt-mount interface make maintenance and system ' +
      'integration straightforward.',
    imageUrl: '/shop/tesollo/gallery/dg-3f-m-angle.png',
    gallery: [
      '/shop/tesollo/gallery/dg-3f-m-angle.png',
      '/shop/tesollo/gallery/dg-3f-m-front.png',
      '/shop/tesollo/gallery/dg-3f-m-arm.png',
    ],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: '3 fingers · 12 DoF (4 per finger)' },
      { label: 'Pinching payload', value: '2.5 kg rated · 5 kg max' },
      { label: 'Envelope payload', value: '10 kg rated · 15 kg max' },
      { label: 'Fingertip force', value: '40 N per finger' },
      { label: 'Weight', value: '1,114 g' },
      { label: 'Motor', value: 'BLDC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '10 A' },
      { label: 'Joint torque', value: '0.4 Nm rated · 2 Nm stall' },
      { label: 'No-load speed', value: '75 rpm per joint' },
      { label: 'Encoder', value: '12-bit absolute, per joint' },
      { label: 'Repeatability', value: '0.1° per joint' },
      { label: 'Communication', value: 'Modbus RTU/TCP · EtherNet TCP/IP' },
      { label: 'Control cycle', value: '333 Hz' },
      { label: 'Fingertips', value: 'White silicone, 40 Shore A' },
      { label: 'Mounting', value: 'ISO 9409-1-50-4-M6' },
      { label: 'Lead time', value: '8 weeks (made to order · monthly production)' },
      { label: 'Warranty', value: '12 months' },
    ],
    leadTime: '8 weeks (made to order)',
    modes: [
      {
        name: 'Operator Mode',
        description:
          "Runs on the gripper's internal controller over Modbus. Control by " +
          'editing the register map or using the bundled UI. Communication cycle ' +
          '33 Hz (Modbus-RTU) or 800 Hz (Modbus-TCP).',
      },
      {
        name: 'Developer Mode',
        description:
          'Direct per-joint control from a custom controller over EtherNet ' +
          '(TCP/IP), with live feedback from every joint. Communication cycle ' +
          'up to 500 Hz.',
      },
    ],
    connector: {
      pins: [
        { pin: '1', color: 'White', signal: 'RS485 A' },
        { pin: '2', color: 'Brown', signal: 'RS485 B' },
        { pin: '3', color: 'Green', signal: 'Digital Output 1' },
        { pin: '4', color: 'Yellow', signal: 'Digital Output 0' },
        { pin: '5', color: 'Gray', signal: 'GND' },
        { pin: '6', color: 'Pink', signal: 'Digital Output 2' },
        { pin: '7', color: 'Blue', signal: 'Digital Input 0' },
        { pin: '8', color: 'Red', signal: '24 V DC' },
      ],
      note:
        '8-pin control connector. EtherNet (TCP/IP) runs on a separate RJ45 port. ' +
        'Supply must provide at least 10 A at 24 V DC.',
    },
    inBox: [
      'DG-3F-M gripper body',
      'Adapter frame (ISO 9409-1-50-4-M6)',
      'Adapter frame bolt set',
      'USB drive (4 GB): user manual, SDK, UI, kinematics data',
      'Power cable',
      'EtherNet cable',
    ],
    photos: [
      '/shop/tesollo/in-use/dg-3f-m-apple.jpg',
      '/shop/tesollo/in-use/dg-3f-m-baseball.jpg',
      '/shop/tesollo/in-use/dg-3f-m-cube.jpg',
      '/shop/tesollo/in-use/dg-3f-m-dumbbell.jpg',
      '/shop/tesollo/in-use/dg-3f-m-golf.jpg',
    ],
    vendorUrl: 'https://en.tesollo.com',
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
