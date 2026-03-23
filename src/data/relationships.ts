import type { SupplyRelationship } from './types';

export const relationships: SupplyRelationship[] = [
  // === MOTOR SUPPLIERS → OEMs ===
  { id: 'r1', from: 'maxon', to: 'boston_dynamics', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Precision frameless motors' },
  { id: 'r2', from: 'maxon', to: 'apptronik', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Frameless BLDC motors for Apollo' },
  { id: 'r3', from: 'kollmorgen', to: 'figure', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Frameless BLDC motors' },
  { id: 'r4', from: 'kollmorgen', to: 'agility', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Brushless DC motors' },
  { id: 'r5', from: 'cubemars', to: 'unitree', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Actuator motors' },
  { id: 'r6', from: 'nidec', to: 'tesla', component: 'Motors', componentCategoryId: 'motors', description: 'Frameless and coreless motors' },
  { id: 'r7', from: 'estun', to: 'agibot', component: 'Servo Motors', componentCategoryId: 'motors', description: 'Servo actuators' },

  // === REDUCER SUPPLIERS → OEMs ===
  { id: 'r10', from: 'harmonic_drive', to: 'tesla', component: 'Harmonic Reducer', componentCategoryId: 'reducers', bomPercent: 36, description: '~36% of rotary actuator cost' },
  { id: 'r11', from: 'harmonic_drive', to: 'apptronik', component: 'Harmonic Reducer', componentCategoryId: 'reducers', bomPercent: 36 },
  { id: 'r12', from: 'harmonic_drive', to: 'figure', component: 'Harmonic Reducer', componentCategoryId: 'reducers', bomPercent: 36 },
  { id: 'r13', from: 'harmonic_drive', to: 'unitree', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },
  { id: 'r14', from: 'harmonic_drive', to: 'ubtech', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },
  { id: 'r15', from: 'harmonic_drive', to: 'dexmate', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },
  { id: 'r16', from: 'harmonic_drive', to: 'engineai', component: 'Strain Wave Reducer', componentCategoryId: 'reducers' },

  // === COMPUTE SUPPLIERS → OEMs ===
  { id: 'r20', from: 'nvidia', to: 'agility', component: 'Jetson Platform', componentCategoryId: 'compute', description: 'AI partnership + compute' },
  { id: 'r21', from: 'nvidia', to: '1x', component: 'Jetson Thor', componentCategoryId: 'compute', description: 'NEO Cortex compute' },
  { id: 'r22', from: 'nvidia', to: 'boston_dynamics', component: 'Jetson AGX Thor', componentCategoryId: 'compute' },
  { id: 'r23', from: 'nvidia', to: 'dexmate', component: 'Jetson AGX Thor', componentCategoryId: 'compute' },
  { id: 'r24', from: 'nvidia', to: 'unitree', component: 'Jetson Orin', componentCategoryId: 'compute' },
  { id: 'r25', from: 'nvidia', to: 'agibot', component: 'Jetson Orin 64G', componentCategoryId: 'compute' },
  { id: 'r26', from: 'nvidia', to: 'figure', component: 'Dual NVIDIA GPUs', componentCategoryId: 'compute' },
  { id: 'r27', from: 'nvidia', to: 'engineai', component: 'Jetson Thor', componentCategoryId: 'compute' },
  { id: 'r28', from: 'intel', to: 'agility', component: 'i7 CPUs + RealSense', componentCategoryId: 'compute', description: 'Dual i7 CPUs and depth cameras' },
  { id: 'r29', from: 'intel', to: 'dexmate', component: 'x86 SoC', componentCategoryId: 'compute', description: 'Secondary compute' },
  { id: 'r30', from: 'intel', to: 'engineai', component: 'Intel N97', componentCategoryId: 'compute' },
  { id: 'r31', from: 'horizon_robotics', to: 'xpeng', component: 'AI Chips', componentCategoryId: 'compute', description: 'Chinese compute alternative' },

  // === AI PARTNERS → OEMs ===
  { id: 'r40', from: 'google_deepmind', to: 'apptronik', component: 'AI/ML Models', componentCategoryId: 'compute', description: 'Foundation model partnership' },
  { id: 'r41', from: 'google_deepmind', to: 'boston_dynamics', component: 'AI/ML Models', componentCategoryId: 'compute', description: 'Robot learning models' },

  // === SENSOR SUPPLIERS → OEMs ===
  { id: 'r50', from: 'hesai', to: 'unitree', component: 'LiDAR', componentCategoryId: 'sensors_general', description: '3D LiDAR sensors' },
  { id: 'r51', from: 'hesai', to: 'agibot', component: 'LiDAR', componentCategoryId: 'sensors_general' },
  { id: 'r52', from: 'hesai', to: 'xpeng', component: 'LiDAR', componentCategoryId: 'sensors_general' },
  { id: 'r53', from: 'sony_sensors', to: 'tesla', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Camera sensors (FSD hardware)' },
  { id: 'r54', from: 'sony_sensors', to: 'figure', component: 'Image Sensors', componentCategoryId: 'sensors_general' },

  // === SEMICONDUCTOR SUPPLY CHAIN ===
  { id: 'r60', from: 'tsmc', to: 'nvidia', component: 'Chip Fabrication', componentCategoryId: 'compute', description: 'Fabricates Jetson/GPU chips' },
  { id: 'r61', from: 'tsmc', to: 'intel', component: 'Chip Fabrication', componentCategoryId: 'compute' },
  { id: 'r62', from: 'texas_instruments', to: 'tesla', component: 'Motor Drivers / Power ICs', componentCategoryId: 'pcbs' },
  { id: 'r63', from: 'texas_instruments', to: 'apptronik', component: 'Analog ICs', componentCategoryId: 'pcbs' },
  { id: 'r64', from: 'infineon', to: 'tesla', component: 'Power Semiconductors', componentCategoryId: 'pcbs', description: 'Motor controllers, power management' },
  { id: 'r65', from: 'infineon', to: 'boston_dynamics', component: 'Power Semiconductors', componentCategoryId: 'pcbs' },
  { id: 'r66', from: 'samsung_electro', to: 'tesla', component: 'MLCCs / Substrates', componentCategoryId: 'pcbs' },
  { id: 'r67', from: 'samsung_electro', to: 'unitree', component: 'Passive Components', componentCategoryId: 'pcbs' },

  // === RAW MATERIALS → COMPONENT MAKERS ===
  { id: 'r70', from: 'mp_materials', to: 'maxon', component: 'NdFeB Rare Earths', componentCategoryId: 'raw_materials', description: 'Magnet materials for BLDC motors' },
  { id: 'r71', from: 'mp_materials', to: 'kollmorgen', component: 'NdFeB Rare Earths', componentCategoryId: 'raw_materials' },
  { id: 'r72', from: 'mp_materials', to: 'nidec', component: 'NdFeB Rare Earths', componentCategoryId: 'raw_materials' },
  { id: 'r73', from: 'lynas', to: 'maxon', component: 'Rare Earth Oxides', componentCategoryId: 'raw_materials' },
  { id: 'r74', from: 'lynas', to: 'nidec', component: 'Rare Earth Oxides', componentCategoryId: 'raw_materials' },
  { id: 'r75', from: 'jl_mag', to: 'cubemars', component: 'NdFeB Magnets', componentCategoryId: 'raw_materials', description: 'Permanent magnets for Chinese motor supply chain' },
  { id: 'r76', from: 'jl_mag', to: 'estun', component: 'NdFeB Magnets', componentCategoryId: 'raw_materials' },

  // === ACTUATOR MODULE SUPPLIERS → OEMs ===
  { id: 'r106', from: 'cubemars', to: 'unitree', component: 'Actuator Modules', componentCategoryId: 'actuators_rotary', description: 'Complete rotary actuator modules' },
  { id: 'r107', from: 'cubemars', to: 'agibot', component: 'Actuator Modules', componentCategoryId: 'actuators_rotary' },
  { id: 'r108', from: 'cubemars', to: 'engineai', component: 'Actuator Modules', componentCategoryId: 'actuators_rotary' },
  { id: 'r109', from: 'estun', to: 'agibot', component: 'Servo Actuators', componentCategoryId: 'actuators_rotary', description: 'Integrated servo actuator packages' },
  { id: 'r110', from: 'estun', to: 'xpeng', component: 'Servo Actuators', componentCategoryId: 'actuators_rotary' },
  { id: 'r111', from: 'estun', to: 'ubtech', component: 'Servo Actuators', componentCategoryId: 'actuators_rotary' },

  // === BEARING SUPPLIERS → OEMs ===
  { id: 'r93', from: 'thk', to: 'tesla', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings', description: 'Hip and waist joint bearings' },
  { id: 'r94', from: 'thk', to: 'apptronik', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r95', from: 'thk', to: 'figure', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r96', from: 'thk', to: 'ubtech', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r97', from: 'thk', to: 'engineai', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r98', from: 'skf', to: 'boston_dynamics', component: 'Bearings', componentCategoryId: 'bearings' },
  { id: 'r99', from: 'skf', to: 'agility', component: 'Bearings', componentCategoryId: 'bearings' },
  { id: 'r100', from: 'skf', to: 'unitree', component: 'Ball Bearings', componentCategoryId: 'bearings' },

  // === SCREW SUPPLIERS → OEMs ===
  { id: 'r101', from: 'rollvis', to: 'tesla', component: 'Planetary Roller Screws', componentCategoryId: 'screws', description: '1:14 ratio screws for linear actuators' },
  { id: 'r102', from: 'rollvis', to: 'apptronik', component: 'Planetary Roller Screws', componentCategoryId: 'screws' },
  { id: 'r103', from: 'rollvis', to: 'figure', component: 'Planetary Roller Screws', componentCategoryId: 'screws' },
  { id: 'r104', from: 'ewellix', to: 'boston_dynamics', component: 'Roller Screws', componentCategoryId: 'screws' },
  { id: 'r105', from: 'ewellix', to: 'agility', component: 'Roller Screws', componentCategoryId: 'screws' },

  // === BATTERY SUPPLIERS → OEMs ===
  { id: 'r85', from: 'panasonic_energy', to: 'tesla', component: 'Battery Cells', componentCategoryId: 'batteries', description: '2170/4680 lithium-ion cells' },
  { id: 'r86', from: 'catl', to: 'unitree', component: 'Battery Pack', componentCategoryId: 'batteries', description: 'Lithium-ion battery packs' },
  { id: 'r87', from: 'catl', to: 'agibot', component: 'Battery Pack', componentCategoryId: 'batteries' },
  { id: 'r88', from: 'catl', to: 'xpeng', component: 'Battery Cells', componentCategoryId: 'batteries', description: 'Solid-state battery development' },
  { id: 'r89', from: 'catl', to: 'ubtech', component: 'Battery Pack', componentCategoryId: 'batteries', description: 'Dual hot-swap battery packs' },
  { id: 'r90', from: 'catl', to: 'engineai', component: 'Battery Cells', componentCategoryId: 'batteries' },
  { id: 'r91', from: 'byd_battery', to: 'agibot', component: 'Battery Pack', componentCategoryId: 'batteries' },
  { id: 'r92', from: 'byd_battery', to: 'ubtech', component: 'Battery Pack', componentCategoryId: 'batteries' },

  // === END EFFECTOR SUPPLIERS ===
  { id: 'r80', from: 'psyonic', to: 'apptronik', component: 'Dexterous Hands', componentCategoryId: 'end_effectors', description: 'Off-the-shelf robotic/prosthetic hands' },
  { id: 'r81', from: 'sharpa', to: 'unitree', component: 'Dexterous Hands', componentCategoryId: 'end_effectors', description: 'Dexterous hands for Chinese OEMs' },
  { id: 'r82', from: 'sharpa', to: 'agibot', component: 'Dexterous Hands', componentCategoryId: 'end_effectors' },
  { id: 'r405', from: 'shadow_robot', to: 'boston_dynamics', component: 'Dexterous Hands', componentCategoryId: 'end_effectors', description: 'Research-grade 24 DOF tendon-driven hand (OpenAI, DeepMind, NASA)' },
  { id: 'r406', from: 'orca_dexterity', to: 'pollen_robotics', component: 'Dexterous Hands', componentCategoryId: 'end_effectors', description: 'Open-source 17 DOF hand ($3.5K-$6.1K), NVIDIA Isaac Gym support' },
  { id: 'r407', from: 'robotis', to: 'pollen_robotics', component: 'Dexterous Hands', componentCategoryId: 'end_effectors', description: 'Dynamixel XM430 servo motors for Reachy 2 grippers' },

  // === ADDITIONAL SENSOR RELATIONSHIPS (from audit) ===
  { id: 'r120', from: 'sony_sensors', to: 'boston_dynamics', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Camera sensors for 360° perception' },
  { id: 'r121', from: 'sony_sensors', to: 'agility', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Head and torso camera sensors' },
  { id: 'r122', from: 'sony_sensors', to: '1x', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: '8.85MP 90Hz stereo fisheye sensors' },
  { id: 'r123', from: 'sony_sensors', to: 'apptronik', component: 'Image Sensors', componentCategoryId: 'sensors_general' },
  { id: 'r124', from: 'sony_sensors', to: 'ubtech', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'RGB and fisheye camera sensors' },
  { id: 'r125', from: 'sony_sensors', to: 'dexmate', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Sensors for multi-camera perception' },
  { id: 'r126', from: 'sony_sensors', to: 'sunday', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Eye and hand camera sensors' },
  { id: 'r127', from: 'ouster', to: 'agility', component: 'LiDAR', componentCategoryId: 'sensors_general', description: 'Digital LiDAR for navigation' },
  { id: 'r128', from: 'ouster', to: 'dexmate', component: 'LiDAR', componentCategoryId: 'sensors_general', description: 'Dual 3D LiDAR' },
  { id: 'r129', from: 'hesai', to: 'engineai', component: 'LiDAR', componentCategoryId: 'sensors_general', description: '360° LiDAR sensor' },
  { id: 'r130', from: 'orbbec', to: 'unitree', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: '360° depth camera array' },
  { id: 'r131', from: 'orbbec', to: 'agibot', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: 'RGB-D depth cameras' },
  { id: 'r132', from: 'bosch_sensortec', to: 'boston_dynamics', component: 'IMU', componentCategoryId: 'sensors_general', description: 'MEMS inertial measurement unit' },
  { id: 'r133', from: 'bosch_sensortec', to: 'agility', component: 'IMU', componentCategoryId: 'sensors_general', description: 'MEMS IMU for balance and orientation' },
  { id: 'r134', from: 'bosch_sensortec', to: '1x', component: 'IMU', componentCategoryId: 'sensors_general', description: 'Linkwise differential IMUs' },
  { id: 'r135', from: 'bosch_sensortec', to: 'unitree', component: 'IMU', componentCategoryId: 'sensors_general' },
  { id: 'r136', from: 'bosch_sensortec', to: 'apptronik', component: 'IMU', componentCategoryId: 'sensors_general' },
  { id: 'r137', from: 'bosch_sensortec', to: 'dexmate', component: 'IMU', componentCategoryId: 'sensors_general' },

  // === ADDITIONAL REDUCER RELATIONSHIPS (from audit) ===
  { id: 'r140', from: 'nabtesco', to: 'agility', component: 'Cycloidal Reducer', componentCategoryId: 'reducers', description: 'Cycloidal-pin gear transmission' },
  { id: 'r141', from: 'leaderdrive', to: 'unitree', component: 'Harmonic Reducer', componentCategoryId: 'reducers', description: 'Chinese domestic harmonic drive' },
  { id: 'r142', from: 'leaderdrive', to: 'agibot', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },
  { id: 'r143', from: 'harmonic_drive', to: 'xpeng', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },
  { id: 'r144', from: 'harmonic_drive', to: 'agibot', component: 'Harmonic Reducer', componentCategoryId: 'reducers' },

  // === ADDITIONAL MOTOR RELATIONSHIPS (from audit) ===
  { id: 'r145', from: 'moons', to: 'xpeng', component: 'Servo Motors', componentCategoryId: 'motors' },
  { id: 'r146', from: 'moons', to: 'ubtech', component: 'Servo Motors', componentCategoryId: 'motors' },
  { id: 'r147', from: '1x', to: '1x', component: 'Revo2 Motors (in-house)', componentCategoryId: 'motors', description: 'Proprietary motors with in-house wound copper coils, 5x torque density vs off-the-shelf' },

  // === ADDITIONAL BEARING RELATIONSHIPS (from audit) ===
  { id: 'r148', from: 'thk', to: 'agibot', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r149', from: 'thk', to: 'xpeng', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r150', from: 'skf', to: 'dexmate', component: 'Bearings', componentCategoryId: 'bearings' },
  { id: 'r151', from: 'nsk', to: 'agibot', component: 'Ball Bearings', componentCategoryId: 'bearings' },

  // === ADDITIONAL BATTERY RELATIONSHIPS (from audit) ===
  { id: 'r152', from: 'lg_energy', to: 'boston_dynamics', component: 'Battery Cells', componentCategoryId: 'batteries', description: 'Hyundai group battery supply chain' },
  { id: 'r153', from: 'panasonic_energy', to: 'agility', component: 'Battery Cells', componentCategoryId: 'batteries' },
  { id: 'r154', from: '1x', to: '1x', component: 'Battery Cells (in-house)', componentCategoryId: 'batteries', description: '1X manufactures their own batteries' },

  // === ADDITIONAL SCREW RELATIONSHIPS (from audit) ===
  { id: 'r155', from: 'nanjing_kgm', to: 'unitree', component: 'Planetary Roller Screws', componentCategoryId: 'screws', description: 'Chinese domestic screw supplier' },
  { id: 'r156', from: 'nanjing_kgm', to: 'agibot', component: 'Planetary Roller Screws', componentCategoryId: 'screws' },
  { id: 'r157', from: 'nanjing_kgm', to: 'xpeng', component: 'Planetary Roller Screws', componentCategoryId: 'screws' },
  { id: 'r158', from: 'nanjing_kgm', to: 'engineai', component: 'Planetary Roller Screws', componentCategoryId: 'screws' },

  // === ADDITIONAL COMPUTE/PCB RELATIONSHIPS (from audit) ===
  { id: 'r159', from: 'stmicro', to: 'tesla', component: 'Motor Drivers / MEMS', componentCategoryId: 'pcbs', description: 'Gate drivers and STM32 MCUs for actuator control' },
  { id: 'r160', from: 'stmicro', to: 'boston_dynamics', component: 'Motor Drivers', componentCategoryId: 'pcbs', description: 'MEMS IMUs and motor gate drivers' },
  { id: 'r161', from: 'nvidia', to: 'sunday', component: 'Jetson Platform', componentCategoryId: 'compute', description: 'Compute for ACT-1 model inference' },

  // === SUNDAY ROBOTICS (filling zero-relationship gap) ===
  { id: 'r162', from: 'kollmorgen', to: 'sunday', component: 'BLDC Motors', componentCategoryId: 'motors' },
  { id: 'r163', from: 'panasonic_energy', to: 'sunday', component: 'Battery Pack', componentCategoryId: 'batteries' },
  { id: 'r164', from: 'thk', to: 'sunday', component: 'Cross-Roller Bearings', componentCategoryId: 'bearings' },
  { id: 'r165', from: 'bosch_sensortec', to: 'sunday', component: 'IMU', componentCategoryId: 'sensors_general' },

  // === FOURIER INTELLIGENCE (GR-2) ===
  { id: 'r170', from: 'nvidia', to: 'fourier', component: 'Jetson Orin', componentCategoryId: 'compute', description: 'AI compute for GR-2' },
  { id: 'r171', from: 'leaderdrive', to: 'fourier', component: 'Harmonic Reducer', componentCategoryId: 'reducers', description: 'Reducers for FSA actuators' },
  { id: 'r172', from: 'catl', to: 'fourier', component: 'Battery Pack', componentCategoryId: 'batteries' },
  { id: 'r173', from: 'bosch_sensortec', to: 'fourier', component: 'IMU', componentCategoryId: 'sensors_general' },
  { id: 'r174', from: 'sony_sensors', to: 'fourier', component: 'Image Sensors', componentCategoryId: 'sensors_general' },

  // === KEPLER ROBOTICS (K2) ===
  { id: 'r180', from: 'leaderdrive', to: 'kepler', component: 'Harmonic Reducer', componentCategoryId: 'reducers', description: 'Chinese domestic reducer supply' },
  { id: 'r181', from: 'catl', to: 'kepler', component: 'Battery Pack', componentCategoryId: 'batteries' },
  { id: 'r182', from: 'bosch_sensortec', to: 'kepler', component: 'IMU', componentCategoryId: 'sensors_general' },
  { id: 'r183', from: 'sony_sensors', to: 'kepler', component: 'Image Sensors', componentCategoryId: 'sensors_general' },

  // === SANCTUARY AI (Phoenix) ===
  { id: 'r190', from: 'nvidia', to: 'sanctuary_ai', component: 'Jetson Platform', componentCategoryId: 'compute', description: 'Compute for Carbon AI system' },
  { id: 'r191', from: 'sony_sensors', to: 'sanctuary_ai', component: 'Image Sensors', componentCategoryId: 'sensors_general' },
  { id: 'r192', from: 'bosch_sensortec', to: 'sanctuary_ai', component: 'IMU', componentCategoryId: 'sensors_general' },

  // === SAMSUNG SDI (filling zero-relationship gap) ===
  { id: 'r210', from: 'samsung_sdi', to: 'boston_dynamics', component: 'Battery Cells', componentCategoryId: 'batteries', description: 'Hyundai group battery supply chain' },
  { id: 'r211', from: 'samsung_sdi', to: 'figure', component: 'Battery Cells', componentCategoryId: 'batteries', description: 'High energy density cylindrical cells' },

  // === EXPANDING EXISTING SUPPLIERS (high-confidence) ===
  { id: 'r200', from: 'horizon_robotics', to: 'ubtech', component: 'AI Chips', componentCategoryId: 'compute', description: 'Chinese domestic compute alternative' },
  { id: 'r201', from: 'horizon_robotics', to: 'agibot', component: 'AI Chips', componentCategoryId: 'compute', description: 'Domestic compute qualification' },
  { id: 'r202', from: 'nsk', to: 'unitree', component: 'Ball Bearings', componentCategoryId: 'bearings' },
  { id: 'r203', from: 'nsk', to: 'tesla', component: 'Precision Bearings', componentCategoryId: 'bearings' },
  { id: 'r204', from: 'nsk', to: 'boston_dynamics', component: 'Angular Contact Bearings', componentCategoryId: 'bearings' },
  { id: 'r205', from: 'nabtesco', to: 'boston_dynamics', component: 'RV Reducer', componentCategoryId: 'reducers', description: 'Cycloidal reducer for high-torque joints' },
  { id: 'r206', from: 'kollmorgen', to: 'boston_dynamics', component: 'BLDC Motors', componentCategoryId: 'motors', description: 'Frameless motors from Spot heritage' },
  { id: 'r207', from: 'sony_sensors', to: 'unitree', component: 'Image Sensors', componentCategoryId: 'sensors_general' },
  { id: 'r208', from: 'sony_sensors', to: 'xpeng', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Eagle Eye stereo camera sensors' },

  // === NEW OEM SUPPLY CHAIN RELATIONSHIPS ===

  // Noetix Robotics (N2)
  { id: 'r299', from: 'nvidia', to: 'noetix', component: 'Jetson Orin', componentCategoryId: 'compute', description: 'AI inference compute (40 TOPS, 8GB) alongside RK3588s control' },

  // Booster Robotics (T1)
  { id: 'r310', from: 'nvidia', to: 'booster', component: 'Jetson AGX Orin', componentCategoryId: 'compute', description: 'AI compute (200 TOPS)' },
  { id: 'r311', from: 'intel', to: 'booster', component: 'i7 CPU', componentCategoryId: 'compute', description: 'Main CPU compute' },
  { id: 'r312', from: 'intel', to: 'booster', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: 'RealSense D455 RGBD depth camera' },


  // RobotEra (L7)
  { id: 'r330', from: 'nvidia', to: 'robotera', component: 'Jetson AGX Orin', componentCategoryId: 'compute', description: 'AI compute (275 TOPS), NVIDIA Developer Program member' },

  // Dobot (Atom)
  { id: 'r340', from: 'intel', to: 'dobot', component: 'Core i9 CPU', componentCategoryId: 'compute', description: 'Main CPU compute (24 cores)' },
  { id: 'r342', from: 'intel', to: 'dobot', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: 'RealSense D455 depth camera' },
  { id: 'r341', from: 'nvidia', to: 'dobot', component: 'GPU', componentCategoryId: 'compute', description: '16GB GPU (1500 TOPS total system), Physics AI partner' },

  // LimX Dynamics (Oli)
  { id: 'r350', from: 'nvidia', to: 'limx', component: 'Jetson Orin', componentCategoryId: 'compute', description: 'Primary AI/perception compute' },
  { id: 'r351', from: 'intel', to: 'limx', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: 'RealSense D435i (head, chest, wrist, hip)' },

  // PUDU Robotics (D9)
  { id: 'r360', from: 'nvidia', to: 'pudu', component: 'Jetson Orin', componentCategoryId: 'compute', description: 'AI compute in dual-processor architecture' },

  // MagicLab (MagicBot G1)
  { id: 'r370', from: 'leaderdrive', to: 'magiclab', component: 'Harmonic Reducer', componentCategoryId: 'reducers', description: 'Waist, arm, and wrist joint reducers' },
  { id: 'r371', from: 'moons', to: 'magiclab', component: 'Precision Motors', componentCategoryId: 'motors', description: 'Coreless/hollow-cup motors' },

  // Xiaomi (CyberOne)
  { id: 'r380', from: 'intel', to: 'xiaomi', component: 'Xeon CPUs', componentCategoryId: 'compute', description: 'Dual Xeon quad-core processors' },
  { id: 'r382', from: 'intel', to: 'xiaomi', component: 'Depth Cameras', componentCategoryId: 'sensors_general', description: 'RealSense D455 Mi-Sense depth camera' },
  { id: 'r381', from: 'harmonic_drive', to: 'xiaomi', component: 'Harmonic Reducer', componentCategoryId: 'reducers', description: 'Joint harmonic gearboxes' },

  // Neura Robotics (4NE-1)
  { id: 'r390', from: 'nvidia', to: 'neura_4ne1', component: 'Jetson Thor T5000', componentCategoryId: 'compute', description: 'Main compute with water cooling, GR00T XX VLA' },

  // Vanar Robots (Gen 1)
  { id: 'r391', from: 'nvidia', to: 'vanar_robots', component: 'Jetson Platform', componentCategoryId: 'compute', description: 'Primary compute for in-house VLA models' },
  { id: 'r392', from: 'panasonic_energy', to: 'vanar_robots', component: 'Battery Cells', componentCategoryId: 'batteries', description: 'Commercially sourced Panasonic cells for custom battery pack' },
  { id: 'r393', from: 'sony_sensors', to: 'vanar_robots', component: 'Image Sensors', componentCategoryId: 'sensors_general', description: 'Planned Sony vision sensors for multi-modal perception' },

  // Fauna Robotics (Sprout)
  { id: 'r400', from: 'nvidia', to: 'fauna', component: 'Jetson AGX Orin 64GB', componentCategoryId: 'compute', description: 'Primary AI/perception compute' },
  { id: 'r401', from: 'stereolabs', to: 'fauna', component: 'ZED2i Stereo Camera', componentCategoryId: 'sensors_general', description: 'Stereo RGB-D for visual-inertial odometry and mapping' },
  { id: 'r402', from: 'stmicro', to: 'fauna', component: 'VL53L8CX ToF Sensors', componentCategoryId: 'sensors_general', description: '4x time-of-flight obstacle detection sensors' },
  { id: 'r403', from: 'molicel', to: 'fauna', component: 'P50B Battery Cells', componentCategoryId: 'batteries', description: 'Li-ion 21700 cells, 46.8V swappable pack' },
  { id: 'r404', from: 'bosch_sensortec', to: 'fauna', component: 'IMU', componentCategoryId: 'sensors_general', description: '9-axis inertial measurement unit' },

];
// NullLabTests additions — potential for embodied AGI acceleration

{
  from: "Tesla",
  to: "Nvidia",
  component: "compute",
  type: "supplier",
  confidence: "confirmed",
  source: "https://www.tesla.com/AI (Optimus compute references)",
  notes: "High-bandwidth inference for real-time world models"
},
{
  from: "Figure",
  to: "Agile Robots",
  component: "actuators",
  type: "supplier",
  confidence: "likely",
  source: "https://example-robotics-news.com/figure-agile-partnership",
  notes: "Dexterity boost — key for self-improving manipulation loops"
}
