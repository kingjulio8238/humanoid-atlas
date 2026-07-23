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
  {
    // Tesollo Delto DG-5F-M — human-scale 5-finger dexterous hand. Specs and
    // product copy from the Tesollo company overview deck
    // (Tesollo_company_overview.pdf, product page for DG-5F-M). No standalone
    // hardware manual, pricing, connector pinout, or in-box list was supplied
    // for this model, so only deck-level fields are listed (RFQ, listPrice null).
    // imageUrl is a PLACEHOLDER extracted from the deck render — replace with an
    // official Tesollo image when available.
    id: 'tesollo-dg-5f-m',
    slug: 'tesollo-dg-5f-m',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-5F-M',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Human-scale 5-finger robotic hand with 20 DoF for human-level grasping ' +
      'and manipulation, tool handling, and object assembly/disassembly.',
    description:
      "A robot hand capable of human-level grasping and manipulation. Similar in " +
      "size to an adult male's hand, it is composed of 20 independently controlled " +
      'joints across five fingers. It suits tasks such as tool handling and object ' +
      'assembly/disassembly, making it applicable to research institutions and a ' +
      'wide range of industries.',
    imageUrl: '/shop/tesollo/gallery/dg-5f-m.png',
    gallery: ['/shop/tesollo/gallery/dg-5f-m.png'],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: '5 fingers · 20 DoF (4 per finger)' },
      { label: 'Pinching payload', value: '2.5 kg rated · 5 kg max' },
      { label: 'Envelope payload', value: '10 kg rated · 20 kg max' },
      { label: 'Weight', value: '1,763 g' },
      { label: 'Motor', value: 'BLDC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '10 A' },
      { label: 'Joint torque', value: '0.4 Nm rated · 2 Nm stall' },
      { label: 'No-load speed', value: '75 rpm per joint' },
      { label: 'Encoder', value: 'Absolute, per joint' },
      { label: 'Communication', value: 'Modbus RTU/TCP · EtherNet TCP/IP' },
      { label: 'Control cycle', value: '250 Hz' },
    ],
    vendorUrl: 'https://en.tesollo.com',
  },
  {
    // Tesollo Delto DG-5F-S — compact, lightweight (<1 kg) high-DoF 5-finger
    // hand. Specs/copy from the company overview deck (DG-5F-S product page).
    // imageUrl is a PLACEHOLDER extracted from the deck render — replace with an
    // official Tesollo image when available.
    id: 'tesollo-dg-5f-s',
    slug: 'tesollo-dg-5f-s',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-5F-S',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Compact, lightweight (<1 kg) 5-finger robotic hand with 20 DoF for ' +
      'humanoid robots and advanced manipulation research.',
    description:
      'A compact, lightweight high-DoF robotic hand that combines a human-scale ' +
      'form factor with a sub-1 kg design, making it well-suited for humanoid ' +
      'robots and manipulation research. It serves as a high-performance research ' +
      'platform capable of reliably handling advanced tasks such as deformable ' +
      'object manipulation, tool use, and precision assembly and fastening.',
    imageUrl: '/shop/tesollo/gallery/dg-5f-s.png',
    gallery: ['/shop/tesollo/gallery/dg-5f-s.png'],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: '5 fingers · 20 DoF (4 per finger)' },
      { label: 'Pinching payload', value: '1 kg rated · 2 kg max' },
      { label: 'Envelope payload', value: '7 kg rated · 12 kg max' },
      { label: 'Weight', value: '880 g' },
      { label: 'Motor', value: 'DC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '10 A' },
      { label: 'Joint torque', value: '0.11 Nm rated · 0.65 Nm stall' },
      { label: 'No-load speed', value: '85 rpm per joint' },
      { label: 'Encoder', value: 'Absolute, per joint' },
      { label: 'Communication', value: 'EtherNet TCP/IP · Modbus TCP' },
      { label: 'Control cycle', value: '500 Hz' },
    ],
    vendorUrl: 'https://en.tesollo.com',
  },
  {
    // Tesollo Delto DG-4F — 4-finger hybrid hand/gripper. Specs/copy from the
    // company overview deck (DG-4F product page). imageUrl is a PLACEHOLDER
    // extracted from the deck render — replace with an official image later.
    id: 'tesollo-dg-4f',
    slug: 'tesollo-dg-4f',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-4F',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Shape-shifting 4-finger gripper with 18 DoF that combines humanoid-hand ' +
      'and gripper functions for mixed picking and assembly.',
    description:
      'A gripper that combines both humanoid-hand and gripper functions. Its ' +
      'flexible design can transform its shape and includes the functions of a ' +
      'left hand, right hand, and gripper. It can securely grasp objects of ' +
      'various materials and shapes and is also capable of tool-handling tasks, ' +
      'making it suitable for automating processes that mix picking and assembly ' +
      'operations.',
    imageUrl: '/shop/tesollo/gallery/dg-4f.png',
    gallery: ['/shop/tesollo/gallery/dg-4f.png'],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: '4 fingers · 18 DoF (4-5 per finger)' },
      { label: 'Pinching payload', value: '3 kg rated · 5 kg max' },
      { label: 'Envelope payload', value: '10 kg rated · 20 kg max' },
      { label: 'Weight', value: '1,494 g' },
      { label: 'Motor', value: 'BLDC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '10 A' },
      { label: 'Joint torque', value: '0.4 Nm rated · 2 Nm stall' },
      { label: 'No-load speed', value: '75 rpm per joint' },
      { label: 'Encoder', value: 'Absolute, per joint' },
      { label: 'Communication', value: 'Modbus RTU/TCP · EtherNet TCP/IP' },
      { label: 'Control cycle', value: '333 Hz' },
    ],
    vendorUrl: 'https://en.tesollo.com',
  },
  {
    // Tesollo Delto DG-2F — 2-finger precision gripper. Specs/copy from the
    // company overview deck (DG-2F product page). imageUrl is a PLACEHOLDER
    // extracted from the deck render — replace with an official image later.
    id: 'tesollo-dg-2f',
    slug: 'tesollo-dg-2f',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-2F',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Multi-joint 2-finger gripper with 6 DoF for precise handling of diverse ' +
      'objects in repetitive industrial automation.',
    description:
      'A multi-joint two-finger gripper engineered for precise handling of diverse ' +
      'objects. It is optimized for repetitive precision tasks and can securely ' +
      'lift up to 4 kg with a pinching grasp. Its 6-DoF structure adapts easily to ' +
      'various object shapes, making it ideal for industrial automation.',
    imageUrl: '/shop/tesollo/gallery/dg-2f.png',
    gallery: ['/shop/tesollo/gallery/dg-2f.png'],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: '2 fingers · 6 DoF (3 per finger)' },
      { label: 'Pinching payload', value: '2.5 kg rated · 4 kg max' },
      { label: 'Envelope payload', value: '5 kg rated · 10 kg max' },
      { label: 'Weight', value: '770 g' },
      { label: 'Motor', value: 'BLDC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '10 A' },
      { label: 'Joint torque', value: '0.4 Nm rated · 2 Nm stall' },
      { label: 'No-load speed', value: '75 rpm per joint' },
      { label: 'Encoder', value: 'Absolute, per joint' },
      { label: 'Communication', value: 'Modbus RTU/TCP · EtherNet TCP/IP' },
      { label: 'Control cycle', value: '500 Hz' },
    ],
    vendorUrl: 'https://en.tesollo.com',
  },
  {
    // Tesollo Delto DG-1F — vacuum/suction gripper with articulated pad. Specs/
    // copy from the company overview deck (DG-1F product page). No payload
    // figures were given in the deck for this model (vacuum gripper). imageUrl is
    // a PLACEHOLDER extracted from the deck render — replace with an official
    // image later.
    id: 'tesollo-dg-1f',
    slug: 'tesollo-dg-1f',
    category: 'gripper',
    group: 'end-effectors',
    name: 'Tesollo DG-1F',
    vendor: 'Tesollo',
    vendorOrigin: 'KR',
    vendorOriginLabel: 'South Korea',
    tagline:
      'Vacuum gripper with 3-DoF articulated suction fingertip for stable ' +
      'picking on uneven or awkward surfaces.',
    description:
      'A vacuum gripper designed with extra pad freedom to reduce environmental ' +
      'interference. Combining 3-DoF motion with a suction fingertip enables ' +
      'stable gripping even on uneven or awkward surfaces. It offers an efficient ' +
      'solution for vacuum handling, piece-picking, and other precision tasks.',
    imageUrl: '/shop/tesollo/gallery/dg-1f.png',
    gallery: ['/shop/tesollo/gallery/dg-1f.png'],
    listPrice: null,
    currency: 'USD',
    specs: [
      { label: 'Configuration', value: 'Vacuum gripper · 3 DoF articulated pad' },
      { label: 'Weight', value: '710 g' },
      { label: 'Motor', value: 'BLDC' },
      { label: 'Supply voltage', value: '24 V DC' },
      { label: 'Max current', value: '6 A' },
      { label: 'Joint torque', value: '0.4 Nm rated · 2 Nm stall' },
      { label: 'No-load speed', value: '75 rpm per joint' },
      { label: 'Encoder', value: 'Absolute, per joint' },
      { label: 'Communication', value: 'Modbus RTU/TCP · EtherNet TCP/IP' },
      { label: 'Control cycle', value: '1,000 Hz' },
    ],
    vendorUrl: 'https://en.tesollo.com',
  },

  {
    // HONPINE HPJM PRO Series — integrated harmonic joint motors. Data sourced
    // from the vendor package: specification EN.xlsx (electricals + per-ratio
    // torque/speed/backlash), price and delivery.xlsx (USD/pc matrix), and the
    // dimensioned PRO drawings (OD/pilot/bore/length). Weight is blank in every
    // source → weightG: null ("On request"). For the 5 largest frames
    // (RE80-110…RE110-170) the source price file had garbled build-variant
    // LABELS (prices intact); values below are entered in the standard
    // SE/NB → SE/WB → DE/NB → DE/WB order per the price pattern — CONFIRM labels
    // with Honpine before publishing.
    // PRICING: per the Honpine collect-and-remit agreement (v5, 2026-07-13), all
    // prices below are Honpine's EXW price × 1.10 — i.e. Atlas's 10% commission is
    // baked in on top. Atlas collects the listed price and remits the EXW (list ÷ 1.10)
    // to Honpine. Source EXW figures: price and delivery.xlsx (and git history of this file).
    id: 'honpine-hpjm',
    slug: 'honpine-hpjm',
    category: 'harmonic_joint_motor',
    group: 'actuation',
    name: 'Honpine HPJM Series',
    vendor: 'Honpine',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Integrated harmonic joint motors: frameless BLDC, strain-wave reducer, 16-bit encoder, and CAN/EtherCAT driver in one hollow-shaft module.',
    description:
      "HONPINE's HPJM PRO Series integrates a frameless BLDC motor, strain-wave " +
      'reducer, 16-bit absolute encoder, and CAN/EtherCAT driver into one ' +
      'hollow-shaft joint module. 14 frame sizes (RE30-40 to RE110-170) in multiple ' +
      'gear ratios, with optional brake, dual-encoder, low-temperature, and ' +
      'left-hand builds.',
    imageUrl: '/shop/hpjm/gallery/front-new.png',
    gallery: [
      '/shop/hpjm/gallery/front-new.png',
      '/shop/hpjm/gallery/angle-new.png',
      '/shop/hpjm/gallery/connector-new.png',
      '/shop/hpjm/gallery/side-new.png',
    ],
    listPrice: null,
    currency: 'USD',
    specs: [],
    vendorUrl: 'https://www.honpine.com',
    series: {
      common: [
        { label: 'Supply voltage', value: '24–48 V DC' },
        { label: 'Encoder', value: '16-bit absolute (65,536 cpr)' },
        { label: 'Communication', value: 'CAN / EtherCAT' },
        { label: 'Construction', value: 'Hollow-shaft integrated harmonic joint module' },
      ],
      customization: [
        'Optional holding brake',
        'EtherCAT / CANopen protocol',
        'Low-temperature build (−40 °C)',
        'Left-hand (LH) mirror build',
      ],
      fromPrice: 1095,
      currency: 'USD',
      buildLabels: {
        encoder: { se: 'Single encoder', de: 'Dual encoder' },
        brake: { nb: 'No brake', wb: 'With brake' },
      },
      leadTimes: [
        { qty: '1–5 units', time: '1–10 days', maxQty: 5 },
        { qty: '6–20 units', time: '3–15 days', maxQty: 20 },
        { qty: '21–100 units', time: '3–30 days', maxQty: 100 },
        { qty: '101+ units', time: 'By arrangement', maxQty: null },
      ],
      ordering: {
        format: 'HPJM-RE{frame}-{OD}-PRO-{ratio}-B',
        segments: [
          { code: 'RE{frame}', meaning: 'Motor / rotor frame-size class' },
          { code: '{OD}', meaning: 'Module outer diameter in mm' },
          { code: 'PRO', meaning: 'Product grade (PRO finished series)' },
          { code: '{ratio}', meaning: 'Gear reduction ratio (51 / 81 / 101 / 121 / 161)' },
          { code: 'B', meaning: 'Output-flange configuration code' },
        ],
        note: 'Build options (single or dual encoder, holding brake, CAN / EtherCAT / CANopen protocol, low-temperature to −40 °C, and left-hand LH mirror) are specified on top of the base code. Atlas confirms the final catalog part number with Honpine.',
      },
      qc: 'Every unit is serialized, date-coded, and ships with a factory QC pass (100% tested).',
      skuBase: (frameCode, ratio) => `HPJM-${frameCode}-PRO-${ratio}-B`,
      frames: [
        {
          code: 'RE30-40', odMm: 40, pilotDiaMm: 31, boreMm: 6, lengthMm: 78.6,
          ratedPowerW: 36, ratedCurrentA: 1, maxContCurrentA: 2, torqueConstant: 0.024, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 1.8, maxTorqueNm: 2.3, impactTorqueNm: 3.3, ratedSpeedRpm: 90, peakSpeedRpm: 118, backlashArcsec: 40 },
            { ratio: 101, ratedTorqueNm: 2.8, maxTorqueNm: 3.3, impactTorqueNm: 4.8, ratedSpeedRpm: 45, peakSpeedRpm: 59, backlashArcsec: 40 },
          ],
          price: { seNb: [1170, 1095], seWb: [1324, 1252], deNb: [1313, 1239], deWb: [1471, 1396] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE30-40-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE30-40-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE30-40-PRO.step',
          boltPattern: '8×M2.5 (thru-bore ⌀6)',
          motorPattern: '8×M2 + 8×⌀2.2',
          fit: 'pilot ⌀31 h7 · OD ⌀40 h7',
          connector: 'Flying-lead (Power+CAN X1002H-04L, 20 cm) · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE40-52', odMm: 52, pilotDiaMm: 40, boreMm: 12, lengthMm: 81.5,
          ratedPowerW: 90, ratedCurrentA: 2, maxContCurrentA: 3, torqueConstant: 0.05, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 4, maxTorqueNm: 5.5, impactTorqueNm: 8.3, ratedSpeedRpm: 80, peakSpeedRpm: 118, backlashArcsec: 40 },
            { ratio: 101, ratedTorqueNm: 6.5, maxTorqueNm: 8.9, impactTorqueNm: 11, ratedSpeedRpm: 40, peakSpeedRpm: 59, backlashArcsec: 30 },
          ],
          price: { seNb: [1245, 1170], seWb: [1421, 1346], deNb: [1399, 1324], deWb: [1542, 1467] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE40-52-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE40-52-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE40-52-PRO.step',
          boltPattern: '8×M2.5 (BCD ⌀47) + 8×M2.5',
          motorPattern: '4×M2 (BCD ⌀19)',
          fit: 'pilot ⌀40 h7 · OD ⌀52 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE50-60', odMm: 60, pilotDiaMm: 47, boreMm: 12, lengthMm: 81.5,
          ratedPowerW: 150, ratedCurrentA: 3.6, maxContCurrentA: 5, torqueConstant: 0.089, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 6.6, maxTorqueNm: 8.6, impactTorqueNm: 23, ratedSpeedRpm: 75, peakSpeedRpm: 97, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 9.6, maxTorqueNm: 13.5, impactTorqueNm: 29, ratedSpeedRpm: 46, peakSpeedRpm: 61, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 9.6, maxTorqueNm: 13.5, impactTorqueNm: 34, ratedSpeedRpm: 37, peakSpeedRpm: 49, backlashArcsec: 10 },
          ],
          price: { seNb: [1320, 1245], seWb: [1496, 1421], deNb: [1474, 1399], deWb: [1617, 1542] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE50-60-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE50-60-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE50-60-PRO.step',
          boltPattern: '12×M2.5 (BCD ⌀54.5) + 12×M2.5 (BCD ⌀42)',
          motorPattern: '4×M2 (BCD ⌀24)',
          fit: 'pilot ⌀47 h7 · OD ⌀60 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE50-70', odMm: 70, pilotDiaMm: 50, boreMm: 12, lengthMm: 81.6,
          ratedPowerW: 150, ratedCurrentA: 3.6, maxContCurrentA: 5, torqueConstant: 0.089, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 6.6, maxTorqueNm: 8.6, impactTorqueNm: 23, ratedSpeedRpm: 75, peakSpeedRpm: 97, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 9.6, maxTorqueNm: 13.5, impactTorqueNm: 29, ratedSpeedRpm: 46, peakSpeedRpm: 61, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 9.6, maxTorqueNm: 13.5, impactTorqueNm: 34, ratedSpeedRpm: 37, peakSpeedRpm: 49, backlashArcsec: 10 },
          ],
          price: { seNb: [1283, 1207], seWb: [1459, 1383], deNb: [1437, 1361], deWb: [1580, 1504] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE50-70-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE50-70-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE50-70-PRO.step',
          boltPattern: '8×M3 (BCD ⌀64) + 8×M3 (BCD ⌀44)',
          fit: 'pilot ⌀50 h7 · OD ⌀70 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE60-70', odMm: 70, pilotDiaMm: 57, boreMm: 18, lengthMm: 92.5,
          ratedPowerW: 300, ratedCurrentA: 5, maxContCurrentA: 6.7, torqueConstant: 0.096, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 19.8, maxTorqueNm: 32, impactTorqueNm: 42, ratedSpeedRpm: 68, peakSpeedRpm: 82, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 27.5, maxTorqueNm: 33, impactTorqueNm: 53, ratedSpeedRpm: 43, peakSpeedRpm: 51, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 30, maxTorqueNm: 49, impactTorqueNm: 66, ratedSpeedRpm: 34, peakSpeedRpm: 41, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 30, maxTorqueNm: 49, impactTorqueNm: 66, ratedSpeedRpm: 24, peakSpeedRpm: 32, backlashArcsec: 10 },
          ],
          price: { seNb: [1359, 1283], seWb: [1535, 1459], deNb: [1513, 1437], deWb: [1656, 1580] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE60-70-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE60-70-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE60-70-PRO.step',
          boltPattern: '16×M3 + 16×⌀3.5/M3 (BCD ⌀51)',
          motorPattern: '16×M2.5 (BCD ⌀65)',
          fit: 'pilot ⌀57 h7 · OD ⌀70 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE60-80', odMm: 80, pilotDiaMm: 60, boreMm: 18, lengthMm: 91.5,
          ratedPowerW: 300, ratedCurrentA: 5, maxContCurrentA: 6.7, torqueConstant: 0.096, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 19.8, maxTorqueNm: 32, impactTorqueNm: 42, ratedSpeedRpm: 68, peakSpeedRpm: 82, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 27.8, maxTorqueNm: 33, impactTorqueNm: 53, ratedSpeedRpm: 43, peakSpeedRpm: 51, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 30, maxTorqueNm: 49, impactTorqueNm: 66, ratedSpeedRpm: 34, peakSpeedRpm: 41, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 30, maxTorqueNm: 49, impactTorqueNm: 66, ratedSpeedRpm: 24, peakSpeedRpm: 32, backlashArcsec: 10 },
          ],
          price: { seNb: [1393, 1318], seWb: [1569, 1494], deNb: [1547, 1472], deWb: [1690, 1615] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE60-80-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE60-80-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE60-80-PRO.step',
          boltPattern: '16×⌀3.5/M3 (BCD ⌀54)',
          motorPattern: '9×M3 thru (⌀74)',
          fit: 'pilot ⌀60 h7 · OD ⌀80 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE70-80', odMm: 80, pilotDiaMm: 67, boreMm: 18, lengthMm: 91.5,
          ratedPowerW: 500, ratedCurrentA: 6.1, maxContCurrentA: 8.4, torqueConstant: 0.118, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 32, maxTorqueNm: 42, impactTorqueNm: 63, ratedSpeedRpm: 61, peakSpeedRpm: 77, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 42, maxTorqueNm: 58, impactTorqueNm: 91, ratedSpeedRpm: 38, peakSpeedRpm: 48, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 50, maxTorqueNm: 61, impactTorqueNm: 102, ratedSpeedRpm: 30, peakSpeedRpm: 40, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 50, maxTorqueNm: 61, impactTorqueNm: 108, ratedSpeedRpm: 25, peakSpeedRpm: 30, backlashArcsec: 10 },
          ],
          price: { seNb: [1433, 1359], seWb: [1609, 1535], deNb: [1587, 1513], deWb: [1730, 1656] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE70-80-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE70-80-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE70-80-PRO.step',
          boltPattern: '14×M2.5 (BCD ⌀75)',
          motorPattern: '16×⌀3.5/M3 thru (BCD ⌀61)',
          fit: 'pilot ⌀67 h7 · OD ⌀80 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE70-90', odMm: 90, pilotDiaMm: 70, boreMm: 18, lengthMm: 73.5,
          ratedPowerW: 500, ratedCurrentA: 6.1, maxContCurrentA: 8.4, torqueConstant: 0.118, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 32, maxTorqueNm: 42, impactTorqueNm: 63, ratedSpeedRpm: 61, peakSpeedRpm: 77, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 42, maxTorqueNm: 58, impactTorqueNm: 91, ratedSpeedRpm: 38, peakSpeedRpm: 48, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 50, maxTorqueNm: 61, impactTorqueNm: 102, ratedSpeedRpm: 30, peakSpeedRpm: 40, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 50, maxTorqueNm: 61, impactTorqueNm: 108, ratedSpeedRpm: 25, peakSpeedRpm: 30, backlashArcsec: 10 },
          ],
          price: { seNb: [1507, 1480], seWb: [1683, 1656], deNb: [1661, 1634], deWb: [1804, 1777] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE70-90-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE70-90-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE70-90-PRO.step',
          boltPattern: '12×M3',
          motorPattern: '16×M3 (BCD ⌀84)',
          fit: 'pilot ⌀70 h7 · OD ⌀90 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE80-97', odMm: 97, pilotDiaMm: 81, boreMm: 27, lengthMm: 105.5,
          ratedPowerW: 750, ratedCurrentA: 9, maxContCurrentA: 10.4, torqueConstant: 0.143, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 48, maxTorqueNm: 68.8, impactTorqueNm: 121, ratedSpeedRpm: 54, peakSpeedRpm: 65, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 78, maxTorqueNm: 107, impactTorqueNm: 169, ratedSpeedRpm: 35, peakSpeedRpm: 43, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 194, ratedSpeedRpm: 27, peakSpeedRpm: 36, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 207, ratedSpeedRpm: 23, peakSpeedRpm: 30, backlashArcsec: 10 },
            { ratio: 161, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 217, ratedSpeedRpm: 17, peakSpeedRpm: 22, backlashArcsec: 10 },
          ],
          price: { seNb: [1547, 1514], seWb: [1723, 1690], deNb: [1701, 1668], deWb: [1844, 1811] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE80-97-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE80-97-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE80-97-PRO.step',
          boltPattern: '20×M3',
          motorPattern: '20×⌀3.5/M3 (BCD ⌀90)',
          fit: 'pilot ⌀81 h7 · OD ⌀97 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE80-110', odMm: 110, pilotDiaMm: 85, boreMm: 27, lengthMm: 105.5,
          ratedPowerW: 750, ratedCurrentA: 9, maxContCurrentA: 10.4, torqueConstant: 0.143, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 48, maxTorqueNm: 68.8, impactTorqueNm: 121, ratedSpeedRpm: 54, peakSpeedRpm: 65, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 78, maxTorqueNm: 107, impactTorqueNm: 169, ratedSpeedRpm: 35, peakSpeedRpm: 43, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 194, ratedSpeedRpm: 27, peakSpeedRpm: 36, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 207, ratedSpeedRpm: 23, peakSpeedRpm: 30, backlashArcsec: 10 },
            { ratio: 161, ratedTorqueNm: 84, maxTorqueNm: 133, impactTorqueNm: 217, ratedSpeedRpm: 17, peakSpeedRpm: 22, backlashArcsec: 10 },
          ],
          price: { seNb: [1624, 1539], seWb: [1800, 1715], deNb: [1778, 1693], deWb: [1921, 1836] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE80-110-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE80-110-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE80-110-PRO.step',
          boltPattern: '16×⌀4.5/M4',
          motorPattern: '12×⌀4.5/M4 (⌀102)',
          fit: 'pilot ⌀85 h7 · OD ⌀110 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE100-120', odMm: 120, pilotDiaMm: 102, boreMm: 32, lengthMm: 121.5,
          ratedPowerW: 1000, ratedCurrentA: 15.8, maxContCurrentA: 16.9, torqueConstant: 0.175, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 94, maxTorqueNm: 120, impactTorqueNm: 267, ratedSpeedRpm: 44, peakSpeedRpm: 55, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 146, maxTorqueNm: 185, impactTorqueNm: 376, ratedSpeedRpm: 29, peakSpeedRpm: 37, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 169, maxTorqueNm: 267, impactTorqueNm: 411, ratedSpeedRpm: 22, peakSpeedRpm: 29, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 169, maxTorqueNm: 267, impactTorqueNm: 436, ratedSpeedRpm: 18, peakSpeedRpm: 24, backlashArcsec: 10 },
            { ratio: 161, ratedTorqueNm: 168, maxTorqueNm: 267, impactTorqueNm: 459, ratedSpeedRpm: 12, peakSpeedRpm: 18, backlashArcsec: 10 },
          ],
          price: { seNb: [1697, 1577], seWb: [1873, 1753], deNb: [1851, 1731], deWb: [1994, 1874] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE100-120-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE100-120-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE100-120-PRO.step',
          boltPattern: '20×M3',
          motorPattern: '18×M4 (⌀112)',
          fit: 'pilot ⌀102 h7 · OD ⌀120 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE100-142', odMm: 142, pilotDiaMm: 110, boreMm: 32, lengthMm: 121.5,
          ratedPowerW: 1000, ratedCurrentA: 15.8, maxContCurrentA: 16.9, torqueConstant: 0.175, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 94, maxTorqueNm: 120, impactTorqueNm: 267, ratedSpeedRpm: 44, peakSpeedRpm: 55, backlashArcsec: 20 },
            { ratio: 81, ratedTorqueNm: 146, maxTorqueNm: 185, impactTorqueNm: 376, ratedSpeedRpm: 29, peakSpeedRpm: 37, backlashArcsec: 20 },
            { ratio: 101, ratedTorqueNm: 169, maxTorqueNm: 267, impactTorqueNm: 411, ratedSpeedRpm: 22, peakSpeedRpm: 29, backlashArcsec: 10 },
            { ratio: 121, ratedTorqueNm: 169, maxTorqueNm: 267, impactTorqueNm: 436, ratedSpeedRpm: 18, peakSpeedRpm: 24, backlashArcsec: 10 },
            { ratio: 161, ratedTorqueNm: 168, maxTorqueNm: 267, impactTorqueNm: 459, ratedSpeedRpm: 12, peakSpeedRpm: 18, backlashArcsec: 10 },
          ],
          price: { seNb: [1835, 1707], seWb: [2011, 1883], deNb: [1989, 1861], deWb: [2132, 2004] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE100-142-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE100-142-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE100-142-PRO.step',
          boltPattern: '16×⌀5.5/M5',
          motorPattern: '12×⌀5.5/M5 thru (⌀132)',
          fit: 'pilot ⌀110 h7 · OD ⌀142 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE110-145', odMm: 145, pilotDiaMm: 126, boreMm: 40, lengthMm: 147.7,
          ratedPowerW: 1500, ratedCurrentA: 14.1, maxContCurrentA: 30.2, torqueConstant: 0.293, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 169, maxTorqueNm: 255, impactTorqueNm: 532, ratedSpeedRpm: 22, peakSpeedRpm: 34, backlashArcsec: 20 },
            { ratio: 121, ratedTorqueNm: 363, maxTorqueNm: 586, impactTorqueNm: 802, ratedSpeedRpm: 12, peakSpeedRpm: 14, backlashArcsec: 20 },
            { ratio: 161, ratedTorqueNm: 363, maxTorqueNm: 586, impactTorqueNm: 841, ratedSpeedRpm: 7, peakSpeedRpm: 10, backlashArcsec: 10 },
          ],
          price: { seNb: [1971, 1804], seWb: [2147, 1980], deNb: [2125, 1958], deWb: [2268, 2101] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE110-145-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE110-145-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE110-145-PRO.step',
          boltPattern: '20×M5 (BCD ⌀136)',
          motorPattern: '15×⌀5.5/M5 thru',
          fit: 'pilot ⌀126 h7 · OD ⌀145 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
        {
          code: 'RE110-170', odMm: 170, pilotDiaMm: 141, boreMm: 40, lengthMm: 147.7,
          ratedPowerW: 1500, ratedCurrentA: 14.1, maxContCurrentA: 30.2, torqueConstant: 0.293, weightG: null,
          ratios: [
            { ratio: 51, ratedTorqueNm: 169, maxTorqueNm: 255, impactTorqueNm: 532, ratedSpeedRpm: 22, peakSpeedRpm: 34, backlashArcsec: 20 },
            { ratio: 121, ratedTorqueNm: 363, maxTorqueNm: 586, impactTorqueNm: 802, ratedSpeedRpm: 12, peakSpeedRpm: 14, backlashArcsec: 20 },
            { ratio: 161, ratedTorqueNm: 363, maxTorqueNm: 586, impactTorqueNm: 841, ratedSpeedRpm: 7, peakSpeedRpm: 10, backlashArcsec: 10 },
          ],
          price: { seNb: [2225, 2075], seWb: [2401, 2251], deNb: [2379, 2229], deWb: [2522, 2372] },
          imageUrl: '/shop/hpjm/frames/HPJM-RE110-170-PRO-XX.jpg',
          drawingPdfUrl: '/shop/hpjm/drawings/HPJM-RE110-170-PRO.pdf',
          stepUrl: '/shop/hpjm/step/HPJM-RE110-170-PRO.step',
          boltPattern: '12×M6 thru (BCD ⌀122)',
          motorPattern: '16×M6 (BCD ⌀158)',
          fit: 'pilot ⌀141 h7 · OD ⌀170 h7',
          connector: 'Power XT30U-F · CAN X1251H-03 · CAN+Power X1002H-04L · Battery X1002H-02L · Download X1002H-03L',
        },
      ],
    },
  },
  {
    // Virdyn VDSuit Full — full-body inertial mocap suit. Specs from the Virdyn
    // product page (virdynm.com). Price + shipping per Virdyn's supplied listing
    // sheet. Origin China.
    id: 'virdyn-vdsuit-full',
    slug: 'virdyn-vdsuit-full',
    category: 'mocap_suit',
    group: 'capture',
    name: 'Virdyn VDSuit Full',
    vendor: 'Virdyn',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Full-body inertial motion-capture suit with 27 sensor nodes for film, ' +
      'animation, VR, and robotics teleoperation.',
    description:
      'A professional full-body inertial motion-capture suit. 27 sensor nodes ' +
      'stream 360-degree full-body motion at up to 96 Hz with a self-developed ' +
      'anti-magnetic calibration, exporting to BVH, FBX, and CSV for Unity, ' +
      'Unreal, MotionBuilder, and Blender. Wired or wireless, with up to five ' +
      'performers captured at once.',
    imageUrl: '/shop/virdyn/vdsuit-full/front.png',
    gallery: [
      '/shop/virdyn/vdsuit-full/front.png',
      '/shop/virdyn/vdsuit-full/rear.png',
      '/shop/virdyn/vdsuit-full/sensor-detail.png',
    ],
    listPrice: 2720,
    currency: 'USD',
    shippingUsd: 250,
    specs: [
      { label: 'Sensor nodes', value: '27 nodes · 28 sensors' },
      { label: 'Sensor type', value: 'Gyro + accelerometer + magnetometer' },
      { label: 'Internal refresh', value: '500 Hz' },
      { label: 'Output rate', value: '60 / 72 / 80 / 96 Hz' },
      { label: 'Latency', value: 'Wired <16 ms · wireless 10-20 ms' },
      { label: 'Wireless', value: '2.4 GHz · 30 m range' },
      { label: 'Wired', value: 'USB 2.0 · 3 m' },
      { label: 'Battery', value: '6 h runtime · <2 h charge' },
      { label: 'Capture range', value: '360°, no angle limit' },
      { label: 'Accuracy', value: 'Roll/pitch <0.5° · yaw <1.5°' },
      { label: 'Weight', value: '0.5 kg (suit)' },
      { label: 'Wear time', value: '<5 min' },
      { label: 'Output formats', value: 'BVH · FBX · CSV · Euler · Quaternion' },
      { label: 'Software / SDK', value: 'Unity · Unreal 4.26-5.3 · Maya · MotionBuilder · Blender · C++ · Python' },
      { label: 'Multi-person', value: 'Up to 5 (Unity)' },
    ],
    inBox: [
      'VDSuit Full mocap suit',
      '28 sensor nodes',
      'Controller',
      'Wireless receiver',
      '3 m USB cable',
      '5 V charger',
      '30 silicone rings',
    ],
    vendorUrl: 'https://www.virdynm.com/virdyn-vdsuit-full-for-full-body-function-inertia-motion-capture-suit-product/',
  },
  {
    // Virdyn VDSuitMini Flex — half/upper-body inertial mocap for robotics
    // teleoperation + data collection (the Flex config adds data gloves).
    // Specs from the Virdyn product page. Origin China.
    id: 'virdyn-vdsuitmini-flex',
    slug: 'virdyn-vdsuitmini-flex',
    category: 'mocap_suit',
    group: 'capture',
    name: 'Virdyn VDSuitMini Flex',
    vendor: 'Virdyn',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Half-body inertial mocap for humanoid teleoperation and robot data ' +
      'collection, with ROS/ROS2 output and finger tracking.',
    description:
      'An upper-body inertial motion-capture system built for robotics. The Flex ' +
      'configuration adds data gloves for finger, wrist, and hand articulation, ' +
      'driving 1:1 real-time humanoid teleoperation and high-quality datasets for ' +
      'imitation and reinforcement learning. Sub-20 ms latency over Wi-Fi 6, with ' +
      'native ROS, ROS2, MATLAB, and Python integration.',
    imageUrl: '/shop/virdyn/vdsuitmini-flex/front.png',
    gallery: [
      '/shop/virdyn/vdsuitmini-flex/front.png',
      '/shop/virdyn/vdsuitmini-flex/back.png',
    ],
    photos: ['/shop/virdyn/vdsuitmini-flex/worn.png'],
    listPrice: 1789,
    currency: 'USD',
    shippingUsd: 250,
    specs: [
      { label: 'Configuration', value: 'Upper body + data gloves (Flex)' },
      { label: 'IMUs', value: '17 total · 12 in gloves' },
      { label: 'Sensor refresh', value: '≥1000 Hz' },
      { label: 'Data rate', value: '90 Hz' },
      { label: 'Latency', value: '≤20 ms' },
      { label: 'Wireless', value: 'Wi-Fi 6 · ≥80 m range' },
      { label: 'Battery', value: '2500 mAh · ≥6 h' },
      { label: 'Weight', value: '≤0.35 kg' },
      { label: 'Angular velocity resolution', value: '<0.02°' },
      { label: 'Calibration', value: 'Dual pose (A-pose / P-pose)' },
      { label: 'Robot control', value: '1:1 teleop · IL/RL datasets · dual-arm' },
      { label: 'Output formats', value: 'BVH · FBX · CSV' },
      { label: 'Robotics SDK', value: 'ROS · ROS2 · MATLAB · Python' },
      { label: 'Plugins', value: 'Unity · Unreal · MotionBuilder · Blender' },
      { label: 'Anti-magnetic', value: 'Yes (industrial environments)' },
    ],
    vendorUrl: 'https://www.virdynm.com/vdmocco-half-body-mocap-system-robot-data-collection-teleoperation-free-software-product/',
  },
  {
    // Virdyn mHand Pro — inertial motion-capture gloves. Specs from the Virdyn
    // product page. Origin China.
    id: 'virdyn-mhand-pro',
    slug: 'virdyn-mhand-pro',
    category: 'mocap_glove',
    group: 'capture',
    name: 'Virdyn mHand Pro',
    vendor: 'Virdyn',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Inertial motion-capture gloves with 16 sensors, 800 Hz sampling, gesture ' +
      'recognition, and haptic feedback.',
    description:
      'A pair of inertial motion-capture gloves with 16 nine-axis sensors and a ' +
      'dual-chip architecture sampling up to 800 Hz. Built-in gesture recognition ' +
      'covers 15 or more gestures, with vibration feedback and broad plugin ' +
      'support across Unity, Unreal, Maya, Blender, and MotionBuilder. Ships with ' +
      'the free lifetime mHand Studio engine.',
    imageUrl: '/shop/virdyn/mhand-pro/glove.png',
    gallery: [
      '/shop/virdyn/mhand-pro/glove.png',
      '/shop/virdyn/mhand-pro/pair.png',
    ],
    listPrice: 1399,
    currency: 'USD',
    shippingUsd: 200,
    specs: [
      { label: 'Sensors', value: '16 · 8 per hand' },
      { label: 'Sensor type', value: '9-axis IMU (gyro + accel + mag)' },
      { label: 'Capture range', value: '±180°' },
      { label: 'Accuracy', value: 'Roll/pitch <0.5° · yaw <15°' },
      { label: 'Output rate', value: '60 / 96 / 120 Hz' },
      { label: 'Internal sampling', value: 'Up to 800 Hz' },
      { label: 'Wireless', value: '2.4 GHz · 20 m indoor / 40 m outdoor' },
      { label: 'Battery', value: '≈1050 mAh · ≥8 h' },
      { label: 'Sizing', value: 'S / M / L' },
      { label: 'Feedback', value: 'Vibration, multi-mode' },
      { label: 'Gesture recognition', value: '15+ gestures' },
      { label: 'Output formats', value: 'BVH · Euler · Quaternion · Raw' },
      { label: 'Software / SDK', value: 'mHand Studio (free) · C++ · C# · Unity · Unreal 4.24-5.3 · Maya · Blender · MotionBuilder · 3DS Max · iClone' },
    ],
    inBox: [
      '1 pair mHand Pro gloves',
      '2 USB cables',
      'USB-to-USB adapter',
      '2 tracker holders',
      'Toolkit',
      'Charger',
      'Receiver',
    ],
    vendorUrl: 'https://www.virdynm.com/virdyn-mhand-pro-a-smart-motion-capture-gloves-for-virtual-reality-product/',
  },
  {
    // Virdyn DreamsCap X1-R — flagship performance-capture kit (body suit +
    // gloves + software). Specs from the Virdyn product page.
    // NOTE: Virdyn's listing sheet gives $8,500; the public product page shows
    // $9,500 — listing the $8,500 Virdyn told us to use. Origin China.
    // Per Virdyn (2026-07-15): kit is body + gloves only (no face helmet); body
    // has 15 nodes, not 31.
    id: 'virdyn-dreamscap-x1r',
    slug: 'virdyn-dreamscap-x1r',
    category: 'mocap_suit',
    group: 'capture',
    name: 'Virdyn DreamsCap X1-R',
    vendor: 'Virdyn',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Professional performance-capture kit: full-body suit and data gloves ' +
      'for animation and humanoid robot data collection.',
    description:
      "Virdyn's flagship performance-capture kit combines a 15-node full-body " +
      'suit and 16-sensor data gloves, all driven by DreamsCap Studio. Under ' +
      '16 ms latency over adaptive 2.4 GHz wireless, exporting BVH, FBX, CSV, ' +
      'and VAB for film, game, and humanoid robot data collection and ' +
      'teleoperation.',
    imageUrl: '/shop/virdyn/dreamscap-x1r/front.png',
    gallery: ['/shop/virdyn/dreamscap-x1r/front.png'],
    photos: ['/shop/virdyn/dreamscap-x1r/software.png'],
    listPrice: 8500,
    currency: 'USD',
    shippingUsd: 450,
    specs: [
      { label: 'Kit includes', value: 'Body suit · data gloves · Studio software' },
      { label: 'Body', value: '15 nodes · 15 sensors' },
      { label: 'Gloves', value: '16 sensors · 10+ gestures' },
      { label: 'Output rate', value: '60 / 72 / 80 / 96 / 120 Hz' },
      { label: 'Sensor refresh', value: '≥800 Hz' },
      { label: 'Latency', value: '<16 ms' },
      { label: 'Wireless', value: 'Adaptive 2.4 GHz · body 100 m / gloves 40 m' },
      { label: 'Battery', value: '≥8 h' },
      { label: 'Weight', value: 'Suit ≤500 g · gloves ≤170 g' },
      { label: 'Output formats', value: 'BVH · FBX · CSV · VAB' },
      { label: 'Software / SDK', value: 'DreamsCap Studio · Unity · Unreal · MotionBuilder · Blender · C++' },
      { label: 'Multi-person', value: 'Up to 5' },
    ],
    inBox: [
      'Full-body mocap suit',
      'Hand mocap gloves',
      'DreamsCap Studio software',
      '7-port expander',
      '64 GB drive',
      'Software keys',
      'User manual',
      'Storage box',
    ],
    vendorUrl: 'https://www.virdynm.com/dreamscap-x1-full-performance-capture-professional-motion-capture-kits-for-animators-and-film-and-game-producers-product/',
  },
  {
    // Virdyn VDEgo-C2 — egocentric first-person capture rig for VLA / world-model
    // training data. Specs from Virdyn's VDEgo-C2 parameter sheet + product page.
    // Origin China.
    id: 'virdyn-vdego-c2',
    slug: 'virdyn-vdego-c2',
    category: 'egocentric_capture',
    group: 'capture',
    name: 'Virdyn VDEgo-C2',
    vendor: 'Virdyn',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Egocentric first-person capture rig for VLA and world-model training data, ' +
      'with binocular fisheye cameras, IMU, and open data output.',
    description:
      "A lightweight head-worn rig that captures true first-person vision-action " +
      'data for embodied-AI training. Binocular global-shutter fisheye cameras ' +
      '(3840 × 1200 up to 60 fps, 175° FOV) are hardware-synchronized with a ' +
      '6-axis IMU and audio, recording an open, self-contained data package ' +
      '(video, timestamps, IMU, trajectory, calibration, audio) for VLA and ' +
      'world-model training. Offline capture with encrypted storage and Wi-Fi 6 upload.',
    imageUrl: '/shop/virdyn/vdego-c2/front.png',
    gallery: [
      '/shop/virdyn/vdego-c2/front.png',
      '/shop/virdyn/vdego-c2/side.png',
      '/shop/virdyn/vdego-c2/back.png',
      '/shop/virdyn/vdego-c2/perspective.png',
    ],
    listPrice: 1100,
    currency: 'USD',
    shippingUsd: 200,
    specs: [
      { label: 'Cameras', value: 'Binocular global shutter' },
      { label: 'Resolution', value: '3840 × 1200 @ 30/60 fps' },
      { label: 'Lens FOV', value: 'Fisheye · 175° diagonal' },
      { label: 'Sync', value: 'Hardware frame sync · binocular ≤1 µs · IMU <50 µs' },
      { label: 'IMU', value: '6-axis · ±16 g / ±2000 dps · 300-600 Hz' },
      { label: 'Interface', value: 'USB 3.0' },
      { label: 'Compute', value: '8-core · 4 GB RAM · 128 GB storage' },
      { label: 'Wireless', value: 'Wi-Fi 6 · Bluetooth 5.4' },
      { label: 'Battery', value: '5000 mAh · 3.5-4 h capture' },
      { label: 'Weight', value: '≈330 g' },
      { label: 'Dimensions', value: '275 × 190 × 130 mm' },
      { label: 'System', value: 'Linux · open data format' },
      { label: 'Output data', value: 'Video · IMU · trajectory · calibration · audio' },
    ],
    inBox: [
      'VDEgo-C2 unit (camera, board, battery, carrier, cable)',
      'Type-C charging cable (2 m)',
      'Product manual',
      'Warranty card',
      'Optional: spare battery module + charging adapter',
    ],
    vendorUrl: 'https://www.virdynm.com/vdego-egocentric-video-data-collection-service-at-scale-first-person-vision-product/',
  },
  {
    id: 'tlibot-cap-harmonic-reducers',
    slug: 'tlibot-cap-harmonic-reducers',
    category: 'harmonic_drive',
    group: 'actuation',
    name: 'TLIBOT Cap Harmonic Reducers',
    vendor: 'TLIBOT',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Hat-type (pancake) strain-wave reducers, sizes 5 to 65, standard and high-torque grades, zero backlash.',
    description:
      "TLIBOT cap-type (hat) harmonic reducers are flat pancake strain-wave gears with a large hollow bore and an output-side mounting flange. The line spans 13 frame sizes (5 to 65) in standard-torque (FHS) and high-torque (FHG) grades, with reduction ratios from 30 to 160:1 and rated torque to about 1240 N·m. Hollow-shaft (AH), cam (SJ), cross-slide (SO), center-shaft (AJ), simple-hollow (SH), and component (CJ/CO) input configurations are available. Suited to robot joints, rotary axes, and precision positioning. Sold RFQ / broker only.",
    imageUrl: '/shop/tlibot/tlibot-cap.png',
    gallery: ['/shop/tlibot/tlibot-cap.png'],
    listPrice: null,
    currency: null,
    specs: [],
    vendorUrl: 'https://www.tlibot.com',
    variants: {
      common: [
        { label: 'Type', value: 'Hat / cap (pancake) strain-wave reducer' },
        { label: 'Grades', value: 'FHS standard torque · FHG high torque' },
        { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
        { label: 'Frame sizes', value: '5 to 65 (13 sizes)' },
        { label: 'Rotational accuracy', value: 'Single-stage, zero-backlash tooth engagement' },
        { label: 'Rated input speed', value: '2000 rpm (torque rated at 2000 rpm)' },
        { label: 'Warranty', value: '1 year from delivery' },
      ],
      customization: ['Custom output flange', 'Special reduction ratio (SP)', 'Low-temperature / vacuum grease', 'Integrated joint assembly'],
      note: 'Torque values are at reduction ratio 100 and 2000 rpm input; std = FHS, high = FHG. Full per-ratio ratings shown per size.',
      columns: [
        { key: 'ratios', label: 'Ratios' },
        { key: 'rated', label: 'Rated torque @100 (std/high)' },
        { key: 'peak', label: 'Peak torque @100 (std/high)' },
        { key: 'bore', label: 'Bore Ø' },
        { key: 'weight', label: 'Weight' },
      ],
      rows: [
        { model: 'FHS/FHG-5', label: 'Ø5 · hat type',
          values: { ratios: '30-100', rated: '0.6 N·m', peak: '1 N·m', bore: '-', weight: '0.04 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '0.6 N·m' },
            { label: 'Peak torque @100 (std)', value: '1 N·m' },
            { label: 'Momentary max torque @100', value: '3 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 0.3 · 50: 0.4 · 80: 0.5 · 100: 0.6 N·m' },
            { label: 'Input speed (max / rated)', value: '10000 / 6500 rpm' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-8', label: 'Ø8 · hat type',
          values: { ratios: '30-100', rated: '2.4 N·m', peak: '5 N·m', bore: '-', weight: '0.08 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '2.4 N·m' },
            { label: 'Peak torque @100 (std)', value: '5 N·m' },
            { label: 'Momentary max torque @100', value: '9 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 0.9 · 50: 1.8 · 80: 2.4 · 100: 2.4 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 59 · 50: 35 · 80: 22 · 100: 18' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-11', label: 'Ø11 · hat type',
          values: { ratios: '30-100', rated: '5 N·m', peak: '11 N·m', bore: '-', weight: '0.16 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '5 N·m' },
            { label: 'Peak torque @100 (std)', value: '11 N·m' },
            { label: 'Momentary max torque @100', value: '25 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 2.2 · 50: 3.5 · 80: 5 · 100: 5 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 49 · 50: 24 · 80: 18 · 100: 15' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-14', label: 'Ø14 · hat type',
          values: { ratios: '30-100', rated: '8.2 / 9.8 N·m', peak: '29 / 35 N·m', bore: 'Ø14 mm', weight: '0.41 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '8.2 / 9.8 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '29 / 35 N·m' },
            { label: 'Momentary max torque @100', value: '56 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 4 · 50: 5.7 · 80: 8.2 · 100: 8.2 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø74 × 52.5 mm' },
            { label: 'Hollow bore', value: 'Ø14 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 60 · 50: 36 · 80: 23 · 100: 18' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-17', label: 'Ø17 · hat type',
          values: { ratios: '30-120', rated: '25 / 31 N·m', peak: '56 / 70 N·m', bore: 'Ø19 mm', weight: '0.57 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '25 / 31 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '56 / 70 N·m' },
            { label: 'Momentary max torque @100', value: '114 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 8.8 · 50: 17 · 80: 23 · 100: 25 · 120: 25 N·m' },
            { label: 'Input speed (max / rated)', value: '7300 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø84 × 56.5 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 33 · 50: 20 · 80: 13 · 100: 10 · 120: 8' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-20', label: 'Ø20 · hat type',
          values: { ratios: '30-160', rated: '42 / 52 N·m', peak: '85 / 107 N·m', bore: 'Ø21 mm', weight: '0.81 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '42 / 52 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '85 / 107 N·m' },
            { label: 'Momentary max torque @100', value: '153 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 15 · 50: 26 · 80: 36 · 100: 42 · 120: 42 · 160: 42 N·m' },
            { label: 'Input speed (max / rated)', value: '6500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø95 × 51.5 mm' },
            { label: 'Hollow bore', value: 'Ø21 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 28 · 50: 17 · 80: 11 · 100: 9 · 120: 8 · 160: 6' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-25', label: 'Ø25 · hat type',
          values: { ratios: '30-160', rated: '70 / 86 N·m', peak: '163 / 204 N·m', bore: 'Ø29 mm', weight: '1.31 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '70 / 86 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '163 / 204 N·m' },
            { label: 'Momentary max torque @100', value: '295 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 27 · 50: 41 · 80: 66 · 100: 70 · 120: 70 · 160: 70 N·m' },
            { label: 'Input speed (max / rated)', value: '5600 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø115 × 55.5 mm' },
            { label: 'Hollow bore', value: 'Ø29 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 28 · 50: 17 · 80: 11 · 100: 9 · 120: 8 · 160: 6' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-32', label: 'Ø32 · hat type',
          values: { ratios: '30-160', rated: '138 / 176 N·m', peak: '346 / 433 N·m', bore: 'Ø36 mm', weight: '2.94 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '138 / 176 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '346 / 433 N·m' },
            { label: 'Momentary max torque @100', value: '673 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 54 · 50: 80 · 80: 122 · 100: 138 · 120: 138 · 160: 138 N·m' },
            { label: 'Input speed (max / rated)', value: '4800 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø147 × 65.5 mm' },
            { label: 'Hollow bore', value: 'Ø36 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '30: 23 · 50: 14 · 80: 9 · 100: 7 · 120: 6 · 160: 5' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-40', label: 'Ø40 · hat type',
          values: { ratios: '50-160', rated: '268 / 343 N·m', peak: '574 / 738 N·m', bore: 'Ø46 mm', weight: '5.1 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '268 / 343 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '574 / 738 N·m' },
            { label: 'Momentary max torque @100', value: '1091 N·m' },
            { label: 'Rated torque by ratio (std)', value: '50: 138 · 80: 208 · 100: 268 · 120: 297 · 160: 297 N·m' },
            { label: 'Input speed (max / rated)', value: '4000 / 3000 rpm' },
            { label: 'Overall size', value: 'Ø175 × 79 mm' },
            { label: 'Hollow bore', value: 'Ø46 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '50: 14 · 80: 9 · 100: 7 · 120: 6 · 160: 5' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-45', label: 'Ø45 · hat type',
          values: { ratios: '50-160', rated: '357 / 457 N·m', peak: '763 / 982 N·m', bore: 'Ø52 mm', weight: '6.5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '357 / 457 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '763 / 982 N·m' },
            { label: 'Momentary max torque @100', value: '1586 N·m' },
            { label: 'Rated torque by ratio (std)', value: '50: 178 · 80: 316 · 100: 357 · 120: 406 · 160: 406 N·m' },
            { label: 'Input speed (max / rated)', value: '3800 / 3000 rpm' },
            { label: 'Overall size', value: 'Ø195 × 85 mm' },
            { label: 'Hollow bore', value: 'Ø52 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '50: 12 · 80: 8 · 100: 6 · 120: 5 · 160: 4' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-50', label: 'Ø50 · hat type',
          values: { ratios: '80-160', rated: '475 / 612 N·m', peak: '990 / 1274 N·m', bore: 'Ø60 mm', weight: '9.6 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '475 / 612 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '990 / 1274 N·m' },
            { label: 'Momentary max torque @100', value: '2081 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 376 · 100: 475 · 120: 534 · 160: 534 N·m' },
            { label: 'Input speed (max / rated)', value: '3500 / 2500 rpm' },
            { label: 'Overall size', value: 'Ø220 × 93 mm' },
            { label: 'Hollow bore', value: 'Ø60 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '80: 8 · 100: 6 · 120: 5 · 160: 4' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-58', label: 'Ø58 · hat type',
          values: { ratios: '80-160', rated: '703 / 905 N·m', peak: '1606 / 2067 N·m', bore: 'Ø70 mm', weight: '13.5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '703 / 905 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '1606 / 2067 N·m' },
            { label: 'Momentary max torque @100', value: '3212 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 554 · 100: 703 · 120: 752 · 160: 752 N·m' },
            { label: 'Input speed (max / rated)', value: '3000 / 2200 rpm' },
            { label: 'Overall size', value: 'Ø246 × 106 mm' },
            { label: 'Hollow bore', value: 'Ø70 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '80: 6 · 100: 5 · 120: 4 · 160: 3' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
        { model: 'FHS/FHG-65', label: 'Ø65 · hat type',
          values: { ratios: '80-160', rated: '961 / 1238 N·m', peak: '2323 / 2990 N·m', bore: 'Ø80 mm', weight: '19.5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '961 / 1238 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '2323 / 2990 N·m' },
            { label: 'Momentary max torque @100', value: '4798 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 752 · 100: 961 · 120: 961 · 160: 961 N·m' },
            { label: 'Input speed (max / rated)', value: '2500 / 1900 rpm' },
            { label: 'Overall size', value: 'Ø284 × 128 mm' },
            { label: 'Hollow bore', value: 'Ø80 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '80: 6 · 100: 5 · 120: 4 · 160: 3' },
            { label: 'Structure options', value: 'AH hollow · AHL lightweight · SJ cam input · SO cross-slide · AJ center-shaft · SH simple-hollow · CJ/CO component' },
          ] },
      ],
    },
  },
  {
    id: 'tlibot-cup-harmonic-reducers',
    slug: 'tlibot-cup-harmonic-reducers',
    category: 'harmonic_drive',
    group: 'actuation',
    name: 'TLIBOT Cup Harmonic Reducers',
    vendor: 'TLIBOT',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Cup-type strain-wave reducers, sizes 5 to 65, standard and high-torque grades, cross-roller output bearing.',
    description:
      "TLIBOT cup-type harmonic reducers use a classic cup flexspline with a cross-roller main bearing on combination models. The line spans 13 frame sizes (5 to 65) in standard (FCS) and high-torque (FCG) grades, ratios 30 to 160:1, and rated torque to about 1248 N·m. Cam (AJ), cross-slide (AO), component (CJ/CO), and mini square-flange (MHF) configurations are available. Sold RFQ / broker only.",
    imageUrl: '/shop/tlibot/tlibot-cup.png',
    gallery: ['/shop/tlibot/tlibot-cup.png'],
    listPrice: null,
    currency: null,
    specs: [],
    vendorUrl: 'https://www.tlibot.com',
    variants: {
      common: [
        { label: 'Type', value: 'Cup strain-wave reducer' },
        { label: 'Grades', value: 'FCS standard torque · FCG high torque' },
        { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
        { label: 'Frame sizes', value: '5 to 65 (13 sizes)' },
        { label: 'Output bearing', value: 'Cross-roller main bearing (combination types)' },
        { label: 'Rated input speed', value: '2000 rpm' },
        { label: 'Warranty', value: '1 year from delivery' },
      ],
      customization: ['Custom output flange', 'Special reduction ratio (SP)', 'Low-temperature / vacuum grease', 'Integrated joint assembly'],
      note: 'Torque values are at reduction ratio 100 and 2000 rpm input; std = FCS, high = FCG. Full per-ratio ratings shown per size.',
      columns: [
        { key: 'ratios', label: 'Ratios' },
        { key: 'rated', label: 'Rated torque @100 (std/high)' },
        { key: 'peak', label: 'Peak torque @100 (std/high)' },
        { key: 'bore', label: 'Bore Ø' },
        { key: 'weight', label: 'Weight' },
      ],
      rows: [
        { model: 'FCS/FCG-5', label: 'Ø5 · cup type',
          values: { ratios: '30-100', rated: '0.6 N·m', peak: '1.4 N·m', bore: '-', weight: '0.04 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '0.6 N·m' },
            { label: 'Peak torque @100 (std)', value: '1.4 N·m' },
            { label: 'Momentary max torque @100', value: '2.7 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 0.3 · 50: 0.4 · 80: 0.5 · 100: 0.6 N·m' },
            { label: 'Input speed (max / rated)', value: '10000 / 6500 rpm' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-8', label: 'Ø8 · cup type',
          values: { ratios: '30-100', rated: '2.4 N·m', peak: '4.8 N·m', bore: '-', weight: '0.17 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '2.4 N·m' },
            { label: 'Peak torque @100 (std)', value: '4.8 N·m' },
            { label: 'Momentary max torque @100', value: '9 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 0.9 · 50: 1.8 · 80: 2.4 · 100: 2.4 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-11', label: 'Ø11 · cup type',
          values: { ratios: '30-100', rated: '5 N·m', peak: '11 N·m', bore: '-', weight: '0.33 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std)', value: '5 N·m' },
            { label: 'Peak torque @100 (std)', value: '11 N·m' },
            { label: 'Momentary max torque @100', value: '25 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 2.2 · 50: 3.5 · 80: 5 · 100: 5 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-14', label: 'Ø14 · cup type',
          values: { ratios: '30-100', rated: '8.2 / 10 N·m', peak: '29 / 36 N·m', bore: 'Ø8 mm', weight: '0.52 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '8.2 / 10 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '29 / 36 N·m' },
            { label: 'Momentary max torque @100', value: '56 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 4 · 50: 5.7 · 80: 8.2 · 100: 8.2 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø73 × 41 mm' },
            { label: 'Hollow bore', value: 'Ø8 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '18-60 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-17', label: 'Ø17 · cup type',
          values: { ratios: '30-120', rated: '25 / 31 N·m', peak: '56 / 70 N·m', bore: 'Ø8 mm', weight: '0.68 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '25 / 31 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '56 / 70 N·m' },
            { label: 'Momentary max torque @100', value: '114 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 8.8 · 50: 16.8 · 80: 23 · 100: 25 · 120: 25 N·m' },
            { label: 'Input speed (max / rated)', value: '7300 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø79 × 45 mm' },
            { label: 'Hollow bore', value: 'Ø8 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '8-33 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-20', label: 'Ø20 · cup type',
          values: { ratios: '30-160', rated: '42 / 52 N·m', peak: '85 / 107 N·m', bore: 'Ø10 mm', weight: '0.98 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '42 / 52 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '85 / 107 N·m' },
            { label: 'Momentary max torque @100', value: '153 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 15 · 50: 26 · 80: 36 · 100: 42 · 120: 42 · 160: 42 N·m' },
            { label: 'Input speed (max / rated)', value: '6500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø93 × 45.5 mm' },
            { label: 'Hollow bore', value: 'Ø10 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '6-28 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-25', label: 'Ø25 · cup type',
          values: { ratios: '30-160', rated: '70 / 87 N·m', peak: '163 / 204 N·m', bore: 'Ø14 mm', weight: '1.5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '70 / 87 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '163 / 204 N·m' },
            { label: 'Momentary max torque @100', value: '295 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 27 · 50: 41 · 80: 66 · 100: 70 · 120: 70 · 160: 70 N·m' },
            { label: 'Input speed (max / rated)', value: '5600 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø107 × 52 mm' },
            { label: 'Hollow bore', value: 'Ø14 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '6-28 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-32', label: 'Ø32 · cup type',
          values: { ratios: '30-160', rated: '138 / 178 N·m', peak: '346 / 433 N·m', bore: 'Ø19 mm', weight: '3.2 kg' },
          detail: [
            { label: 'Reduction ratios', value: '30, 50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '138 / 178 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '346 / 433 N·m' },
            { label: 'Momentary max torque @100', value: '673 N·m' },
            { label: 'Rated torque by ratio (std)', value: '30: 54 · 50: 80 · 80: 122 · 100: 138 · 120: 138 · 160: 138 N·m' },
            { label: 'Input speed (max / rated)', value: '4800 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø138 × 62 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '5-23 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-40', label: 'Ø40 · cup type',
          values: { ratios: '50-160', rated: '268 / 345 N·m', peak: '574 / 738 N·m', bore: 'Ø19 mm', weight: '5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '268 / 345 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '574 / 738 N·m' },
            { label: 'Momentary max torque @100', value: '1091 N·m' },
            { label: 'Rated torque by ratio (std)', value: '50: 138 · 80: 208 · 100: 268 · 120: 297 · 160: 297 N·m' },
            { label: 'Input speed (max / rated)', value: '4000 / 3000 rpm' },
            { label: 'Overall size', value: 'Ø160 × 74.5 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '5-14 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-45', label: 'Ø45 · cup type',
          values: { ratios: '50-160', rated: '357 / 457 N·m', peak: '763 / 982 N·m', bore: 'Ø19 mm', weight: '7 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '357 / 457 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '763 / 982 N·m' },
            { label: 'Momentary max torque @100', value: '1586 N·m' },
            { label: 'Rated torque by ratio (std)', value: '50: 178 · 80: 316 · 100: 357 · 120: 406 · 160: 406 N·m' },
            { label: 'Input speed (max / rated)', value: '3800 / 3000 rpm' },
            { label: 'Overall size', value: 'Ø180 × 80.5 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '4-12 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-50', label: 'Ø50 · cup type',
          values: { ratios: '80-160', rated: '475 / 611 N·m', peak: '990 / 1274 N·m', bore: 'Ø19 mm', weight: '8.9 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '475 / 611 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '990 / 1274 N·m' },
            { label: 'Momentary max torque @100', value: '2081 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 376 · 100: 475 · 120: 534 · 160: 534 N·m' },
            { label: 'Input speed (max / rated)', value: '3500 / 2500 rpm' },
            { label: 'Overall size', value: 'Ø190 × 93 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '4-12 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-58', label: 'Ø58 · cup type',
          values: { ratios: '80-160', rated: '703 / 905 N·m', peak: '1606 / 2067 N·m', bore: 'Ø24 mm', weight: '14.6 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '703 / 905 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '1606 / 2067 N·m' },
            { label: 'Momentary max torque @100', value: '3212 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 554 · 100: 703 · 120: 752 · 160: 752 N·m' },
            { label: 'Input speed (max / rated)', value: '3000 / 2200 rpm' },
            { label: 'Overall size', value: 'Ø226 × 109.5 mm' },
            { label: 'Hollow bore', value: 'Ø24 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '3-10 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
        { model: 'FCS/FCG-65', label: 'Ø65 · cup type',
          values: { ratios: '80-160', rated: '961 / 1248 N·m', peak: '2323 / 3020 N·m', bore: 'Ø24 mm', weight: '20.9 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100 (std / high)', value: '961 / 1248 N·m' },
            { label: 'Peak torque @100 (std / high)', value: '2323 / 3020 N·m' },
            { label: 'Momentary max torque @100', value: '4798 N·m' },
            { label: 'Rated torque by ratio (std)', value: '80: 752 · 100: 961 · 120: 961 · 160: 961 N·m' },
            { label: 'Input speed (max / rated)', value: '2800 / 1900 rpm' },
            { label: 'Overall size', value: 'Ø260 × 118.5 mm' },
            { label: 'Hollow bore', value: 'Ø24 mm' },
            { label: 'Backlash by ratio (arc-sec)', value: '3-10 arc-sec (best at high ratio)' },
            { label: 'Structure options', value: 'AJ cam input · AJL lightweight · AO cross-slide · CJ/CO component · MHF mini square flange' },
          ] },
      ],
    },
  },
  {
    id: 'tlibot-ultrathin-harmonic-reducers',
    slug: 'tlibot-ultrathin-harmonic-reducers',
    category: 'harmonic_drive',
    group: 'actuation',
    name: 'TLIBOT Ultra-Thin Harmonic Reducers',
    vendor: 'TLIBOT',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Ultra-thin strain-wave reducers (FCD cup and FHD cap), sizes 14 to 50, minimal axial height.',
    description:
      "TLIBOT ultra-thin harmonic reducers minimise axial height for compact robot joints and wrists. The FCD cup line (sizes 14 to 50) and FHD cap line (sizes 14 to 40) cover ratios 50 to 160:1 and rated torque to about 370 N·m. FCD is offered in hollow (AH), small-diameter (AJ), and component (C) forms; FHD in hollow (AH) and simple-hollow (SH) forms. Sold RFQ / broker only.",
    imageUrl: '/shop/tlibot/tlibot-ultrathin.png',
    gallery: ['/shop/tlibot/tlibot-ultrathin.png'],
    listPrice: null,
    currency: null,
    specs: [],
    vendorUrl: 'https://www.tlibot.com',
    variants: {
      common: [
        { label: 'Type', value: 'Ultra-thin strain-wave reducer (FCD cup · FHD cap)' },
        { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
        { label: 'Frame sizes', value: '14 to 50' },
        { label: 'Profile', value: 'Ultra-low axial height for compact joints' },
        { label: 'Rated input speed', value: '2000 rpm' },
        { label: 'Warranty', value: '1 year from delivery' },
      ],
      customization: ['Custom output flange', 'Special reduction ratio (SP)', 'Low-temperature / vacuum grease', 'Integrated joint assembly'],
      note: 'FCD rows are ultra-thin cup type; FHD rows are ultra-thin cap type. Torque at ratio 100, 2000 rpm input.',
      columns: [
        { key: 'ratios', label: 'Ratios' },
        { key: 'rated', label: 'Rated torque @100' },
        { key: 'peak', label: 'Peak torque @100' },
        { key: 'bore', label: 'Bore Ø' },
        { key: 'weight', label: 'Weight' },
      ],
      rows: [
        { model: 'FCD-14', label: 'Ø14 · ultra-thin cup',
          values: { ratios: '50-100', rated: '5.2 N·m', peak: '19 N·m', bore: 'Ø11 mm', weight: '0.5 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100 : 1' },
            { label: 'Rated torque @100', value: '5.2 N·m' },
            { label: 'Peak torque @100', value: '19 N·m' },
            { label: 'Momentary max torque @100', value: '35 N·m' },
            { label: 'Rated torque by ratio', value: '50: 3.6 · 80: 5.2 · 100: 5.2 N·m' },
            { label: 'Input speed (max / rated)', value: '8500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø70 × 22 mm' },
            { label: 'Hollow bore', value: 'Ø11 mm' },
            { label: 'Backlash', value: '≤18 arc-sec' },
          ] },
        { model: 'FCD-17', label: 'Ø17 · ultra-thin cup',
          values: { ratios: '50-120', rated: '16 N·m', peak: '36 N·m', bore: 'Ø15 mm', weight: '0.66 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120 : 1' },
            { label: 'Rated torque @100', value: '16 N·m' },
            { label: 'Peak torque @100', value: '36 N·m' },
            { label: 'Momentary max torque @100', value: '71 N·m' },
            { label: 'Rated torque by ratio', value: '50: 11 · 80: 15 · 100: 16 · 120: 16 N·m' },
            { label: 'Input speed (max / rated)', value: '7300 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø80 × 22.7 mm' },
            { label: 'Hollow bore', value: 'Ø15 mm' },
            { label: 'Backlash', value: '≤8 arc-sec' },
          ] },
        { model: 'FCD-20', label: 'Ø20 · ultra-thin cup',
          values: { ratios: '50-160', rated: '27 N·m', peak: '57 N·m', bore: 'Ø20 mm', weight: '0.94 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '27 N·m' },
            { label: 'Peak torque @100', value: '57 N·m' },
            { label: 'Momentary max torque @100', value: '93 N·m' },
            { label: 'Rated torque by ratio', value: '50: 17 · 80: 24 · 100: 27 · 120: 27 · 160: 27 N·m' },
            { label: 'Input speed (max / rated)', value: '6500 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø90 × 26.8 mm' },
            { label: 'Hollow bore', value: 'Ø20 mm' },
            { label: 'Backlash', value: '≤6 arc-sec' },
          ] },
        { model: 'FCD-25', label: 'Ø25 · ultra-thin cup',
          values: { ratios: '50-160', rated: '45 N·m', peak: '110 N·m', bore: 'Ø24 mm', weight: '1.7 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '45 N·m' },
            { label: 'Peak torque @100', value: '110 N·m' },
            { label: 'Momentary max torque @100', value: '184 N·m' },
            { label: 'Rated torque by ratio', value: '50: 26 · 80: 43 · 100: 45 · 120: 47 · 160: 47 N·m' },
            { label: 'Input speed (max / rated)', value: '5600 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø110 × 31.5 mm' },
            { label: 'Hollow bore', value: 'Ø24 mm' },
            { label: 'Backlash', value: '≤6 arc-sec' },
          ] },
        { model: 'FCD-32', label: 'Ø32 · ultra-thin cup',
          values: { ratios: '50-160', rated: '94 N·m', peak: '233 N·m', bore: 'Ø32 mm', weight: '3.3 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '94 N·m' },
            { label: 'Peak torque @100', value: '233 N·m' },
            { label: 'Momentary max torque @100', value: '420 N·m' },
            { label: 'Rated torque by ratio', value: '50: 52 · 80: 83 · 100: 94 · 120: 94 · 160: 94 N·m' },
            { label: 'Input speed (max / rated)', value: '4800 / 3500 rpm' },
            { label: 'Overall size', value: 'Ø142 × 37 mm' },
            { label: 'Hollow bore', value: 'Ø32 mm' },
            { label: 'Backlash', value: '≤7 arc-sec' },
          ] },
        { model: 'FCD-40', label: 'Ø40 · ultra-thin cup',
          values: { ratios: '50-160', rated: '185 N·m', peak: '398 N·m', bore: 'Ø40 mm', weight: '5.7 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '185 N·m' },
            { label: 'Peak torque @100', value: '398 N·m' },
            { label: 'Momentary max torque @100', value: '700 N·m' },
            { label: 'Rated torque by ratio', value: '50: 94 · 80: 144 · 100: 185 · 120: 206 · 160: 206 N·m' },
            { label: 'Input speed (max / rated)', value: '4000 / 3000 rpm' },
            { label: 'Overall size', value: 'Ø170 × 45 mm' },
            { label: 'Hollow bore', value: 'Ø40 mm' },
            { label: 'Backlash', value: '≤5 arc-sec' },
          ] },
        { model: 'FCD-50', label: 'Ø50 · ultra-thin cup',
          values: { ratios: '50-160', rated: '329 N·m', peak: '686 N·m', bore: 'Ø50 mm', weight: '6.9 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '329 N·m' },
            { label: 'Peak torque @100', value: '686 N·m' },
            { label: 'Momentary max torque @100', value: '1440 N·m' },
            { label: 'Rated torque by ratio', value: '50: 173 · 80: 260 · 100: 329 · 120: 370 · 160: 370 N·m' },
            { label: 'Input speed (max / rated)', value: '3500 / 2500 rpm' },
            { label: 'Overall size', value: 'Ø157 × 62.5 mm' },
            { label: 'Hollow bore', value: 'Ø50 mm' },
            { label: 'Backlash', value: '≤4 arc-sec' },
          ] },
        { model: 'FHD-14', label: 'Ø14 · ultra-thin cap',
          values: { ratios: '50-100', rated: '5.2 N·m', peak: '19 N·m', bore: 'Ø14 mm', weight: '0.49 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100 : 1' },
            { label: 'Rated torque @100', value: '5.2 N·m' },
            { label: 'Peak torque @100', value: '19 N·m' },
            { label: 'Momentary max torque @100', value: '35 N·m' },
            { label: 'Rated torque by ratio', value: '50: 3.6 · 80: 5.2 · 100: 5.2 N·m' },
            { label: 'Input speed (max / rated)', value: '8000 / 3500 rpm' },
            { label: 'Outer diameter', value: 'Ø70 mm' },
            { label: 'Hollow bore', value: 'Ø14 mm' },
          ] },
        { model: 'FHD-17', label: 'Ø17 · ultra-thin cap',
          values: { ratios: '50-120', rated: '16 N·m', peak: '36 N·m', bore: 'Ø19 mm', weight: '0.66 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120 : 1' },
            { label: 'Rated torque @100', value: '16 N·m' },
            { label: 'Peak torque @100', value: '36 N·m' },
            { label: 'Momentary max torque @100', value: '71 N·m' },
            { label: 'Rated torque by ratio', value: '50: 11 · 80: 15 · 100: 16 · 120: 16 N·m' },
            { label: 'Input speed (max / rated)', value: '7000 / 3500 rpm' },
            { label: 'Outer diameter', value: 'Ø84 mm' },
            { label: 'Hollow bore', value: 'Ø19 mm' },
          ] },
        { model: 'FHD-20', label: 'Ø20 · ultra-thin cap',
          values: { ratios: '50-160', rated: '27 N·m', peak: '57 N·m', bore: 'Ø21 mm', weight: '0.84 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '27 N·m' },
            { label: 'Peak torque @100', value: '57 N·m' },
            { label: 'Momentary max torque @100', value: '93 N·m' },
            { label: 'Rated torque by ratio', value: '50: 17 · 80: 24 · 100: 27 · 120: 27 · 160: 27 N·m' },
            { label: 'Input speed (max / rated)', value: '6000 / 3500 rpm' },
            { label: 'Outer diameter', value: 'Ø90 mm' },
            { label: 'Hollow bore', value: 'Ø21 mm' },
          ] },
        { model: 'FHD-25', label: 'Ø25 · ultra-thin cap',
          values: { ratios: '50-160', rated: '45 N·m', peak: '110 N·m', bore: 'Ø29 mm', weight: '1.4 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '45 N·m' },
            { label: 'Peak torque @100', value: '110 N·m' },
            { label: 'Momentary max torque @100', value: '184 N·m' },
            { label: 'Rated torque by ratio', value: '50: 26 · 80: 43 · 100: 45 · 120: 47 · 160: 47 N·m' },
            { label: 'Input speed (max / rated)', value: '5500 / 3500 rpm' },
            { label: 'Outer diameter', value: 'Ø115 mm' },
            { label: 'Hollow bore', value: 'Ø29 mm' },
          ] },
        { model: 'FHD-32', label: 'Ø32 · ultra-thin cap',
          values: { ratios: '50-160', rated: '94 N·m', peak: '233 N·m', bore: 'Ø41 mm', weight: '2.7 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '94 N·m' },
            { label: 'Peak torque @100', value: '233 N·m' },
            { label: 'Momentary max torque @100', value: '420 N·m' },
            { label: 'Rated torque by ratio', value: '50: 52 · 80: 83 · 100: 94 · 120: 94 · 160: 94 N·m' },
            { label: 'Input speed (max / rated)', value: '4500 / 3500 rpm' },
            { label: 'Outer diameter', value: 'Ø142 mm' },
            { label: 'Hollow bore', value: 'Ø41 mm' },
          ] },
        { model: 'FHD-40', label: 'Ø40 · ultra-thin cap',
          values: { ratios: '50-160', rated: '185 N·m', peak: '398 N·m', bore: 'Ø51 mm', weight: '4.6 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160 : 1' },
            { label: 'Rated torque @100', value: '185 N·m' },
            { label: 'Peak torque @100', value: '398 N·m' },
            { label: 'Momentary max torque @100', value: '700 N·m' },
            { label: 'Rated torque by ratio', value: '50: 94 · 80: 144 · 100: 185 · 120: 206 · 160: 206 N·m' },
            { label: 'Input speed (max / rated)', value: '4000 / 3000 rpm' },
            { label: 'Outer diameter', value: 'Ø175 mm' },
            { label: 'Hollow bore', value: 'Ø51 mm' },
          ] },
      ],
    },
  },
  {
    id: 'tlibot-differential-harmonic-reducers',
    slug: 'tlibot-differential-harmonic-reducers',
    category: 'harmonic_drive',
    group: 'actuation',
    name: 'TLIBOT Differential Harmonic Reducers',
    vendor: 'TLIBOT',
    vendorOrigin: 'CN',
    vendorOriginLabel: 'China',
    tagline:
      'Cam differential strain-wave reducers (FDS), sizes 14 to 100, high ratios and high torque.',
    description:
      "TLIBOT FDS differential harmonic reducers are cam-differential strain-wave gears reaching very high reduction ratios and high torque in larger frames. Sizes span 14 to 100 with rated torque to about 4470 N·m and hollow bores to Ø110. Intended for heavy rotary axes, positioners, and large robot joints. Sold RFQ / broker only.",
    imageUrl: '/shop/tlibot/tlibot-differential.png',
    gallery: ['/shop/tlibot/tlibot-differential.png'],
    listPrice: null,
    currency: null,
    specs: [],
    vendorUrl: 'https://www.tlibot.com',
    variants: {
      common: [
        { label: 'Type', value: 'Cam differential strain-wave reducer' },
        { label: 'Frame sizes', value: '14 to 100' },
        { label: 'Reduction ratios', value: 'High-ratio differential (50 to 320 : 1, size-dependent)' },
        { label: 'Rated input speed', value: '2000 rpm' },
        { label: 'Warranty', value: '1 year from delivery' },
      ],
      customization: ['Custom output flange', 'Special reduction ratio (SP)', 'Low-temperature / vacuum grease', 'Integrated joint assembly'],
      note: 'Differential ratios vary by frame size; torque quoted at the ratio nearest 100 and 2000 rpm input.',
      columns: [
        { key: 'ratios', label: 'Ratios' },
        { key: 'rated', label: 'Rated torque' },
        { key: 'peak', label: 'Peak torque' },
        { key: 'bore', label: 'Bore Ø' },
        { key: 'weight', label: 'Weight' },
      ],
      rows: [
        { model: 'FDS-14', label: 'Ø14 · differential',
          values: { ratios: '50-110', rated: '7.8 N·m', peak: '13.7 N·m', bore: 'Ø14 mm', weight: '0.2 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 88, 100, 110 : 1' },
            { label: 'Rated torque @100', value: '7.8 N·m' },
            { label: 'Peak torque @100', value: '13.7 N·m' },
            { label: 'Momentary max torque @100', value: '19.6 N·m' },
            { label: 'Rated torque by ratio', value: '50: 4.4 · 88: 5.9 · 100: 7.8 · 110: 7.8 N·m' },
            { label: 'Input speed (max / rated)', value: '3600 / 2500 rpm' },
            { label: 'Outer diameter', value: 'Ø50 mm' },
            { label: 'Hollow bore', value: 'Ø14 mm' },
          ] },
        { model: 'FDS-17', label: 'Ø17 · differential',
          values: { ratios: '50-120', rated: '24 N·m', peak: '33 N·m', bore: 'Ø17 mm', weight: '0.4 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120 : 1' },
            { label: 'Rated torque @100', value: '24 N·m' },
            { label: 'Peak torque @100', value: '33 N·m' },
            { label: 'Momentary max torque @100', value: '56 N·m' },
            { label: 'Rated torque by ratio', value: '50: 15 · 80: 20 · 100: 24 · 120: 24 N·m' },
            { label: 'Input speed (max / rated)', value: '3600 / 2500 rpm' },
            { label: 'Outer diameter', value: 'Ø60 mm' },
            { label: 'Hollow bore', value: 'Ø17 mm' },
          ] },
        { model: 'FDS-20', label: 'Ø20 · differential',
          values: { ratios: '50-160', rated: '40 N·m', peak: '53 N·m', bore: 'Ø20 mm', weight: '0.6 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 128, 160 : 1' },
            { label: 'Rated torque @100', value: '40 N·m' },
            { label: 'Peak torque @100', value: '53 N·m' },
            { label: 'Momentary max torque @100', value: '94 N·m' },
            { label: 'Rated torque by ratio', value: '50: 25 · 80: 34 · 100: 40 · 128: 40 · 160: 40 N·m' },
            { label: 'Input speed (max / rated)', value: '3600 / 2500 rpm' },
            { label: 'Overall size', value: 'Ø70 × 38 mm' },
            { label: 'Hollow bore', value: 'Ø20 mm' },
          ] },
        { model: 'FDS-25', label: 'Ø25 · differential',
          values: { ratios: '50-200', rated: '67 N·m', peak: '91 N·m', bore: 'Ø30 mm', weight: '1 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 120, 160, 200 : 1' },
            { label: 'Rated torque @100', value: '67 N·m' },
            { label: 'Peak torque @100', value: '91 N·m' },
            { label: 'Momentary max torque @100', value: '160 N·m' },
            { label: 'Rated torque by ratio', value: '50: 39 · 80: 56 · 100: 67 · 120: 67 · 160: 67 · 200: 67 N·m' },
            { label: 'Input speed (max / rated)', value: '3600 / 2500 rpm' },
            { label: 'Outer diameter', value: 'Ø85 mm' },
            { label: 'Hollow bore', value: 'Ø30 mm' },
          ] },
        { model: 'FDS-32', label: 'Ø32 · differential',
          values: { ratios: '50-260', rated: '137 N·m', peak: '176 N·m', bore: 'Ø40 mm', weight: '2 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 78, 100, 131, 157, 200, 260 : 1' },
            { label: 'Rated torque @100', value: '137 N·m' },
            { label: 'Peak torque @100', value: '176 N·m' },
            { label: 'Momentary max torque @100', value: '323 N·m' },
            { label: 'Rated torque by ratio', value: '50: 76 · 78: 108 · 100: 137 · 131: 137 · 157: 137 · 200: 137 · 260: 137 N·m' },
            { label: 'Input speed (max / rated)', value: '3600 / 2300 rpm' },
            { label: 'Overall size', value: 'Ø110 × 50 mm' },
            { label: 'Hollow bore', value: 'Ø40 mm' },
          ] },
        { model: 'FDS-40', label: 'Ø40 · differential',
          values: { ratios: '50-258', rated: '255 N·m', peak: '314 N·m', bore: 'Ø50 mm', weight: '3.6 kg' },
          detail: [
            { label: 'Reduction ratios', value: '50, 80, 100, 128, 160, 200, 258 : 1' },
            { label: 'Rated torque @100', value: '255 N·m' },
            { label: 'Peak torque @100', value: '314 N·m' },
            { label: 'Momentary max torque @100', value: '549 N·m' },
            { label: 'Rated torque by ratio', value: '50: 137 · 80: 196 · 100: 255 · 128: 294 · 160: 294 · 200: 294 · 258: 294 N·m' },
            { label: 'Input speed (max / rated)', value: '3300 / 2000 rpm' },
            { label: 'Outer diameter', value: 'Ø135 mm' },
            { label: 'Hollow bore', value: 'Ø50 mm' },
          ] },
        { model: 'FDS-50', label: 'Ø50 · differential',
          values: { ratios: '80-242', rated: '470 N·m', peak: '578 N·m', bore: 'Ø60 mm', weight: '7.2 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160, 200, 242 : 1' },
            { label: 'Rated torque @100', value: '470 N·m' },
            { label: 'Peak torque @100', value: '578 N·m' },
            { label: 'Momentary max torque @100', value: '1019 N·m' },
            { label: 'Rated torque by ratio', value: '80: 363 · 100: 470 · 120: 559 · 160: 559 · 200: 559 · 242: 559 N·m' },
            { label: 'Input speed (max / rated)', value: '3000 / 1700 rpm' },
            { label: 'Overall size', value: 'Ø170 × 78 mm' },
            { label: 'Hollow bore', value: 'Ø60 mm' },
          ] },
        { model: 'FDS-65', label: 'Ø65 · differential',
          values: { ratios: '78-260', rated: '1070 N·m', peak: '1340 N·m', bore: 'Ø70 mm', weight: '14 kg' },
          detail: [
            { label: 'Reduction ratios', value: '78, 104, 132, 158, 208, 260 : 1' },
            { label: 'Rated torque @104', value: '1070 N·m' },
            { label: 'Peak torque @104', value: '1340 N·m' },
            { label: 'Momentary max torque @104', value: '2360 N·m' },
            { label: 'Rated torque by ratio', value: '78: 745 · 104: 1070 · 132: 1070 · 158: 1070 · 208: 1070 · 260: 1070 N·m' },
            { label: 'Input speed (max / rated)', value: '2200 / 1400 rpm' },
            { label: 'Outer diameter', value: 'Ø215 mm' },
            { label: 'Hollow bore', value: 'Ø70 mm' },
          ] },
        { model: 'FDS-80', label: 'Ø80 · differential',
          values: { ratios: '80-320', rated: '1660 N·m', peak: '2050 N·m', bore: 'Ø90 mm', weight: '26 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 96, 128, 160, 194, 258, 320 : 1' },
            { label: 'Rated torque @96', value: '1660 N·m' },
            { label: 'Peak torque @96', value: '2050 N·m' },
            { label: 'Momentary max torque @96', value: '3590 N·m' },
            { label: 'Rated torque by ratio', value: '80: 1320 · 96: 1660 · 128: 2300 · 160: 2350 · 194: 2350 · 258: 2350 · 320: 2350 N·m' },
            { label: 'Input speed (max / rated)', value: '2000 / 1200 rpm' },
            { label: 'Overall size', value: 'Ø265 × 106 mm' },
            { label: 'Hollow bore', value: 'Ø90 mm' },
          ] },
        { model: 'FDS-100', label: 'Ø100 · differential',
          values: { ratios: '80-320', rated: '3200 N·m', peak: '3940 N·m', bore: 'Ø110 mm', weight: '48 kg' },
          detail: [
            { label: 'Reduction ratios', value: '80, 100, 120, 160, 200, 242, 320 : 1' },
            { label: 'Rated torque @100', value: '3200 N·m' },
            { label: 'Peak torque @100', value: '3940 N·m' },
            { label: 'Momentary max torque @100', value: '6920 N·m' },
            { label: 'Rated torque by ratio', value: '80: 2330 · 100: 3200 · 120: 3890 · 160: 4470 · 200: 4470 · 242: 4470 · 320: 4470 N·m' },
            { label: 'Input speed (max / rated)', value: '1700 / 1000 rpm' },
            { label: 'Overall size', value: 'Ø330 × 130 mm' },
            { label: 'Hollow bore', value: 'Ø110 mm' },
          ] },
      ],
    },
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
