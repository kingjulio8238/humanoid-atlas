import type { HeadDesign } from './types';

export const headDesigns: HeadDesign[] = [
  // ===================== OLED SCREEN =====================
  {
    id: 'optimus_gen3',
    name: 'Optimus (Gen 3)',
    developer: 'Tesla',
    country: 'US',
    faceType: 'oled-screen',
    description:
      'Samsung 8-inch curved OLED face display capable of showing full facial expressions and dynamic status indicators. Head houses 8 Autopilot-heritage cameras providing comprehensive vision coverage. Pure vision system with no LiDAR \u2014 uses neural networks trained on billions of miles of Tesla vehicle data for stereo depth estimation. Gen 3 adds Samsung Electro-Mechanics camera modules with Sony sensors and xAI Grok voice integration.',
    displayTech: 'Samsung 8-inch curved OLED',
    headCameras: '8 (Autopilot multi-camera unit)',
    totalCameras: '8',
    depthApproach: 'Stereo vision (neural depth estimation)',
    lidar: 'None (pure vision)',
    audioSystem: 'Microphones + speakers, xAI Grok voice',
    interactiveFeatures:
      'Full facial expressions, emotional states, status signaling, conversational voice',
    sources: [
      { label: 'Tesla AI & Robotics', url: 'https://www.tesla.com/AI' },
      {
        label: 'Samsung OLED Supply (TrendForce)',
        url: 'https://www.trendforce.com/news/2025/08/18/news-samsung-reportedly-to-supply-8-inch-oleds-to-tesla-in-2027-possibly-for-optimus-robots/',
      },
    ],
  },
  {
    id: 'xpeng_iron',
    name: 'Iron',
    developer: 'XPeng',
    country: 'CN',
    faceType: 'oled-screen',
    description:
      'Most anthropomorphic humanoid face \u2014 3D curved OLED display wrapping around the head capable of displaying full facial expressions (smile, wink, mood). Beneath the display sits a 3D-printed lattice "fascia" mimicking musculature, covered in skin-like material with embedded full-body tactile sensors. Multiple stereo and depth cameras provide 720-degree spatial awareness, leveraging XPeng\'s autonomous vehicle sensor stack.',
    displayTech: '3D curved OLED (full face wrap)',
    headCameras: 'Multiple stereo + depth',
    totalCameras: 'Multiple (720-degree coverage)',
    depthApproach: 'Dedicated depth sensors + stereo',
    lidar: 'Likely (AV heritage)',
    audioSystem: 'Microphone arrays at ear positions',
    interactiveFeatures:
      'Full expressions (smile, wink, mood), skin-like covering, tactile feedback',
    sources: [
      {
        label: 'XPeng AI Day',
        url: 'https://www.xpeng.com/news/019a56f54fe99a2a0a8d8a0282e402b7',
      },
      {
        label: 'BotInfo: XPeng Iron',
        url: 'https://botinfo.ai/articles/xpeng-iron-humanoid-robot',
      },
    ],
  },

  // ===================== STATUS SCREEN =====================
  {
    id: 'fourier_gr2',
    name: 'GR-2',
    developer: 'Fourier',
    country: 'CN',
    faceType: 'status-screen',
    description:
      'High-definition oval display embedded in the head with integrated emotion AI module enabling emotional expression. 6 RGB cameras distributed around the body provide 360-degree bird\'s-eye-view perception. Pure vision system \u2014 no LiDAR or radar. LLM-powered conversation with built-in emotional expression systems and circular microphone array for voice recognition.',
    displayTech: 'HD oval display + emotion AI module',
    headCameras: 'Cameras from 6-cam array',
    totalCameras: '6 (360-degree BEV)',
    depthApproach: 'AI-based depth estimation',
    lidar: 'None',
    audioSystem: 'Circular microphone array + speakers',
    interactiveFeatures:
      'Emotional display via oval screen, LLM-powered conversation',
    sources: [
      { label: 'Fourier GR-2', url: 'https://www.fftai.com/products-gr2' },
    ],
  },
  {
    id: 'agibot_a2',
    name: 'A2',
    developer: 'AgiBot',
    country: 'CN',
    faceType: 'status-screen',
    description:
      'Interactive screen embedded in the head displaying dynamic facial expressions. RGBD and fisheye cameras in the head provide depth and wide-angle coverage, with 6 HD cameras total across the body plus 360-degree LiDAR. Achieves 96% facial recognition accuracy and 99% face wake-up rate with lip-reading capability in noisy environments. Multi-turn conversation powered by WorkGPT LLM.',
    displayTech: 'Interactive face screen',
    headCameras: '2 (RGBD + fisheye)',
    totalCameras: '6+ HD + LiDAR',
    depthApproach: 'Active depth (RGBD)',
    lidar: '360-degree LiDAR',
    audioSystem: 'Microphone array (sound source localization) + speaker',
    interactiveFeatures:
      'Dynamic expressions, facial recognition, lip-reading, voice conversation',
    sources: [
      { label: 'AgiBot A2', url: 'https://www.agibot.com/products/A2' },
    ],
  },
  {
    id: 'neura_4ne1',
    name: '4NE-1',
    developer: 'NEURA Robotics',
    country: 'DE',
    faceType: 'status-screen',
    description:
      'Interactive touchscreen display on the head designed by Studio F.A. Porsche (Gen 3). Omnidirectional 3D vision with 360-degree environmental perception using depth cameras and LiDAR. Features NEURA\'s proprietary Touchless Safe Human Detection (SHD) sensor for non-intrusive proximity detection. Multi-language voice recognition with emotional tone detection.',
    displayTech: 'Interactive touchscreen (Porsche-designed)',
    headCameras: '3D vision + depth cameras',
    totalCameras: 'Multiple (360-degree perception)',
    depthApproach: 'Depth cameras',
    lidar: 'Yes',
    audioSystem: 'Multi-language voice recognition + speakers',
    interactiveFeatures:
      'Customizable display, voice/gesture recognition, emotional tone detection',
    sources: [
      {
        label: 'NEURA 4NE-1',
        url: 'https://neura-robotics.com/products/4ne1/',
      },
    ],
  },
  {
    id: 'apollo',
    name: 'Apollo',
    developer: 'Apptronik',
    country: 'US',
    faceType: 'status-screen',
    description:
      'Concave face with multi-element display system co-designed with design firm Argo. Two large circular LED "eyes" house stereoscopic cameras serving dual perception and expression roles. A monochromatic E Ink display below the eyes functions as a mouth \u2014 showing words, icons, speech bubbles, and an ellipsis when processing. Separate OLED display on the chest shows robot name, task, and battery level.',
    displayTech: 'LED eyes + E Ink mouth + chest OLED',
    headCameras: '2 stereo (integrated in LED eyes)',
    totalCameras: '2+',
    depthApproach: 'Stereo vision',
    lidar: 'Not disclosed',
    audioSystem: 'Speakers + status LEDs',
    interactiveFeatures:
      'E Ink text/icons, LED mood indicators, chest status display',
    sources: [
      { label: 'Apptronik Apollo', url: 'https://apptronik.com/apollo' },
      {
        label: 'E Ink Feature',
        url: 'https://www.ereaderpro.co.uk/en/blogs/news/e-ink-product-apptronik-apollo-robot-combines-eink-and-nasa-technology',
      },
    ],
  },

  // ===================== LED INDICATOR =====================
  {
    id: 'digit',
    name: 'Digit',
    developer: 'Agility Robotics',
    country: 'US',
    faceType: 'led-indicator',
    description:
      'Oblong head deliberately angled sideways to avoid human resemblance. Two large LED animated eye panels signal directional intent and status to co-workers. Third rear light creates a three-point system readable from any angle. Uniquely, all 4 perception cameras are torso-mounted (Intel RealSense D455), not in the head \u2014 the head serves purely for human-robot interaction and antenna housing.',
    displayTech: 'LED animated eye panels + rear light',
    headCameras: '0 (cameras in torso)',
    totalCameras: '4 (RealSense D455, torso-mounted)',
    depthApproach: 'Active IR stereo (RealSense D455)',
    lidar: 'Yes',
    audioSystem: 'Acoustic sensors + speakers',
    interactiveFeatures:
      'Directional gaze, blinking, movement indication, rear status light',
    sources: [
      {
        label: 'Agility Robotics',
        url: 'https://www.agilityrobotics.com',
      },
      {
        label: 'IEEE Spectrum: Digit',
        url: 'https://spectrum.ieee.org/agility-robotics-digit',
      },
    ],
  },
  {
    id: 'unitree_g1',
    name: 'G1',
    developer: 'Unitree',
    country: 'CN',
    faceType: 'led-indicator',
    description:
      'Compact head with blue LED "light mask" faceplate providing visual feedback and interactive personality. Houses Intel RealSense D435i depth camera plus HD binocular camera for stereo perception. Livox MID-360 LiDAR mounted in the head provides 360-degree spatial mapping. SDK-controllable LED lighting via Unitree Light Control API. 4-microphone array with noise cancellation.',
    displayTech: 'Blue LED light mask (SDK-controllable)',
    headCameras: '2 (RealSense D435i + binocular)',
    totalCameras: '4 (with wrist cameras on EDU models)',
    depthApproach: 'Active IR stereo (RealSense D435i)',
    lidar: 'Livox MID-360 (head-mounted)',
    audioSystem: '4-mic array (noise cancellation) + 5W stereo speaker',
    interactiveFeatures: 'LED status mask, voice commands, gesture greetings',
    sources: [
      { label: 'Unitree G1', url: 'https://www.unitree.com/g1/' },
    ],
  },
  {
    id: 'neo_gamma',
    name: 'NEO Gamma',
    developer: '1X Technologies',
    country: 'NO',
    faceType: 'led-indicator',
    description:
      'Dark shield face panel with set-back camera "eyes" behind it, flanked by circular LED Emotive Ear Rings that pulse with colored light to communicate status \u2014 listening, battery level, attention state, operator mode. Dual 8.85MP stereo fisheye cameras at 90Hz with 180-degree FOV each. Deliberately eliminated LiDAR in favor of pure stereo vision. Japanese/Scandi-inspired minimalist aesthetic with 3D-knitted nylon KnitSuit covering.',
    displayTech: 'LED Emotive Ear Rings (side-mounted)',
    headCameras: '2 stereo fisheye (8.85MP, 90Hz, 180-deg FOV)',
    totalCameras: '2',
    depthApproach: 'Stereo vision (no dedicated depth sensor)',
    lidar: 'None (removed from Beta)',
    audioSystem: '4 beamforming microphones + pelvis/chest speakers',
    interactiveFeatures:
      'Ear ring color states, voice interaction via LLM, body language',
    sources: [
      { label: '1X NEO', url: 'https://www.1x.tech/neo' },
      {
        label: '1X NEO Gamma',
        url: 'https://www.1x.tech/discover/introducing-neo-gamma',
      },
    ],
  },
  {
    id: 'atlas_electric',
    name: 'Atlas (Electric)',
    developer: 'Boston Dynamics',
    country: 'US',
    faceType: 'led-indicator',
    description:
      'Circular head with silicone LED ring light replacing a traditional face \u2014 deliberately designed as "a helpful robot, not a person." Ring light glows (orange in demos) to communicate status and presence. Perception sensors integrated behind the ring light assembly. Dedicated neck pitch actuator enables a 10-degree nod for social acknowledgment and sensor tilting. Head designed to survive a 2-meter fall onto a table edge.',
    displayTech: 'Silicone LED ring light (circular)',
    headCameras: 'Stereo + RGB + depth (count undisclosed)',
    totalCameras: 'Undisclosed',
    depthApproach: 'Stereo + dedicated depth',
    lidar: 'Yes',
    audioSystem: 'Not disclosed',
    interactiveFeatures: 'Ring light status, 10-degree nod gesture',
    sources: [
      {
        label: 'Boston Dynamics Atlas',
        url: 'https://bostondynamics.com/atlas/',
      },
      {
        label: 'Atlas Design Logic',
        url: 'https://www.humanoidsdaily.com/news/form-as-function-boston-dynamics-details-the-industrial-design-logic-behind-the-production-atlas',
      },
    ],
  },

  // ===================== NO DISPLAY =====================
  {
    id: 'phoenix',
    name: 'Phoenix',
    developer: 'Sanctuary AI',
    country: 'CA',
    faceType: 'no-display',
    description:
      'Utilitarian sensor housing with no screen, LED, or expressive elements. Head optimized for close-range manipulation perception \u2014 seeing what the hands are doing with precision. Depth cameras and RGB vision with improved FOV and resolution in Gen 8. Described as "the most sensor-rich humanoid ever built." Design prioritizes data capture quality for training the Carbon AI cognitive architecture.',
    displayTech: 'None',
    headCameras: 'Depth + RGB (count undisclosed)',
    totalCameras: 'Undisclosed',
    depthApproach: 'Depth cameras',
    lidar: 'Yes',
    audioSystem: 'Audio/video system (Gen 8 improved)',
    interactiveFeatures: 'None (pure sensor pod)',
    sources: [
      {
        label: 'Sanctuary AI Phoenix',
        url: 'https://www.sanctuary.ai/blog/sanctuary-ai-unveils-phoenix-a-humanoid-general-purpose-robot-designed-for-work',
      },
    ],
  },
  {
    id: 'forerunner_k2',
    name: 'Forerunner K2',
    developer: 'Kepler Robotics',
    country: 'CN',
    faceType: 'no-display',
    description:
      'Industrial mech-style head shell housing sensors with no face display. Wide-angle binocular camera provides stereo vision, supplemented by 3D cameras and fisheye vision cameras on the K2. 4-microphone far-field array for voice commands with AHRS (Attitude and Heading Reference System) for spatial awareness. 2 DOF head movement for natural interaction posture. Perception processed through proprietary NEBULA AI system (100 TOPS).',
    displayTech: 'None',
    headCameras: 'Wide-angle binocular + 3D + fisheye',
    totalCameras: '2+',
    depthApproach: 'Stereo vision',
    lidar: 'None',
    audioSystem: '4-mic far-field array + stereophonic speakers',
    interactiveFeatures: 'Voice commands, 2 DOF head tracking',
    sources: [
      {
        label: 'Kepler Forerunner',
        url: 'https://www.gotokepler.com/',
      },
    ],
  },
  {
    id: 'walker_s2',
    name: 'Walker S2',
    developer: 'UBTech',
    country: 'CN',
    faceType: 'no-display',
    description:
      'No head display \u2014 interaction via 7-inch touchscreen on the chest. First Chinese humanoid to adopt a pure RGB dual-camera vision system using deep learning-based stereo depth estimation for real-time dense depth maps. Depth LiDAR provides additional spatial mapping. Designed for factory environments and 24/7 industrial operation.',
    displayTech: 'None (7-inch chest touchscreen)',
    headCameras: '2 RGB (binocular stereo)',
    totalCameras: '2',
    depthApproach: 'DL stereo depth estimation',
    lidar: 'Yes (depth LiDAR)',
    audioSystem: '4-microphone array (multi-language voice)',
    interactiveFeatures:
      'Chest touchscreen, voice commands, gesture recognition',
    sources: [
      {
        label: 'UBTech Walker S2',
        url: 'https://www.ubtrobot.com/en/humanoid/products/walker-s2',
      },
    ],
  },
  {
    id: 'unitree_h1',
    name: 'H1',
    developer: 'Unitree',
    country: 'CN',
    faceType: 'no-display',
    description:
      'Full-size research/industrial humanoid with purely utilitarian head \u2014 no LED face or display elements. Single Intel RealSense D435i depth camera plus Livox MID-360 LiDAR for perception. Simpler sensor setup than the consumer-oriented G1. Head serves as a functional sensor mounting point for the research platform.',
    displayTech: 'None',
    headCameras: '1 (RealSense D435i)',
    totalCameras: '1',
    depthApproach: 'Active IR stereo (RealSense D435i)',
    lidar: 'Livox MID-360 (head-mounted)',
    audioSystem: 'Microphone + speaker',
    interactiveFeatures: 'None',
    sources: [
      { label: 'Unitree H1', url: 'https://www.unitree.com/h1/' },
    ],
  },
  {
    id: 'dexmate_vega',
    name: 'Vega',
    developer: 'Dexmate',
    country: 'CN',
    faceType: 'no-display',
    description:
      'Compact sensor pod head on a wheeled mobile base with foldable humanoid upper body. RGB-D cameras for primary vision. 3 DOF head for panning, tilting, and orienting sensors. Purely industrial function \u2014 no social interaction features. Designed for long operating times (10-30 hours) on NVIDIA Jetson Orin with edge AI.',
    displayTech: 'None',
    headCameras: 'RGB-D cameras',
    totalCameras: 'Undisclosed',
    depthApproach: 'Active depth (RGB-D)',
    lidar: 'Likely',
    audioSystem: 'Not disclosed',
    interactiveFeatures: 'None (3 DOF head tracking only)',
    sources: [
      {
        label: 'Dexmate Vega',
        url: 'https://www.dexmate.ai/product/vega',
      },
    ],
  },

  // ===================== CONCEALED =====================
  {
    id: 'figure_02',
    name: 'Figure 02',
    developer: 'Figure',
    country: 'US',
    faceType: 'concealed',
    description:
      'Matte black curved panel face with minimal animated display showing dynamic icons based on interaction state. 2 cameras embedded in the face panel with 4 additional cameras distributed around the body for 360-degree coverage. Moved to purely RGB camera-based perception augmented by AI \u2014 no depth cameras or LiDAR in production. Full speech-to-speech conversational AI powered by custom models co-developed with OpenAI. Matte black finish reduces glare that could interfere with cameras.',
    displayTech: 'Curved panel with animated icons',
    headCameras: '2 (embedded in face panel)',
    totalCameras: '6 (360-degree coverage)',
    depthApproach: 'AI-based depth estimation',
    lidar: 'None (removed from Figure 01)',
    audioSystem: 'Microphones + speakers, OpenAI speech-to-speech',
    interactiveFeatures: 'Dynamic status icons, full voice conversation',
    sources: [
      {
        label: 'Figure 02',
        url: 'https://www.figure.ai/news/introducing-figure-02',
      },
      {
        label: 'TechCrunch: Figure 02 Face',
        url: 'https://techcrunch.com/2024/09/12/face-to-face-with-figures-new-humanoid-robot/',
      },
    ],
  },
  {
    id: 'sunday_memo',
    name: 'Memo',
    developer: 'Sunday Robotics',
    country: 'DE',
    faceType: 'concealed',
    description:
      'Round cartoon-like head with decorative button "eyes" that are not functional cameras. Actual camera hidden under the brim of a customizable hat \u2014 allowing users to make eye contact with the decorative eyes rather than staring into a camera lens. Hat also conceals microphones. Covered in soft silicone shell with no sharp corners. Designed for homes around children and pets, with customizable color-ways and personalized hats.',
    displayTech: 'Decorative eyes (non-functional)',
    headCameras: '1 (hidden under hat brim)',
    totalCameras: '1',
    depthApproach: 'Not disclosed',
    lidar: 'None',
    audioSystem: 'Microphones (hidden under hat)',
    interactiveFeatures:
      'Customizable hats and color-ways, body-language based',
    sources: [
      { label: 'Sunday Robotics', url: 'https://www.sunday.ai' },
      {
        label: 'Designboom: Memo',
        url: 'https://www.designboom.com/technology/half-bodied-personal-home-robot-memo-cartoon-character-humanoid-sunday-11-20-2025/',
      },
    ],
  },
];
