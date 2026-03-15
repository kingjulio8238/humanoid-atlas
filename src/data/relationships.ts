import type { SupplyRelationship } from './types';

export const relationships: SupplyRelationship[] = [
  // === MOTOR SUPPLIERS → OEMs ===
  { id: 'r1', from: 'maxon', to: 'boston_dynamics', component: 'BLDC Motors', description: 'Precision frameless motors' },
  { id: 'r2', from: 'maxon', to: 'apptronik', component: 'BLDC Motors', description: 'Frameless BLDC motors for Apollo' },
  { id: 'r3', from: 'kollmorgen', to: 'figure', component: 'BLDC Motors', description: 'Frameless BLDC motors' },
  { id: 'r4', from: 'kollmorgen', to: 'agility', component: 'BLDC Motors', description: 'Brushless DC motors' },
  { id: 'r5', from: 'cubemars', to: 'unitree', component: 'BLDC Motors', description: 'Actuator motors' },
  { id: 'r6', from: 'nidec', to: 'tesla', component: 'Motors', description: 'Frameless and coreless motors' },
  { id: 'r7', from: 'estun', to: 'agibot', component: 'Servo Motors', description: 'Servo actuators' },

  // === REDUCER SUPPLIERS → OEMs ===
  { id: 'r10', from: 'harmonic_drive', to: 'tesla', component: 'Harmonic Reducer', bomPercent: 36, description: '~36% of rotary actuator cost' },
  { id: 'r11', from: 'harmonic_drive', to: 'apptronik', component: 'Harmonic Reducer', bomPercent: 36 },
  { id: 'r12', from: 'harmonic_drive', to: 'figure', component: 'Harmonic Reducer', bomPercent: 36 },
  { id: 'r13', from: 'harmonic_drive', to: 'unitree', component: 'Harmonic Reducer' },
  { id: 'r14', from: 'harmonic_drive', to: 'ubtech', component: 'Harmonic Reducer' },
  { id: 'r15', from: 'harmonic_drive', to: 'dexmate', component: 'Harmonic Reducer' },
  { id: 'r16', from: 'harmonic_drive', to: 'engineai', component: 'Strain Wave Reducer' },

  // === COMPUTE SUPPLIERS → OEMs ===
  { id: 'r20', from: 'nvidia', to: 'agility', component: 'Jetson Platform', description: 'AI partnership + compute' },
  { id: 'r21', from: 'nvidia', to: '1x', component: 'Jetson Thor', description: 'NEO Cortex compute' },
  { id: 'r22', from: 'nvidia', to: 'boston_dynamics', component: 'Jetson AGX Thor' },
  { id: 'r23', from: 'nvidia', to: 'dexmate', component: 'Jetson AGX Thor' },
  { id: 'r24', from: 'nvidia', to: 'unitree', component: 'Jetson Orin' },
  { id: 'r25', from: 'nvidia', to: 'agibot', component: 'Jetson Orin 64G' },
  { id: 'r26', from: 'nvidia', to: 'figure', component: 'Dual NVIDIA GPUs' },
  { id: 'r27', from: 'nvidia', to: 'engineai', component: 'Jetson Thor' },
  { id: 'r28', from: 'intel', to: 'agility', component: 'i7 CPUs + RealSense', description: 'Dual i7 CPUs and depth cameras' },
  { id: 'r29', from: 'intel', to: 'dexmate', component: 'x86 SoC', description: 'Secondary compute' },
  { id: 'r30', from: 'intel', to: 'engineai', component: 'Intel N97' },
  { id: 'r31', from: 'horizon_robotics', to: 'xpeng', component: 'AI Chips', description: 'Chinese compute alternative' },

  // === AI PARTNERS → OEMs ===
  { id: 'r40', from: 'google_deepmind', to: 'apptronik', component: 'AI/ML Models', description: 'Foundation model partnership' },
  { id: 'r41', from: 'google_deepmind', to: 'boston_dynamics', component: 'AI/ML Models', description: 'Robot learning models' },

  // === SENSOR SUPPLIERS → OEMs ===
  { id: 'r50', from: 'hesai', to: 'unitree', component: 'LiDAR', description: '3D LiDAR sensors' },
  { id: 'r51', from: 'hesai', to: 'agibot', component: 'LiDAR' },
  { id: 'r52', from: 'hesai', to: 'xpeng', component: 'LiDAR' },
  { id: 'r53', from: 'sony_sensors', to: 'tesla', component: 'Image Sensors', description: 'Camera sensors (FSD hardware)' },
  { id: 'r54', from: 'sony_sensors', to: 'figure', component: 'Image Sensors' },

  // === SEMICONDUCTOR SUPPLY CHAIN ===
  { id: 'r60', from: 'tsmc', to: 'nvidia', component: 'Chip Fabrication', description: 'Fabricates Jetson/GPU chips' },
  { id: 'r61', from: 'tsmc', to: 'intel', component: 'Chip Fabrication' },
  { id: 'r62', from: 'texas_instruments', to: 'tesla', component: 'Motor Drivers / Power ICs' },
  { id: 'r63', from: 'texas_instruments', to: 'apptronik', component: 'Analog ICs' },
  { id: 'r64', from: 'infineon', to: 'tesla', component: 'Power Semiconductors', description: 'Motor controllers, power management' },
  { id: 'r65', from: 'infineon', to: 'boston_dynamics', component: 'Power Semiconductors' },
  { id: 'r66', from: 'samsung_electro', to: 'tesla', component: 'MLCCs / Substrates' },
  { id: 'r67', from: 'samsung_electro', to: 'unitree', component: 'Passive Components' },

  // === RAW MATERIALS → COMPONENT MAKERS ===
  { id: 'r70', from: 'mp_materials', to: 'maxon', component: 'NdFeB Rare Earths', description: 'Magnet materials for BLDC motors' },
  { id: 'r71', from: 'mp_materials', to: 'kollmorgen', component: 'NdFeB Rare Earths' },
  { id: 'r72', from: 'mp_materials', to: 'nidec', component: 'NdFeB Rare Earths' },
  { id: 'r73', from: 'lynas', to: 'maxon', component: 'Rare Earth Oxides' },
  { id: 'r74', from: 'lynas', to: 'nidec', component: 'Rare Earth Oxides' },
  { id: 'r75', from: 'jl_mag', to: 'cubemars', component: 'NdFeB Magnets', description: 'Permanent magnets for Chinese motor supply chain' },
  { id: 'r76', from: 'jl_mag', to: 'estun', component: 'NdFeB Magnets' },

  // === ACTUATOR MODULE SUPPLIERS → OEMs ===
  { id: 'r106', from: 'cubemars', to: 'unitree', component: 'Actuator Modules', description: 'Complete rotary actuator modules' },
  { id: 'r107', from: 'cubemars', to: 'agibot', component: 'Actuator Modules' },
  { id: 'r108', from: 'cubemars', to: 'engineai', component: 'Actuator Modules' },
  { id: 'r109', from: 'estun', to: 'agibot', component: 'Servo Actuators', description: 'Integrated servo actuator packages' },
  { id: 'r110', from: 'estun', to: 'xpeng', component: 'Servo Actuators' },
  { id: 'r111', from: 'estun', to: 'ubtech', component: 'Servo Actuators' },

  // === BEARING SUPPLIERS → OEMs ===
  { id: 'r93', from: 'thk', to: 'tesla', component: 'Cross-Roller Bearings', description: 'Hip and waist joint bearings' },
  { id: 'r94', from: 'thk', to: 'apptronik', component: 'Cross-Roller Bearings' },
  { id: 'r95', from: 'thk', to: 'figure', component: 'Cross-Roller Bearings' },
  { id: 'r96', from: 'thk', to: 'ubtech', component: 'Cross-Roller Bearings' },
  { id: 'r97', from: 'thk', to: 'engineai', component: 'Cross-Roller Bearings' },
  { id: 'r98', from: 'skf', to: 'boston_dynamics', component: 'Bearings' },
  { id: 'r99', from: 'skf', to: 'agility', component: 'Bearings' },
  { id: 'r100', from: 'skf', to: 'unitree', component: 'Ball Bearings' },

  // === SCREW SUPPLIERS → OEMs ===
  { id: 'r101', from: 'rollvis', to: 'tesla', component: 'Planetary Roller Screws', description: '1:14 ratio screws for linear actuators' },
  { id: 'r102', from: 'rollvis', to: 'apptronik', component: 'Planetary Roller Screws' },
  { id: 'r103', from: 'rollvis', to: 'figure', component: 'Planetary Roller Screws' },
  { id: 'r104', from: 'ewellix', to: 'boston_dynamics', component: 'Roller Screws' },
  { id: 'r105', from: 'ewellix', to: 'agility', component: 'Roller Screws' },

  // === BATTERY SUPPLIERS → OEMs ===
  { id: 'r85', from: 'panasonic_energy', to: 'tesla', component: 'Battery Cells', description: '2170/4680 lithium-ion cells' },
  { id: 'r86', from: 'catl', to: 'unitree', component: 'Battery Pack', description: 'Lithium-ion battery packs' },
  { id: 'r87', from: 'catl', to: 'agibot', component: 'Battery Pack' },
  { id: 'r88', from: 'catl', to: 'xpeng', component: 'Battery Cells', description: 'Solid-state battery development' },
  { id: 'r89', from: 'catl', to: 'ubtech', component: 'Battery Pack', description: 'Dual hot-swap battery packs' },
  { id: 'r90', from: 'catl', to: 'engineai', component: 'Battery Cells' },
  { id: 'r91', from: 'byd_battery', to: 'agibot', component: 'Battery Pack' },
  { id: 'r92', from: 'byd_battery', to: 'ubtech', component: 'Battery Pack' },

  // === END EFFECTOR SUPPLIERS ===
  { id: 'r80', from: 'psyonic', to: 'apptronik', component: 'Dexterous Hands', description: 'Off-the-shelf robotic/prosthetic hands' },
  { id: 'r81', from: 'sharpa', to: 'unitree', component: 'Dexterous Hands', description: 'Dexterous hands for Chinese OEMs' },
  { id: 'r82', from: 'sharpa', to: 'agibot', component: 'Dexterous Hands' },

  // === ADDITIONAL SENSOR RELATIONSHIPS (from audit) ===
  { id: 'r120', from: 'sony_sensors', to: 'boston_dynamics', component: 'Image Sensors', description: 'Camera sensors for 360° perception' },
  { id: 'r121', from: 'sony_sensors', to: 'agility', component: 'Image Sensors', description: 'Head and torso camera sensors' },
  { id: 'r122', from: 'sony_sensors', to: '1x', component: 'Image Sensors', description: '8.85MP 90Hz stereo fisheye sensors' },
  { id: 'r123', from: 'sony_sensors', to: 'apptronik', component: 'Image Sensors' },
  { id: 'r124', from: 'sony_sensors', to: 'ubtech', component: 'Image Sensors', description: 'RGB and fisheye camera sensors' },
  { id: 'r125', from: 'sony_sensors', to: 'dexmate', component: 'Image Sensors', description: 'Sensors for multi-camera perception' },
  { id: 'r126', from: 'sony_sensors', to: 'sunday', component: 'Image Sensors', description: 'Eye and hand camera sensors' },
  { id: 'r127', from: 'ouster', to: 'agility', component: 'LiDAR', description: 'Digital LiDAR for navigation' },
  { id: 'r128', from: 'ouster', to: 'dexmate', component: 'LiDAR', description: 'Dual 3D LiDAR' },
  { id: 'r129', from: 'hesai', to: 'engineai', component: 'LiDAR', description: '360° LiDAR sensor' },
  { id: 'r130', from: 'orbbec', to: 'unitree', component: 'Depth Cameras', description: '360° depth camera array' },
  { id: 'r131', from: 'orbbec', to: 'agibot', component: 'Depth Cameras', description: 'RGB-D depth cameras' },
  { id: 'r132', from: 'bosch_sensortec', to: 'boston_dynamics', component: 'IMU', description: 'MEMS inertial measurement unit' },
  { id: 'r133', from: 'bosch_sensortec', to: 'agility', component: 'IMU', description: 'MEMS IMU for balance and orientation' },
  { id: 'r134', from: 'bosch_sensortec', to: '1x', component: 'IMU', description: 'Linkwise differential IMUs' },
  { id: 'r135', from: 'bosch_sensortec', to: 'unitree', component: 'IMU' },
  { id: 'r136', from: 'bosch_sensortec', to: 'apptronik', component: 'IMU' },
  { id: 'r137', from: 'bosch_sensortec', to: 'dexmate', component: 'IMU' },

  // === ADDITIONAL REDUCER RELATIONSHIPS (from audit) ===
  { id: 'r140', from: 'nabtesco', to: 'agility', component: 'Cycloidal Reducer', description: 'Cycloidal-pin gear transmission' },
  { id: 'r141', from: 'leaderdrive', to: 'unitree', component: 'Harmonic Reducer', description: 'Chinese domestic harmonic drive' },
  { id: 'r142', from: 'leaderdrive', to: 'agibot', component: 'Harmonic Reducer' },
  { id: 'r143', from: 'harmonic_drive', to: 'xpeng', component: 'Harmonic Reducer' },
  { id: 'r144', from: 'harmonic_drive', to: 'agibot', component: 'Harmonic Reducer' },

  // === ADDITIONAL MOTOR RELATIONSHIPS (from audit) ===
  { id: 'r145', from: 'moons', to: 'xpeng', component: 'Servo Motors' },
  { id: 'r146', from: 'moons', to: 'ubtech', component: 'Servo Motors' },
  { id: 'r147', from: 'maxon', to: '1x', component: 'BLDC Motors', description: 'Frameless BLDC motors' },

  // === ADDITIONAL BEARING RELATIONSHIPS (from audit) ===
  { id: 'r148', from: 'thk', to: 'agibot', component: 'Cross-Roller Bearings' },
  { id: 'r149', from: 'thk', to: 'xpeng', component: 'Cross-Roller Bearings' },
  { id: 'r150', from: 'skf', to: 'dexmate', component: 'Bearings' },
  { id: 'r151', from: 'nsk', to: 'agibot', component: 'Ball Bearings' },

  // === ADDITIONAL BATTERY RELATIONSHIPS (from audit) ===
  { id: 'r152', from: 'lg_energy', to: 'boston_dynamics', component: 'Battery Cells', description: 'Hyundai group battery supply chain' },
  { id: 'r153', from: 'panasonic_energy', to: 'agility', component: 'Battery Cells' },
  { id: 'r154', from: 'panasonic_energy', to: '1x', component: 'Battery Cells' },

  // === ADDITIONAL SCREW RELATIONSHIPS (from audit) ===
  { id: 'r155', from: 'nanjing_kgm', to: 'unitree', component: 'Planetary Roller Screws', description: 'Chinese domestic screw supplier' },
  { id: 'r156', from: 'nanjing_kgm', to: 'agibot', component: 'Planetary Roller Screws' },
  { id: 'r157', from: 'nanjing_kgm', to: 'xpeng', component: 'Planetary Roller Screws' },
  { id: 'r158', from: 'nanjing_kgm', to: 'engineai', component: 'Planetary Roller Screws' },

  // === ADDITIONAL COMPUTE/PCB RELATIONSHIPS (from audit) ===
  { id: 'r159', from: 'stmicro', to: 'tesla', component: 'Motor Drivers / MEMS', description: 'Gate drivers and STM32 MCUs for actuator control' },
  { id: 'r160', from: 'stmicro', to: 'boston_dynamics', component: 'Motor Drivers', description: 'MEMS IMUs and motor gate drivers' },
  { id: 'r161', from: 'nvidia', to: 'sunday', component: 'Jetson Platform', description: 'Compute for ACT-1 model inference' },

  // === SUNDAY ROBOTICS (filling zero-relationship gap) ===
  { id: 'r162', from: 'kollmorgen', to: 'sunday', component: 'BLDC Motors' },
  { id: 'r163', from: 'panasonic_energy', to: 'sunday', component: 'Battery Pack' },
  { id: 'r164', from: 'thk', to: 'sunday', component: 'Cross-Roller Bearings' },
  { id: 'r165', from: 'bosch_sensortec', to: 'sunday', component: 'IMU' },
];
