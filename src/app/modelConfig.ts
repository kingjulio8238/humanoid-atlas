import type { RobotSpecs } from '../data';

export const MODEL_SPIN: Record<string, number> = {
  '/models/skeleton.ply': 2.2,
  '/models/battery.ply': 1.5,
  '/models/bldc-motor.ply': 1.3,
  '/models/harmonic-reducer.ply': 1.15,
  '/models/bearings.ply': 1.3,
  '/models/linear-actuator.ply': 1.043,
  '/models/planetary-screw.ply': 1.13,
  '/models/end-effector.ply': 1.44,
};

export const MODEL_SCALE: Record<string, number> = {
  '/models/harmonic-reducer.ply': 0.9,
  '/models/bearings.ply': 0.9,
  '/models/linear-actuator.ply': 1.5,
  '/models/planetary-screw.ply': 1.3,
};

export const MODEL_ROTATIONS: Record<string, [number, number, number]> = {
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

export const ACTUATOR_INFO = {
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

export interface SkeletonRegionBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface SkeletonRegion {
  id: string;
  label: string;
  componentIds: string[];
  bounds: SkeletonRegionBounds[];
  color: string;
}

export const SKELETON_REGIONS: SkeletonRegion[] = [
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

export const COMPONENT_SPEC_FIELDS: Record<string, { field: keyof RobotSpecs; label: string }[]> = {
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
