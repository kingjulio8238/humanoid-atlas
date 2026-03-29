import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { companies, relationships, vlaModels, companyFunding, componentCategories, scenarios } from '../data';
import type { Company, VLAModel, CompanyFunding, ComponentCategory, Scenario } from '../data';

// ==================== GENERIC ARENA ENTITY ====================

interface ArenaEntity {
  id: string;
  name: string;
  subtitle: string;       // country or developer
  image?: string;         // robot image (OEMs only)
  badge?: string;         // type badge text (supplier type, VLA relationship)
  badgeClass?: string;    // CSS modifier for badge color
  description?: string;   // truncated description
  infoRows: { label: string; value: string }[];
}

// ==================== SHARED TYPES ====================

interface MatchupPair {
  entityA: ArenaEntity;
  entityB: ArenaEntity;
  alreadyVoted: boolean;
}

interface VoteResult {
  entityA: { id: string; elo: number; delta: number };
  entityB: { id: string; elo: number; delta: number };
}

interface RankingEntry {
  id: string;
  elo: number;
  votes: number;
  rank: number;
}

interface LeaderboardData {
  arena: string;
  dimension: string;
  rankings: RankingEntry[];
  lastUpdated: string;
}

interface DimensionDef {
  id: string;
  label: string;
  description: string;
}

// ==================== ARENA CONFIGS ====================

interface ArenaConfig {
  type: string;
  title: string;
  subtitle: string;
  entityLabel: string;
  dimensions: DimensionDef[];
  categories?: { id: string; label: string }[];
  entityMap: Map<string, ArenaEntity>;
  fallbackPool: (category?: string) => ArenaEntity[];
}

const OEM_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Overall best humanoid robot' },
];

const SUPPLIER_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Overall best supplier' },
];

const VLA_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Overall best VLA model' },
];

const INVESTMENT_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Overall best investment' },
];

const COMPONENT_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Most critical component category' },
];

const SCENARIO_DIMENSIONS: DimensionDef[] = [
  { id: 'best_overall', label: 'Best Overall', description: 'Most significant scenario' },
];

const SCENARIO_CATEGORY_LABELS: Record<string, string> = {
  supply_disruption: 'Supply Disruption',
  policy_shift: 'Policy Shift',
  market_event: 'Market Event',
  tech_breakthrough: 'Tech Breakthrough',
};

const SCENARIO_BADGE_CLASS: Record<string, string> = {
  supply_disruption: 'arena-badge--scenario-disruption',
  policy_shift: 'arena-badge--scenario-policy',
  market_event: 'arena-badge--scenario-market',
  tech_breakthrough: 'arena-badge--scenario-tech',
};

const SUPPLIER_CATEGORIES = [
  { id: 'motors', label: 'Motors' },
  { id: 'reducers', label: 'Reducers' },
  { id: 'compute', label: 'Compute' },
  { id: 'sensors_general', label: 'Sensors' },
  { id: 'batteries', label: 'Batteries' },
  { id: 'bearings', label: 'Bearings' },
  { id: 'screws', label: 'Screws' },
  { id: 'end_effectors', label: 'Hands' },
  { id: 'actuators_rotary', label: 'Actuators' },
  { id: 'pcbs', label: 'PCBs' },
];

// ==================== ENTITY MAPPERS ====================

// Build supplier customer map once
const supplierCustomers = new Map<string, { oemNames: string[] }>();
for (const rel of relationships) {
  const oem = companies.find((c) => c.id === rel.to && c.type === 'oem');
  if (!oem) continue;
  const existing = supplierCustomers.get(rel.from);
  if (existing) {
    if (!existing.oemNames.includes(oem.name)) existing.oemNames.push(oem.name);
  } else {
    supplierCustomers.set(rel.from, { oemNames: [oem.name] });
  }
}

const HIDDEN_VALUES = new Set(['not disclosed', 'n/a', '—', '']);

function isValidSpec(value: string): boolean {
  return !!value && !HIDDEN_VALUES.has(value.toLowerCase().trim());
}

function companyToOemEntity(c: Company): ArenaEntity {
  const s = c.robotSpecs;
  const rows: { label: string; value: string }[] = [];
  if (s) {
    const specs = [
      { label: 'Status', value: s.status },
      { label: 'Launch', value: s.launchDate },
      { label: 'Height', value: s.height },
      { label: 'Mass', value: s.mass },
      { label: 'DOF', value: s.totalDOF },
      { label: 'Speed', value: s.speed },
      { label: 'Runtime', value: s.operatingTime },
      { label: 'Payload', value: s.payloadCapacity },
      { label: 'Locomotion', value: s.locomotion },
      { label: 'Motor', value: s.motor },
      { label: 'Transmission', value: s.transmission },
      { label: 'End Effector', value: s.endEffector },
      { label: 'Ext. Sensors', value: s.externalSensors },
      { label: 'Compute', value: s.compute },
      { label: 'Battery', value: s.battery },
      { label: 'Price', value: s.price || '' },
      { label: 'BOM', value: s.bom || '' },
      { label: '2025 Ships', value: s.shipments2025 ? s.shipments2025.toLocaleString() : '' },
    ];
    for (const r of specs) { if (isValidSpec(r.value)) rows.push(r); }
  }
  return { id: c.id, name: c.name, subtitle: c.country, image: c.robotImage, infoRows: rows };
}

// Pre-compute supplier derived stats
const supplierCategoryCount = new Map<string, number>();
const supplierRelCount = new Map<string, number>();
for (const rel of relationships) {
  // Count unique categories each supplier serves
  const key = `${rel.from}:${rel.componentCategoryId}`;
  if (!supplierCategoryCount.has(key)) {
    supplierCategoryCount.set(key, 1);
  }
  supplierRelCount.set(rel.from, (supplierRelCount.get(rel.from) ?? 0) + 1);
}
const supplierUniqueCats = new Map<string, number>();
for (const key of supplierCategoryCount.keys()) {
  const suppId = key.split(':')[0];
  supplierUniqueCats.set(suppId, (supplierUniqueCats.get(suppId) ?? 0) + 1);
}

function companyToSupplierEntity(c: Company): ArenaEntity {
  // Blind-safe rows only — no ticker, no customer names (identity-revealing)
  const rows: { label: string; value: string }[] = [];
  rows.push({ label: 'Country', value: c.country });
  if (c.marketShare) rows.push({ label: 'Market Share', value: c.marketShare });
  const customers = supplierCustomers.get(c.id);
  if (customers) {
    rows.push({ label: 'OEM Customers', value: customers.oemNames.join(', ') });
  }
  const catCount = supplierUniqueCats.get(c.id);
  if (catCount && catCount > 1) {
    rows.push({ label: 'Categories Supplied', value: String(catCount) });
  }
  const supplierRels = relationships.filter((r) => r.from === c.id);
  if (supplierRels.length > 0) {
    const components = [...new Set(supplierRels.map((r) => r.component))];
    rows.push({ label: 'Components', value: components.join(', ') });
  }
  return {
    id: c.id,
    name: c.name,
    subtitle: c.country,
    description: c.description.length > 120 ? c.description.slice(0, 120) + '...' : c.description,
    infoRows: rows,
  };
}

function generalizeAvailability(avail: string): string {
  const lower = avail.toLowerCase();
  if (lower.includes('open') || lower.includes('public') || lower.includes('hugging')) return 'Open source';
  return 'Proprietary';
}

function vlaToEntity(m: VLAModel): ArenaEntity {
  return {
    id: m.id,
    name: m.name,
    subtitle: `${m.developer} · ${m.country}`,
    description: m.description.length > 140 ? m.description.slice(0, 140) + '...' : m.description,
    infoRows: [
      { label: 'Country', value: m.country },
      { label: 'Availability', value: generalizeAvailability(m.availability) },
      { label: 'Release', value: m.release },
      { label: 'Focus', value: m.focus },
      { label: 'OEM Integrations', value: String(m.companyLinks.length) },
    ],
  };
}

function fundingToEntity(f: CompanyFunding): ArenaEntity {
  const rows: { label: string; value: string }[] = [
    { label: 'Country', value: f.country },
    { label: 'Status', value: f.status },
  ];
  if (f.totalRaisedM) rows.push({ label: 'Total Raised', value: `$${f.totalRaisedM}M` });
  if (f.latestValuationM) {
    const valStr = f.latestValuationM >= 1000
      ? `$${(f.latestValuationM / 1000).toFixed(1)}B`
      : `$${f.latestValuationM}M`;
    rows.push({ label: 'Valuation', value: valStr });
  }
  if (f.revenue2025M) rows.push({ label: '2025 Revenue', value: `$${f.revenue2025M}M` });
  if (f.rounds.length > 0) {
    rows.push({ label: 'Funding Rounds', value: String(f.rounds.length) });
    const latest = f.rounds[f.rounds.length - 1];
    rows.push({ label: 'Latest Round', value: latest.name });
  }
  const company = companies.find((c) => c.id === f.companyId);
  if (company?.robotSpecs?.shipments2025) {
    rows.push({ label: '2025 Shipments', value: company.robotSpecs.shipments2025.toLocaleString() });
  }
  return {
    id: f.companyId,
    name: f.name,
    subtitle: f.country,
    infoRows: rows,
  };
}

function componentToEntity(c: ComponentCategory): ArenaEntity {
  const supplierCount = new Set(
    relationships.filter((r) => r.componentCategoryId === c.id).map((r) => r.from)
  ).size;
  const rows: { label: string; value: string }[] = [];
  if (c.avgCostPercent) rows.push({ label: 'Avg BOM %', value: `${c.avgCostPercent}%` });
  rows.push({ label: 'Bottleneck', value: c.bottleneck ? 'Yes' : 'No' });
  if (c.bottleneckReason) {
    rows.push({ label: 'Reason', value: c.bottleneckReason.length > 80 ? c.bottleneckReason.slice(0, 80) + '...' : c.bottleneckReason });
  }
  if (supplierCount > 0) rows.push({ label: 'Suppliers Tracked', value: String(supplierCount) });
  if (c.keyMetrics) {
    const entries = Object.entries(c.keyMetrics);
    for (const [k, v] of entries.slice(0, 3)) {
      rows.push({ label: k, value: v });
    }
  }
  return {
    id: c.id,
    name: c.name,
    subtitle: c.bottleneck ? 'Bottleneck' : 'Standard',
    badge: c.bottleneck ? 'bottleneck' : undefined,
    badgeClass: c.bottleneck ? 'arena-badge--proprietary' : undefined,
    description: c.description.length > 140 ? c.description.slice(0, 140) + '...' : c.description,
    infoRows: rows,
  };
}

// ==================== BUILD ENTITY MAPS ====================

const oems = companies.filter((c) => c.type === 'oem');
const suppliersAll = companies.filter((c) => c.type !== 'oem');

const oemEntityMap = new Map(oems.map((c) => [c.id, companyToOemEntity(c)]));
const supplierEntityMap = new Map(suppliersAll.map((c) => [c.id, companyToSupplierEntity(c)]));
const vlaEntityMap = new Map(vlaModels.map((m) => [m.id, vlaToEntity(m)]));
const investmentEntityMap = new Map(companyFunding.map((f) => [f.companyId, fundingToEntity(f)]));
const componentEntityMap = new Map(componentCategories.map((c) => [c.id, componentToEntity(c)]));

function scenarioToEntity(s: Scenario): ArenaEntity {
  const catLabel = SCENARIO_CATEGORY_LABELS[s.category] || s.category;
  const rows: { label: string; value: string }[] = [
    { label: 'Category', value: catLabel },
  ];
  if (s.affectedCountries.length > 0) {
    rows.push({ label: 'Countries Affected', value: s.affectedCountries.join(', ') });
  }
  if (s.affectedCategories.length > 0) {
    const catNames = s.affectedCategories
      .map((id) => componentCategories.find((c) => c.id === id)?.name || id)
      .slice(0, 4);
    rows.push({ label: 'Components Affected', value: catNames.join(', ') + (s.affectedCategories.length > 4 ? ` +${s.affectedCategories.length - 4}` : '') });
  }
  return {
    id: s.id,
    name: s.title,
    subtitle: catLabel,
    badge: catLabel,
    badgeClass: SCENARIO_BADGE_CLASS[s.category] || '',
    description: s.description,
    infoRows: rows,
  };
}

const scenarioEntityMap = new Map(scenarios.map((s) => [s.id, scenarioToEntity(s)]));

function buildConfig(activeSubTab: string): ArenaConfig | null {
  if (activeSubTab === 'arena_oems') {
    return {
      type: 'oems',
      title: 'OEM Arena',
      subtitle: 'Vote head-to-head: which humanoid robot wins?',
      entityLabel: 'Humanoid',
      dimensions: OEM_DIMENSIONS,
      entityMap: oemEntityMap,
      fallbackPool: () => Array.from(oemEntityMap.values()),
    };
  }
  if (activeSubTab === 'arena_suppliers') {
    return {
      type: 'suppliers',
      title: 'Supplier Arena',
      subtitle: 'Vote head-to-head: which supplier leads?',
      entityLabel: 'Supplier',
      dimensions: SUPPLIER_DIMENSIONS,
      categories: SUPPLIER_CATEGORIES,
      entityMap: supplierEntityMap,
      fallbackPool: (category) => {
        if (!category) return Array.from(supplierEntityMap.values());
        const rels = relationships.filter((r) => r.componentCategoryId === category);
        const ids = new Set(rels.map((r) => r.from));
        return Array.from(supplierEntityMap.values()).filter((e) => ids.has(e.id));
      },
    };
  }
  if (activeSubTab === 'arena_vla') {
    return {
      type: 'vla',
      title: 'VLA Arena',
      subtitle: 'Vote head-to-head: which Vision-Language-Action model wins?',
      entityLabel: 'Model',
      dimensions: VLA_DIMENSIONS,
      entityMap: vlaEntityMap,
      fallbackPool: () => Array.from(vlaEntityMap.values()),
    };
  }
  if (activeSubTab === 'arena_investment') {
    return {
      type: 'investment',
      title: 'Investment Arena',
      subtitle: 'Vote head-to-head: which company is the better bet?',
      entityLabel: 'Company',
      dimensions: INVESTMENT_DIMENSIONS,
      entityMap: investmentEntityMap,
      fallbackPool: () => Array.from(investmentEntityMap.values()),
    };
  }
  if (activeSubTab === 'arena_components') {
    return {
      type: 'components',
      title: 'Component Arena',
      subtitle: 'Vote head-to-head: which component category matters most?',
      entityLabel: 'Component',
      dimensions: COMPONENT_DIMENSIONS,
      entityMap: componentEntityMap,
      fallbackPool: () => Array.from(componentEntityMap.values()),
    };
  }
  if (activeSubTab === 'arena_scenarios') {
    return {
      type: 'scenarios',
      title: 'Scenario Arena',
      subtitle: 'Vote head-to-head: which scenario disrupts the industry more?',
      entityLabel: 'Scenario',
      dimensions: SCENARIO_DIMENSIONS,
      entityMap: scenarioEntityMap,
      fallbackPool: () => Array.from(scenarioEntityMap.values()),
    };
  }
  return null;
}

// ==================== CLIENT-SIDE ELO ENGINE ====================

const LOCAL_ELO_KEY = 'arena_elo';
const DEFAULT_ELO = 1500;
const K_FACTOR = 32;

interface LocalEloStore {
  [arenaKey: string]: {
    elo: Record<string, number>;
    votes: Record<string, number>;
  };
}

function getLocalStore(): LocalEloStore {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ELO_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalStore(store: LocalEloStore) {
  localStorage.setItem(LOCAL_ELO_KEY, JSON.stringify(store));
}

function getArenaKey(arenaType: string, dimension: string, category?: string): string {
  return category ? `${arenaType}:${category}:${dimension}` : `${arenaType}:${dimension}`;
}

function computeLocalElo(
  ratingA: number,
  ratingB: number,
  winner: 'A' | 'B' | 'tie'
): { newA: number; newB: number; deltaA: number; deltaB: number } {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const scoreA = winner === 'A' ? 1 : winner === 'B' ? 0 : 0.5;
  const scoreB = 1 - scoreA;
  const expectedB = 1 - expectedA;
  const deltaA = Math.round(K_FACTOR * (scoreA - expectedA));
  const deltaB = Math.round(K_FACTOR * (scoreB - expectedB));
  return { newA: ratingA + deltaA, newB: ratingB + deltaB, deltaA, deltaB };
}

function recordLocalVote(
  arenaType: string,
  dimension: string,
  entityAId: string,
  entityBId: string,
  winner: 'A' | 'B' | 'tie',
  category?: string
): VoteResult {
  const store = getLocalStore();
  const key = getArenaKey(arenaType, dimension, category);
  if (!store[key]) store[key] = { elo: {}, votes: {} };
  const bucket = store[key];

  const ratingA = bucket.elo[entityAId] ?? DEFAULT_ELO;
  const ratingB = bucket.elo[entityBId] ?? DEFAULT_ELO;
  const { newA, newB, deltaA, deltaB } = computeLocalElo(ratingA, ratingB, winner);

  bucket.elo[entityAId] = newA;
  bucket.elo[entityBId] = newB;
  bucket.votes[entityAId] = (bucket.votes[entityAId] ?? 0) + 1;
  bucket.votes[entityBId] = (bucket.votes[entityBId] ?? 0) + 1;

  saveLocalStore(store);

  return {
    entityA: { id: entityAId, elo: newA, delta: deltaA },
    entityB: { id: entityBId, elo: newB, delta: deltaB },
  };
}

function getLocalLeaderboard(
  arenaType: string,
  dimension: string,
  category?: string
): LeaderboardData {
  const store = getLocalStore();
  const key = getArenaKey(arenaType, dimension, category);
  const bucket = store[key] || { elo: {}, votes: {} };

  const allIds = new Set([...Object.keys(bucket.elo), ...Object.keys(bucket.votes)]);
  const rankings = Array.from(allIds)
    .map((id) => ({
      id,
      elo: bucket.elo[id] ?? DEFAULT_ELO,
      votes: bucket.votes[id] ?? 0,
      rank: 0,
    }))
    .sort((a, b) => b.elo - a.elo);

  rankings.forEach((r, i) => { r.rank = i + 1; });

  return {
    arena: arenaType,
    dimension,
    rankings,
    lastUpdated: new Date().toISOString(),
  };
}

// ==================== COMPONENT ====================

const API_BASE = '';

interface ArenaProps {
  activeSubTab: string;
}

export default function Arena({ activeSubTab }: ArenaProps) {
  const config = useMemo(() => buildConfig(activeSubTab), [activeSubTab]);

  // ---- State ----
  const [matchup, setMatchup] = useState<MatchupPair | null>(null);
  const [dimension, setDimension] = useState('');
  const [category, setCategory] = useState('');
  const [voting, setVoting] = useState(false);
  const [voteResult, setVoteResult] = useState<VoteResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [matchupLoading, setMatchupLoading] = useState(false);
  const [matchupError, setMatchupError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardView, setLeaderboardView] = useState<'table' | 'chart'>('table');

  // Blind mode: hide identity until vote
  const isBlindMode = activeSubTab === 'arena_oems' || activeSubTab === 'arena_suppliers' || activeSubTab === 'arena_vla' || activeSubTab === 'arena_investment';

  // Reset state when switching arenas
  useEffect(() => {
    if (config) {
      setDimension(config.dimensions[0].id);
      setCategory(config.categories?.[0]?.id || '');
      setMatchup(null);
      setVoteResult(null);
      setLeaderboard(null);
    }
  }, [config]);

  // ---- Fetch helpers (use refs to avoid dep cycles) ----
  const configRef = useRef(config);
  configRef.current = config;
  const dimensionRef = useRef(dimension);
  dimensionRef.current = dimension;
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const fetchMatchup = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg) return;
    const dim = dimensionRef.current;
    const cat = categoryRef.current;
    const hasCat = !!cfg.categories;
    setMatchupLoading(true);
    setMatchupError(null);
    setVoteResult(null);
    setRevealed(false);
    try {
      const catParam = hasCat && cat ? `&category=${cat}` : '';
      const res = await fetch(`${API_BASE}/api/arena/matchup?arena=${cfg.type}&dimension=${dim}${catParam}`);
      if (!res.ok) throw new Error('Failed to fetch matchup');
      const data = await res.json();
      const a = cfg.entityMap.get(data.entityA);
      const b = cfg.entityMap.get(data.entityB);
      if (!a || !b) throw new Error('Unknown entity');
      setMatchup({ entityA: a, entityB: b, alreadyVoted: !!data.alreadyVoted });
    } catch (err) {
      setMatchupError(err instanceof Error ? err.message : 'Failed to load matchup');
      // Fallback: pick random pair client-side
      const pool = cfg.fallbackPool(cat || undefined);
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      if (shuffled.length >= 2) {
        setMatchup({ entityA: shuffled[0], entityB: shuffled[1], alreadyVoted: false });
        setMatchupError(null);
      }
    } finally {
      setMatchupLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (bustCache = false) => {
    const cfg = configRef.current;
    if (!cfg) return;
    const dim = dimensionRef.current;
    const cat = categoryRef.current;
    const hasCat = !!cfg.categories;
    setLeaderboardLoading(true);
    try {
      const catParam = hasCat && cat ? `&category=${cat}` : '';
      const cacheBust = bustCache ? `&_t=${Date.now()}` : '';
      const res = await fetch(`${API_BASE}/api/arena/leaderboard?arena=${cfg.type}&dimension=${dim}${catParam}${cacheBust}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data: LeaderboardData = await res.json();
      setLeaderboard(data);

    } catch {
      // API unavailable — load from localStorage
      const localBoard = getLocalLeaderboard(cfg.type, dim, hasCat && cat ? cat : undefined);
      setLeaderboard(localBoard);

    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  // ---- Vote ----
  const handleVote = useCallback(async (winner: 'A' | 'B' | 'tie') => {
    const cfg = configRef.current;
    if (!matchup || !cfg || voting) return;
    setVoting(true);
    try {
      const dim = dimensionRef.current;
      const cat = categoryRef.current;
      const hasCat = !!cfg.categories;
      const res = await fetch(`${API_BASE}/api/arena/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arena: cfg.type,
          entityA: matchup.entityA.id,
          entityB: matchup.entityB.id,
          winner,
          dimension: dim,
          ...(hasCat && cat ? { category: cat } : {}),
        }),
      });
      if (res.status === 409) {
        setVoting(false);
        fetchMatchup();
        return;
      }
      if (!res.ok) throw new Error('Vote failed');
      const data: VoteResult = await res.json();
      setVoteResult(data);
      fetchLeaderboard(true);
    } catch {
      // API unavailable — compute Elo locally and persist to localStorage
      const dim = dimensionRef.current;
      const cat = categoryRef.current;
      const hasCat = !!cfg.categories;
      const localResult = recordLocalVote(
        cfg.type, dim, matchup.entityA.id, matchup.entityB.id, winner,
        hasCat && cat ? cat : undefined
      );
      setVoteResult(localResult);
      // Refresh leaderboard from local data
      const localBoard = getLocalLeaderboard(cfg.type, dim, hasCat && cat ? cat : undefined);
      setLeaderboard(localBoard);

    } finally {
      setVoting(false);
    }
  }, [matchup, voting, fetchMatchup, fetchLeaderboard]);

  // ---- Load on mount, dimension, or category change ----
  useEffect(() => {
    if (config) {
      fetchMatchup();
      fetchLeaderboard();
    }
  }, [config, dimension, category, fetchMatchup, fetchLeaderboard]);

  // ---- Blind mode: reveal after vote, auto-advance after 6s ----
  useEffect(() => {
    if (!voteResult) return;
    setRevealed(true);
    const timer = setTimeout(() => {
      fetchMatchup();
    }, 5000);
    return () => clearTimeout(timer);
  }, [voteResult, fetchMatchup]);

  // ---- Leaderboard chart data ----
  const chartData = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.rankings.filter((r) => r.votes >= 1).slice(0, 20);
  }, [leaderboard]);

  const maxElo = useMemo(() => {
    if (!chartData.length) return 1600;
    return Math.max(...chartData.map((r) => r.elo)) + 50;
  }, [chartData]);

  const minElo = useMemo(() => {
    if (!chartData.length) return 1400;
    return Math.min(...chartData.map((r) => r.elo)) - 50;
  }, [chartData]);

  // ==================== RENDER ====================

  if (!config) return null;

  // In blind mode, only show specs both entities share for fair comparison
  const sharedLabels = useMemo(() => {
    if (!matchup || !isBlindMode) return null;
    const labelsA = new Set(matchup.entityA.infoRows.map((r) => r.label));
    return new Set(matchup.entityB.infoRows.filter((r) => labelsA.has(r.label)).map((r) => r.label));
  }, [matchup, isBlindMode]);

  // Auto-skip matchups with fewer than 3 shared attributes in blind mode
  const skipCountRef = useRef(0);
  useEffect(() => {
    if (isBlindMode && sharedLabels && sharedLabels.size < 3 && !voteResult && skipCountRef.current < 10) {
      skipCountRef.current += 1;
      fetchMatchup();
    } else {
      skipCountRef.current = 0;
    }
  }, [sharedLabels, isBlindMode, voteResult, fetchMatchup]);

  function renderCard(entity: ArenaEntity, side: 'A' | 'B') {
    const result = voteResult?.[side === 'A' ? 'entityA' : 'entityB'];
    const hideIdentity = isBlindMode && !revealed;
    const visibleRows = hideIdentity && sharedLabels
      ? entity.infoRows.filter((r) => sharedLabels.has(r.label))
      : entity.infoRows;

    return (
      <div className={`arena-card ${result ? (result.delta > 0 ? 'arena-card--winner' : result.delta < 0 ? 'arena-card--loser' : '') : ''} ${revealed ? 'arena-card--revealed' : ''}`}>
        {!hideIdentity && entity.image && (
          <div className="arena-card__img">
            <img src={entity.image} alt={entity.name} />
          </div>
        )}
        <div className="arena-card__inner">
          <div className="arena-card__body">
            {!hideIdentity && (
              <>
                <div className="arena-card__name">{entity.name}</div>
                <div className="arena-card__country">{entity.subtitle}</div>
                {entity.description && (
                  <div className="arena-card__desc">{entity.description}</div>
                )}
              </>
            )}
            <div className="arena-card__specs">
              {visibleRows.map((r) => (
                <div key={r.label} className="arena-spec">
                  <span className="arena-spec__label">{r.label}</span>
                  <span className="arena-spec__value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          {!voteResult && !matchup?.alreadyVoted && (
            <button
              className="arena-vote-btn"
              onClick={() => handleVote(side)}
              disabled={voting}
              aria-label={`Vote for Robot ${side}`}
            >
              {voting ? '...' : isBlindMode ? `Vote ${config!.entityLabel} ${side}` : `Vote ${side}`}
            </button>
          )}
          {result && (
            <div className={`arena-delta ${result.delta > 0 ? 'positive' : result.delta < 0 ? 'negative' : ''}`}>
              {result.delta > 0 ? '+' : ''}{result.delta} Elo ({result.elo})
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="arena-view">
      {/* Header */}
      <div className="arena-header">
        <h2 className="arena-title">{config.title}</h2>
        <p className="arena-subtitle">{config.subtitle}</p>
      </div>

      {/* Category selector (suppliers only) */}
      {config.categories && (
        <div className="arena-categories">
          {config.categories.map((cat) => (
            <button
              key={cat.id}
              className={`arena-cat-btn ${category === cat.id ? 'active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Dimension selector (hidden when single dimension) */}
      {config.dimensions.length > 1 && (
        <div className="arena-dimensions">
          {config.dimensions.map((d) => (
            <button
              key={d.id}
              className={`arena-dim-btn ${dimension === d.id ? 'active' : ''}`}
              onClick={() => setDimension(d.id)}
              title={d.description}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Matchup area */}
      <div className="arena-matchup-container">
        {matchupLoading ? (
          <div className="arena-loading">Loading matchup...</div>
        ) : matchupError ? (
          <div className="arena-error">{matchupError}</div>
        ) : matchup ? (
          <div className="arena-matchup">
            {renderCard(matchup.entityA, 'A')}

            <div className="arena-vs">
              <span className="arena-vs__text">VS</span>
              {!voteResult && !matchup.alreadyVoted && (
                <button
                  className="arena-tie-btn"
                  onClick={() => handleVote('tie')}
                  disabled={voting}
                  aria-label="Vote tie"
                >
                  Tie
                </button>
              )}
              {voteResult && (
                <button className="arena-next-btn" onClick={fetchMatchup}>
                  Next Matchup
                </button>
              )}
              {matchup.alreadyVoted && !voteResult && (
                <div className="arena-already-voted">
                  <span>Already voted</span>
                  <button className="arena-next-btn" onClick={fetchMatchup}>
                    Next Matchup
                  </button>
                </div>
              )}
            </div>

            {renderCard(matchup.entityB, 'B')}
          </div>
        ) : null}
      </div>

      {/* Leaderboard */}
      <div className="arena-leaderboard">
        <div className="arena-leaderboard__header">
          <h3 className="arena-leaderboard__title">
            Leaderboard
            {leaderboard && leaderboard.rankings.length > 0 && (
              <span className="arena-leaderboard__vote-count">
                {Math.floor(leaderboard.rankings.reduce((sum, r) => sum + r.votes, 0) / 2)} votes
              </span>
            )}
          </h3>
          <div className="arena-leaderboard__toggle">
            <button
              className={`arena-toggle-btn ${leaderboardView === 'table' ? 'active' : ''}`}
              onClick={() => setLeaderboardView('table')}
            >
              Table
            </button>
            <button
              className={`arena-toggle-btn ${leaderboardView === 'chart' ? 'active' : ''}`}
              onClick={() => setLeaderboardView('chart')}
            >
              Chart
            </button>
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="arena-loading">Loading leaderboard...</div>
        ) : !leaderboard || leaderboard.rankings.length === 0 ? (
          <div className="arena-empty">No votes yet — be the first to vote!</div>
        ) : leaderboardView === 'table' ? (
          <div className="arena-table-wrap">
            <table className="arena-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>{config.entityLabel}</th>
                  <th>Elo</th>
                  <th>Votes</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.rankings.map((entry) => {
                  const entity = config.entityMap.get(entry.id);
                  return (
                    <tr key={entry.id}>
                      <td className="arena-table__rank">{entry.rank}</td>
                      <td className="arena-table__name">
                        {entity?.image && (
                          <img src={entity.image} alt="" className="arena-table__thumb" />
                        )}
                        {entity?.name || entry.id}
                      </td>
                      <td className="arena-table__elo">{entry.elo}</td>
                      <td className="arena-table__votes">{entry.votes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="arena-chart">
            {chartData.map((entry) => {
              const entity = config.entityMap.get(entry.id);
              const pct = ((entry.elo - minElo) / (maxElo - minElo)) * 100;
              return (
                <div key={entry.id} className="arena-chart__row">
                  <span className="arena-chart__label">{entity?.name || entry.id}</span>
                  <div className="arena-chart__bar-wrap">
                    <div className="arena-chart__bar" style={{ width: `${Math.max(2, pct)}%` }} />
                    <span className="arena-chart__elo">{entry.elo}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {leaderboard && (
          <div className="arena-leaderboard__footer">
            Last updated: {new Date(leaderboard.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
