import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PLYViewer, { preloadPLY } from './components/PLYViewer';
import SupplyChainGraph from './components/SupplyChainGraph';
import { companies, relationships, componentCategories, vlaModels, rewardModels, rewardComparisons, worldModels, vizTools, headDesigns, companyFunding, topInvestors, companyProduction, factoryDirectory, manufacturingPartners, simPlatforms, safetyStandards, oemSafetyProfiles } from './data';
import type { RobotSpecs, RewardModelType, WorldModelType, VizToolType, FaceDisplayType, FundingStatus, FactoryStatus, SimPlatformType, SafetyComplianceLevel, OemSafetyProfile } from './data';
import RewardChart from './components/RewardChart';
import ApiDocs from './components/ApiDocs';
import CliDocs from './components/CliDocs';
import DataBrokerage from './components/DataBrokerage';
import './App.css';

// Start fetching the skeleton model immediately on module load
preloadPLY('/models/skeleton.ply');

type TabGroup = 'overview' | 'industry' | 'data' | 'hardware' | 'software' | 'hri' | 'cli' | 'api';

const TAB_GROUPS: { id: TabGroup; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'industry', label: 'Industry' },
  { id: 'data', label: 'Data' }, // Hidden until ready — uncomment to enable
  { id: 'hardware', label: 'Hardware' },
  { id: 'software', label: 'Software' },
  { id: 'hri', label: 'HRI' },
  { id: 'cli', label: 'CLI' },
  { id: 'api', label: 'API' },
];

const TABS: { id: string; label: string; group: TabGroup }[] = [
  // Overview
  { id: 'skeleton', label: 'Skeleton', group: 'overview' },
  { id: 'all_oems', label: 'All OEMs', group: 'overview' },
  { id: 'network', label: 'Network', group: 'overview' },
  // Industry
  { id: 'geopolitics', label: 'Geopolitics', group: 'industry' },
  { id: 'funding', label: 'Funding', group: 'industry' },
  { id: 'timeline', label: 'Buildout', group: 'industry' },
  { id: 'factories', label: 'Factories', group: 'industry' },
  // Data
  { id: 'buy_data', label: 'Buy Data', group: 'data' },
  { id: 'sell_data', label: 'Sell Data', group: 'data' },
  { id: 'collect_data', label: 'Collect Data', group: 'data' },
  { id: 'account', label: 'Sign Out', group: 'data' },
  // Hardware
  { id: 'sensors_general', label: 'Sensors', group: 'hardware' },
  { id: 'compute', label: 'Compute', group: 'hardware' },
  { id: 'batteries', label: 'Battery', group: 'hardware' },
  { id: 'motors', label: 'Motors', group: 'hardware' },
  { id: 'reducers', label: 'Reducers', group: 'hardware' },
  { id: 'bearings', label: 'Bearings', group: 'hardware' },
  { id: 'actuators_rotary', label: 'Actuators', group: 'hardware' },
  { id: 'screws', label: 'Screws', group: 'hardware' },
  { id: 'end_effectors', label: 'Hands', group: 'hardware' },
  { id: 'pcbs', label: 'PCBs', group: 'hardware' },
  // Software
  { id: 'vlas', label: 'VLA', group: 'software' },
  { id: 'reward_models', label: 'Reward Models', group: 'software' },
  { id: 'world_models', label: 'World Models', group: 'software' },
  { id: 'sim_platforms', label: 'Sim Platforms', group: 'software' },
  { id: 'viz_tools', label: 'Viz Tools', group: 'software' },
  // HRI
  { id: 'displays', label: 'Displays', group: 'hri' },
  { id: 'safety_standards', label: 'Safety & Standards', group: 'hri' },
  // CLI
  { id: 'cli_install', label: 'Install', group: 'cli' },
  { id: 'cli_commands', label: 'Commands', group: 'cli' },
  { id: 'cli_examples', label: 'Examples', group: 'cli' },
  // API
  { id: 'api_getting_started', label: 'Getting Started', group: 'api' },
  { id: 'api_companies', label: 'Companies', group: 'api' },
  { id: 'api_supply_chain', label: 'Supply Chain', group: 'api' },
  { id: 'api_resources', label: 'Resources', group: 'api' },
  { id: 'api_ai_sim', label: 'AI & Sim', group: 'api' },
  { id: 'api_safety', label: 'Safety', group: 'api' },
  { id: 'api_query', label: 'Query', group: 'api' },
];

// Path ↔ Tab ID mapping for SEO-friendly URLs
const TAB_TO_PATH: Record<string, string> = {
  skeleton: '/',
  all_oems: '/oems',
  network: '/network',
  funding: '/industry/funding',
  factories: '/industry/factories',
  geopolitics: '/industry/geopolitics',
  timeline: '/industry/buildout',
  buy_data: '/data/buy',
  sell_data: '/data/sell',
  collect_data: '/data/collect',
  seller_terms: '/data/seller-terms',
  buyer_terms: '/data/buyer-terms',
  collector_terms: '/data/collector-terms',
  account: '/data/account',
  sensors_general: '/hardware/sensors',
  compute: '/hardware/compute',
  batteries: '/hardware/battery',
  motors: '/hardware/motors',
  reducers: '/hardware/reducers',
  bearings: '/hardware/bearings',
  actuators_rotary: '/hardware/actuators',
  screws: '/hardware/screws',
  end_effectors: '/hardware/hands',
  pcbs: '/hardware/pcbs',
  vlas: '/software/vla',
  reward_models: '/software/reward-models',
  world_models: '/software/world-models',
  sim_platforms: '/software/sim-platforms',
  viz_tools: '/software/viz-tools',
  displays: '/hri/displays',
  safety_standards: '/hri/safety-standards',
  cli_install: '/cli/install',
  cli_commands: '/cli/commands',
  cli_examples: '/cli/examples',
  api_getting_started: '/api/getting-started',
  api_companies: '/api/companies',
  api_supply_chain: '/api/supply-chain',
  api_resources: '/api/resources',
  api_ai_sim: '/api/ai-sim',
  api_safety: '/api/safety',
  api_query: '/api/query',
};

const PATH_TO_TAB: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab])
  ),
  // Legacy redirects (moved from overview to industry)
  '/geopolitics': 'geopolitics',
  '/buildout': 'timeline',
};

// Per-tab SEO meta content
const TAB_META: Record<string, { title: string; description: string }> = {
  skeleton: { title: 'Humanoid Atlas | Humanoid Robot Supply Chain Map & OEM Database', description: 'The comprehensive humanoid robot industry database. Compare 29+ OEMs, 41+ suppliers, hardware supply chain, VLA models, reward models, world models, and more.' },
  all_oems: { title: 'All Humanoid Robot OEMs | Humanoid Atlas', description: 'Compare 29+ humanoid robot manufacturers worldwide. Detailed specs, shipment data, and side-by-side comparison for Tesla Optimus, Figure, 1X NEO, Unitree, Agility Digit, and more.' },
  funding: { title: 'Humanoid Robot Funding & Valuations | Humanoid Atlas', description: 'Track funding rounds, valuations, and key investors across 25+ humanoid robotics companies. Compare total raised, latest valuations, and investor portfolios.' },
  factories: { title: 'Humanoid Robot Factories & Production Capacity | Humanoid Atlas', description: 'Compare production capacity, factory locations, and manufacturing targets across 20+ humanoid robot manufacturers. Track the global production ramp.' },
  geopolitics: { title: 'Humanoid Robot Geopolitics - US vs China Supply Chain | Humanoid Atlas', description: 'Geopolitical analysis of the humanoid robot supply chain. Compare US, China, and global supplier dependencies, self-sufficiency scores, and bottleneck exposure.' },
  network: { title: 'Humanoid Robot Supply Chain Network Graph | Humanoid Atlas', description: 'Interactive network visualization of all humanoid robot OEM-supplier relationships. Explore the full supply chain graph.' },
  timeline: { title: 'Humanoid Robot Industry Buildout Timeline | Humanoid Atlas', description: 'Timeline of humanoid robot development milestones, production ramp-ups, and industry buildout.' },
  buy_data: { title: 'Buy Training Data | Atlas Data Brokerage', description: 'Browse and purchase humanoid robot training datasets. Egocentric video, teleoperation, tactile, motion capture data from verified providers.' },
  sell_data: { title: 'Sell Training Data | Atlas Data Brokerage', description: 'List your training datasets on Atlas Data Brokerage. Reach OEM buyers, set your own prices, get paid via Stripe.' },
  collect_data: { title: 'Collect Training Data | Atlas Data Brokerage', description: 'Join data collection programs and earn by gathering training data for humanoid robots.' },
  account: { title: 'Account | Atlas Data Brokerage', description: 'Manage your Atlas Data Brokerage account.' },
  sensors_general: { title: 'Humanoid Robot Sensors - Cameras, LiDAR, IMUs | Humanoid Atlas', description: 'Sensor supply chain for humanoid robots. Intel RealSense, Livox LiDAR, Sony image sensors, and more.' },
  compute: { title: 'Humanoid Robot Compute - NVIDIA Jetson, SoCs | Humanoid Atlas', description: 'Compute platforms powering humanoid robots. NVIDIA Jetson Orin/Thor, Intel, Qualcomm, and custom SoCs.' },
  batteries: { title: 'Humanoid Robot Batteries - Cells & Pack Design | Humanoid Atlas', description: 'Battery supply chain for humanoid robots. Panasonic, CATL, Samsung SDI, Molicel cells and pack designs.' },
  motors: { title: 'Humanoid Robot Motors - BLDC Suppliers | Humanoid Atlas', description: 'BLDC motor supply chain for humanoid robots. Maxon, Allied Motion, ThinGap, T-Motor, and more.' },
  reducers: { title: 'Humanoid Robot Reducers - Harmonic & Cycloidal | Humanoid Atlas', description: 'Harmonic and cycloidal reducer supply chain. Harmonic Drive, LKGEAR, Leaderdrive - a key supply chain bottleneck.' },
  bearings: { title: 'Humanoid Robot Bearings - Cross-Roller & Ball | Humanoid Atlas', description: 'Bearing supply chain for humanoid robot joints. Cross-roller and ball bearings from key suppliers.' },
  actuators_rotary: { title: 'Humanoid Robot Actuators - Rotary & Linear | Humanoid Atlas', description: 'Actuator modules for humanoid robots. Rotary and linear actuators combining motors, reducers, encoders, and torque sensors.' },
  screws: { title: 'Humanoid Robot Planetary Roller Screws | Humanoid Atlas', description: 'Planetary roller screw supply chain - a critical bottleneck component for humanoid robot linear actuators.' },
  end_effectors: { title: 'Humanoid Robot Hands & End Effectors | Humanoid Atlas', description: 'Dexterous hands and grippers for humanoid robots. From 3-finger grippers to 22-DOF anthropomorphic hands.' },
  pcbs: { title: 'Humanoid Robot PCBs - Motor Drivers & Power | Humanoid Atlas', description: 'PCB and electronics supply chain for humanoid robots. Motor drivers, power management, and analog ICs.' },
  vlas: { title: 'VLA Models - Vision-Language-Action for Robotics | Humanoid Atlas', description: 'Compare 19 Vision-Language-Action models. GR00T N1, pi0, OpenVLA, Gemini Robotics, Helix 02, and more with OEM integration maps.' },
  reward_models: { title: 'Robotic Reward Models - Comparison & Scores | Humanoid Atlas', description: 'Compare 10 robotic reward models with interactive score comparison. Robometer, RoboReward, SARM, GVL, Eureka, and more.' },
  world_models: { title: 'World Models for Robotics - Video, Latent, RL | Humanoid Atlas', description: 'Compare 19 world models for robotics. DreamDojo, Dreamer V4, NVIDIA Cosmos, V-JEPA 2, Field AI, Rhoda AI, and more.' },
  sim_platforms: { title: 'Robotics Simulation Platforms - Isaac Sim, MuJoCo, Genesis | Humanoid Atlas', description: 'Compare 14 robotics simulation platforms with capability matrix. NVIDIA Isaac Sim, MuJoCo, Genesis, Drake, Gazebo, and more with OEM adoption maps.' },
  viz_tools: { title: 'Robotics Visualization Tools - Foxglove, Rerun & More | Humanoid Atlas', description: 'Compare 10 robotics visualization tools with capability matrix. Foxglove, Rerun, RViz2, PlotJuggler, and more.' },
  safety_standards: { title: 'Humanoid Robot Safety Standards & Compliance | Humanoid Atlas', description: 'Track safety standards (ISO 25785-1, ANSI R15.06, EU AI Act), OEM compliance profiles, and safety design features across 12 humanoid robotics companies.' },
  displays: { title: 'Humanoid Robot Displays & Head Designs | Humanoid Atlas', description: 'Compare 17 humanoid robot head/face designs. OLED screens, status displays, LED indicators, cameras, sensors, and interaction design.' },
  cli_install: { title: 'Atlas CLI Installation | Humanoid Atlas', description: 'Install the Humanoid Atlas CLI tool. Query the humanoid robot supply chain from your terminal.' },
  cli_commands: { title: 'Atlas CLI Command Reference | Humanoid Atlas', description: 'Full command reference for the Atlas CLI. Companies, supply chain, bottlenecks, scenarios, AI models, and more.' },
  cli_examples: { title: 'Atlas CLI Examples & Workflows | Humanoid Atlas', description: 'Real-world CLI workflows for querying the humanoid robot supply chain, running scenarios, and piping data to coding agents.' },
  api_getting_started: { title: 'API Getting Started - Authentication & Base URL | Humanoid Atlas', description: 'Get started with the Humanoid Atlas API. Base URL, authentication, response format, and system health endpoints.' },
  api_companies: { title: 'API Companies Endpoints | Humanoid Atlas', description: 'List, search, and retrieve detailed company profiles for OEMs and suppliers via the Humanoid Atlas API.' },
  api_supply_chain: { title: 'API Supply Chain Endpoints | Humanoid Atlas', description: 'Query supply chain relationships, traverse dependency graphs, analyze bottlenecks, and run what-if scenarios.' },
  api_resources: { title: 'API Resource Endpoints | Humanoid Atlas', description: 'Access components, funding, investors, production data, factories, and manufacturing partners via the API.' },
  api_ai_sim: { title: 'API AI & Simulation Endpoints | Humanoid Atlas', description: 'Query VLA models, reward models, world models, simulation platforms, and visualization tools.' },
  api_safety: { title: 'API Safety Endpoints | Humanoid Atlas', description: 'Access safety standards, OEM compliance profiles, and head design data via the API.' },
  api_query: { title: 'API Query & Compare Endpoints | Humanoid Atlas', description: 'Natural language search powered by LLM and side-by-side OEM comparison endpoints.' },
};

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
    description: 'Linear actuators convert rotary motion into push/pull force using planetary roller screws. They provide the high-force movements needed in legs and torso - extending and retracting to walk, squat, and lift. Tesla Optimus uses 14 linear actuators across three force classes. The planetary roller screw is the critical precision component, and a key supply chain bottleneck.',
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
    description: 'Rotary actuators handle all joint movements - shoulders, elbows, hips, knees, wrists. Each is a self-contained module combining a frameless BLDC motor + harmonic reducer + dual encoders + torque sensor. The harmonic reducer alone accounts for ~36% of the actuator cost, making it the most expensive single component. Unitree achieves ~$300/unit through Chinese supply chain optimization.',
    keyMetrics: {
      'Tesla Optimus Count': '20 rotary actuators',
      'Torque Classes (Tesla)': '20Nm, 110Nm, 180Nm',
      'Cost Breakdown': 'Reducer 36%, Torque sensor 30%, Motor 13.5%',
      'Unitree Cost': '~$300/unit',
      'Encoders': '2 per rotary actuator',
      'Design Trend': 'Quasi-Direct Drive (QDD)',
      'Alt Approach': 'Tendon drive (1X Neo - no gearboxes)',
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

// ==================== SKELETON INTERACTIVE REGIONS ====================
interface SkeletonRegionBounds {
  min: [number, number, number];
  max: [number, number, number];
}

interface SkeletonRegion {
  id: string;
  label: string;
  componentIds: string[];
  bounds: SkeletonRegionBounds[];
  color: string;
}

const SKELETON_REGIONS: SkeletonRegion[] = [
  {
    id: 'head',
    label: 'Head',
    componentIds: ['sensors_general', 'displays', 'compute'],
    bounds: [{ min: [-0.12, 0.81, -0.12], max: [0.12, 1.05, 0.12] }],
    color: '#d05050',
  },
  {
    id: 'neck',
    label: 'Neck',
    componentIds: ['actuators_rotary', 'motors', 'displays'],
    bounds: [{ min: [-0.18, 0.71, -0.15], max: [0.18, 0.77, 0.15] }],
    color: '#d05050',
  },
  {
    id: 'torso',
    label: 'Torso',
    componentIds: ['batteries', 'pcbs', 'compute'],
    bounds: [{ min: [-0.2, 0.15, -0.16], max: [0.2, 0.72, 0.16] }],
    color: '#d05050',
  },
  {
    id: 'shoulders',
    label: 'Shoulders',
    componentIds: ['actuators_rotary', 'bearings', 'reducers'],
    bounds: [
      { min: [-1.0, 0.5, -0.22], max: [-0.2, 0.78, 0.22] },
      { min: [0.2, 0.5, -0.22], max: [1.0, 0.78, 0.22] },
    ],
    color: '#d05050',
  },
  {
    id: 'arms',
    label: 'Arms',
    componentIds: ['actuators_rotary', 'motors', 'reducers'],
    bounds: [
      { min: [-1.0, -0.1, -0.18], max: [-0.22, 0.55, 0.18] },
      { min: [0.22, -0.1, -0.18], max: [1.0, 0.55, 0.18] },
    ],
    color: '#d05050',
  },
  {
    id: 'hips',
    label: 'Hips',
    componentIds: ['bearings', 'actuators_rotary', 'reducers'],
    bounds: [{ min: [-0.22, -0.15, -0.16], max: [0.22, 0.15, 0.16] }],
    color: '#d05050',
  },
  {
    id: 'legs',
    label: 'Legs',
    componentIds: ['actuators_linear', 'screws', 'bearings'],
    bounds: [{ min: [-0.28, -0.7, -0.18], max: [0.28, -0.15, 0.18] }],
    color: '#d05050',
  },
  {
    id: 'ankles',
    label: 'Ankles',
    componentIds: ['actuators_rotary', 'bearings', 'reducers'],
    bounds: [{ min: [-0.28, -0.88, -0.18], max: [0.28, -0.7, 0.18] }],
    color: '#d05050',
  },
  {
    id: 'feet',
    label: 'Feet',
    componentIds: ['sensors_general', 'bearings'],
    bounds: [{ min: [-0.32, -1.05, -0.22], max: [0.32, -0.88, 0.22] }],
    color: '#d05050',
  },
  {
    id: 'hands',
    label: 'Hands',
    componentIds: ['end_effectors', 'sensors_tactile', 'motors'],
    bounds: [
      { min: [-0.65, -0.5, -0.15], max: [-0.28, -0.1, 0.15] },
      { min: [0.28, -0.5, -0.15], max: [0.65, -0.1, 0.15] },
    ],
    color: '#d05050',
  },
];

const COMPONENT_SPEC_FIELDS: Record<string, { field: keyof RobotSpecs; label: string }[]> = {
  motors: [{ field: 'motor', label: 'Motor Type' }],
  reducers: [{ field: 'transmission', label: 'Transmission' }],
  compute: [{ field: 'compute', label: 'Compute Platform' }],
  sensors_general: [{ field: 'externalSensors', label: 'External Sensors' }, { field: 'internalSensors', label: 'Internal Sensors' }],
  sensors_tactile: [{ field: 'endEffector', label: 'End Effector' }, { field: 'internalSensors', label: 'Internal Sensors' }],
  end_effectors: [{ field: 'endEffector', label: 'End Effector' }],
  batteries: [{ field: 'battery', label: 'Battery' }, { field: 'charging', label: 'Charging' }, { field: 'operatingTime', label: 'Operating Time' }],
  pcbs: [],
  displays: [],
  actuators_rotary: [{ field: 'actuatorBody', label: 'Body Actuators' }, { field: 'actuatorHand', label: 'Hand Actuators' }],
  actuators_linear: [{ field: 'actuatorBody', label: 'Body Actuators' }, { field: 'transmission', label: 'Transmission' }],
  bearings: [{ field: 'transmission', label: 'Transmission' }],
  screws: [{ field: 'transmission', label: 'Transmission' }],
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

// Pre-computed OEM list (static data, no need to recompute per render)
const oems = companies.filter((c) => c.type === 'oem');

// Named scenarios for Cut the Wire
// Compute dynamic OEM counts for scenario descriptions
const _totalOems = oems.length;
const _oemIds = new Set(oems.map((c) => c.id));
function _countOemCustomers(supplierId: string) {
  return [...new Set(relationships.filter((r) => r.from === supplierId && _oemIds.has(r.to)).map((r) => r.to))].length;
}

const SCENARIOS = [
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
    description: `Japan's Harmonic Drive Systems cannot ship - the single most expensive actuator component disappears from ${_countOemCustomers('harmonic_drive')} of ${_totalOems} OEMs.`,
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
    description: `NVIDIA cut from supply chain - ${_countOemCustomers('nvidia')} of ${_totalOems} OEMs lose their primary compute platform.`,
    cutCompanies: ['nvidia'],
    cutCountries: [],
  },
];

// Unified impact calculator: supports country-level AND company-level cuts with cascade
function getUnifiedImpact(cutCountries: Set<string>, cutCompanyIds: Set<string>) {
  if (cutCountries.size === 0 && cutCompanyIds.size === 0) return null;

  const oemIds = new Set(companies.filter((c) => c.type === 'oem').map((c) => c.id));

  // Build the full set of disrupted supplier IDs (direct + cascade)
  const disruptedIds = new Set<string>();
  const cascadeChains: { source: string; sourceName: string; affected: { id: string; name: string }[] }[] = [];

  // 1. Country-level cuts: mark all non-OEM companies from cut countries
  companies.forEach((c) => {
    if (!oemIds.has(c.id) && cutCountries.has(getCountryGroup(c.country))) {
      disruptedIds.add(c.id);
    }
  });

  // 2. Company-level cuts: mark directly cut companies
  cutCompanyIds.forEach((id) => disruptedIds.add(id));

  // 3. Cascade: for each disrupted company, find downstream companies that depend on them
  //    and may be effectively disrupted (if they lose a critical upstream supplier)
  const directCuts = new Set(disruptedIds);
  let changed = true;
  while (changed) {
    changed = false;
    companies.forEach((c) => {
      if (disruptedIds.has(c.id) || oemIds.has(c.id)) return;
      // Check if ALL suppliers for any critical input are disrupted
      const incomingRels = relationships.filter((r) => r.to === c.id);
      if (incomingRels.length === 0) return;
      // Group by component
      const byComponent = new Map<string, string[]>();
      incomingRels.forEach((r) => {
        const list = byComponent.get(r.component) || [];
        list.push(r.from);
        byComponent.set(r.component, list);
      });
      // If ALL suppliers for ANY component are disrupted, this company is disrupted
      for (const [, supplierIds] of byComponent) {
        if (supplierIds.every((sid) => disruptedIds.has(sid))) {
          disruptedIds.add(c.id);
          changed = true;
          return;
        }
      }
    });
  }

  // Build cascade chains for display
  directCuts.forEach((cutId) => {
    const cutCompany = companies.find((c) => c.id === cutId);
    if (!cutCompany) return;
    // Find non-OEM companies that became disrupted because of this cut
    const affected = companies.filter((c) => {
      if (c.id === cutId || oemIds.has(c.id) || directCuts.has(c.id)) return false;
      if (!disruptedIds.has(c.id)) return false;
      // Check if this company has a relationship from the cut company
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

  // Compute OEM impacts
  const oemList = companies.filter((c) => c.type === 'oem');
  const oemImpacts = oemList.map((oem) => {
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

  // Compute component category impacts
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

function getCompanyVlaLinks(companyId: string) {
  return vlaModels.flatMap((model) =>
    model.companyLinks
      .filter((link) => link.companyId === companyId)
      .map((link) => ({ model, link }))
  );
}

function getVlaRelationshipTypeLabel(type: 'proprietary' | 'partner' | 'open' | 'ecosystem') {
  if (type === 'proprietary') return 'Proprietary / In-House';
  if (type === 'partner') return 'Partner Integration';
  if (type === 'open') return 'Open Model';
  return 'Ecosystem';
}

function getVlaCompanyRelationshipLabel(type: 'proprietary' | 'partner') {
  if (type === 'proprietary') return 'Proprietary / In-House';
  return 'Partner Integration';
}

const VIZ_CAPABILITIES = [
  'ROS 1', 'ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab',
] as const;

const VIZ_CAPABILITY_MAP: Record<string, Set<string>> = {
  foxglove:    new Set(['ROS 1', 'ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab']),
  rerun:       new Set(['ROS 2', 'MCAP', 'Web', 'Desktop', 'Python', '3D', 'Time Series', 'Video']),
  formant:     new Set(['ROS 1', 'ROS 2', 'Web', 'Python', '3D', 'Time Series', 'Video', 'Fleet', 'Collab']),
  rviz2:       new Set(['ROS 2', 'Desktop', '3D']),
  meshcat:     new Set(['Web', 'Python', '3D']),
  viser:       new Set(['Web', 'Python', '3D']),
  vuer:        new Set(['Web', 'Python', '3D', 'Video']),
  plotjuggler: new Set(['ROS 1', 'ROS 2', 'MCAP', 'Desktop', 'Time Series']),
  datatamer:   new Set(['ROS 2', 'Time Series']),
  roboto_ai:   new Set(['ROS 2', 'MCAP', 'Web', 'Python', 'Time Series', 'Video', 'Fleet']),
};

function getRewardModelTypeLabel(type: RewardModelType) {
  if (type === 'trained') return 'Trained Model';
  if (type === 'zero-shot') return 'Zero-Shot';
  return 'Code Generation';
}

function getRewardModelOverview() {
  return {
    trackedModels: rewardModels.length,
    trainedModels: rewardModels.filter((m) => m.modelType === 'trained').length,
    zeroShotModels: rewardModels.filter((m) => m.modelType === 'zero-shot').length,
    codeGenModels: rewardModels.filter((m) => m.modelType === 'code-gen').length,
    developerCount: new Set(rewardModels.map((m) => m.developer)).size,
  };
}

function getWorldModelTypeLabel(type: WorldModelType) {
  if (type === 'video-generation') return 'Video Generation';
  if (type === 'latent-dynamics') return 'Latent Dynamics';
  if (type === 'rl-imagination') return 'RL / Imagination';
  return 'Foundation Platform';
}

function getWorldModelOverview() {
  return {
    trackedModels: worldModels.length,
    videoGenModels: worldModels.filter((m) => m.modelType === 'video-generation').length,
    latentDynModels: worldModels.filter((m) => m.modelType === 'latent-dynamics').length,
    rlImaginModels: worldModels.filter((m) => m.modelType === 'rl-imagination').length,
    foundationModels: worldModels.filter((m) => m.modelType === 'foundation-platform').length,
    developerCount: new Set(worldModels.map((m) => m.developer)).size,
  };
}

function getFaceDisplayTypeLabel(type: FaceDisplayType) {
  if (type === 'oled-screen') return 'OLED Screen';
  if (type === 'status-screen') return 'Status Screen';
  if (type === 'led-indicator') return 'LED Indicator';
  if (type === 'no-display') return 'No Display';
  return 'Concealed';
}

function getHeadDesignOverview() {
  return {
    trackedDesigns: headDesigns.length,
    oledScreens: headDesigns.filter((d) => d.faceType === 'oled-screen').length,
    statusScreens: headDesigns.filter((d) => d.faceType === 'status-screen').length,
    ledIndicators: headDesigns.filter((d) => d.faceType === 'led-indicator').length,
    noDisplay: headDesigns.filter((d) => d.faceType === 'no-display').length,
    concealed: headDesigns.filter((d) => d.faceType === 'concealed').length,
  };
}

function getVizToolTypeLabel(type: VizToolType) {
  if (type === 'platform') return 'Platform';
  if (type === '3d-viewer') return '3D Viewer';
  if (type === 'time-series') return 'Time Series';
  return 'Data & Analytics';
}

function getVizToolOverview() {
  return {
    trackedTools: vizTools.length,
    platformTools: vizTools.filter((t) => t.toolType === 'platform').length,
    viewerTools: vizTools.filter((t) => t.toolType === '3d-viewer').length,
    timeSeriesTools: vizTools.filter((t) => t.toolType === 'time-series').length,
    analyticsTools: vizTools.filter((t) => t.toolType === 'data-analytics').length,
    developerCount: new Set(vizTools.map((t) => t.developer)).size,
  };
}

const SIM_CAPABILITIES = [
  'GPU Accel', 'Open Source', 'Humanoid', 'Sim-to-Real', 'Differentiable', 'Multi-Physics', 'ROS 2',
] as const;

function getSimCapabilities(p: { gpuAccelerated: boolean; openSource: boolean; humanoidModels: boolean; simToReal: boolean; differentiable: boolean; multiPhysics: boolean; ros2: boolean }): Set<string> {
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

function getSimPlatformTypeLabel(type: SimPlatformType) {
  if (type === 'physics-engine') return 'Physics Engine';
  if (type === 'rl-framework') return 'RL Framework';
  if (type === 'environment') return 'Environment';
  return 'World Model';
}

function getSimPlatformOverview() {
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

const SAFETY_CAPABILITIES = [
  'Force Limit', 'E-Stop', 'Speed Limit', 'Collision Det.', 'Compliant Act.', 'Fall Protect', 'Cyber',
] as const;

function getSafetyCapabilities(p: OemSafetyProfile): Set<string> {
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

function getComplianceLevelLabel(level: SafetyComplianceLevel) {
  switch (level) {
    case 'certified': return 'Certified';
    case 'in-progress': return 'In Progress';
    case 'claimed': return 'Claimed';
    case 'not-disclosed': return 'Not Disclosed';
  }
}

function getSafetyOverview() {
  return {
    trackedStandards: safetyStandards.length,
    publishedStandards: safetyStandards.filter((s) => s.status === 'published' || s.status === 'in-force').length,
    inProgressStandards: safetyStandards.filter((s) => s.status === 'working-draft' || s.status === 'fdis' || s.status === 'framework').length,
    trackedOems: oemSafetyProfiles.length,
    certifiedOems: oemSafetyProfiles.filter((p) => p.complianceLevel === 'certified').length,
    inProgressOems: oemSafetyProfiles.filter((p) => p.complianceLevel === 'in-progress').length,
  };
}

function getVLAOverview() {
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

type CountryGroup = 'US' | 'CN' | 'JP' | 'KR' | 'OTHER' | null;

// Geopolitical grouping (US vs CN vs Other) - used for scoreboard analytics, supply chain bars, scenario cuts
function getCountryGroup(country: string): 'US' | 'CN' | 'OTHER' {
  if (country === 'US') return 'US';
  if (country === 'CN') return 'CN';
  return 'OTHER';
}

// Filter grouping - used for the country filter pills (distinguishes JP and KR)
function getCountryFilterGroup(country: string): 'US' | 'CN' | 'JP' | 'KR' | 'OTHER' {
  if (country === 'US') return 'US';
  if (country === 'CN') return 'CN';
  if (country === 'JP') return 'JP';
  if (country === 'KR') return 'KR';
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

// --- Timeline data ---
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseLaunchDate(s: string): number {
  // "Aug 2023" → 2023.58, "Q1 2026" → 2026.0, "Feb 2019" → 2019.08
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
  return 2025; // fallback
}

const TIMELINE_START = 2018.5;
const TIMELINE_END = 2026.5;
const TIMELINE_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

function getTimelineData() {
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

  // Group into lanes
  const lanes: { group: string; label: string; rows: typeof rows }[] = [
    { group: 'US', label: 'United States', rows: rows.filter((r) => r.countryGroup === 'US') },
    { group: 'CN', label: 'China', rows: rows.filter((r) => r.countryGroup === 'CN') },
    { group: 'JP', label: 'Japan', rows: rows.filter((r) => r.countryGroup === 'JP') },
    { group: 'KR', label: 'South Korea', rows: rows.filter((r) => r.countryGroup === 'KR') },
    { group: 'OTHER', label: 'Rest of World', rows: rows.filter((r) => r.countryGroup === 'OTHER') },
  ].filter((l) => l.rows.length > 0);

  // Shipment summary
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

  // "Now" marker position
  const now = new Date().getFullYear() + new Date().getMonth() / 12;
  const nowPct = ((now - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * 100;

  return { lanes, shipmentsByGroup, totalShipments, nowPct, maxShipments };
}

const COUNTRY_GROUP_COLORS: Record<string, string> = {
  US: '#3b82f6',
  CN: '#ef4444',
  OTHER: '#888',
};

// Component categories that are bottlenecks (from componentCategories data)
const BOTTLENECK_COMPONENTS = new Set(['Reducers', 'Screws']);

// Rotary actuator cost breakdown (industry data from ACTUATOR_INFO)
const ACTUATOR_BREAKDOWN = [
  { id: 'reducer', label: 'Harmonic Reducer', pct: 36 },
  { id: 'torque', label: 'Torque Sensor', pct: 30 },
  { id: 'motor', label: 'BLDC Motor', pct: 13.5 },
  { id: 'encoder', label: 'Encoders', pct: 7 },
  { id: 'other', label: 'Housing & Other', pct: 13.5 },
];

// Parse a price/BOM string like "$40K", "~$28K", "$11.5K" into a number (in thousands)
function parseCostK(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.match(/\$\s*([\d.]+)\s*K/i);
  if (m) return parseFloat(m[1]);
  // Handle "$20K - $30K" → take first value
  const range = s.match(/\$\s*([\d.]+)\s*K?\s*[-–]/i);
  if (range) return parseFloat(range[1]);
  return null;
}

function getBOMData() {
  const oemList = companies.filter((c) => c.type === 'oem');

  // Build comparison rows with parsed BOM and price
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
      sortValue: priceK ?? bomK ?? 999, // sort by price, fallback to BOM
    };
  })
    .filter((r) => r.bomK !== null || r.priceK !== null)
    .sort((a, b) => a.sortValue - b.sortValue);

  // Max value for bar scaling
  const maxK = Math.max(...rows.map((r) => Math.max(r.bomK || 0, r.priceK || 0)));

  // Unit economics: OEMs with both BOM and price
  const econRows = rows.filter((r) => r.bomK !== null && r.priceK !== null);

  return { rows, maxK, econRows, actuatorBreakdown: ACTUATOR_BREAKDOWN };
}

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

  return { spofRows };
}

// Legacy hash redirect - send old hash URLs to new paths
function useLegacyHashRedirect(navigate: ReturnType<typeof useNavigate>) {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    if (hash.startsWith('/tab/')) {
      const tabId = hash.slice(5);
      const path = TAB_TO_PATH[tabId];
      if (path) navigate(path, { replace: true });
    } else if (hash.startsWith('/company/')) {
      const companyId = hash.slice(9);
      navigate(`/?company=${companyId}`, { replace: true });
    }
  }, []);
}

const TYPE_DISPLAY: Record<string, string> = {
  oem: 'OEM', tier1_supplier: 'Tier 1', component_maker: 'Supplier',
  raw_material: 'Raw Material', ai_compute: 'Compute',
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Redirect legacy hash URLs to path-based routes
  useLegacyHashRedirect(navigate);

  // Derive activeTab from URL path
  const activeTab = useMemo(() => {
    return PATH_TO_TAB[location.pathname] || 'skeleton';
  }, [location.pathname]);

  const activeTabGroup = TABS.find((t) => t.id === activeTab)?.group || 'overview';
  const [companyId, setCompanyId] = useState<string | null>(searchParams.get('company') || null);
  const [actuatorType, setActuatorType] = useState<'linear' | 'rotary'>('linear');
  const [chainFocus, setChainFocus] = useState<string | null>(null);
  const [vlaFilter, setVlaFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [rewardFilter, setRewardFilter] = useState<'all' | RewardModelType>('all');
  const [worldModelFilter, setWorldModelFilter] = useState<'all' | WorldModelType>('all');
  const [vizToolFilter, setVizToolFilter] = useState<'all' | VizToolType>('all');
  const [headDesignFilter, setHeadDesignFilter] = useState<'all' | FaceDisplayType>('all');
  const [fundingStatusFilter, setFundingStatusFilter] = useState<'all' | FundingStatus>('all');
  const [factoryStatusFilter, setFactoryStatusFilter] = useState<'all' | FactoryStatus>('all');
  const [simPlatformFilter, setSimPlatformFilter] = useState<'all' | SimPlatformType>('all');
  const [safetyComplianceFilter, setSafetyComplianceFilter] = useState<'all' | SafetyComplianceLevel>('all');
  const [countryFilter, setCountryFilter] = useState<CountryGroup>(null);
  const [cutCountries, setCutCountries] = useState<Set<string>>(new Set());
  const [cutCompanies, setCutCompanies] = useState<Set<string>>(new Set());
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [clerkSignedIn, setClerkSignedIn] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => setClerkSignedIn((e as CustomEvent).detail?.isSignedIn ?? false);
    window.addEventListener('clerk-auth-change', handler);
    return () => window.removeEventListener('clerk-auth-change', handler);
  }, []);

  // Skeleton interactive state
  const [skeletonRegion, setSkeletonRegion] = useState<string | null>(null);
  const [skeletonPill, setSkeletonPill] = useState<string | null>(null);
  const [skeletonOem, setSkeletonOem] = useState<string | null>(null);
  const [skeletonSidebarOpen, setSkeletonSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('oem_likes') || '[]'));
    } catch {
      return new Set<string>();
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [smartAnswer, setSmartAnswer] = useState<{ answer: string; companyIds: string[] } | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const [thesis, setThesis] = useState<string | null>(null);
  const [thesisLoading, setThesisLoading] = useState(false);
  const thesisCache = useRef<Map<string, string>>(new Map());
  const [graphQuery, setGraphQuery] = useState('');
  const [graphHighlightIds, setGraphHighlightIds] = useState<Set<string> | null>(null);
  const [graphQuerying, setGraphQuerying] = useState(false);
  const [companyChat, setCompanyChat] = useState('');
  const [companyChatAnswer, setCompanyChatAnswer] = useState<string | null>(null);
  const [companyChatLoading, setCompanyChatLoading] = useState(false);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const [compareAnalysis, setCompareAnalysis] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const summaryCache = useRef<Map<string, string>>(new Map());
  const searchRef = useRef<HTMLDivElement>(null);

  const sortedOems = useMemo(
    () => [...oems].sort((a, b) => (likes[b.id] || 0) - (likes[a.id] || 0)),
    [likes],
  );

  // Sync companyId to URL query param
  useEffect(() => {
    if (companyId) {
      const currentPath = TAB_TO_PATH[activeTab] || '/';
      navigate(`${currentPath}?company=${companyId}`, { replace: true });
    }
  }, [companyId]);

  // Pick up company from URL on mount / navigation
  useEffect(() => {
    const urlCompany = searchParams.get('company');
    if (urlCompany && urlCompany !== companyId) {
      setCompanyId(urlCompany);
    }
  }, [searchParams]);

  // Mobile detection for skeleton interactive
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Detect if query is a compare or natural language question
  const isCompareQuery = useMemo(() => /^compare\s+.+\s+(?:vs\.?|versus)\s+.+$/i.test(searchQuery.trim()), [searchQuery]);
  const isNlQuery = useMemo(() => {
    if (isCompareQuery) return true;
    const q = searchQuery.trim().toLowerCase();
    return q.includes('?') || q.startsWith('which') || q.startsWith('who') || q.startsWith('what') || q.startsWith('how') || q.startsWith('list') || q.startsWith('show') || q.startsWith('find') || q.includes('suppliers with') || q.includes('oems that') || q.includes('companies that');
  }, [searchQuery, isCompareQuery]);

  // Simple search results (client-side, instant)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || isNlQuery) return [];
    const q = searchQuery.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      (c.ticker && c.ticker.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [searchQuery, isNlQuery]);

  const vlaSearchResults = useMemo(() => {
    if (!searchQuery.trim() || isNlQuery) return [];
    const q = searchQuery.toLowerCase();
    return vlaModels.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.developer.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [searchQuery, isNlQuery]);

  // Smart search results (companies from AI answer)
  const smartCompanies = useMemo(() => {
    if (!smartAnswer) return [];
    return smartAnswer.companyIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean) as typeof companies;
  }, [smartAnswer]);

  useEffect(() => {
    fetch('/api/views', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => setViewCount(d.views))
      .catch(() => {});
    fetch('/api/likes')
      .then((r) => r.json())
      .then((d) => setLikes(d.likes || {}))
      .catch(() => {});
  }, []);

  // Fetch AI summary when scenario cuts change
  useEffect(() => {
    if (cutCountries.size === 0 && cutCompanies.size === 0) {
      setAiSummary(null);
      return;
    }
    const cacheKey = [...cutCompanies].sort().join(',') + '|' + [...cutCountries].sort().join(',');
    if (summaryCache.current.has(cacheKey)) {
      setAiSummary(summaryCache.current.get(cacheKey)!);
      return;
    }
    const impact = getUnifiedImpact(cutCountries, cutCompanies);
    if (!impact) { setAiSummary(null); return; }

    setAiLoading(true);
    fetch('/api/scenario-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarios: SCENARIOS.filter((s) => activeScenarios.has(s.id)).map((s) => s.label),
        componentImpacts: impact.componentImpacts,
        oemImpacts: impact.oemImpacts,
        cascadeChains: impact.cascadeChains,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        const text = d.summary || null;
        if (text) summaryCache.current.set(cacheKey, text);
        setAiSummary(text);
      })
      .catch(() => setAiSummary(null))
      .finally(() => setAiLoading(false));
  }, [cutCountries, cutCompanies, activeScenarios]);

  // Fetch investment thesis for supplier detail pages
  useEffect(() => {
    if (!companyId) { setThesis(null); return; }
    const company = companies.find((c) => c.id === companyId);
    if (!company || company.type === 'oem') { setThesis(null); return; }
    if (thesisCache.current.has(companyId)) {
      setThesis(thesisCache.current.get(companyId)!);
      return;
    }
    const oemIds = new Set(oems.map((c) => c.id));
    const customerRels = relationships.filter((r) => r.from === companyId && oemIds.has(r.to));
    const uniqueOemIds = [...new Set(customerRels.map((r) => r.to))];
    const oemCustomers = uniqueOemIds
      .map((id) => companies.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ name: c!.name, country: c!.country }));
    const componentLabel = SUPPLIER_COMPONENT_LABEL[companyId] || null;
    const isBottleneck = componentLabel ? BOTTLENECK_COMPONENTS.has(componentLabel) : false;
    const alternatives = componentLabel
      ? companies.filter((s) => s.id !== companyId && s.type !== 'oem' && SUPPLIER_COMPONENT_LABEL[s.id] === componentLabel && relationships.some((r) => r.from === s.id && oemIds.has(r.to)))
          .map((s) => ({ name: s.name, country: s.country }))
      : [];

    setThesisLoading(true);
    fetch('/api/investment-thesis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: company.name, country: company.country, type: company.type,
        description: company.description, marketShare: company.marketShare,
        ticker: company.ticker, componentLabel, isBottleneck,
        oemCount: oemCustomers.length, totalOems: oems.length,
        alternatives, customers: oemCustomers,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        const text = d.thesis || null;
        if (text) thesisCache.current.set(companyId, text);
        setThesis(text);
      })
      .catch(() => setThesis(null))
      .finally(() => setThesisLoading(false));
  }, [companyId]);

  const selectedComponent = useMemo(
    () => (activeTab !== 'skeleton' ? componentCategories.find((c) => c.id === activeTab) : null),
    [activeTab]
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId),
    [companyId]
  );

  const linkedCompanyVlaModels = useMemo(
    () => (selectedCompany ? getCompanyVlaLinks(selectedCompany.id) : []),
    [selectedCompany]
  );

  const chain = useMemo(() => {
    if (activeTab === 'skeleton' || activeTab === 'all_oems' || activeTab === 'geopolitics' || activeTab === 'funding' || activeTab === 'factories') return null;
    if (activeTab === 'vlas') return null;
    if (activeTab === 'reward_models') return null;
    if (activeTab === 'world_models') return null;
    if (activeTab === 'viz_tools') return null;
    if (activeTab === 'displays') return null;
    if (activeTab === 'actuators_rotary') {
      return getComponentChain(actuatorType === 'linear' ? 'actuators_linear_only' : 'actuators_rotary_only');
    }
    return getComponentChain(activeTab);
  }, [activeTab, actuatorType]);

  // Skeleton sidebar computed data
  const skeletonChain = useMemo(() => {
    if (!skeletonPill) return null;
    return getComponentChain(skeletonPill);
  }, [skeletonPill]);

  const skeletonComponent = useMemo(() => {
    if (!skeletonPill) return null;
    return componentCategories.find(c => c.id === skeletonPill) || null;
  }, [skeletonPill]);

  const vlaOverview = useMemo(() => getVLAOverview(), []);

  const focusedVlaModel = useMemo(
    () => vlaModels.find((model) => model.id === chainFocus) || null,
    [chainFocus]
  );

  const focusedVlaOemIds = useMemo(
    () => new Set(focusedVlaModel?.companyLinks.map((link) => link.companyId) || []),
    [focusedVlaModel]
  );

  const filteredVlaModels = useMemo(() => {
    if (vlaFilter === 'all') return vlaModels;
    if (vlaFilter === 'open') return vlaModels.filter((m) => m.relationshipType === 'open' || m.relationshipType === 'ecosystem');
    return vlaModels.filter((m) => m.relationshipType === 'proprietary' || m.relationshipType === 'partner');
  }, [vlaFilter]);

  const linkedVlaOems = useMemo(() => {
    const models = vlaFilter === 'all' ? vlaModels : filteredVlaModels;
    const ids = [...new Set(models.flatMap((model) => model.companyLinks.map((link) => link.companyId)))];
    return ids
      .map((id) => companies.find((company) => company.id === id))
      .filter(Boolean) as typeof companies;
  }, [vlaFilter, filteredVlaModels]);

  // Reward model state
  const rewardOverview = useMemo(() => getRewardModelOverview(), []);

  const focusedRewardModel = useMemo(
    () => rewardModels.find((model) => model.id === chainFocus) || null,
    [chainFocus]
  );

  const filteredRewardModels = useMemo(() => {
    if (rewardFilter === 'all') return rewardModels;
    return rewardModels.filter((m) => m.modelType === rewardFilter);
  }, [rewardFilter]);

  // World model state
  const worldModelOverview = useMemo(() => getWorldModelOverview(), []);

  const focusedWorldModel = useMemo(
    () => worldModels.find((model) => model.id === chainFocus) || null,
    [chainFocus]
  );

  const filteredWorldModels = useMemo(() => {
    if (worldModelFilter === 'all') return worldModels;
    return worldModels.filter((m) => m.modelType === worldModelFilter);
  }, [worldModelFilter]);

  // Sim platform state
  const simPlatformOverview = useMemo(() => getSimPlatformOverview(), []);

  const focusedSimPlatform = useMemo(
    () => simPlatforms.find((p) => p.id === chainFocus) || null,
    [chainFocus]
  );

  // Safety & standards state
  const safetyOverviewData = useMemo(() => getSafetyOverview(), []);

  const focusedSafetyProfile = useMemo(
    () => oemSafetyProfiles.find((p) => p.id === chainFocus) || null,
    [chainFocus]
  );

  const focusedSafetyStandard = useMemo(
    () => safetyStandards.find((s) => s.id === chainFocus) || null,
    [chainFocus]
  );

  const filteredSafetyProfiles = useMemo(() => {
    if (safetyComplianceFilter === 'all') return oemSafetyProfiles;
    return oemSafetyProfiles.filter((p) => p.complianceLevel === safetyComplianceFilter);
  }, [safetyComplianceFilter]);

  // Viz tool state
  const vizToolOverview = useMemo(() => getVizToolOverview(), []);

  const focusedVizTool = useMemo(
    () => vizTools.find((tool) => tool.id === chainFocus) || null,
    [chainFocus]
  );

  const filteredVizTools = useMemo(() => {
    if (vizToolFilter === 'all') return vizTools;
    return vizTools.filter((t) => t.toolType === vizToolFilter);
  }, [vizToolFilter]);

  // Head design state
  const headDesignOverview = useMemo(() => getHeadDesignOverview(), []);

  const focusedHeadDesign = useMemo(
    () => headDesigns.find((d) => d.id === chainFocus) || null,
    [chainFocus]
  );

  const filteredHeadDesigns = useMemo(() => {
    if (headDesignFilter === 'all') return headDesigns;
    return headDesigns.filter((d) => d.faceType === headDesignFilter);
  }, [headDesignFilter]);

  const filteredFunding = useMemo(() => {
    let items = [...companyFunding];
    if (fundingStatusFilter !== 'all') {
      items = items.filter((f) => f.status === fundingStatusFilter);
    }
    return items;
  }, [fundingStatusFilter]);

  const fundingSortedByRaised = useMemo(() => {
    return [...filteredFunding].sort((a, b) => {
      const valDiff = (b.latestValuationM ?? 0) - (a.latestValuationM ?? 0);
      if (valDiff !== 0) return valDiff;
      return (b.totalRaisedM ?? 0) - (a.totalRaisedM ?? 0);
    });
  }, [filteredFunding]);

  const filteredSimPlatforms = useMemo(() => {
    const base = simPlatforms.filter((p) => p.platformType !== 'world-model');
    if (simPlatformFilter === 'all') return base;
    return base.filter((p) => p.platformType === simPlatformFilter);
  }, [simPlatformFilter]);

  const filteredFactories = useMemo(() => {
    if (factoryStatusFilter === 'all') return factoryDirectory;
    return factoryDirectory.filter((f) => f.status === factoryStatusFilter);
  }, [factoryStatusFilter]);

  const productionSorted = useMemo(() => {
    return [...companyProduction]
      .filter((p) => p.shipped2025 != null || p.annualCapacity != null)
      .sort((a, b) => (b.annualCapacity ?? 0) - (a.annualCapacity ?? 0));
  }, []);

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

  const handleSelectCompany = useCallback((id: string) => {
    setCompanyId(id);
    setSearchOpen(false);
    setSearchQuery('');
    setCompanyChat('');
    setCompanyChatAnswer(null);
  }, []);

  const handleLike = useCallback((oemId: string) => {
    const removing = likedByMe.has(oemId);
    // Optimistic UI update
    setLikes((prev) => ({ ...prev, [oemId]: Math.max(0, (prev[oemId] || 0) + (removing ? -1 : 1)) }));
    setLikedByMe((prev) => {
      const next = new Set(prev);
      if (removing) next.delete(oemId); else next.add(oemId);
      try { localStorage.setItem('oem_likes', JSON.stringify([...next])); } catch { /* private browsing */ }
      return next;
    });
    fetch('/api/likes', {
      method: removing ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oemId }),
    })
      .then((r) => r.json())
      .then((data) => {
        // Server returned actual count - sync it (handles alreadyVoted case)
        if (typeof data.likes === 'number') {
          setLikes((prev) => ({ ...prev, [oemId]: data.likes }));
        }
        // If server says already voted, re-toggle the heart to "liked" state
        if (data.alreadyVoted) {
          setLikedByMe((prev) => {
            const next = new Set(prev);
            next.add(oemId);
            try { localStorage.setItem('oem_likes', JSON.stringify([...next])); } catch { /* */ }
            return next;
          });
        }
      })
      .catch(() => {});
  }, [likedByMe]);

  const handleBackFromCompany = () => {
    setCompanyId(null);
  };

  // ==================== COMPARISON VIEW ====================
  if (compareIds) {
    const [idA, idB] = compareIds;
    const compA = companies.find((c) => c.id === idA);
    const compB = companies.find((c) => c.id === idB);
    if (compA && compB) {
      const suppliersA = new Set(relationships.filter((r) => r.to === idA).map((r) => r.from));
      const suppliersB = new Set(relationships.filter((r) => r.to === idB).map((r) => r.from));
      const customersA = new Set(relationships.filter((r) => r.from === idA).map((r) => r.to));
      const customersB = new Set(relationships.filter((r) => r.from === idB).map((r) => r.to));
      const allA = new Set([...suppliersA, ...customersA]);
      const allB = new Set([...suppliersB, ...customersB]);
      const shared = [...allA].filter((id) => allB.has(id)).map((id) => companies.find((c) => c.id === id)?.name).filter(Boolean) as string[];
      const exclA = [...allA].filter((id) => !allB.has(id)).map((id) => companies.find((c) => c.id === id)?.name).filter(Boolean) as string[];
      const exclB = [...allB].filter((id) => !allA.has(id)).map((id) => companies.find((c) => c.id === id)?.name).filter(Boolean) as string[];

      const geoOf = (compId: string) => {
        const rels = relationships.filter((r) => r.to === compId || r.from === compId);
        const connIds = [...new Set(rels.map((r) => r.from === compId ? r.to : r.from))];
        const conns = connIds.map((id) => companies.find((c) => c.id === id)).filter(Boolean) as typeof companies;
        const total = conns.length || 1;
        const us = conns.filter((c) => c.country === 'US').length;
        const cn = conns.filter((c) => c.country === 'CN').length;
        return { us: Math.round((us / total) * 100), cn: Math.round((cn / total) * 100), other: Math.round(((total - us - cn) / total) * 100) };
      };
      const geoA = geoOf(idA);
      const geoB = geoOf(idB);

      // Fetch AI analysis
      if (!compareAnalysis && !compareLoading) {
        setCompareLoading(true);
        fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyA: { name: compA.name, country: compA.country, bom: compA.robotSpecs?.bom, price: compA.robotSpecs?.price, status: compA.robotSpecs?.status, shipments: compA.robotSpecs?.shipments2025, supplierCount: allA.size },
            companyB: { name: compB.name, country: compB.country, bom: compB.robotSpecs?.bom, price: compB.robotSpecs?.price, status: compB.robotSpecs?.status, shipments: compB.robotSpecs?.shipments2025, supplierCount: allB.size },
            shared, exclusiveA: exclA, exclusiveB: exclB, geoA, geoB,
          }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.analysis) setCompareAnalysis(d.analysis); })
          .catch(() => {})
          .finally(() => setCompareLoading(false));
      }

      const specRow = (label: string, valA: string | undefined, valB: string | undefined) => {
        if (!valA && !valB) return null;
        return { label, valA: valA || ' - ', valB: valB || ' - ' };
      };
      const specs = [
        specRow('BOM', compA.robotSpecs?.bom, compB.robotSpecs?.bom),
        specRow('Price', compA.robotSpecs?.price, compB.robotSpecs?.price),
        specRow('Status', compA.robotSpecs?.status, compB.robotSpecs?.status),
        specRow('Shipments', compA.robotSpecs?.shipments2025?.toLocaleString(), compB.robotSpecs?.shipments2025?.toLocaleString()),
        specRow('Height', compA.robotSpecs?.height, compB.robotSpecs?.height),
        specRow('Mass', compA.robotSpecs?.mass, compB.robotSpecs?.mass),
        specRow('DOF', compA.robotSpecs?.totalDOF, compB.robotSpecs?.totalDOF),
        specRow('Speed', compA.robotSpecs?.speed, compB.robotSpecs?.speed),
        specRow('Runtime', compA.robotSpecs?.operatingTime, compB.robotSpecs?.operatingTime),
      ].filter(Boolean) as { label: string; valA: string; valB: string }[];

      return (
        <div className="app">
          <header className="header">
            <button className="back-btn" onClick={() => { setCompareIds(null); setCompareAnalysis(null); }}>&larr;</button>
            <span className="header-title">{compA.name} <span className="compare-vs">vs</span> {compB.name}</span>
          </header>
          <main className="compare-view">
            <div className="compare-grid">
              <div className="compare-card" onClick={() => { setCompareIds(null); setCompareAnalysis(null); handleSelectCompany(idA); }}>
                {compA.robotImage && <img className="compare-card__image" src={compA.robotImage} alt={compA.name} />}
                <div className="compare-card__name">{compA.name}</div>
                <div className="compare-card__meta">{compA.country}</div>
                <div className="compare-card__specs">
                  {specs.map((s) => (
                    <div key={s.label} className="compare-card__spec">
                      <span className="compare-card__spec-label">{s.label}</span>
                      <span className="compare-card__spec-value">{s.valA}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="compare-card" onClick={() => { setCompareIds(null); setCompareAnalysis(null); handleSelectCompany(idB); }}>
                {compB.robotImage && <img className="compare-card__image" src={compB.robotImage} alt={compB.name} />}
                <div className="compare-card__name">{compB.name}</div>
                <div className="compare-card__meta">{compB.country}</div>
                <div className="compare-card__specs">
                  {specs.map((s) => (
                    <div key={s.label} className="compare-card__spec">
                      <span className="compare-card__spec-label">{s.label}</span>
                      <span className="compare-card__spec-value">{s.valB}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="compare-section">
              <div className="compare-section__title">Supply Chain Overlap</div>
              <div className="compare-overlap">
                <div className="compare-overlap__group">
                  <div className="compare-overlap__label">Shared ({shared.length})</div>
                  <div className="compare-overlap__list">{shared.join(', ') || 'None'}</div>
                </div>
                <div className="compare-overlap__group">
                  <div className="compare-overlap__label">{compA.name} only ({exclA.length})</div>
                  <div className="compare-overlap__list">{exclA.join(', ') || 'None'}</div>
                </div>
                <div className="compare-overlap__group">
                  <div className="compare-overlap__label">{compB.name} only ({exclB.length})</div>
                  <div className="compare-overlap__list">{exclB.join(', ') || 'None'}</div>
                </div>
              </div>
            </div>

            <div className="compare-section">
              <div className="compare-section__title">Geopolitical Exposure</div>
              <div className="compare-geo">
                {[{ name: compA.name, geo: geoA }, { name: compB.name, geo: geoB }].map((row) => (
                  <div key={row.name} className="compare-geo__row">
                    <span className="compare-geo__name">{row.name}</span>
                    <div className="compare-geo__bar">
                      {row.geo.us > 0 && <div className="compare-geo__seg" style={{ width: `${row.geo.us}%`, background: '#3b82f6' }} />}
                      {row.geo.cn > 0 && <div className="compare-geo__seg" style={{ width: `${row.geo.cn}%`, background: '#ef4444' }} />}
                      {row.geo.other > 0 && <div className="compare-geo__seg" style={{ width: `${row.geo.other}%`, background: '#888' }} />}
                    </div>
                    <span className="compare-geo__stats">US {row.geo.us}% · CN {row.geo.cn}% · Other {row.geo.other}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="compare-section">
              <div className="compare-section__title">AI Analysis</div>
              {compareLoading ? (
                <p className="compare-analysis" style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>Generating analysis...</p>
              ) : compareAnalysis ? (
                <p className="compare-analysis">{compareAnalysis}</p>
              ) : null}
            </div>
          </main>
          <footer className="footer">
            <span><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
          </footer>
        </div>
      );
    }
  }

  // ==================== COMPANY VIEW ====================
  if (companyId && selectedCompany) {
    const specs = selectedCompany.robotSpecs;
    const supplierRels = relationships.filter((r) => r.to === selectedCompany.id);
    const customerRels = relationships.filter((r) => r.from === selectedCompany.id);
    const isSupplier = selectedCompany.type !== 'oem';

    // Supplier-specific computed data
    const supplierAnalysis = isSupplier ? (() => {
      const oemList = companies.filter((c) => c.type === 'oem');
      const oemIds = new Set(oemList.map((c) => c.id));
      const totalOems = oemList.length;

      // Customer reach: which OEMs does this supplier serve?
      const oemCustomerRels = customerRels.filter((r) => oemIds.has(r.to));
      const oemCustomers = oemCustomerRels
        .map((r) => companies.find((c) => c.id === r.to))
        .filter(Boolean) as typeof companies;
      const uniqueOemCustomers = [...new Map(oemCustomers.map((c) => [c.id, c])).values()];
      const reachGroups: Record<string, typeof companies> = { US: [], CN: [], OTHER: [] };
      uniqueOemCustomers.forEach((c) => {
        reachGroups[getCountryGroup(c.country)].push(c);
      });

      // Alternative suppliers: same component category
      const componentLabel = SUPPLIER_COMPONENT_LABEL[selectedCompany.id] || null;
      const alternatives = componentLabel
        ? companies.filter((s) => {
            if (s.id === selectedCompany.id || s.type === 'oem') return false;
            if (SUPPLIER_COMPONENT_LABEL[s.id] !== componentLabel) return false;
            return relationships.some((r) => r.from === s.id && oemIds.has(r.to));
          }).map((s) => {
            const oemCount = [...new Set(
              relationships.filter((r) => r.from === s.id && oemIds.has(r.to)).map((r) => r.to)
            )].length;
            const components = [...new Set(
              relationships.filter((r) => r.from === s.id).map((r) => r.component)
            )];
            return { id: s.id, name: s.name, country: s.country, oemCount, component: components[0] || componentLabel };
          })
        : [];

      // Supply chain position: upstream → this → downstream
      const upstream = supplierRels
        .map((r) => companies.find((c) => c.id === r.from))
        .filter(Boolean) as typeof companies;
      const downstream = customerRels
        .map((r) => companies.find((c) => c.id === r.to))
        .filter(Boolean) as typeof companies;
      const uniqueDownstream = [...new Map(downstream.map((c) => [c.id, c])).values()];
      const uniqueUpstream = [...new Map(upstream.map((c) => [c.id, c])).values()];

      return {
        totalOems,
        oemCount: uniqueOemCustomers.length,
        reachGroups,
        componentLabel,
        alternatives,
        upstream: uniqueUpstream,
        downstream: uniqueDownstream,
      };
    })() : null;

    return (
      <div className="app">
        <header className="header">
          <button className="back-btn" onClick={handleBackFromCompany}>&larr;</button>
          <span className="header-title">{selectedCompany.name}</span>
          {selectedCompany.ticker && <span className="header-ticker">{selectedCompany.ticker}</span>}
          <span className="header-badge">{selectedCompany.country}</span>
        </header>

        <main className="company-view">
          <div className="company-ask">
            <input
              className="nl-query-input"
              type="text"
              placeholder={`Ask about ${selectedCompany.name}...`}
              value={companyChat}
              disabled={companyChatLoading}
              onChange={(e) => setCompanyChat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setCompanyChat(''); setCompanyChatAnswer(null); }
                if (e.key === 'Enter' && companyChat.trim() && !companyChatLoading) {
                  setCompanyChatLoading(true);
                  setCompanyChatAnswer(null);
                  const sRels = supplierRels.map((r) => {
                    const s = companies.find((c) => c.id === r.from);
                    return { fromName: s?.name, fromCountry: s?.country, component: r.component };
                  });
                  const cRels = customerRels.map((r) => {
                    const c = companies.find((x) => x.id === r.to);
                    return { toName: c?.name, toCountry: c?.country, component: r.component };
                  });
                  fetch('/api/company-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: companyChat.trim(),
                      company: { name: selectedCompany.name, country: selectedCompany.country, type: selectedCompany.type, description: selectedCompany.description, marketShare: selectedCompany.marketShare, ticker: selectedCompany.ticker, robotSpecs: selectedCompany.robotSpecs },
                      supplierRels: sRels,
                      customerRels: cRels,
                      allCompanies: companies.map((c) => ({ id: c.id, name: c.name, country: c.country, type: c.type })),
                    }),
                  })
                    .then((r) => r.json())
                    .then((d) => { if (d.answer) setCompanyChatAnswer(d.answer); })
                    .catch(() => {})
                    .finally(() => setCompanyChatLoading(false));
                }
              }}
            />
            {companyChatLoading && <span className="nl-query-status">Thinking...</span>}
            {companyChatAnswer && <div className="company-ask__answer">{companyChatAnswer}</div>}
          </div>
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

          {supplierAnalysis && (
            <>
              {supplierAnalysis.oemCount > 0 && (
                <div className="company-section">
                  <h3 className="section-title">Customer Reach</h3>
                  <div className="supplier-reach">
                    <div className="supplier-reach__bar">
                      <div className="supplier-reach__track">
                        <div
                          className="supplier-reach__fill"
                          style={{ width: `${(supplierAnalysis.oemCount / supplierAnalysis.totalOems) * 100}%` }}
                        />
                      </div>
                      <span className="supplier-reach__label">{supplierAnalysis.oemCount}/{supplierAnalysis.totalOems} OEMs</span>
                    </div>
                    <div className="supplier-reach__groups">
                      {(['US', 'CN', 'OTHER'] as const).map((g) => {
                        const group = supplierAnalysis.reachGroups[g];
                        if (group.length === 0) return null;
                        const label = g === 'US' ? 'US' : g === 'CN' ? 'CN' : 'Other';
                        return (
                          <div key={g} className="supplier-reach__group">
                            <span className="supplier-reach__group-label">{label} ({group.length}):</span>
                            <span className="supplier-reach__group-names">{group.map((c) => c.name).join(', ')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="company-section">
                <h3 className="section-title">Alternative Suppliers{supplierAnalysis.componentLabel ? ` - ${supplierAnalysis.componentLabel}` : ''}</h3>
                {supplierAnalysis.alternatives.length > 0 ? (
                  <div className="supplier-alts">
                    {supplierAnalysis.alternatives.map((alt) => (
                      <button key={alt.id} className="supplier-alts__row" onClick={() => handleSelectCompany(alt.id)}>
                        <span className="supplier-alts__name">{alt.name}</span>
                        <span className="supplier-alts__country">{alt.country}</span>
                        <span className="supplier-alts__component">{alt.component}</span>
                        <span className="supplier-alts__oems">{alt.oemCount} OEMs</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="supplier-alts--none">Sole supplier in dataset - no alternatives tracked</p>
                )}
              </div>

              {(thesisLoading || thesis) && (
                <div className="company-section">
                  <h3 className="section-title">Supply Chain Analysis</h3>
                  {thesisLoading ? (
                    <p className="scenario-desc" style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>Generating analysis...</p>
                  ) : (
                    <p className="scenario-desc">{thesis}</p>
                  )}
                </div>
              )}

            </>
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
                <Spec
                  label="In-House VLA Model"
                  value={linkedCompanyVlaModels
                    .filter(({ link }) => link.relationship === 'proprietary')
                    .map(({ model }) => model.name)
                    .join(', ')}
                />
                <Spec label="Software" value={specs.software} />
                <Spec label="Data Collection" value={specs.dataCollection} />
                {specs.bom && <Spec label="BOM" value={specs.bom} />}
                {specs.price && <Spec label="Price" value={specs.price} highlight />}
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <span><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
        </footer>
      </div>
    );
  }

  // ==================== CHANGELOG VIEW ====================
  if (location.pathname === '/changelog') {
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', height: 'auto', overflow: 'visible' }}>
        <Helmet>
          <title>Changelog | Humanoid Atlas</title>
          <meta name="description" content="Changelog for the Humanoid Atlas - major updates, new OEMs, tabs, and data additions." />
        </Helmet>
        <button className="back-btn" onClick={() => navigate('/')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
          <span className="back-arrow">&larr;</span>
        </button>
        <main className="main" style={{ maxWidth: 600, margin: '0 auto', padding: '6rem 2rem 8rem' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>Changelog</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '3.5rem' }}>View more on the open source Atlas <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>repo</a></p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.8rem' }}>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 23, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added LLM summaries of Atlas</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 22, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added interactive skeleton with clickable body regions and component sidebar</li>
                <li>Added CLI documentation tab</li>
                <li>Mobile UX polish - horizontal scroll on tab nav, filter spacing, focus states</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 21, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added API documentation tab with 7 sub-tabs</li>
                <li>Added data package build for API consumption</li>
                <li>Added Data Sources page</li>
                <li>Added 8 new OEMs - PAL, Ameca, Reachy 2, Clone, Qinglong, Unitree H2, Mentee Robotics, Booster K1</li>
                <li>Added 3 new hand suppliers - Shadow Robot, ORCA Dexterity, ROBOTIS</li>
                <li>Updated Unitree data - IPO filing, 5.5K shipments, financials</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 20, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added Safety &amp; Standards tab - 10 standards, 12 OEM safety profiles</li>
                <li>Added Sim Platforms tab - 13 platforms with capability matrix</li>
                <li>Added Factories tab</li>
                <li>Added Industry tab group with Funding tab - 26 companies, 12 investors</li>
                <li>Added SEO/GEO - path-based routing, meta tags, structured data, sitemap, llms.txt</li>
                <li>Added World Models tab - 17 models across 4 categories</li>
                <li>Added HRI tab group with Displays tab - 17 head/face designs</li>
                <li>Added Viz Tools tab - 10 tools across 4 categories</li>
                <li>Added Vanar Robots - first Indian OEM</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 19, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added Robometer scores for all reward models</li>
                <li>Added Reward Models tab - 10 curated models under Software</li>
                <li>Added tab grouping - Overview, Hardware, Software</li>
                <li>Added Fauna Robotics (Sprout) as new OEM</li>
                <li>Added OEM like/unlike voting with heart button</li>
                <li>Added Japan and South Korea country filters</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 18, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added 11 new humanoid OEMs</li>
                <li>Added VLA tab - 20 vision-language-action models with OEM links, search &amp; filters</li>
                <li>Open-sourced repository - CONTRIBUTING guide, issue/PR templates, CI</li>
                <li>Optimized images - PNG to WebP conversion</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 17, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Public release</li>
                <li>Added 15 new humanoid OEMs with enriched specs</li>
                <li>Fixed open API proxy vulnerability - restricted CORS and sanitized errors</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 16, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Added competitive comparison view</li>
                <li>Added AI features via Groq - smart search, scenario analysis, investment thesis, graph query</li>
                <li>Added Timeline tab with swim-lane OEM launch history</li>
                <li>Added Network graph tab with column-based supply chain layout</li>
                <li>Added BOM &amp; Cost Analysis</li>
                <li>Added Supply Chain Simulator with named scenarios and cascade logic</li>
                <li>Added Geopolitics - Single Points of Failure analysis</li>
                <li>Expanded atlas - 3 new OEMs, supplier enrichment, 16 new relationships</li>
              </ul>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>March 15, 2026</span>
              <ul style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.5rem', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <li>Initial build - supply chain explorer for humanoid robotics</li>
                <li>Tab-based navigation with supply chain data for all components</li>
                <li>3D PLY models with per-model spin speed and scale normalization</li>
                <li>Robot image gallery for all 13 humanoids</li>
                <li>Geopolitics features - country filter, sovereignty scoreboard, cut the wire</li>
                <li>Mobile responsive design</li>
                <li>Live page view counter and analytics</li>
              </ul>
            </div>

          </div>
        </main>
        <footer className="footer" style={{ marginTop: 'auto' }}>
          <span><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
        </footer>
      </div>
    );
  }

  // ==================== SOURCES VIEW ====================
  if (location.pathname === '/sources') {
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', height: 'auto', overflow: 'visible' }}>
        <Helmet>
          <title>Data Sources | Humanoid Atlas</title>
          <meta name="description" content="Data sources powering the Humanoid Atlas - OEM specs, supply chain data, and industry intelligence." />
        </Helmet>
        <button className="back-btn" onClick={() => navigate('/')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
          <span className="back-arrow">&larr;</span>
        </button>
        <main className="main" style={{ maxWidth: 600, margin: '0 auto', padding: '6rem 2rem 8rem' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '3.5rem', color: 'var(--text-primary)' }}>Data Sources</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2rem' }}>
            <div>
              <a href="https://www.humanityslastmachine.com/humanoid-landscape" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Humanity&apos;s Last Machine</a>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>A deep dive on humanoid hardware</p>
            </div>
            <div>
              <a href="https://www.robostrategy.co/" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>RoboStrategy</a>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Fund focused on robotics</p>
            </div>
            <div>
              <a href="https://www.integrarobot.com" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>integrarobot.com</a>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Weekly robotics newsletter</p>
            </div>
            <div>
              <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Community Contributions</a>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.3rem' }}>Open-source contributions from the humanoid community</p>
            </div>
          </div>
        </main>
        <footer className="footer" style={{ marginTop: 'auto' }}>
          <span><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
        </footer>
      </div>
    );
  }

  // ==================== MAIN VIEW (tabs) ====================
  const tabMeta = TAB_META[activeTab] || TAB_META.skeleton;

  return (
    <div className="app">
      <Helmet>
        <title>{tabMeta.title}</title>
        <meta name="description" content={tabMeta.description} />
        <link rel="canonical" href={`https://www.humanoids.fyi${TAB_TO_PATH[activeTab] || '/'}`} />
        <meta property="og:title" content={tabMeta.title} />
        <meta property="og:description" content={tabMeta.description} />
        <meta property="og:url" content={`https://www.humanoids.fyi${TAB_TO_PATH[activeTab] || '/'}`} />
      </Helmet>
      <header className="header">
        <span className="header-title">Humanoid Atlas</span>
        <span className="header-sub">Built For Humanoid Enthusiasts</span>
        <div className="search-wrapper" ref={searchRef}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search & ask the atlas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
              setSmartAnswer(null);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); setSmartAnswer(null); }
              if (e.key === 'Enter') {
                // Detect "compare X vs Y" pattern
                const compareMatch = searchQuery.trim().match(/^compare\s+(.+?)\s+(?:vs\.?|versus)\s+(.+)$/i);
                if (compareMatch) {
                  const nameA = compareMatch[1].trim().toLowerCase();
                  const nameB = compareMatch[2].trim().toLowerCase();
                  const compA = companies.find((c) => c.name.toLowerCase().includes(nameA));
                  const compB = companies.find((c) => c.name.toLowerCase().includes(nameB));
                  if (compA && compB) {
                    setCompareIds([compA.id, compB.id]);
                    setCompareAnalysis(null);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }
                } else if (isNlQuery && searchQuery.trim() && !smartLoading) {
                  setSmartLoading(true);
                  setSmartAnswer(null);
                  fetch('/api/smart-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      query: searchQuery.trim(),
                      companies: companies.map((c) => ({ id: c.id, name: c.name, country: c.country, type: c.type, marketShare: c.marketShare })),
                      relationships: relationships.map((r) => ({ from: r.from, to: r.to, component: r.component })),
                    }),
                  })
                    .then((r) => r.json())
                    .then((d) => { if (d.answer) setSmartAnswer(d); })
                    .catch(() => {})
                    .finally(() => setSmartLoading(false));
                } else if (searchResults.length > 0) {
                  handleSelectCompany(searchResults[0].id);
                } else if (vlaSearchResults.length > 0) {
                  navigate(TAB_TO_PATH['vlas']); setChainFocus(vlaSearchResults[0].id); setSearchOpen(false); setSearchQuery('');
                }
              }
            }}
          />
          {searchOpen && searchQuery.trim() && (
            <div className="search-dropdown">
              {smartLoading ? (
                <div className="search-empty">Searching...</div>
              ) : smartAnswer ? (
                <>
                  <div className="search-answer">{smartAnswer.answer}</div>
                  {smartCompanies.map((c) => (
                    <div key={c.id} className="search-result" onClick={() => handleSelectCompany(c.id)}>
                      <span className="search-result__name">{c.name}</span>
                      <span className="search-result__meta">
                        <span>{c.country}</span>
                        <span>&middot;</span>
                        <span className="search-result__type">{TYPE_DISPLAY[c.type] || c.type}</span>
                      </span>
                    </div>
                  ))}
                </>
              ) : isCompareQuery ? (
                <div className="search-empty">Press Enter to compare</div>
              ) : isNlQuery ? (
                <div className="search-empty">Press Enter to search</div>
              ) : searchResults.length > 0 || vlaSearchResults.length > 0 ? (
                <>
                  {searchResults.map((c) => (
                    <div key={c.id} className="search-result" onClick={() => handleSelectCompany(c.id)}>
                      <span className="search-result__name">{c.name}</span>
                      <span className="search-result__meta">
                        <span>{c.country}</span>
                        <span>&middot;</span>
                        <span className="search-result__type">{TYPE_DISPLAY[c.type] || c.type}</span>
                      </span>
                    </div>
                  ))}
                  {vlaSearchResults.map((m) => (
                    <div key={m.id} className="search-result" onClick={() => { navigate(TAB_TO_PATH['vlas']); setChainFocus(m.id); setSearchOpen(false); setSearchQuery(''); }}>
                      <span className="search-result__name">{m.name}</span>
                      <span className="search-result__meta">
                        <span>{m.country}</span>
                        <span>&middot;</span>
                        <span className="search-result__type">VLA · {m.developer}</span>
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-empty">No results</div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="filter-bar">
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
            className={`country-pill ${countryFilter === 'JP' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'JP' ? null : 'JP')}
          >Japan</button>
          <button
            className={`country-pill ${countryFilter === 'KR' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'KR' ? null : 'KR')}
          >S. Korea</button>
          <button
            className={`country-pill ${countryFilter === 'OTHER' ? 'country-pill--active' : ''}`}
            onClick={() => setCountryFilter(countryFilter === 'OTHER' ? null : 'OTHER')}
          >Other</button>
        </div>

        <div className="filter-bar__separator"></div>

        <div className="tab-group-nav">
          {TAB_GROUPS.map((g) => (
            <Fragment key={g.id}>
              {g.id === 'cli' && <div className="filter-bar__separator" />}
              <button
                className={`tab-group-pill ${activeTabGroup === g.id ? 'tab-group-pill--active' : ''}`}
                onClick={() => {
                  const firstTab = TABS.find((t) => t.group === g.id);
                  if (firstTab) { navigate(TAB_TO_PATH[firstTab.id] || '/'); setChainFocus(null); }
                }}
              >{g.label}</button>
            </Fragment>
          ))}
        </div>
      </div>

      <nav className="component-nav">
        {TABS.filter((t) => t.group === activeTabGroup).filter((t) => t.id !== 'account' || clerkSignedIn).map((t) => {
          return (
            <button
              key={t.id}
              className={`component-btn ${activeTab === t.id ? 'component-btn--active' : ''}`}
              onClick={() => { navigate(TAB_TO_PATH[t.id] || '/'); setChainFocus(null); }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <main className={activeTabGroup === 'data' ? 'component-view' : activeTabGroup === 'cli' ? 'component-view' : activeTabGroup === 'api' ? 'component-view' : activeTab === 'skeleton' ? 'skeleton-view' : activeTab === 'network' ? 'skeleton-view' : activeTab === 'timeline' ? 'geo-view' : activeTab === 'geopolitics' ? 'geo-view' : activeTab === 'funding' ? 'geo-view' : activeTab === 'factories' ? 'geo-view' : 'component-view'}>
        {/* Skeleton tab */}
        {activeTab === 'skeleton' && (
          <div className={`skeleton-interactive${skeletonRegion && skeletonSidebarOpen && !isMobile ? ' skeleton-interactive--sidebar-open' : ''}`}>
            {!isMobile && !skeletonRegion && (
              <div className="skeleton-prompt">Click a region of the humanoid to explore more</div>
            )}
            <div className="skeleton-center">
              <PLYViewer
                modelUrl="/models/skeleton.ply"
                color="#1a1a1a"
                initialRotation={MODEL_ROTATIONS['/models/skeleton.ply']}
                spinSpeed={isMobile ? MODEL_SPIN['/models/skeleton.ply'] : 0}
                interactive={!isMobile}
                regions={SKELETON_REGIONS}
                selectedRegion={skeletonRegion}
                onRegionClick={(regionId) => {
                  setSkeletonRegion(regionId);
                  const region = SKELETON_REGIONS.find(r => r.id === regionId);
                  if (region) setSkeletonPill(region.componentIds[0]);
                  setSkeletonSidebarOpen(true);
                }}
              />
            </div>
            {!isMobile && skeletonRegion && skeletonSidebarOpen && (() => {
              const activeSkeletonRegion = SKELETON_REGIONS.find(r => r.id === skeletonRegion);
              if (!activeSkeletonRegion) return null;
              const selectedOemCompany = skeletonOem ? companies.find(c => c.id === skeletonOem) : null;
              return (
                <div className="skeleton-sidebar">
                  <div className="skeleton-sidebar__header">
                    <span className="skeleton-sidebar__region-label">{activeSkeletonRegion.label}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="back-btn" onClick={() => setSkeletonSidebarOpen(false)} title="Collapse sidebar">
                        <span>&rsaquo;</span>
                      </button>
                      <button className="back-btn" onClick={() => { setSkeletonRegion(null); setSkeletonPill(null); }} title="Close">
                        <span>&times;</span>
                      </button>
                    </div>
                  </div>

                  <div className="skeleton-sidebar__pills">
                    {activeSkeletonRegion.componentIds.map(cid => {
                      const comp = componentCategories.find(c => c.id === cid);
                      if (!comp) return null;
                      return (
                        <button
                          key={cid}
                          className={`country-pill${skeletonPill === cid ? ' country-pill--active' : ''}`}
                          onClick={() => setSkeletonPill(cid)}
                        >
                          {comp.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="skeleton-sidebar__body">
                    {skeletonComponent && (
                      <>
                        <h3 className="skeleton-sidebar__component-name">{skeletonComponent.name}</h3>
                        <p className="skeleton-sidebar__description">{skeletonComponent.description}</p>

                        {skeletonComponent.bottleneck && skeletonComponent.bottleneckReason && (
                          <div className="skeleton-sidebar__bottleneck">
                            <span className="skeleton-sidebar__section-label">Supply Chain Bottleneck</span>
                            <p className="skeleton-sidebar__bottleneck-reason">{skeletonComponent.bottleneckReason}</p>
                          </div>
                        )}

                        {skeletonComponent.keyMetrics && Object.keys(skeletonComponent.keyMetrics).length > 0 && (
                          <div className="skeleton-sidebar__section">
                            <span className="skeleton-sidebar__section-label">Key Metrics</span>
                            <div className="skeleton-sidebar__metrics">
                              {Object.entries(skeletonComponent.keyMetrics).map(([k, v]) => (
                                <div key={k} className="skeleton-sidebar__metric-row">
                                  <span className="skeleton-sidebar__metric-label">{k}</span>
                                  <span className="skeleton-sidebar__metric-value">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {skeletonChain && skeletonChain.suppliers.length > 0 && (
                          <div className="skeleton-sidebar__section">
                            <span className="skeleton-sidebar__section-label">Suppliers</span>
                            <div className="skeleton-sidebar__supplier-list">
                              {skeletonChain.suppliers.map(s => (
                                <div key={s!.id} className="skeleton-sidebar__supplier-row" onClick={() => { setCompanyId(s!.id); }}>
                                  <span className="skeleton-sidebar__supplier-name">{s!.name}</span>
                                  <span className="skeleton-sidebar__supplier-meta">{s!.country}{s!.marketShare ? ` - ${s!.marketShare}` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {skeletonChain && (
                          <div className="skeleton-sidebar__section">
                            <span className="skeleton-sidebar__section-label">Supply Chain</span>
                            <div className="skeleton-sidebar__chain-summary">
                              {skeletonChain.upstream.length > 0 && (
                                <span className="skeleton-sidebar__chain-tier">{skeletonChain.upstream.length} Raw Materials</span>
                              )}
                              {skeletonChain.upstream.length > 0 && <span className="skeleton-sidebar__chain-arrow">&rarr;</span>}
                              <span className="skeleton-sidebar__chain-tier">{skeletonChain.suppliers.length} Suppliers</span>
                              <span className="skeleton-sidebar__chain-arrow">&rarr;</span>
                              <span className="skeleton-sidebar__chain-tier">{skeletonChain.oems.length} OEMs</span>
                            </div>
                          </div>
                        )}

                        {TAB_TO_PATH[skeletonPill!] && (
                          <button
                            className="skeleton-sidebar__nav-link"
                            onClick={() => navigate(TAB_TO_PATH[skeletonPill!])}
                          >
                            View full {skeletonComponent.name} tab &rarr;
                          </button>
                        )}

                        <div className="skeleton-sidebar__section" style={{ marginTop: '20px' }}>
                          <span className="skeleton-sidebar__section-label">OEM View</span>
                          <select
                            className="skeleton-sidebar__oem-select"
                            value={skeletonOem || ''}
                            onChange={(e) => setSkeletonOem(e.target.value || null)}
                          >
                            <option value="">Select an OEM...</option>
                            {oems.map(o => (
                              <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                          </select>

                          {selectedOemCompany && selectedOemCompany.robotSpecs && skeletonPill && (
                            <div className="skeleton-sidebar__oem-data">
                              <span className="skeleton-sidebar__oem-name">{selectedOemCompany.name}</span>
                              {(COMPONENT_SPEC_FIELDS[skeletonPill] || []).map(({ field, label }) => {
                                const val = selectedOemCompany.robotSpecs?.[field];
                                if (!val || val === 'Not disclosed') return null;
                                const display = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                                return (
                                  <div key={field} className="skeleton-sidebar__metric-row">
                                    <span className="skeleton-sidebar__metric-label">{label}</span>
                                    <span className="skeleton-sidebar__metric-value">{display}</span>
                                  </div>
                                );
                              })}
                              {skeletonChain && (() => {
                                const oemRels = skeletonChain.rels.filter(r => r.to === skeletonOem);
                                if (oemRels.length === 0) return <p className="skeleton-sidebar__no-data">No supply chain data for this OEM</p>;
                                return (
                                  <div className="skeleton-sidebar__section" style={{ marginTop: '8px' }}>
                                    <span className="skeleton-sidebar__section-label">Suppliers Used</span>
                                    <div className="skeleton-sidebar__supplier-list">
                                    {oemRels.map(r => {
                                      const sup = companies.find(c => c.id === r.from);
                                      return sup ? (
                                        <div key={r.id} className="skeleton-sidebar__supplier-row" onClick={() => setCompanyId(sup.id)}>
                                          <span className="skeleton-sidebar__supplier-name">{sup.name}</span>
                                          <span className="skeleton-sidebar__supplier-meta">{r.component}</span>
                                        </div>
                                      ) : null;
                                    })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {selectedOemCompany && !selectedOemCompany.robotSpecs && (
                            <p className="skeleton-sidebar__no-data">No spec data available for {selectedOemCompany.name}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
            {!isMobile && skeletonRegion && !skeletonSidebarOpen && (
              <button
                className="skeleton-sidebar__reopen back-btn"
                onClick={() => setSkeletonSidebarOpen(true)}
                title="Open sidebar"
              >
                <span>&lsaquo;</span>
              </button>
            )}
          </div>
        )}

        {/* All OEMs tab */}
        {activeTab === 'all_oems' && (() => {
          const bomData = getBOMData();
          return (
            <div className="oems-view">
              <div className="oem-image-grid">
                {sortedOems.map((c) => (
                  <div key={c.id} className={`oem-image-card ${countryFilter && getCountryFilterGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`} onClick={() => handleSelectCompany(c.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') handleSelectCompany(c.id); }}>
                    <div className="oem-image-card__img">
                      {c.robotImage ? (
                        <img src={c.robotImage} alt={c.name} />
                      ) : (
                        <div className="oem-image-card__placeholder" />
                      )}
                    </div>
                    <div className="oem-image-card__info">
                      <span className="oem-image-card__name">{c.name}</span>
                      <button
                        className={`oem-heart oem-heart--inline ${likedByMe.has(c.id) ? 'liked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handleLike(c.id); }}
                        aria-label={likedByMe.has(c.id) ? 'Liked' : 'Like'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill={likedByMe.has(c.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                        <span className="oem-heart__count">{likes[c.id] || 0}</span>
                      </button>
                      <span className="oem-image-card__country">{c.country}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bom-section">
                <h3 className="section-title">BOM & Cost Analysis</h3>

                <div className="bom-subsection">
                  <h4 className="cut-subtitle">OEM Price & BOM Comparison</h4>
                  <div className="bom-list">
                    {bomData.rows.map((row) => (
                      <div key={row.id} className="bom-row" onClick={() => handleSelectCompany(row.id)}>
                        <span className="bom-row__country">{row.country}</span>
                        <span className="bom-row__name">{row.name}</span>
                        <div className="bom-row__bars">
                          {row.bomK !== null && (
                            <div
                              className="bom-row__bom"
                              style={{ width: `${(row.bomK / bomData.maxK) * 100}%` }}
                            />
                          )}
                          {row.priceK !== null && (
                            <div
                              className="bom-row__price"
                              style={{ left: `${(row.priceK / bomData.maxK) * 100}%` }}
                            />
                          )}
                        </div>
                        <div className="bom-row__labels">
                          {row.bomK !== null && (
                            <span className="bom-row__bom-label">${row.bomK}K BOM</span>
                          )}
                          {row.priceK !== null && (
                            <span className="bom-row__price-label">${row.priceK}K price</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bom-legend">
                    <span className="bom-legend__item"><span className="bom-legend__bar bom-legend__bar--bom" /> BOM</span>
                    <span className="bom-legend__item"><span className="bom-legend__bar bom-legend__bar--price" /> Price</span>
                  </div>
                </div>

                <div className="bom-subsection">
                  <h4 className="cut-subtitle">Rotary Actuator Cost Breakdown</h4>
                  <p className="bom-note">Each humanoid uses ~20 rotary actuators. The reducer alone is 36% of each unit's cost - the single biggest cost driver.</p>
                  <div className="actuator-waterfall">
                    <div className="actuator-bar">
                      {bomData.actuatorBreakdown.map((seg) => (
                        <div
                          key={seg.id}
                          className={`actuator-seg actuator-seg--${seg.id}`}
                          style={{ width: `${seg.pct}%` }}
                        >
                          {seg.pct >= 10 && `${seg.pct}%`}
                        </div>
                      ))}
                    </div>
                    <div className="actuator-legend">
                      {bomData.actuatorBreakdown.map((seg) => (
                        <span key={seg.id} className="actuator-legend__item">
                          <span className={`actuator-legend__dot actuator-seg--${seg.id}`} />
                          {seg.label} ({seg.pct}%)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Funding tab */}
        {activeTab === 'funding' && (() => {
          // Shared linear scale - exclude mega-cap outliers (>$100B)
          // so diversified public companies don't crush the scale
          const scaleMax = Math.max(
            ...filteredFunding.map((f) => f.totalRaisedM ?? 0),
            ...filteredFunding
              .filter((f) => (f.latestValuationM ?? 0) <= 100000)
              .map((f) => f.latestValuationM ?? 0),
          );
          const pct = (v: number) => Math.min((v / scaleMax) * 100, 99);

          const getFundingStatusLabel = (s: FundingStatus) => {
            switch (s) {
              case 'private': return 'Private';
              case 'public': return 'Public';
              case 'ipo-filed': return 'IPO Filed';
              case 'acquired': return 'Acquired';
              case 'subsidiary': return 'Subsidiary';
            }
          };

          const formatAmount = (m: number) => {
            if (m >= 1000000) return `$${(m / 1000000).toFixed(1)}T`;
            if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
            return `$${Math.round(m)}M`;
          };

          return (
            <div className="geo-content">
              <section className="geo-section">
                <div className="supply-chain__header">
                  <h3 className="section-title">Funding & Valuation</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${fundingStatusFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setFundingStatusFilter('all')}>All</button>
                    <button className={`country-pill ${fundingStatusFilter === 'private' ? 'country-pill--active' : ''}`} onClick={() => setFundingStatusFilter(fundingStatusFilter === 'private' ? 'all' : 'private')}>Private</button>
                    <button className={`country-pill ${fundingStatusFilter === 'public' ? 'country-pill--active' : ''}`} onClick={() => setFundingStatusFilter(fundingStatusFilter === 'public' ? 'all' : 'public')}>Public</button>
                    <button className={`country-pill ${fundingStatusFilter === 'subsidiary' ? 'country-pill--active' : ''}`} onClick={() => setFundingStatusFilter(fundingStatusFilter === 'subsidiary' ? 'all' : 'subsidiary')}>Subsidiary</button>
                    <button className={`country-pill ${fundingStatusFilter === 'acquired' ? 'country-pill--active' : ''}`} onClick={() => setFundingStatusFilter(fundingStatusFilter === 'acquired' ? 'all' : 'acquired')}>Acquired</button>
                  </div>
                </div>
                <div className="funding-list">
                  {fundingSortedByRaised.map((f) => (
                    <div
                      key={f.companyId}
                      className={`funding-row ${countryFilter && getCountryFilterGroup(f.country) !== countryFilter ? 'geo-dim' : ''}`}
                      onClick={() => handleSelectCompany(f.companyId)}
                    >
                      <span className="funding-row__country">{f.country}</span>
                      <span className="funding-row__name">{f.name}</span>
                      <span className="funding-row__status">{getFundingStatusLabel(f.status)}</span>
                      <div className="funding-row__bars">
                        {f.totalRaisedM != null && (
                          <div
                            className="funding-row__raised"
                            style={{ width: `${pct(f.totalRaisedM)}%` }}
                          />
                        )}
                        {f.latestValuationM != null && (
                          <div
                            className="funding-row__valuation"
                            style={{ left: `${pct(f.latestValuationM)}%` }}
                          />
                        )}
                      </div>
                      <div className="funding-row__labels">
                        {f.totalRaisedM != null && (
                          <span className="funding-row__raised-label">{formatAmount(f.totalRaisedM)} raised</span>
                        )}
                        {f.latestValuationM != null && (
                          <span className="funding-row__val-label">{formatAmount(f.latestValuationM)} val{f.latestValuationNote ? '*' : ''}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="funding-legend">
                  <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--raised" /> Raised</span>
                  <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--val" /> Valuation</span>
                </div>
                <div className="funding-footnote">* analyst estimate / IPO target / acquisition price</div>
              </section>

              <section className="geo-section">
                <div className="supply-chain__header">
                  <h3 className="section-title">Top Investors</h3>
                </div>
                <div className="funding-investors">
                  {topInvestors.map((inv) => (
                    <div key={inv.id} className="funding-investor-card">
                      <div className="funding-investor-card__header">
                        <span className="funding-investor-card__name">{inv.name}</span>
                        <span className="funding-investor-card__meta">{inv.country} / {inv.type}</span>
                      </div>
                      <div className="funding-investor-card__portfolio">
                        {inv.portfolioCompanyIds.map((cid) => {
                          const cf = companyFunding.find((f) => f.companyId === cid);
                          return (
                            <button
                              key={cid}
                              className="funding-investor-card__company"
                              onClick={() => handleSelectCompany(cid)}
                            >
                              {cf?.name || cid}
                            </button>
                          );
                        })}
                      </div>
                      <p className="funding-investor-card__desc">{inv.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })()}

        {/* Factories tab */}
        {activeTab === 'factories' && (() => {
          // Shared linear scale - exclude Tesla's 10M aspirational capacity
          const scaleMax = Math.max(
            ...productionSorted.map((p) => p.shipped2025 ?? 0),
            ...productionSorted
              .filter((p) => (p.annualCapacity ?? 0) <= 100000)
              .map((p) => p.annualCapacity ?? 0),
          );
          const pct = (v: number) => Math.min((v / scaleMax) * 100, 99);

          const getFactoryStatusLabel = (s: FactoryStatus) => {
            switch (s) {
              case 'operational': return 'Operational';
              case 'under-construction': return 'Under Construction';
              case 'planned': return 'Planned';
              case 'pre-production': return 'Pre-Production';
              case 'trials': return 'Trials';
            }
          };

          const getMfgModelLabel = (m: string) => {
            switch (m) {
              case 'in-house': return 'In-House';
              case 'contract': return 'Contract';
              case 'partner': return 'Partner';
              case 'vertically-integrated': return 'Vert. Integrated';
              default: return m;
            }
          };

          const formatUnits = (n: number) => {
            if (n >= 1000000) return `${(n / 1000000).toFixed(0)}M/yr`;
            if (n >= 1000) return `${(n / 1000).toFixed(0)}K/yr`;
            return `${n}/yr`;
          };

          return (
            <div className="geo-content">
              <section className="geo-section">
                <div className="supply-chain__header">
                  <h3 className="section-title">Production Capacity</h3>
                </div>
                <div className="funding-list">
                  {productionSorted.map((p) => (
                    <div
                      key={p.companyId}
                      className={`funding-row ${countryFilter && getCountryFilterGroup(p.country) !== countryFilter ? 'geo-dim' : ''}`}
                      onClick={() => handleSelectCompany(p.companyId)}
                    >
                      <span className="funding-row__country">{p.country}</span>
                      <span className="funding-row__name">{p.name}</span>
                      <span className="funding-row__status">{getMfgModelLabel(p.mfgModel)}</span>
                      <div className="funding-row__bars">
                        {p.shipped2025 != null && (
                          <div
                            className="funding-row__raised"
                            style={{ width: `${pct(p.shipped2025)}%` }}
                          />
                        )}
                        {p.annualCapacity != null && (
                          <div
                            className="funding-row__valuation"
                            style={{ left: `${pct(p.annualCapacity)}%` }}
                          />
                        )}
                      </div>
                      <div className="funding-row__labels">
                        {p.shipped2025 != null && (
                          <span className="funding-row__raised-label">{p.shipped2025.toLocaleString()} shipped</span>
                        )}
                        {p.shipped2025 == null && p.shipped2025Note && (
                          <span className="funding-row__raised-label">{p.shipped2025Note}</span>
                        )}
                        {p.annualCapacity != null && (
                          <span className="funding-row__val-label">{formatUnits(p.annualCapacity)} capacity{p.capacityNote ? '*' : ''}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="funding-legend">
                  <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--raised" /> 2025 Shipped</span>
                  <span className="funding-legend__item"><span className="funding-legend__bar funding-legend__bar--val" /> Capacity</span>
                </div>
                <div className="funding-footnote">* see capacity notes in data</div>
              </section>

              <section className="geo-section">
                <div className="supply-chain__header">
                  <h3 className="section-title">Factory Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${factoryStatusFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setFactoryStatusFilter('all')}>All</button>
                    <button className={`country-pill ${factoryStatusFilter === 'operational' ? 'country-pill--active' : ''}`} onClick={() => setFactoryStatusFilter(factoryStatusFilter === 'operational' ? 'all' : 'operational')}>Operational</button>
                    <button className={`country-pill ${factoryStatusFilter === 'under-construction' ? 'country-pill--active' : ''}`} onClick={() => setFactoryStatusFilter(factoryStatusFilter === 'under-construction' ? 'all' : 'under-construction')}>Under Construction</button>
                    <button className={`country-pill ${factoryStatusFilter === 'planned' ? 'country-pill--active' : ''}`} onClick={() => setFactoryStatusFilter(factoryStatusFilter === 'planned' ? 'all' : 'planned')}>Planned</button>
                    <button className={`country-pill ${factoryStatusFilter === 'pre-production' ? 'country-pill--active' : ''}`} onClick={() => setFactoryStatusFilter(factoryStatusFilter === 'pre-production' ? 'all' : 'pre-production')}>Pre-Production</button>
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Factories</div>
                    {filteredFactories.map((f) => (
                      <button
                        key={f.id}
                        className={`chain-entity ${countryFilter && getCountryFilterGroup(f.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => handleSelectCompany(f.companyId)}
                      >
                        <span className="chain-name">{f.name}</span>
                        <span className="chain-country">{f.country}</span>
                        <span className="chain-share">
                          {f.companyName} · {f.location} · {getFactoryStatusLabel(f.status)}{f.sizeSqft ? ` · ${f.sizeSqft}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="geo-section">
                <div className="supply-chain__header">
                  <h3 className="section-title">Manufacturing Partners</h3>
                </div>
                <div className="funding-investors">
                  {manufacturingPartners.map((mp) => (
                    <div key={mp.id} className="funding-investor-card">
                      <div className="funding-investor-card__header">
                        <span className="funding-investor-card__name">{mp.name}</span>
                        <span className="funding-investor-card__meta">{mp.country} / {mp.type}</span>
                      </div>
                      <div className="funding-investor-card__portfolio">
                        {mp.partnerCompanyIds.map((cid) => {
                          const cp = companyProduction.find((p) => p.companyId === cid);
                          return (
                            <button
                              key={cid}
                              className="funding-investor-card__company"
                              onClick={() => handleSelectCompany(cid)}
                            >
                              {cp?.name || cid}
                            </button>
                          );
                        })}
                      </div>
                      <p className="funding-investor-card__desc">{mp.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          );
        })()}

        {/* Geopolitics tab */}
        {activeTab === 'geopolitics' && (() => {
          const sovereignty = getSovereigntyData();
          const oemNationality = getOemNationalityData();
          const scoreboard = getScoreboardData();
          const cutImpact = getUnifiedImpact(cutCountries, cutCompanies);
          const { spofRows } = getSPOFData();
          return (
            <div className="geo-content">
              <section className="geo-section">
                <h3 className="section-title">US vs China vs Rest - Scoreboard</h3>
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
                <h3 className="section-title">Stack Sovereignty - Supplier Origin by Component</h3>
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
                <h3 className="section-title">Critical Suppliers - Single Points of Failure</h3>
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
                          ? 'None in dataset - sole supplier'
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
                <h3 className="section-title">OEM Supply Chain Dependency - Supplier Origin per OEM</h3>
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
                <h3 className="section-title">Supply Chain Simulator</h3>

                <div className="scenario-presets">
                  {SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      className={`scenario-btn ${activeScenarios.has(s.id) ? 'scenario-btn--active' : ''}`}
                      onClick={() => {
                        const next = new Set(activeScenarios);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        setActiveScenarios(next);
                        // Merge all active scenario cuts
                        const allCutCompanies = new Set<string>();
                        const allCutCountries = new Set<string>();
                        next.forEach((sid) => {
                          const sc = SCENARIOS.find((x) => x.id === sid);
                          if (sc) {
                            sc.cutCompanies.forEach((c) => allCutCompanies.add(c));
                            sc.cutCountries.forEach((c) => allCutCountries.add(c));
                          }
                        });
                        setCutCompanies(allCutCompanies);
                        setCutCountries(allCutCountries);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="nl-query-wrapper">
                  <input
                    className="nl-query-input"
                    type="text"
                    placeholder="Describe a scenario... e.g. &quot;What if Japan bans reducer exports?&quot;"
                    value={nlQuery}
                    onChange={(e) => setNlQuery(e.target.value)}
                    disabled={nlParsing}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setNlQuery(''); }
                      if (e.key === 'Enter' && nlQuery.trim() && !nlParsing) {
                        setNlParsing(true);
                        setActiveScenarios(new Set());
                        fetch('/api/scenario-parse', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            query: nlQuery.trim(),
                            companies: companies.map((c) => ({ id: c.id, name: c.name, country: c.country, type: c.type })),
                          }),
                        })
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.cutCompanies || d.cutCountries) {
                              setCutCompanies(new Set(d.cutCompanies || []));
                              setCutCountries(new Set(d.cutCountries || []));
                            }
                          })
                          .catch(() => {})
                          .finally(() => setNlParsing(false));
                      }
                    }}
                  />
                  {nlParsing && <span className="nl-query-status">Parsing...</span>}
                </div>

                {(activeScenarios.size > 0 || cutCountries.size > 0 || cutCompanies.size > 0) && (
                  <div className="scenario-descs">
                    {aiLoading ? (
                      <div className="scenario-desc" style={{ fontStyle: 'italic', color: 'var(--text-dim)' }}>Generating analysis...</div>
                    ) : aiSummary ? (
                      <div className="scenario-desc">{aiSummary}</div>
                    ) : activeScenarios.size > 0 ? (
                      SCENARIOS.filter((s) => activeScenarios.has(s.id)).map((s) => (
                        <div key={s.id} className="scenario-desc">{s.description}</div>
                      ))
                    ) : null}
                  </div>
                )}

                <div className="scenario-or">or manually</div>

                <div className="cut-controls">
                  <span className="cut-label">Remove suppliers from:</span>
                  {(['US', 'CN', 'OTHER'] as const).map((g) => (
                    <button
                      key={g}
                      className={`cut-toggle ${cutCountries.has(g) ? 'cut-toggle--active' : ''}`}
                      onClick={() => {
                        setActiveScenarios(new Set());
                        const next = new Set(cutCountries);
                        if (next.has(g)) next.delete(g); else next.add(g);
                        setCutCountries(next);
                        setCutCompanies(new Set());
                      }}
                    >
                      {g === 'US' ? 'US' : g === 'CN' ? 'China' : 'Other'}
                    </button>
                  ))}
                  {(cutCountries.size > 0 || cutCompanies.size > 0) && (
                    <button className="cut-reset" onClick={() => {
                      setCutCountries(new Set());
                      setCutCompanies(new Set());
                      setActiveScenarios(new Set());
                    }}>Reset</button>
                  )}
                </div>

                {cutImpact && (
                  <div className="cut-impact">
                    {cutImpact.cascadeChains.length > 0 && (
                      <div className="cut-subsection">
                        <h4 className="cut-subtitle">Disruption Cascade</h4>
                        {cutImpact.cascadeChains.map((chain) => (
                          <div key={chain.source} className="scenario-cascade">
                            <span className="scenario-cascade__node scenario-cascade__node--cut">
                              {chain.sourceName}
                            </span>
                            <span className="scenario-cascade__arrow">&rarr;</span>
                            {chain.affected.map((a) => (
                              <span key={a.id} className="scenario-cascade__node scenario-cascade__node--affected">
                                {a.name}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

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

              </section>

            </div>
          );
        })()}

        {/* Network tab */}
        {activeTab === 'network' && (
          <div className="network-view">
            <div className="network-controls">
              <input
                className="nl-query-input"
                type="text"
                placeholder="Ask about the network... e.g. &quot;Who supplies Tesla?&quot;"
                value={graphQuery}
                disabled={graphQuerying}
                onChange={(e) => setGraphQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setGraphQuery('');
                    setGraphHighlightIds(null);

                  }
                  if (e.key === 'Enter' && graphQuery.trim() && !graphQuerying) {
                    setGraphQuerying(true);

                    fetch('/api/graph-query', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        query: graphQuery.trim(),
                        nodes: companies.map((c) => ({ id: c.id, name: c.name, country: c.country, type: c.type })),
                        edges: relationships.map((r) => ({ from: r.from, to: r.to, component: r.component })),
                      }),
                    })
                      .then((r) => r.json())
                      .then((d) => {
                        if (d.highlightIds) setGraphHighlightIds(new Set(d.highlightIds));
                      })
                      .catch(() => {})
                      .finally(() => setGraphQuerying(false));
                  }
                }}
              />
              {graphQuerying && <span className="nl-query-status">Querying...</span>}
              {graphHighlightIds && (
                <button className="cut-reset" onClick={() => {
                  setGraphQuery('');
                  setGraphHighlightIds(null);
                }}>Clear</button>
              )}
            </div>
            <SupplyChainGraph
              onNodeSelect={handleSelectCompany}
              countryFilter={countryFilter}
              highlightedIds={graphHighlightIds}
            />
          </div>
        )}

        {/* Timeline tab */}
        {activeTab === 'timeline' && (() => {
          const tl = getTimelineData();
          return (
            <div className="timeline-view">
              {/* Year axis - offset to align with track column */}
              <div className="timeline-header">
                <div className="timeline-header__spacer" />
                <div className="timeline-axis">
                  {TIMELINE_YEARS.map((y) => (
                    <span key={y} className="timeline-axis__year">{y}</span>
                  ))}
                  <div className="timeline-axis__now" style={{ left: `${tl.nowPct}%` }} />
                </div>
              </div>

              <div className="timeline-legend">
                <span className="timeline-legend__item">
                  <span className="timeline-legend__dot timeline-legend__dot--filled" /> In Production
                </span>
                <span className="timeline-legend__item">
                  <span className="timeline-legend__dot timeline-legend__dot--hollow" /> Prototype
                </span>
                <span className="timeline-legend__item">
                  <span className="timeline-legend__dot" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} /> US
                </span>
                <span className="timeline-legend__item">
                  <span className="timeline-legend__dot" style={{ background: '#ef4444', borderColor: '#ef4444' }} /> CN
                </span>
                <span className="timeline-legend__item">
                  <span className="timeline-legend__dot" style={{ background: '#888', borderColor: '#888' }} /> Other
                </span>
              </div>

              <div className="timeline-lanes">
                {tl.lanes.map((lane) => (
                  <div
                    key={lane.group}
                    className={`timeline-lane ${countryFilter && countryFilter !== lane.group ? 'timeline-lane--dim' : ''}`}
                  >
                    <div className="timeline-lane__header">{lane.label}</div>
                    {lane.rows.map((row) => (
                      <div
                        key={row.id}
                        className="timeline-row"
                        onClick={() => handleSelectCompany(row.id)}
                      >
                        <div className="timeline-row__info">
                          <span className="timeline-row__name">{row.name}</span>
                          <span className="timeline-row__meta">
                            {row.dateStr}
                            {row.shipments > 0 && <span className="timeline-row__ships">{row.shipments.toLocaleString()}</span>}
                          </span>
                        </div>
                        <div className="timeline-row__track">
                          <div
                            className={`timeline-row__dot ${row.inProduction ? 'timeline-row__dot--production' : 'timeline-row__dot--prototype'}`}
                            style={{ left: `${row.pct}%`, borderColor: COUNTRY_GROUP_COLORS[row.countryGroup] || '#888', background: row.inProduction ? (COUNTRY_GROUP_COLORS[row.countryGroup] || '#888') : 'var(--bg-card)' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="timeline-summary">
                <div className="timeline-summary__title">2025 Shipments by Region</div>
                {tl.shipmentsByGroup.map((sg) => (
                  <div key={sg.group} className="timeline-summary__row">
                    <span className="timeline-summary__label">{sg.label}</span>
                    <div className="timeline-summary__bar">
                      <div
                        className="timeline-summary__fill"
                        style={{
                          width: `${sg.barPct}%`,
                          background: COUNTRY_GROUP_COLORS[sg.group] || '#888',
                        }}
                      />
                    </div>
                    <span className="timeline-summary__value">
                      {sg.total.toLocaleString()} ({sg.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Component tab */}
        {activeTab !== 'skeleton' && activeTab !== 'all_oems' && activeTab !== 'geopolitics' && activeTab !== 'network' && activeTab !== 'timeline' && selectedComponent && (
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
                ) : activeTab === 'vlas' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedVlaModel ? focusedVlaModel.developer : 'Vision-Language-Action Models'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedVlaModel ? focusedVlaModel.name : 'VLA'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedVlaModel
                        ? `${focusedVlaModel.country} · ${focusedVlaModel.release} · ${focusedVlaModel.availability}`
                        : `${vlaOverview.trackedModels} tracked models · ${vlaOverview.linkedOems} linked humanoid OEMs`}
                    </span>
                  </div>
                ) : activeTab === 'reward_models' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedRewardModel ? focusedRewardModel.developer : 'Robotic Reward Models'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedRewardModel ? focusedRewardModel.name : 'Reward Models'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedRewardModel
                        ? `${focusedRewardModel.country} · ${focusedRewardModel.release} · ${getRewardModelTypeLabel(focusedRewardModel.modelType)}`
                        : `${rewardOverview.trackedModels} tracked models · ${rewardOverview.trainedModels} trained · ${rewardOverview.zeroShotModels} zero-shot · ${rewardOverview.codeGenModels} code-gen`}
                    </span>
                  </div>
                ) : activeTab === 'world_models' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedWorldModel ? focusedWorldModel.developer : 'Robotic World Models'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedWorldModel ? focusedWorldModel.name : 'World Models'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedWorldModel
                        ? `${focusedWorldModel.country} · ${focusedWorldModel.release} · ${getWorldModelTypeLabel(focusedWorldModel.modelType)}`
                        : `${worldModelOverview.trackedModels} tracked · ${worldModelOverview.videoGenModels} video gen · ${worldModelOverview.latentDynModels} latent · ${worldModelOverview.rlImaginModels} RL/imagination · ${worldModelOverview.foundationModels} platform`}
                    </span>
                  </div>
                ) : activeTab === 'sim_platforms' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedSimPlatform ? focusedSimPlatform.developer : 'Robotics Simulation Platforms'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedSimPlatform ? focusedSimPlatform.name : 'Sim Platforms'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedSimPlatform
                        ? `${focusedSimPlatform.country} · ${getSimPlatformTypeLabel(focusedSimPlatform.platformType)} · ${focusedSimPlatform.license}`
                        : `${simPlatformOverview.trackedPlatforms - simPlatformOverview.worldModels} tracked · ${simPlatformOverview.physicsEngines} physics engines · ${simPlatformOverview.rlFrameworks} RL frameworks · ${simPlatformOverview.environments} environments`}
                    </span>
                  </div>
                ) : activeTab === 'viz_tools' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedVizTool ? focusedVizTool.developer : 'Robotics Visualization Tools'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedVizTool ? focusedVizTool.name : 'Viz Tools'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedVizTool
                        ? `${focusedVizTool.country} · ${focusedVizTool.release} · ${getVizToolTypeLabel(focusedVizTool.toolType)}`
                        : `${vizToolOverview.trackedTools} tracked · ${vizToolOverview.platformTools} platforms · ${vizToolOverview.viewerTools} 3D viewers · ${vizToolOverview.timeSeriesTools} time series · ${vizToolOverview.analyticsTools} analytics`}
                    </span>
                  </div>
                ) : activeTab === 'safety_standards' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedSafetyProfile ? focusedSafetyProfile.name : focusedSafetyStandard ? focusedSafetyStandard.issuingBody : 'Humanoid Robot Safety'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedSafetyProfile ? getComplianceLevelLabel(focusedSafetyProfile.complianceLevel) : focusedSafetyStandard ? focusedSafetyStandard.name : 'Safety & Standards'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedSafetyProfile
                        ? `${focusedSafetyProfile.country} · ${focusedSafetyProfile.complianceSummary}`
                        : focusedSafetyStandard
                          ? `${focusedSafetyStandard.region} · ${focusedSafetyStandard.statusLabel}`
                          : `${safetyOverviewData.trackedStandards} standards · ${safetyOverviewData.trackedOems} OEM profiles · ${safetyOverviewData.certifiedOems} certified`}
                    </span>
                  </div>
                ) : activeTab === 'displays' ? (
                  <div className="vla-placeholder">
                    <span className="vla-placeholder__eyebrow">
                      {focusedHeadDesign ? focusedHeadDesign.developer : 'Humanoid Head & Display Designs'}
                    </span>
                    <span className="vla-placeholder__title">
                      {focusedHeadDesign ? focusedHeadDesign.name : 'Displays'}
                    </span>
                    <span className="vla-placeholder__meta">
                      {focusedHeadDesign
                        ? `${focusedHeadDesign.country} · ${getFaceDisplayTypeLabel(focusedHeadDesign.faceType)} · ${focusedHeadDesign.headCameras} head cams`
                        : `${headDesignOverview.trackedDesigns} tracked · ${headDesignOverview.oledScreens} OLED · ${headDesignOverview.statusScreens} status screen · ${headDesignOverview.ledIndicators} LED · ${headDesignOverview.noDisplay} none · ${headDesignOverview.concealed} concealed`}
                    </span>
                  </div>
                ) : selectedComponent.plyModel ? (
                  <PLYViewer modelUrl={selectedComponent.plyModel} color="#1a1a1a" initialRotation={MODEL_ROTATIONS[selectedComponent.plyModel]} spinSpeed={MODEL_SPIN[selectedComponent.plyModel]} scale={MODEL_SCALE[selectedComponent.plyModel]} />
                ) : (
                  <div className="model-placeholder">No 3D model</div>
                )}
              </div>

              <div className="component-info">
                {(() => {
                  const isActuator = activeTab === 'actuators_rotary';
                  const desc = isActuator
                    ? ACTUATOR_INFO[actuatorType].description
                    : activeTab === 'vlas' && focusedVlaModel
                      ? focusedVlaModel.description
                      : activeTab === 'reward_models' && focusedRewardModel
                        ? focusedRewardModel.description
                        : activeTab === 'world_models' && focusedWorldModel
                          ? focusedWorldModel.description
                          : activeTab === 'sim_platforms' && focusedSimPlatform
                            ? focusedSimPlatform.description
                            : activeTab === 'viz_tools' && focusedVizTool
                              ? focusedVizTool.description
                              : activeTab === 'safety_standards' && focusedSafetyProfile
                                ? focusedSafetyProfile.description
                                : activeTab === 'safety_standards' && focusedSafetyStandard
                                  ? focusedSafetyStandard.description
                                  : activeTab === 'displays' && focusedHeadDesign
                                    ? focusedHeadDesign.description
                                    : selectedComponent.description;
                  const metrics = isActuator
                    ? ACTUATOR_INFO[actuatorType].keyMetrics
                    : activeTab === 'reward_models'
                      ? focusedRewardModel
                        ? {
                            Developer: focusedRewardModel.developer,
                            Type: getRewardModelTypeLabel(focusedRewardModel.modelType),
                            Backbone: focusedRewardModel.backbone,
                            Parameters: focusedRewardModel.params,
                            Release: focusedRewardModel.release,
                            Venue: focusedRewardModel.venue,
                            Availability: focusedRewardModel.availability,
                            Focus: focusedRewardModel.focus,
                            Sources: focusedRewardModel.sources.map((s) => s.label).join(' · '),
                          }
                        : {
                            'Tracked Models': `${rewardOverview.trackedModels} reward models`,
                            'Trained Models': `${rewardOverview.trainedModels} with open weights`,
                            'Zero-Shot Methods': `${rewardOverview.zeroShotModels} prompting-based approaches`,
                            'Code Generation': `${rewardOverview.codeGenModels} LLM reward code generators`,
                            Developers: `${rewardOverview.developerCount} organizations`,
                          }
                      : activeTab === 'world_models'
                        ? focusedWorldModel
                          ? {
                              Developer: focusedWorldModel.developer,
                              Type: getWorldModelTypeLabel(focusedWorldModel.modelType),
                              ...(focusedWorldModel.backbone ? { Backbone: focusedWorldModel.backbone } : {}),
                              ...(focusedWorldModel.params ? { Parameters: focusedWorldModel.params } : {}),
                              ...(focusedWorldModel.trainingData ? { 'Training Data': focusedWorldModel.trainingData } : {}),
                              Release: focusedWorldModel.release,
                              Venue: focusedWorldModel.venue,
                              Availability: focusedWorldModel.availability,
                              Focus: focusedWorldModel.focus,
                              Sources: focusedWorldModel.sources.map((s) => s.label).join(' · '),
                            }
                          : {
                              'Tracked Models': `${worldModelOverview.trackedModels} world models`,
                              'Video Generation': `${worldModelOverview.videoGenModels} video prediction models`,
                              'Latent Dynamics': `${worldModelOverview.latentDynModels} latent-space models`,
                              'RL / Imagination': `${worldModelOverview.rlImaginModels} imagination-based RL agents`,
                              'Foundation Platforms': `${worldModelOverview.foundationModels} full platforms`,
                              Developers: `${worldModelOverview.developerCount} organizations`,
                            }
                        : activeTab === 'viz_tools'
                          ? focusedVizTool
                            ? {
                                Developer: focusedVizTool.developer,
                                Type: getVizToolTypeLabel(focusedVizTool.toolType),
                                Language: focusedVizTool.language,
                                Frameworks: focusedVizTool.frameworks,
                                Deployment: focusedVizTool.deployment,
                                License: focusedVizTool.license,
                                Release: focusedVizTool.release,
                                Focus: focusedVizTool.focus,
                                Sources: focusedVizTool.sources.map((s) => s.label).join(' · '),
                              }
                            : {
                                'Tracked Tools': `${vizToolOverview.trackedTools} visualization tools`,
                                Platforms: `${vizToolOverview.platformTools} full observability platforms`,
                                '3D Viewers': `${vizToolOverview.viewerTools} lightweight 3D viewers`,
                                'Time Series': `${vizToolOverview.timeSeriesTools} time series / logging tools`,
                                'Data & Analytics': `${vizToolOverview.analyticsTools} AI-powered analytics`,
                                Developers: `${vizToolOverview.developerCount} organizations`,
                              }
                          : activeTab === 'sim_platforms'
                            ? focusedSimPlatform
                              ? {
                                  Developer: focusedSimPlatform.developer,
                                  Type: getSimPlatformTypeLabel(focusedSimPlatform.platformType),
                                  'Physics Engine': focusedSimPlatform.physicsEngine,
                                  License: focusedSimPlatform.license,
                                  Language: focusedSimPlatform.language,
                                  ...(focusedSimPlatform.latestVersion ? { Version: focusedSimPlatform.latestVersion } : {}),
                                  'OEM Links': focusedSimPlatform.companyLinks.length > 0 ? `${focusedSimPlatform.companyLinks.length} companies` : 'None',
                                  Sources: focusedSimPlatform.sources.map((s) => s.label).join(' · '),
                                }
                              : {
                                  'Tracked Platforms': `${simPlatformOverview.trackedPlatforms - simPlatformOverview.worldModels} simulation platforms`,
                                  'Physics Engines': `${simPlatformOverview.physicsEngines} physics engines`,
                                  'RL Frameworks': `${simPlatformOverview.rlFrameworks} RL training frameworks`,
                                  Environments: `${simPlatformOverview.environments} task environments`,
                                  'With OEM Links': `${simPlatformOverview.withOemLinks} platforms adopted by OEMs`,
                                  Developers: `${simPlatformOverview.developerCount} organizations`,
                                }
                          : activeTab === 'safety_standards'
                            ? focusedSafetyProfile
                              ? {
                                  Company: focusedSafetyProfile.name,
                                  Compliance: getComplianceLevelLabel(focusedSafetyProfile.complianceLevel),
                                  Summary: focusedSafetyProfile.complianceSummary,
                                  Sources: focusedSafetyProfile.sources.map((s) => s.label).join(' · '),
                                }
                              : focusedSafetyStandard
                                ? {
                                    'Issuing Body': focusedSafetyStandard.issuingBody,
                                    Region: focusedSafetyStandard.region,
                                    Status: focusedSafetyStandard.statusLabel,
                                    ...(focusedSafetyStandard.expectedDate ? { Expected: focusedSafetyStandard.expectedDate } : {}),
                                    Sources: focusedSafetyStandard.sources.map((s) => s.label).join(' · '),
                                  }
                                : {
                                    'Tracked Standards': `${safetyOverviewData.trackedStandards} safety standards`,
                                    Published: `${safetyOverviewData.publishedStandards} published/in-force`,
                                    'In Development': `${safetyOverviewData.inProgressStandards} working draft/FDIS/framework`,
                                    'OEM Profiles': `${safetyOverviewData.trackedOems} companies tracked`,
                                    Certified: `${safetyOverviewData.certifiedOems} with NRTL/formal certification`,
                                    'In Progress': `${safetyOverviewData.inProgressOems} pursuing certification`,
                                  }
                          : activeTab === 'displays'
                            ? focusedHeadDesign
                              ? {
                                  Developer: focusedHeadDesign.developer,
                                  'Face Type': getFaceDisplayTypeLabel(focusedHeadDesign.faceType),
                                  'Display Tech': focusedHeadDesign.displayTech,
                                  'Head Cameras': focusedHeadDesign.headCameras,
                                  'Total Cameras': focusedHeadDesign.totalCameras,
                                  'Depth Approach': focusedHeadDesign.depthApproach,
                                  LiDAR: focusedHeadDesign.lidar,
                                  Audio: focusedHeadDesign.audioSystem,
                                  'Interactive Features': focusedHeadDesign.interactiveFeatures,
                                  Sources: focusedHeadDesign.sources.map((s) => s.label).join(' · '),
                                }
                              : {
                                  'Tracked Designs': `${headDesignOverview.trackedDesigns} head/face designs`,
                                  'OLED Screen': `${headDesignOverview.oledScreens} full expression displays`,
                                  'Status Screen': `${headDesignOverview.statusScreens} icon/emotion screens`,
                                  'LED Indicator': `${headDesignOverview.ledIndicators} LED-based signaling`,
                                  'No Display': `${headDesignOverview.noDisplay} pure sensor pods`,
                                  Concealed: `${headDesignOverview.concealed} hidden/decorative`,
                                }
                            : activeTab === 'vlas'
                            ? focusedVlaModel
                              ? {
                                  Developer: focusedVlaModel.developer,
                                  'Relationship Type': getVlaRelationshipTypeLabel(focusedVlaModel.relationshipType),
                                Release: focusedVlaModel.release,
                                Availability: focusedVlaModel.availability,
                                Focus: focusedVlaModel.focus,
                                'Linked OEMs': focusedVlaModel.companyLinks.length
                                  ? focusedVlaModel.companyLinks
                                      .map((link) => {
                                        const company = companies.find((candidate) => candidate.id === link.companyId);
                                        return company ? `${company.name} (${getVlaCompanyRelationshipLabel(link.relationship)})` : null;
                                      })
                                      .filter(Boolean)
                                      .join(', ')
                                  : 'None tracked in current dataset',
                                Sources: focusedVlaModel.sources.map((source) => source.label).join(' · '),
                              }
                            : {
                                'Tracked Models': `${vlaOverview.trackedModels} models (open + proprietary)`,
                                'Linked OEMs': `${vlaOverview.linkedOems} humanoid OEMs with VLA integrations`,
                                'Model Developers': `${vlaOverview.creatorCount} organizations building VLAs`,
                                'Standalone Models': `${vlaOverview.standaloneModels} models without direct OEM ties`,
                              }
                          : selectedComponent.keyMetrics;

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

            {activeTab === 'vlas' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Model Ecosystem</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${vlaFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setVlaFilter('all')}>All</button>
                    <button className={`country-pill ${vlaFilter === 'open' ? 'country-pill--active' : ''}`} onClick={() => setVlaFilter(vlaFilter === 'open' ? 'all' : 'open')}>Open Source</button>
                    <button className={`country-pill ${vlaFilter === 'closed' ? 'country-pill--active' : ''}`} onClick={() => setVlaFilter(vlaFilter === 'closed' ? 'all' : 'closed')}>Proprietary</button>
                    {focusedVlaModel && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Models</div>
                    {filteredVlaModels.map((model) => (
                      <button
                        key={model.id}
                        className={`chain-entity ${focusedVlaModel && focusedVlaModel.id !== model.id ? 'chain-entity--dim' : ''} ${focusedVlaModel?.id === model.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(model.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === model.id ? null : model.id)}
                      >
                        <span className="chain-name">{model.name}</span>
                        <span className="chain-country">{model.country}</span>
                        <span className="chain-share">
                          {model.developer} · {getVlaRelationshipTypeLabel(model.relationshipType)}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="chain-arrow">&rarr;</div>
                  <div className="chain-tier">
                    <div className="chain-tier-label">Linked OEMs</div>
                    {linkedVlaOems.length > 0 ? linkedVlaOems.map((company) => (
                      <button
                        key={company.id}
                        className={`chain-entity ${focusedVlaModel && !focusedVlaOemIds.has(company.id) ? 'chain-entity--dim' : ''} ${countryFilter && getCountryFilterGroup(company.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => handleSelectCompany(company.id)}
                      >
                        <span className="chain-name">{company.name}</span>
                        <span className="chain-country">{company.country}</span>
                        <span className="chain-share">
                          {(focusedVlaModel
                            ? getCompanyVlaLinks(company.id)
                                .filter(({ model }) => model.id === focusedVlaModel.id)
                                .map(({ link }) => getVlaCompanyRelationshipLabel(link.relationship))
                            : getCompanyVlaLinks(company.id)
                                .map(({ model, link }) => `${model.name} (${getVlaCompanyRelationshipLabel(link.relationship)})`)
                          ).join(', ')}
                        </span>
                      </button>
                    )) : (
                      <div className="chain-empty">No linked humanoid OEMs tracked yet.</div>
                    )}
                    {focusedVlaModel && focusedVlaModel.companyLinks.length === 0 && (
                      <div className="chain-empty">No humanoid OEM relationship tracked for {focusedVlaModel.name} in the current dataset.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reward_models' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Reward Comparison</h3>
                </div>
                <RewardChart comparisons={rewardComparisons} />
              </div>
            )}

            {activeTab === 'reward_models' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Model Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${rewardFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setRewardFilter('all')}>All</button>
                    <button className={`country-pill ${rewardFilter === 'trained' ? 'country-pill--active' : ''}`} onClick={() => setRewardFilter(rewardFilter === 'trained' ? 'all' : 'trained')}>Trained</button>
                    <button className={`country-pill ${rewardFilter === 'zero-shot' ? 'country-pill--active' : ''}`} onClick={() => setRewardFilter(rewardFilter === 'zero-shot' ? 'all' : 'zero-shot')}>Zero-Shot</button>
                    <button className={`country-pill ${rewardFilter === 'code-gen' ? 'country-pill--active' : ''}`} onClick={() => setRewardFilter(rewardFilter === 'code-gen' ? 'all' : 'code-gen')}>Code Gen</button>
                    {focusedRewardModel && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Models</div>
                    {filteredRewardModels.map((model) => (
                      <button
                        key={model.id}
                        className={`chain-entity ${focusedRewardModel && focusedRewardModel.id !== model.id ? 'chain-entity--dim' : ''} ${focusedRewardModel?.id === model.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(model.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === model.id ? null : model.id)}
                      >
                        <span className="chain-name">{model.name}</span>
                        <span className="chain-country">{model.country}</span>
                        <span className="chain-share">
                          {model.developer} · {getRewardModelTypeLabel(model.modelType)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'world_models' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Model Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${worldModelFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setWorldModelFilter('all')}>All</button>
                    <button className={`country-pill ${worldModelFilter === 'video-generation' ? 'country-pill--active' : ''}`} onClick={() => setWorldModelFilter(worldModelFilter === 'video-generation' ? 'all' : 'video-generation')}>Video Gen</button>
                    <button className={`country-pill ${worldModelFilter === 'latent-dynamics' ? 'country-pill--active' : ''}`} onClick={() => setWorldModelFilter(worldModelFilter === 'latent-dynamics' ? 'all' : 'latent-dynamics')}>Latent Dynamics</button>
                    <button className={`country-pill ${worldModelFilter === 'rl-imagination' ? 'country-pill--active' : ''}`} onClick={() => setWorldModelFilter(worldModelFilter === 'rl-imagination' ? 'all' : 'rl-imagination')}>RL / Imagination</button>
                    <button className={`country-pill ${worldModelFilter === 'foundation-platform' ? 'country-pill--active' : ''}`} onClick={() => setWorldModelFilter(worldModelFilter === 'foundation-platform' ? 'all' : 'foundation-platform')}>Platform</button>
                    {focusedWorldModel && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Models</div>
                    {filteredWorldModels.map((model) => (
                      <button
                        key={model.id}
                        className={`chain-entity ${focusedWorldModel && focusedWorldModel.id !== model.id ? 'chain-entity--dim' : ''} ${focusedWorldModel?.id === model.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(model.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === model.id ? null : model.id)}
                      >
                        <span className="chain-name">{model.name}</span>
                        <span className="chain-country">{model.country}</span>
                        <span className="chain-share">
                          {model.developer} · {getWorldModelTypeLabel(model.modelType)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sim_platforms' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Capability Matrix</h3>
                </div>
                <div className="cap-matrix">
                  <table className="cap-matrix__table">
                    <thead>
                      <tr>
                        <th className="cap-matrix__tool-header">Platform</th>
                        {SIM_CAPABILITIES.map((cap) => (
                          <th key={cap} className="cap-matrix__cap-header"><span>{cap}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSimPlatforms.map((platform) => {
                        const caps = getSimCapabilities(platform);
                        const isFocused = focusedSimPlatform?.id === platform.id;
                        const isDim = focusedSimPlatform && !isFocused;
                        return (
                          <tr
                            key={platform.id}
                            className={`cap-matrix__row ${isFocused ? 'cap-matrix__row--focused' : ''} ${isDim ? 'cap-matrix__row--dim' : ''}`}
                            onClick={() => setChainFocus((prev) => prev === platform.id ? null : platform.id)}
                          >
                            <td className="cap-matrix__tool-name">{platform.name}</td>
                            {SIM_CAPABILITIES.map((cap) => (
                              <td key={cap} className="cap-matrix__cell">
                                <span className={`cap-matrix__dot ${caps.has(cap) ? 'cap-matrix__dot--on' : ''}`} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'sim_platforms' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Platform Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${simPlatformFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setSimPlatformFilter('all')}>All</button>
                    <button className={`country-pill ${simPlatformFilter === 'physics-engine' ? 'country-pill--active' : ''}`} onClick={() => setSimPlatformFilter(simPlatformFilter === 'physics-engine' ? 'all' : 'physics-engine')}>Physics Engine</button>
                    <button className={`country-pill ${simPlatformFilter === 'rl-framework' ? 'country-pill--active' : ''}`} onClick={() => setSimPlatformFilter(simPlatformFilter === 'rl-framework' ? 'all' : 'rl-framework')}>RL Framework</button>
                    <button className={`country-pill ${simPlatformFilter === 'environment' ? 'country-pill--active' : ''}`} onClick={() => setSimPlatformFilter(simPlatformFilter === 'environment' ? 'all' : 'environment')}>Environment</button>
                    {focusedSimPlatform && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Platforms</div>
                    {filteredSimPlatforms.map((platform) => (
                      <button
                        key={platform.id}
                        className={`chain-entity ${focusedSimPlatform && focusedSimPlatform.id !== platform.id ? 'chain-entity--dim' : ''} ${focusedSimPlatform?.id === platform.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(platform.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === platform.id ? null : platform.id)}
                      >
                        <span className="chain-name">{platform.name}</span>
                        <span className="chain-country">{platform.country}</span>
                        <span className="chain-share">
                          {platform.developer} · {getSimPlatformTypeLabel(platform.platformType)}
                        </span>
                      </button>
                    ))}
                  </div>
                  {focusedSimPlatform && focusedSimPlatform.companyLinks.length > 0 && (
                    <div className="chain-tier">
                      <div className="chain-tier-label">Linked OEMs</div>
                      {focusedSimPlatform.companyLinks.map((link) => {
                        const comp = companies.find((c) => c.id === link.companyId);
                        return (
                          <button
                            key={link.companyId}
                            className="chain-entity"
                            onClick={() => handleSelectCompany(link.companyId)}
                          >
                            <span className="chain-name">{comp?.name || link.companyId}</span>
                            <span className="chain-country">{comp?.country || ''}</span>
                            {link.notes && <span className="chain-share">{link.notes}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'viz_tools' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Capability Matrix</h3>
                </div>
                <div className="cap-matrix">
                  <table className="cap-matrix__table">
                    <thead>
                      <tr>
                        <th className="cap-matrix__tool-header">Tool</th>
                        {VIZ_CAPABILITIES.map((cap) => (
                          <th key={cap} className="cap-matrix__cap-header"><span>{cap}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vizTools.map((tool) => {
                        const caps = VIZ_CAPABILITY_MAP[tool.id] || new Set();
                        const isFocused = focusedVizTool?.id === tool.id;
                        const isDim = focusedVizTool && !isFocused;
                        return (
                          <tr
                            key={tool.id}
                            className={`cap-matrix__row ${isFocused ? 'cap-matrix__row--focused' : ''} ${isDim ? 'cap-matrix__row--dim' : ''}`}
                            onClick={() => setChainFocus((prev) => prev === tool.id ? null : tool.id)}
                          >
                            <td className="cap-matrix__tool-name">{tool.name}</td>
                            {VIZ_CAPABILITIES.map((cap) => (
                              <td key={cap} className="cap-matrix__cell">
                                <span className={`cap-matrix__dot ${caps.has(cap) ? 'cap-matrix__dot--on' : ''}`} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'viz_tools' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Tool Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${vizToolFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setVizToolFilter('all')}>All</button>
                    <button className={`country-pill ${vizToolFilter === 'platform' ? 'country-pill--active' : ''}`} onClick={() => setVizToolFilter(vizToolFilter === 'platform' ? 'all' : 'platform')}>Platform</button>
                    <button className={`country-pill ${vizToolFilter === '3d-viewer' ? 'country-pill--active' : ''}`} onClick={() => setVizToolFilter(vizToolFilter === '3d-viewer' ? 'all' : '3d-viewer')}>3D Viewer</button>
                    <button className={`country-pill ${vizToolFilter === 'time-series' ? 'country-pill--active' : ''}`} onClick={() => setVizToolFilter(vizToolFilter === 'time-series' ? 'all' : 'time-series')}>Time Series</button>
                    <button className={`country-pill ${vizToolFilter === 'data-analytics' ? 'country-pill--active' : ''}`} onClick={() => setVizToolFilter(vizToolFilter === 'data-analytics' ? 'all' : 'data-analytics')}>Analytics</button>
                    {focusedVizTool && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Tools</div>
                    {filteredVizTools.map((tool) => (
                      <button
                        key={tool.id}
                        className={`chain-entity ${focusedVizTool && focusedVizTool.id !== tool.id ? 'chain-entity--dim' : ''} ${focusedVizTool?.id === tool.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(tool.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === tool.id ? null : tool.id)}
                      >
                        <span className="chain-name">{tool.name}</span>
                        <span className="chain-country">{tool.country}</span>
                        <span className="chain-share">
                          {tool.developer} · {getVizToolTypeLabel(tool.toolType)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'safety_standards' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Standards Status</h3>
                </div>
                <div className="cap-matrix cap-matrix--standards">
                  <table className="cap-matrix__table">
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '28%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '16%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="cap-matrix__tool-header">Standard</th>
                        <th className="cap-matrix__cap-header"><span>Scope</span></th>
                        <th className="cap-matrix__cap-header"><span>Region</span></th>
                        <th className="cap-matrix__cap-header"><span>Status</span></th>
                        <th className="cap-matrix__cap-header"><span>Expected</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {safetyStandards.map((std) => {
                        const isFocused = focusedSafetyStandard?.id === std.id;
                        const isDim = focusedSafetyStandard && !isFocused;
                        return (
                          <tr
                            key={std.id}
                            className={`cap-matrix__row ${isFocused ? 'cap-matrix__row--focused' : ''} ${isDim ? 'cap-matrix__row--dim' : ''}`}
                            onClick={() => setChainFocus((prev) => prev === std.id ? null : std.id)}
                          >
                            <td className="cap-matrix__tool-name">{std.name}</td>
                            <td className="cap-matrix__cell"><span className="cap-matrix__text">{std.scope}</span></td>
                            <td className="cap-matrix__cell"><span className="cap-matrix__text">{std.region}</span></td>
                            <td className="cap-matrix__cell"><span className="cap-matrix__text">{std.statusLabel}</span></td>
                            <td className="cap-matrix__cell"><span className="cap-matrix__text">{std.expectedDate || '--'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'safety_standards' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Safety Design Matrix</h3>
                </div>
                <div className="cap-matrix">
                  <table className="cap-matrix__table">
                    <thead>
                      <tr>
                        <th className="cap-matrix__tool-header">Company</th>
                        {SAFETY_CAPABILITIES.map((cap) => (
                          <th key={cap} className="cap-matrix__cap-header"><span>{cap}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSafetyProfiles.map((profile) => {
                        const caps = getSafetyCapabilities(profile);
                        const isFocused = focusedSafetyProfile?.id === profile.id;
                        const isDim = focusedSafetyProfile && !isFocused;
                        return (
                          <tr
                            key={profile.id}
                            className={`cap-matrix__row ${isFocused ? 'cap-matrix__row--focused' : ''} ${isDim ? 'cap-matrix__row--dim' : ''}`}
                            onClick={() => setChainFocus((prev) => prev === profile.id ? null : profile.id)}
                          >
                            <td className="cap-matrix__tool-name">{profile.name}</td>
                            {SAFETY_CAPABILITIES.map((cap) => (
                              <td key={cap} className="cap-matrix__cell">
                                <span className={`cap-matrix__dot ${caps.has(cap) ? 'cap-matrix__dot--on' : ''}`} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'safety_standards' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">OEM Safety Profiles</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${safetyComplianceFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setSafetyComplianceFilter('all')}>All</button>
                    <button className={`country-pill ${safetyComplianceFilter === 'certified' ? 'country-pill--active' : ''}`} onClick={() => setSafetyComplianceFilter(safetyComplianceFilter === 'certified' ? 'all' : 'certified')}>Certified</button>
                    <button className={`country-pill ${safetyComplianceFilter === 'in-progress' ? 'country-pill--active' : ''}`} onClick={() => setSafetyComplianceFilter(safetyComplianceFilter === 'in-progress' ? 'all' : 'in-progress')}>In Progress</button>
                    <button className={`country-pill ${safetyComplianceFilter === 'claimed' ? 'country-pill--active' : ''}`} onClick={() => setSafetyComplianceFilter(safetyComplianceFilter === 'claimed' ? 'all' : 'claimed')}>Claimed</button>
                    <button className={`country-pill ${safetyComplianceFilter === 'not-disclosed' ? 'country-pill--active' : ''}`} onClick={() => setSafetyComplianceFilter(safetyComplianceFilter === 'not-disclosed' ? 'all' : 'not-disclosed')}>Not Disclosed</button>
                    {focusedSafetyProfile && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Companies</div>
                    {filteredSafetyProfiles.map((profile) => (
                      <button
                        key={profile.id}
                        className={`chain-entity ${focusedSafetyProfile && focusedSafetyProfile.id !== profile.id ? 'chain-entity--dim' : ''} ${focusedSafetyProfile?.id === profile.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(profile.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === profile.id ? null : profile.id)}
                      >
                        <span className="chain-name">{profile.name}</span>
                        <span className="chain-country">{profile.country}</span>
                        <span className="chain-share">
                          {getComplianceLevelLabel(profile.complianceLevel)} · {profile.complianceSummary}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'displays' && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Design Directory</h3>
                  <div className="vla-filters">
                    <button className={`country-pill ${headDesignFilter === 'all' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter('all')}>All</button>
                    <button className={`country-pill ${headDesignFilter === 'oled-screen' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter(headDesignFilter === 'oled-screen' ? 'all' : 'oled-screen')}>OLED</button>
                    <button className={`country-pill ${headDesignFilter === 'status-screen' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter(headDesignFilter === 'status-screen' ? 'all' : 'status-screen')}>Status Screen</button>
                    <button className={`country-pill ${headDesignFilter === 'led-indicator' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter(headDesignFilter === 'led-indicator' ? 'all' : 'led-indicator')}>LED</button>
                    <button className={`country-pill ${headDesignFilter === 'no-display' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter(headDesignFilter === 'no-display' ? 'all' : 'no-display')}>None</button>
                    <button className={`country-pill ${headDesignFilter === 'concealed' ? 'country-pill--active' : ''}`} onClick={() => setHeadDesignFilter(headDesignFilter === 'concealed' ? 'all' : 'concealed')}>Concealed</button>
                    {focusedHeadDesign && (
                      <button className="chain-clear" onClick={() => setChainFocus(null)}>
                        CLEAR FILTER
                      </button>
                    )}
                  </div>
                </div>
                <div className="chain-flow">
                  <div className="chain-tier">
                    <div className="chain-tier-label">Designs</div>
                    {filteredHeadDesigns.map((design) => (
                      <button
                        key={design.id}
                        className={`chain-entity ${focusedHeadDesign && focusedHeadDesign.id !== design.id ? 'chain-entity--dim' : ''} ${focusedHeadDesign?.id === design.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(design.country) !== countryFilter ? 'geo-dim' : ''}`}
                        onClick={() => setChainFocus((prev) => prev === design.id ? null : design.id)}
                      >
                        <span className="chain-name">{design.name}</span>
                        <span className="chain-country">{design.country}</span>
                        <span className="chain-share">
                          {design.developer} · {getFaceDisplayTypeLabel(design.faceType)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {chain && (chain.upstream.length > 0 || chain.suppliers.length > 0 || chain.oems.length > 0) && (
              <div className="supply-chain">
                <div className="supply-chain__header">
                  <h3 className="section-title">Supply Chain</h3>
                  {chainFocus && (
                    <button className="chain-clear" onClick={() => setChainFocus(null)}>
                      CLEAR FILTER
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
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
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
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
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
                          className={`chain-entity ${connectedIds && !connectedIds.has(c.id) ? 'chain-entity--dim' : ''} ${chainFocus === c.id ? 'chain-entity--focused' : ''} ${countryFilter && getCountryFilterGroup(c.country) !== countryFilter ? 'geo-dim' : ''}`}
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

        {activeTabGroup === 'data' && (
          <DataBrokerage activeSubTab={activeTab} viewCount={viewCount} />
        )}

        {activeTabGroup === 'cli' && (
          <CliDocs activeSubTab={activeTab} />
        )}

        {activeTabGroup === 'api' && (
          <ApiDocs activeSubTab={activeTab} />
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
        <span className="footer-right"><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
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
