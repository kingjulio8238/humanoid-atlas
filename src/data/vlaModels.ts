import type { VLAModel } from './types';

export const vlaModels: VLAModel[] = [
  // ===================== PROPRIETARY / IN-HOUSE =====================
  {
    id: 'helix_02',
    name: 'Helix 02',
    developer: 'Figure',
    country: 'US',
    relationshipType: 'proprietary',
    description: 'Figure\'s second-gen VLA adding System 0 for kilohertz-rate whole-body balance. Trained on ~500 hours of teleoperated data. Replaced OpenAI partnership in favor of fully in-house AI.',
    release: '2026',
    focus: 'Whole-body humanoid manipulation',
    availability: 'Internal / Figure-only',
    sources: [
      { label: 'Figure: Helix 02', url: 'https://www.figure.ai/news/helix-02' },
      { label: 'Figure: Helix', url: 'https://www.figure.ai/news/helix' },
    ],
    companyLinks: [
      {
        companyId: 'figure',
        relationship: 'proprietary',
        sources: [
          { label: 'Figure: Helix 02', url: 'https://www.figure.ai/news/helix-02' },
        ],
      },
    ],
  },
  {
    id: 'redwood_ai',
    name: 'Redwood AI',
    developer: '1X',
    country: 'US',
    relationshipType: 'proprietary',
    description: '1X\'s in-house robot intelligence stack for NEO, aimed at end-to-end mobile manipulation in home environments.',
    release: '2025',
    focus: 'End-to-end mobile manipulation',
    availability: 'Internal / 1X-only',
    sources: [
      { label: '1X: Redwood AI', url: 'https://www.1x.tech/discover/redwood-ai' },
    ],
    companyLinks: [
      {
        companyId: '1x',
        relationship: 'proprietary',
        sources: [
          { label: '1X: Redwood AI', url: 'https://www.1x.tech/discover/redwood-ai' },
        ],
      },
    ],
  },
  {
    id: 'tesla_nn',
    name: 'Tesla End-to-End NN',
    developer: 'Tesla',
    country: 'US',
    relationshipType: 'proprietary',
    description: 'Adapted from Tesla\'s Full Self-Driving stack. Uses Occupancy Networks and end-to-end neural networks for visual processing and motion planning. Runs on Tesla AI5 SoC. Integrates xAI Grok for conversational AI.',
    release: '2024',
    focus: 'End-to-end perception and control',
    availability: 'Internal only',
    sources: [
      { label: 'Tesla AI & Robotics', url: 'https://www.tesla.com/AI' },
      { label: 'BotInfo: Tesla Optimus Analysis', url: 'https://botinfo.ai/articles/tesla-optimus' },
    ],
    companyLinks: [
      {
        companyId: 'tesla',
        relationship: 'proprietary',
        sources: [
          { label: 'Tesla AI & Robotics', url: 'https://www.tesla.com/AI' },
        ],
      },
    ],
  },
  {
    id: 'act_1_sunday',
    name: 'ACT-1',
    developer: 'Sunday Robotics',
    country: 'DE',
    relationshipType: 'proprietary',
    description: 'Foundation model trained on zero robot data -- instead using 10M+ episodes of genuine household routines from 500+ real homes via the Skill Capture Glove. Founded by Stanford roboticists Tony Zhao and Cheng Chi (creators of ACT and Diffusion Policy).',
    release: '2025',
    focus: 'Household manipulation from human demonstration',
    availability: 'Internal / Sunday-only',
    sources: [
      { label: 'Sunday: ACT-1', url: 'https://www.sunday.ai/journal/no-robot-data' },
      { label: 'Sunday: Homepage', url: 'https://www.sunday.ai' },
    ],
    companyLinks: [
      {
        companyId: 'sunday',
        relationship: 'proprietary',
        sources: [
          { label: 'Sunday: ACT-1', url: 'https://www.sunday.ai/journal/no-robot-data' },
        ],
      },
    ],
  },
  {
    id: 'carbon_ai',
    name: 'Carbon AI',
    developer: 'Sanctuary AI',
    country: 'CA',
    relationshipType: 'proprietary',
    description: 'Sanctuary\'s cognitive architecture combining symbolic reasoning, LLMs, deep learning, and RL. Translates natural language to physical actions with explainable reasoning. Can automate new tasks in under 24 hours.',
    release: '2023',
    focus: 'Cognitive architecture for general-purpose humanoid work',
    availability: 'Internal only',
    sources: [
      { label: 'Sanctuary AI: Phoenix', url: 'https://www.sanctuary.ai/blog/sanctuary-ai-unveils-phoenix-a-humanoid-general-purpose-robot-designed-for-work' },
    ],
    companyLinks: [
      {
        companyId: 'sanctuary_ai',
        relationship: 'proprietary',
        sources: [
          { label: 'Sanctuary AI: Phoenix', url: 'https://www.sanctuary.ai/blog/sanctuary-ai-unveils-phoenix-a-humanoid-general-purpose-robot-designed-for-work' },
        ],
      },
    ],
  },
  {
    id: 'xpeng_vla',
    name: 'XPeng VLA 2.0',
    developer: 'XPeng',
    country: 'CN',
    relationshipType: 'proprietary',
    description: 'Second-generation VLA adapted from XPeng\'s autonomous driving division. Three-model architecture: VLT (Vision-Language-Task) brain, VLA for 82-joint control, and VLM. Runs on 3 in-house Turing AI chips (2,250 TOPS).',
    release: '2025',
    focus: 'Full-body humanoid control from driving AI transfer',
    availability: 'Internal only',
    sources: [
      { label: 'XPeng: AI Day', url: 'https://www.xpeng.com/news/019a56f54fe99a2a0a8d8a0282e402b7' },
      { label: 'CnEVPost: Next-gen Iron', url: 'https://cnevpost.com/2025/11/05/xpeng-unveils-next-gen-iron-humanoid-robot/' },
    ],
    companyLinks: [
      {
        companyId: 'xpeng',
        relationship: 'proprietary',
        sources: [
          { label: 'XPeng: AI Day', url: 'https://www.xpeng.com/news/019a56f54fe99a2a0a8d8a0282e402b7' },
        ],
      },
    ],
  },
  {
    id: 'ubtech_brainnet',
    name: 'Co-Agent / BrainNet 2.0',
    developer: 'UBTech',
    country: 'CN',
    relationshipType: 'proprietary',
    description: 'UBTech\'s AI stack featuring the Co-Agent intelligent agent system for task planning, intention recognition, tool operation, and autonomous anomaly detection. BrainNet 2.0 provides multimodal reasoning.',
    release: '2025',
    focus: 'Industrial humanoid task planning and anomaly detection',
    availability: 'Internal only',
    sources: [
      { label: 'UBTech: Walker S2', url: 'https://www.ubtrobot.com/en/humanoid/products/walker-s2' },
      { label: 'AI Business: UBTech delivery', url: 'https://aibusiness.com/robotics/chinese-company-completes-first-mass-humanoid-robot-delivery' },
    ],
    companyLinks: [
      {
        companyId: 'ubtech',
        relationship: 'proprietary',
        sources: [
          { label: 'UBTech: Walker S2', url: 'https://www.ubtrobot.com/en/humanoid/products/walker-s2' },
        ],
      },
    ],
  },
  {
    id: 'kepler_vla',
    name: 'Kepler VLA+',
    developer: 'Kepler Robotics',
    country: 'CN',
    relationshipType: 'proprietary',
    description: 'Layered VLA+ model integrating cloud-based cognitive model with embodied control. Processes semantic commands for sorting, assembly, and guided tours. Uses imitation and reinforcement learning.',
    release: '2025',
    focus: 'Industrial task execution',
    availability: 'Internal only',
    sources: [
      { label: 'Kepler: Forerunner K2', url: 'https://www.gotokepler.com/' },
      { label: 'PR Newswire: K2 launch', url: 'https://www.prnewswire.com/news-releases/kepler-debuts-forerunner-k2-humanoid-robot-accelerating-commercial-deployment-302281546.html' },
    ],
    companyLinks: [
      {
        companyId: 'kepler',
        relationship: 'proprietary',
        sources: [
          { label: 'Kepler: Forerunner K2', url: 'https://www.gotokepler.com/' },
        ],
      },
    ],
  },

  // ===================== PARTNER ACCESS =====================
  {
    id: 'gemini_robotics',
    name: 'Gemini Robotics',
    developer: 'Google DeepMind',
    country: 'US',
    relationshipType: 'partner',
    description: 'VLA family built on Gemini 2.0 for embodied reasoning and robot action. Includes On-Device variant for local inference. Fine-tunable with as few as 50 demos. Restricted to trusted tester partners.',
    release: '2025',
    focus: 'Embodied reasoning + robot action',
    availability: 'Partner access (trusted testers)',
    sources: [
      { label: 'DeepMind: Gemini Robotics', url: 'https://deepmind.google/models/gemini-robotics/' },
      { label: 'Gemini Robotics arXiv', url: 'https://arxiv.org/abs/2503.20020' },
      { label: 'Apptronik + Google DeepMind', url: 'https://apptronik.com/news-collection/apptronik-partners-with-google-deepmind-robotics' },
      { label: 'Boston Dynamics + DeepMind', url: 'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/' },
    ],
    companyLinks: [
      {
        companyId: 'apptronik',
        relationship: 'partner',
        sources: [
          { label: 'Apptronik + Google DeepMind', url: 'https://apptronik.com/news-collection/apptronik-partners-with-google-deepmind-robotics' },
        ],
      },
      {
        companyId: 'boston_dynamics',
        relationship: 'partner',
        sources: [
          { label: 'Boston Dynamics + DeepMind', url: 'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/' },
        ],
      },
      {
        companyId: 'agility',
        relationship: 'partner',
        sources: [
          { label: 'DeepMind: Gemini Robotics (trusted tester)', url: 'https://deepmind.google/models/gemini-robotics/' },
        ],
      },
    ],
  },

  // ===================== OPEN SOURCE =====================
  {
    id: 'groot_n1',
    name: 'GR00T N1',
    developer: 'NVIDIA',
    country: 'US',
    relationshipType: 'open',
    description: 'NVIDIA\'s open humanoid foundation model (2B params). Open weights on Hugging Face. De facto platform layer used by most major OEMs for post-training and deployment. N1.5 released at Computex 2025.',
    release: '2025',
    focus: 'Open humanoid foundation model',
    availability: 'Open weights (Hugging Face)',
    sources: [
      { label: 'NVIDIA News: GR00T N1', url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks' },
      { label: 'Hugging Face: GR00T-N1-2B', url: 'https://huggingface.co/nvidia/GR00T-N1-2B' },
      { label: 'GR00T N1.5 Research', url: 'https://research.nvidia.com/labs/gear/gr00t-n1_5/' },
    ],
    companyLinks: [
      {
        companyId: '1x',
        relationship: 'partner',
        sources: [
          { label: '1X + NVIDIA Research Collaboration', url: 'https://www.1x.tech/discover/1X-NVIDIA-Research-Collaboration' },
        ],
      },
      {
        companyId: 'agility',
        relationship: 'partner',
        sources: [
          { label: 'Agility + NVIDIA', url: 'https://www.agilityrobotics.com/content/agility-robotics-expands-relationship-with-nvidia' },
        ],
      },
      {
        companyId: 'apptronik',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: Project GR00T partners', url: 'https://nvidianews.nvidia.com/news/foundation-model-isaac-robotics-platform' },
        ],
      },
      {
        companyId: 'boston_dynamics',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA CES 2026 Partners', url: 'https://nvidianews.nvidia.com/news/nvidia-releases-new-physical-ai-models-as-global-partners-unveil-next-generation-robots' },
        ],
      },
      {
        companyId: 'fourier',
        relationship: 'partner',
        sources: [
          { label: 'GR00T N1 Paper (GR-1 demos)', url: 'https://arxiv.org/abs/2503.14734' },
        ],
      },
      {
        companyId: 'unitree',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: GR00T ecosystem', url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks' },
        ],
      },
      {
        companyId: 'xpeng',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: GR00T ecosystem', url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks' },
        ],
      },
      {
        companyId: 'sanctuary_ai',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: GR00T ecosystem', url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks' },
        ],
      },
      {
        companyId: 'dexmate',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: Celebrating 2M+ Robotics Developers', url: 'https://blogs.nvidia.com/blog/2-million-robotics-developers/' },
        ],
      },
      {
        companyId: 'neura_4ne1',
        relationship: 'partner',
        sources: [
          { label: 'Neura Robotics: CES 2026 (GR00T XX)', url: 'https://neura-robotics.com/neura-robotics-at-ces-2026/' },
        ],
      },
      {
        companyId: 'dobot',
        relationship: 'partner',
        sources: [
          { label: 'NVIDIA: Physics AI partner ecosystem', url: 'https://nvidianews.nvidia.com/news/nvidia-isaac-gr00t-n1-open-humanoid-robot-foundation-model-simulation-frameworks' },
        ],
      },
      {
        companyId: 'fauna',
        relationship: 'partner',
        sources: [
          { label: 'Fauna Sprout Technical Report (IsaacSim/Lab + GR00T refs)', url: 'https://arxiv.org/abs/2601.18963' },
        ],
      },
    ],
  },
  {
    id: 'pi0',
    name: '\u03C00',
    developer: 'Physical Intelligence',
    country: 'US',
    relationshipType: 'open',
    description: 'The first generalist robotic policy from Physical Intelligence. Built on a VLM backbone with flow-matching action head. Open-sourced Feb 2025 via openpi.',
    release: '2024',
    focus: 'Generalist robot policy',
    availability: 'Open weights + code',
    sources: [
      { label: 'Physical Intelligence: openpi', url: 'https://www.physicalintelligence.company/blog/openpi' },
      { label: '\u03C00 on Hugging Face', url: 'https://huggingface.co/blog/pi0' },
      { label: '\u03C00 arXiv', url: 'https://arxiv.org/abs/2410.24164' },
    ],
    companyLinks: [
      {
        companyId: 'agibot',
        relationship: 'partner',
        sources: [
          { label: 'AgiBot + Physical Intelligence partnership', url: 'https://www.newsfilecorp.com/release/247097/AgiBot-Partners-with-Physical-Intelligence-to-Pioneer-Global-Innovation-in-Embodied-Intelligence' },
        ],
      },
      {
        companyId: 'astribot',
        relationship: 'partner',
        sources: [
          { label: 'Astribot + Physical Intelligence pi0', url: 'https://mikekalil.com/blog/astribot-physical-intelligence/' },
        ],
      },
      {
        companyId: 'ultra',
        relationship: 'partner',
        sources: [
          { label: 'Ultra Robotics - Operator 1', url: 'https://www.ultra.tech/' },
        ],
      },
    ],
  },
  {
    id: 'pi0_fast',
    name: '\u03C00-FAST',
    developer: 'Physical Intelligence',
    country: 'US',
    relationshipType: 'open',
    description: 'Fast variant of \u03C00 using FAST (Fast Action Sequence Tokenization) to compress continuous actions into discrete tokens. Enables 6x faster inference while maintaining policy quality. Part of the openpi release.',
    release: '2025',
    focus: 'Fast-inference generalist robot policy',
    availability: 'Open weights + code',
    sources: [
      { label: 'Physical Intelligence: openpi', url: 'https://www.physicalintelligence.company/blog/openpi' },
      { label: '\u03C00-FAST arXiv', url: 'https://arxiv.org/abs/2501.09747' },
    ],
    companyLinks: [],
  },
  {
    id: 'pi05',
    name: '\u03C00.5',
    developer: 'Physical Intelligence',
    country: 'US',
    relationshipType: 'open',
    description: 'VLA focused on generalization to entirely new environments. Co-trained on heterogeneous data (robot actions, web data, verbal instructions). Uses hierarchical inference: high-level semantic actions as text, then low-level motor commands via flow matching. 94% out-of-distribution success rate across ~100 diverse homes.',
    release: '2025',
    focus: 'Environment generalization for household tasks',
    availability: 'Open weights + code',
    sources: [
      { label: 'Physical Intelligence: \u03C00.5', url: 'https://www.pi.website/blog/pi05' },
    ],
    companyLinks: [],
  },
  {
    id: 'pi06',
    name: '\u03C0*0.6',
    developer: 'Physical Intelligence',
    country: 'US',
    relationshipType: 'ecosystem',
    description: '5B-parameter VLA trained with Recap (RL with Experience & Corrections via Advantage-conditioned Policies). Learns from demonstrations, expert corrections, and autonomous RL. More than doubles throughput and halves failure rates vs imitation learning alone. Demonstrated making espresso (>90% success), folding 50 novel laundry items, and assembling 59 boxes.',
    release: '2025',
    focus: 'High-reliability real-world task execution',
    availability: 'Not yet released',
    sources: [
      { label: 'Physical Intelligence: \u03C0*0.6', url: 'https://www.pi.website/blog/pistar06' },
    ],
    companyLinks: [],
  },
  {
    id: 'openvla',
    name: 'OpenVLA',
    developer: 'Stanford / UC Berkeley / TRI',
    country: 'US',
    relationshipType: 'open',
    description: '7B-parameter open-source VLA built on Llama 2 with fused SigLIP+DinoV2 vision encoders. Trained on 970k trajectories from Open X-Embodiment. Outperforms RT-2-X (55B) by 16.5% with 7x fewer parameters.',
    release: '2024',
    focus: 'Generalist robot manipulation',
    availability: 'Open weights + code (MIT License)',
    sources: [
      { label: 'OpenVLA Project', url: 'https://openvla.github.io/' },
      { label: 'OpenVLA on Hugging Face', url: 'https://huggingface.co/openvla/openvla-7b' },
      { label: 'OpenVLA arXiv', url: 'https://arxiv.org/abs/2406.09246' },
    ],
    companyLinks: [],
  },
  {
    id: 'unifolm_vla',
    name: 'UnifoLM-VLA-0',
    developer: 'Unitree',
    country: 'CN',
    relationshipType: 'open',
    description: 'Unitree\'s open-source VLA built on Alibaba\'s Qwen2.5-VL-7B, fine-tuned with real-world robot data. Handles 12 categories of complex manipulation with a single policy on the G1 humanoid.',
    release: '2026',
    focus: 'General-purpose humanoid manipulation',
    availability: 'Open weights + training/inference code',
    sources: [
      { label: 'UnifoLM-VLA Project', url: 'https://unigen-x.github.io/unifolm-vla.github.io/' },
      { label: 'UnifoLM-VLA GitHub', url: 'https://github.com/unitreerobotics/unifolm-vla' },
    ],
    companyLinks: [
      {
        companyId: 'unitree',
        relationship: 'proprietary',
        sources: [
          { label: 'UnifoLM-VLA GitHub', url: 'https://github.com/unitreerobotics/unifolm-vla' },
        ],
      },
    ],
  },

  // ===================== ECOSYSTEM / PLATFORM =====================
  {
    id: 'skild_brain',
    name: 'Skild Brain',
    developer: 'Skild AI',
    country: 'US',
    relationshipType: 'ecosystem',
    description: 'Omni-bodied robotics foundation model designed to generalize across robot types and tasks.',
    release: '2024',
    focus: 'General-purpose robotics intelligence',
    availability: 'Platform / enterprise access',
    sources: [
      { label: 'Skild AI: Homepage', url: 'https://www.skild.ai/' },
      { label: 'Skild AI: Robotic Brain', url: 'https://www.skild.ai/blogs/building-the-general-purpose-robotic-brain' },
    ],
    companyLinks: [],
  },
  {
    id: 'agibot_go1',
    name: 'GO-1 (Genie Operator-1)',
    developer: 'AgiBot',
    country: 'CN',
    relationshipType: 'ecosystem',
    description: 'Novel ViLLA (Vision-Language-Latent-Action) framework combining VLM + Mixture of Experts. Trained on AgiBot World dataset (1M+ trajectories, 217 tasks). IROS 2025 Best Paper finalist.',
    release: '2025',
    focus: 'Generalist embodied intelligence',
    availability: 'Open dataset + model on Hugging Face',
    sources: [
      { label: 'AgiBot GO-1 on Hugging Face', url: 'https://huggingface.co/agibot-world/GO-1' },
      { label: 'AgiBot World GitHub', url: 'https://github.com/OpenDriveLab/AgiBot-World' },
      { label: 'GO-1 arXiv', url: 'https://arxiv.org/abs/2503.06669' },
    ],
    companyLinks: [
      {
        companyId: 'agibot',
        relationship: 'proprietary',
        sources: [
          { label: 'AgiBot GO-1 on Hugging Face', url: 'https://huggingface.co/agibot-world/GO-1' },
        ],
      },
    ],
  },
  {
    id: 'molmoact',
    name: 'MolmoAct',
    developer: 'Allen Institute for AI (Ai2)',
    country: 'US',
    relationshipType: 'open',
    description: 'The first Action Reasoning Model (ARM) - a new class of VLA that "thinks" in 3D by grounding reasoning through depth-aware perception tokens rather than text chain-of-thought. Three-stage autoregressive pipeline: depth perception (100 VQVAE tokens encoding geometric structure), visual trace planning (1-5 waypoints in image space, embodiment-agnostic), and action decoding (7-DoF discretized control). Trained on 26.3M samples across 93 manipulation tasks. State-of-the-art on SimplerEnv (70.5% zero-shot) and LIBERO (86.6% avg), outperforming π0-FAST by +10% single-arm, +22.7% bimanual, and +23.3% OOD in real-world tests - with 35x less training data than GR00T N1.5.',
    release: '2025',
    focus: 'Action reasoning via depth perception + visual trace planning',
    availability: 'Open weights + code + data (Apache 2.0)',
    sources: [
      { label: 'MolmoAct arXiv', url: 'https://arxiv.org/abs/2508.07917' },
      { label: 'GitHub', url: 'https://github.com/allenai/MolmoAct' },
      { label: 'HuggingFace Models', url: 'https://huggingface.co/collections/allenai/molmoact-689697591a3936fba38174d7' },
      { label: 'Ai2 Blog', url: 'https://allenai.org/blog/molmoact' },
    ],
    companyLinks: [],
  },
];
