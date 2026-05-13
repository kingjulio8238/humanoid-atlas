import { translate } from '../i18n';
import type { Locale } from '../i18n';
import type { MessageKey } from '../i18n/messages';

export const TAB_META: Record<string, { title: string; description: string }> = {
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
  equipment: { title: 'Equipment | Atlas Shop', description: 'NDAA-compliant Japanese-sourced equipment for US humanoid robotics defense buyers. Coming soon.' },
  components: { title: 'Components | Atlas Shop', description: 'NDAA-compliant Japanese-sourced components for US humanoid robotics defense buyers. Coming soon.' },
  arena_oems: { title: 'Atlas Arena - Vote on the Best Humanoid | Atlas Arena', description: 'Head-to-head humanoid matchups. Vote on best specs, best value, most production-ready, and best design. Community-driven Elo rankings across 38 OEMs.' },
  arena_suppliers: { title: 'Supplier Arena - Vote on the Best Robotics Supplier | Atlas Arena', description: 'Head-to-head supplier matchups by component category. Compare motors, reducers, batteries, compute and more. Community-driven Elo rankings.' },
  arena_vla: { title: 'VLA Arena - Vote on the Best Vision-Language-Action Model | Atlas Arena', description: 'Head-to-head VLA model matchups. Compare Helix, pi0, GR00T, OpenVLA, Gemini Robotics and more. Community-driven Elo rankings across 19 models.' },
  arena_investment: { title: 'Investment Arena - Vote on the Best Humanoid Robotics Investment | Atlas Arena', description: 'Head-to-head investment matchups. Compare valuations, funding rounds, and growth potential across 26 humanoid robotics companies.' },
  arena_components: { title: 'Component Arena - Vote on the Most Critical Humanoid Robot Component | Atlas Arena', description: 'Head-to-head component category matchups. Vote on biggest bottleneck, most innovation potential, and cost reduction opportunity across 15 component types.' },
  arena_scenarios: { title: 'Scenario Arena - Vote on the Most Disruptive Supply Chain Scenario | Atlas Arena', description: 'Head-to-head scenario matchups. Compare geopolitical disruptions, policy shifts, market events, and technology breakthroughs for industry impact and likelihood.' },
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

export function getLocalizedTabMeta(tabId: string, locale: Locale) {
  const fallback = TAB_META[tabId] || TAB_META.skeleton;
  const titleKey = `seo.${tabId}.title` as MessageKey;
  const descriptionKey = `seo.${tabId}.description` as MessageKey;
  const title = translate(locale, titleKey);
  const description = translate(locale, descriptionKey);
  return {
    title: title === titleKey ? fallback.title : title,
    description: description === descriptionKey ? fallback.description : description,
  };
}
