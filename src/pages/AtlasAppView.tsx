import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PLYViewer from '../components/PLYViewer';
import { preloadPLY } from '../components/plyCache';
import SupplyChainGraph from '../components/SupplyChainGraph';
import { companies, relationships, componentCategories, vlaModels, rewardModels, rewardComparisons, worldModels, vizTools, headDesigns, simPlatforms, safetyStandards, oemSafetyProfiles } from '../data';
import type { RewardModelType, WorldModelType, VizToolType, FaceDisplayType, FundingStatus, FactoryStatus, SimPlatformType, SafetyComplianceLevel } from '../data';
import RewardChart from '../components/RewardChart';
import ApiDocs from '../components/ApiDocs';
import CliDocs from '../components/CliDocs';
import DataBrokerage from '../components/DataBrokerage';
import EquipmentPage from '../components/EquipmentPage';
import SampleExplorer from '../components/SampleExplorer';
import Arena from '../components/Arena';
import AllOemsPage from './AllOemsPage';
import FundingPage from './FundingPage';
import FactoriesPage from './FactoriesPage';
import { MODEL_ROTATIONS, MODEL_SCALE, MODEL_SPIN, ACTUATOR_INFO, SKELETON_REGIONS, COMPONENT_SPEC_FIELDS } from '../app/modelConfig';
import { TAB_GROUPS, TABS, TAB_TO_PATH, PATH_TO_TAB } from '../app/tabs';
import { getLocalizedTabMeta } from '../app/seo';
import { SUPPORTED_LOCALES, getTabGroupLabelKey, getTabLabelKey, useI18n } from '../i18n';
import type { Locale } from '../i18n';
import {
  BOTTLENECK_COMPONENTS,
  COUNTRY_GROUP_COLORS,
  SAFETY_CAPABILITIES,
  SCENARIOS,
  SIM_CAPABILITIES,
  SUPPLIER_COMPONENT_LABEL,
  TIMELINE_YEARS,
  VIZ_CAPABILITIES,
  VIZ_CAPABILITY_MAP,
  getCompanyVlaLinks,
  getComponentChain,
  getComplianceLevelLabel,
  getCountryFilterGroup,
  getCountryGroup,
  getFaceDisplayTypeLabel,
  getHeadDesignOverview,
  getOemNationalityData,
  getRewardModelOverview,
  getRewardModelTypeLabel,
  getSPOFData,
  getSafetyCapabilities,
  getSafetyOverview,
  getScoreboardData,
  getSimCapabilities,
  getSimPlatformOverview,
  getSimPlatformTypeLabel,
  getSovereigntyData,
  getTimelineData,
  getVLAOverview,
  getVizToolOverview,
  getVizToolTypeLabel,
  getVlaCompanyRelationshipLabel,
  getVlaRelationshipTypeLabel,
  getWorldModelOverview,
  getWorldModelTypeLabel,
  getUnifiedImpact,
  oems,
} from '../domain/atlasAnalytics';
import type { CountryGroup } from '../domain/atlasAnalytics';
import { useLegacyHashRedirect } from '../hooks/useLegacyHashRedirect';

// Start fetching the skeleton model immediately on module load
preloadPLY('/models/skeleton.ply');

const TYPE_DISPLAY: Record<string, string> = {
  oem: 'OEM', tier1_supplier: 'Tier 1', component_maker: 'Supplier',
  raw_material: 'Raw Material', ai_compute: 'Compute',
};

function deferStateUpdate(update: () => void) {
  queueMicrotask(update);
}

export default function AtlasAppView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { locale, setLocale, t } = useI18n();

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
  const [countryFilter] = useState<CountryGroup>(null);
  const [cutCountries, setCutCountries] = useState<Set<string>>(new Set());
  const [cutCompanies, setCutCompanies] = useState<Set<string>>(new Set());
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [clerkSignedIn, setClerkSignedIn] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const nowSignedIn = (e as CustomEvent).detail?.isSignedIn ?? false;
      setClerkSignedIn((prev: boolean) => {
        if (!prev && nowSignedIn) {
          const path = window.location.pathname;
          if (path.startsWith('/data/')) {
            // Already on a data page - re-navigate to ensure tab stays active
            navigate(path);
          } else {
            // Not on a data page - redirect to Sell Data
            navigate('/data/sell');
          }
        }
        return nowSignedIn;
      });
    };
    window.addEventListener('clerk-auth-change', handler);
    return () => window.removeEventListener('clerk-auth-change', handler);
  }, [navigate]);

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
  }, [activeTab, companyId, navigate]);

  // Pick up company from URL on mount / navigation
  useEffect(() => {
    const urlCompany = searchParams.get('company');
    if (urlCompany && urlCompany !== companyId) {
      deferStateUpdate(() => setCompanyId(urlCompany));
    }
  }, [companyId, searchParams]);

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
      deferStateUpdate(() => setAiSummary(null));
      return;
    }
    const cacheKey = [...cutCompanies].sort().join(',') + '|' + [...cutCountries].sort().join(',');
    if (summaryCache.current.has(cacheKey)) {
      deferStateUpdate(() => setAiSummary(summaryCache.current.get(cacheKey)!));
      return;
    }
    const impact = getUnifiedImpact(cutCountries, cutCompanies);
    if (!impact) { deferStateUpdate(() => setAiSummary(null)); return; }

    deferStateUpdate(() => setAiLoading(true));
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
    if (!companyId) { deferStateUpdate(() => setThesis(null)); return; }
    const company = companies.find((c) => c.id === companyId);
    if (!company || company.type === 'oem') { deferStateUpdate(() => setThesis(null)); return; }
    if (thesisCache.current.has(companyId)) {
      deferStateUpdate(() => setThesis(thesisCache.current.get(companyId)!));
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

    deferStateUpdate(() => setThesisLoading(true));
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


  const filteredSimPlatforms = useMemo(() => {
    const base = simPlatforms.filter((p) => p.platformType !== 'world-model');
    if (simPlatformFilter === 'all') return base;
    return base.filter((p) => p.platformType === simPlatformFilter);
  }, [simPlatformFilter]);


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

  // ==================== SAMPLE EXPLORER VIEW ====================
  const exploreMatch = location.pathname.match(/^\/data\/explore\/(.+)$/);
  if (exploreMatch) {
    return <SampleExplorer slug={exploreMatch[1]} />;
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

  // ==================== PRIVACY POLICY VIEW ====================
  if (location.pathname === '/privacy') {
    return (
      <div className="app" style={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100vh', height: 'auto', overflow: 'visible' }}>
        <Helmet>
          <title>Privacy Policy | Humanoid Atlas</title>
          <meta name="description" content="Privacy policy for Humanoid Atlas (humanoids.fyi)." />
        </Helmet>
        <button className="back-btn" onClick={() => navigate('/')} style={{ position: 'absolute', top: '1.5rem', left: '1.5rem' }}>
          <span className="back-arrow">&larr;</span>
        </button>
        <main className="main" style={{ maxWidth: 600, margin: '0 auto', padding: '6rem 2rem 8rem' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.6rem', color: 'var(--text-primary)' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '3.5rem' }}>Last updated: April 3, 2026</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.2rem', color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.7 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Overview</h2>
              <p>Humanoid Atlas (&ldquo;humanoids.fyi&rdquo;) is an open-source information platform for the humanoid robotics industry. We are committed to respecting your privacy and being transparent about what data we collect.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Data We Collect</h2>
              <p><strong>Analytics:</strong> We use Vercel Analytics to collect anonymous, aggregated usage data such as page views, referrers, and device types. This data cannot identify individual users.</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Authentication:</strong> If you create an account via Clerk, we store your email address and profile information solely for account functionality. We do not sell or share this information with third parties.</p>
              <p style={{ marginTop: '0.5rem' }}><strong>Payments:</strong> Payment processing is handled entirely by Stripe. We do not store credit card numbers or financial details on our servers.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Cookies</h2>
              <p>We use essential cookies for authentication sessions. We do not use advertising or tracking cookies.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Third-Party Services</h2>
              <p>We use the following third-party services: Vercel (hosting &amp; analytics), Clerk (authentication), Stripe (payments), and Upstash (data storage). Each operates under their own privacy policies.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Data Marketplace</h2>
              <p>The Atlas Data Brokerage facilitates transactions between data providers and buyers. Data shared through listings is governed by the terms agreed upon between parties. Humanoid Atlas acts as an intermediary and does not claim ownership of user-submitted data.</p>
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Contact</h2>
              <p>For privacy-related questions, reach out to <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>@JulianSaks</a> or open an issue on our <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-primary)' }}>GitHub repository</a>.</p>
            </div>
          </div>
        </main>
        <footer className="footer" style={{ marginTop: 'auto' }}>
          <span><a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">Contribute</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Changelog</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>Data Sources</a> · Created by <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {viewCount.toLocaleString()} visits</span>}</span>
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
  const tabMeta = getLocalizedTabMeta(activeTab, locale);

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
        <span className="header-sub">{t('app.subtitle')}</span>
        <div className="search-wrapper" ref={searchRef}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder={t('app.searchPlaceholder')}
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
                <div className="search-empty">{t('app.searching')}</div>
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
                <div className="search-empty">{t('app.pressEnterCompare')}</div>
              ) : isNlQuery ? (
                <div className="search-empty">{t('app.pressEnterSearch')}</div>
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
                        <span className="search-result__type">{t('app.vlaType')} · {m.developer}</span>
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="search-empty">{t('app.noResults')}</div>
              )}
            </div>
          )}
        </div>
        <label className="language-switcher">
          <span className="language-switcher__label">{t('language.switcherLabel')}</span>
          <select
            className="language-switcher__select"
            value={locale}
            aria-label={t('language.switcherLabel')}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {SUPPORTED_LOCALES.map((option) => (
              <option key={option} value={option}>
                {option === 'zh-CN' ? t('language.chinese') : t('language.english')}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="filter-bar">
        <div className="tab-group-nav">
          {TAB_GROUPS.map((g) => (
            <Fragment key={g.id}>
              {g.id === 'cli' && <div className="filter-bar__separator" />}
              <button
                className={`tab-group-pill ${activeTabGroup === g.id ? 'tab-group-pill--active' : ''}`}
                style={g.id === 'shop' ? { position: 'relative', paddingRight: 22 } : undefined}
                onClick={() => {
                  const firstTab = TABS.find((t) => t.group === g.id);
                  if (firstTab) { navigate(TAB_TO_PATH[firstTab.id] || '/'); setChainFocus(null); }
                }}
              >{t(getTabGroupLabelKey(g.id))}{g.id === 'shop' && <span className="tab-new-badge">{t('app.newBadge')}</span>}</button>
            </Fragment>
          ))}
        </div>
      </div>

      {TABS.filter((t) => t.group === activeTabGroup && !t.hidden).filter((t) => t.id !== 'account' || clerkSignedIn).length > 1 && (
      <nav className={`component-nav${activeTabGroup === 'cli' ? ' component-nav--cli' : ''}`}>
        {TABS.filter((tab) => tab.group === activeTabGroup && !tab.hidden).filter((tab) => tab.id !== 'account' || clerkSignedIn).map((tab) => {
          return (
            <button
              key={tab.id}
              className={`component-btn ${activeTab === tab.id ? 'component-btn--active' : ''}`}
              onClick={() => { navigate(TAB_TO_PATH[tab.id] || '/'); setChainFocus(null); }}
            >
              {t(getTabLabelKey(tab.id))}
            </button>
          );
        })}
      </nav>
      )}

      <main className={activeTabGroup === 'shop' ? 'component-view' : activeTabGroup === 'cli' ? 'component-view' : activeTabGroup === 'api' ? 'component-view' : activeTabGroup === 'arena' ? 'component-view' : activeTab === 'skeleton' ? 'skeleton-view' : activeTab === 'network' ? 'skeleton-view' : activeTab === 'timeline' ? 'geo-view' : activeTab === 'geopolitics' ? 'geo-view' : activeTab === 'funding' ? 'geo-view' : activeTab === 'factories' ? 'geo-view' : 'component-view'}>
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
        {activeTab === 'all_oems' && (
          <AllOemsPage
            sortedOems={sortedOems}
            likes={likes}
            likedByMe={likedByMe}
            countryFilter={countryFilter}
            onSelectCompany={handleSelectCompany}
            onLike={handleLike}
          />
        )}

        {/* Funding tab */}
        {activeTab === 'funding' && (
          <FundingPage
            fundingStatusFilter={fundingStatusFilter}
            countryFilter={countryFilter}
            onFundingStatusFilterChange={setFundingStatusFilter}
            onSelectCompany={handleSelectCompany}
          />
        )}

        {/* Factories tab */}
        {activeTab === 'factories' && (
          <FactoriesPage
            factoryStatusFilter={factoryStatusFilter}
            countryFilter={countryFilter}
            onFactoryStatusFilterChange={setFactoryStatusFilter}
            onSelectCompany={handleSelectCompany}
          />
        )}

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

        {activeTabGroup === 'arena' && (
          <Arena activeSubTab={activeTab} />
        )}

        {activeTabGroup === 'shop' && activeTab !== 'equipment' && activeTab !== 'components' && (
          <DataBrokerage activeSubTab={activeTab} viewCount={viewCount} />
        )}

        {activeTab === 'equipment' && (
          <EquipmentPage />
        )}

        {activeTab === 'components' && (
          <div className="shop-coming-soon">COMING SOON</div>
        )}

        {activeTabGroup === 'cli' && (
          <CliDocs activeSubTab={activeTab} />
        )}

        {activeTabGroup === 'api' && (
          <ApiDocs activeSubTab={activeTab} />
        )}
      </main>

      <footer className="footer">
        <span>{t('app.footer.oems', { count: oems.length })}</span>
        <span className="footer-sep" />
        <span>{t('app.footer.suppliers', { count: companies.filter((c) => c.type !== 'oem').length })}</span>
        <span className="footer-sep" />
        <span>
          {t('app.footer.shipped', { count: oems.reduce((s, c) => s + (c.robotSpecs?.shipments2025 || 0), 0).toLocaleString() })}
        </span>
        <span className="footer-right"><a href="https://chatgpt.com/share/69c10e41-8034-8004-b523-5ff13a85368a" target="_blank" rel="noopener noreferrer"><img src="/chatgpt_logo.png" alt="ChatGPT" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://claude.ai/share/e01bd8a4-6cdc-4b27-9beb-a3b81de95867" target="_blank" rel="noopener noreferrer"><img src="/claude_logo.webp" alt="Claude" style={{ width: 17, height: 17, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://gemini.google.com/share/29b23abfdc21" target="_blank" rel="noopener noreferrer"><img src="https://www.gstatic.com/lamda/images/gemini_sparkle_4g_512_lt_f94943af3be039176192d.png" alt="Gemini" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a>&nbsp;<a href="https://grok.com/share/c2hhcmQtMg_a9f8f529-4067-4ceb-bc5b-2ecc352ef404" target="_blank" rel="noopener noreferrer"><img src="/grok_logo.webp" alt="Grok" style={{ width: 14, height: 14, verticalAlign: 'middle' }} /></a> · <a href="https://github.com/kingjulio8238/humanoid-atlas" target="_blank" rel="noopener noreferrer">{t('app.footer.contribute')}</a> · <a href="/changelog" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/changelog'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{t('app.footer.changelog')}</a> · <a href="/sources" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/sources'); window.dispatchEvent(new PopStateEvent('popstate')); }}>{t('app.footer.sources')}</a> · {t('app.footer.createdBy')} <a href="https://x.com/JulianSaks" target="_blank" rel="noopener noreferrer">Julian Saks</a>{viewCount !== null && <span className="view-count"> · {t('app.footer.visits', { count: viewCount.toLocaleString() })}</span>}</span>
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
