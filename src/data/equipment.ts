// Equipment listings — Japanese / NATO-ally suppliers for US humanoid + UAV
// defense buyers. Adding a new provider is a single entry append.
//
// At launch we list one SKU: Xsens Link (next-generation humanoid motion
// capture suit, launched Nov 12 2025 by Movella/Xsens, NL).

export interface EquipmentSpec {
  label: string;
  value: string;
}

export interface EquipmentBundle {
  id: string;
  label: string;
  description?: string;
}

export interface EquipmentSoftwareTier {
  tier: string;
  description: string;
}

export interface EquipmentProduct {
  id: string;
  name: string;
  vendor: string;
  vendorOrigin: string;          // ISO country (NL, JP, US, etc.)
  vendorOriginLabel: string;     // human-readable
  category: string;
  tagline: string;
  description: string;
  specs: EquipmentSpec[];
  bundles: EquipmentBundle[];
  software?: EquipmentSoftwareTier[];
  customers: string[];           // publicly named OEM/lab customers only
  ndaaStatus: string;
  pricingNote: string;
  heroVideoUrl?: string;         // looping muted hero video (path under /public)
  secondaryVideoUrl?: string;    // click-to-play case-study video
  vendorUrl: string;
}

export const equipment: EquipmentProduct[] = [
  {
    id: 'xsens-link',
    name: 'Xsens Link',
    vendor: 'Xsens (Movella)',
    vendorOrigin: 'NL',
    vendorOriginLabel: 'Netherlands',
    category: 'Motion Capture',
    tagline: 'Motion capture suits for full-body teleoperation and ML training data collection for humanoid robotics.',
    description:
      'Next-generation inertial motion capture suit launched November 2025. ' +
      'Streams human kinematics directly into ROS 2, NVIDIA Isaac Sim, and MuJoCo ' +
      'with ~20 ms end-to-end latency. Designed for humanoid teleoperation, ' +
      'demonstration data capture, and motion retargeting workflows.',
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
      {
        id: 'suit_only',
        label: 'Xsens Link suit (hardware only)',
        description: 'Suit + receivers + Pelican case.',
      },
      {
        id: 'suit_gloves',
        label: 'Xsens Link + Metagloves by Manus',
        description: 'Adds finger tracking — 120 Hz, 15 m wireless, swappable battery.',
      },
      {
        id: 'suit_live',
        label: 'Xsens Link + Xsens Humanoid Live',
        description: 'Turnkey teleoperation. ROS 2 / Isaac Sim / MuJoCo native.',
      },
      {
        id: 'suit_pro_sdk',
        label: 'Xsens Link + Xsens Humanoid Pro + SDK',
        description: 'Fleet-scale data collection with HD reprocessing and batch export.',
      },
    ],
    software: [
      {
        tier: 'Live',
        description: '~20 ms latency teleop streaming. ROS 1/2, NVIDIA Isaac Sim, MuJoCo.',
      },
      {
        tier: 'Pro',
        description: 'HD reprocessing, batch export to MVNX / XLSX / MP4 / BVH.',
      },
      {
        tier: 'Academic',
        description: 'Discounted tier for universities. 1–10 seat network licenses.',
      },
    ],
    customers: [
      'NVIDIA',
      'Boston Dynamics',
      'Italian Institute of Technology',
      'Kepler Robotics',
      'DEEP Robotics',
      'Mentee Robotics',
      'Neura Robotics',
      'Meta',
    ],
    ndaaStatus: 'NATO-ally sourced (Netherlands). No NDAA covered-foreign-entity flags.',
    pricingNote: 'Pricing provided after Atlas brokers an introduction with Xsens.',
    heroVideoUrl: '/videos/xsens-link-hero.mp4',
    secondaryVideoUrl: '/videos/xsens-60min.mp4',
    vendorUrl: 'https://www.xsens.com/humanoid-robots',
  },
];
