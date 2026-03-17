import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { companies, relationships } from '../data';
import type { EntityType, Country } from '../data/types';

// Country colors — consistent with App.tsx sovereignty palette
const COUNTRY_COLORS: Record<string, string> = {
  US: '#3b82f6',
  CN: '#ef4444',
  JP: '#7c3aed',
  DE: '#d69e2e',
  KR: '#d69e2e',
  CH: '#888',
  TW: '#888',
  NO: '#888',
  AU: '#888',
  IL: '#888',
  CA: '#3b82f6',
  PL: '#888',
  GLOBAL: '#888',
};

const TYPE_LABELS: Record<EntityType, string> = {
  oem: 'OEM',
  tier1_supplier: 'Tier 1',
  component_maker: 'Supplier',
  raw_material: 'Raw Material',
  ai_compute: 'Compute',
};

// --- Deterministic column layout ---
// Arranges nodes in supply chain tiers: Raw Materials → Suppliers → OEMs
// Within each column, sorted by country group (US top, Other middle, CN bottom)
interface Vec2 { x: number; y: number }

// Country sort order for vertical grouping within columns
const COUNTRY_SORT: Record<string, number> = {
  US: 0, CA: 1, NO: 2, CH: 3, DE: 4, AU: 5, IL: 6, PL: 7, // Western/allied
  JP: 10, KR: 11, TW: 12,                     // Asian allied
  CN: 20,                                       // China
};

// Supply chain tier columns (left to right)
const TIER_COLUMNS: Record<EntityType, number> = {
  raw_material: 0,
  component_maker: 1,
  ai_compute: 2,
  tier1_supplier: 2,
  oem: 3,
};

// Sub-columns within "component_maker" based on what they supply
const SUPPLIER_COMPONENT_COL: Record<string, number> = {
  // Raw materials stay at col 0
  mp_materials: 0, lynas: 0, jl_mag: 0,
  // Motors & reducers
  maxon: 1, kollmorgen: 1, cubemars: 1, nidec: 1, estun: 1, moons: 1,
  harmonic_drive: 1, nabtesco: 1, leaderdrive: 1,
  // Bearings & screws
  thk: 1.5, skf: 1.5, nsk: 1.5, rollvis: 1.5, ewellix: 1.5, nanjing_kgm: 1.5,
  // Sensors
  sony_sensors: 2, hesai: 2, ouster: 2, orbbec: 2, bosch_sensortec: 2,
  // Compute & AI
  tsmc: 1.5, nvidia: 2.5, intel: 2.5, horizon_robotics: 2.5, google_deepmind: 2.5,
  // Electronics
  texas_instruments: 2, infineon: 2, samsung_electro: 2, stmicro: 2,
  // Batteries
  catl: 2, panasonic_energy: 2, byd_battery: 2, lg_energy: 2, samsung_sdi: 2,
  // Hands
  psyonic: 2.5, sharpa: 2.5,
};

function columnLayout(
  allCompanies: typeof companies,
  allRelationships: typeof relationships,
): Record<string, Vec2> {
  const colSpacing = 350;
  const rowSpacing = 80;

  // Assign each company to a column
  const colOf: Record<string, number> = {};
  allCompanies.forEach((c) => {
    if (SUPPLIER_COMPONENT_COL[c.id] !== undefined) {
      colOf[c.id] = SUPPLIER_COMPONENT_COL[c.id];
    } else if (c.type === 'oem') {
      colOf[c.id] = 3.5;
    } else {
      colOf[c.id] = TIER_COLUMNS[c.type] ?? 1;
    }
  });

  // Count edges per node (for vertical sort tiebreaker — more connected = higher)
  const edgeCount: Record<string, number> = {};
  allRelationships.forEach((r) => {
    edgeCount[r.from] = (edgeCount[r.from] || 0) + 1;
    edgeCount[r.to] = (edgeCount[r.to] || 0) + 1;
  });

  // Group by column
  const columns: Record<number, typeof companies> = {};
  allCompanies.forEach((c) => {
    const col = colOf[c.id];
    if (!columns[col]) columns[col] = [];
    columns[col].push(c);
  });

  // Sort within each column: by country group, then by edge count (desc)
  Object.values(columns).forEach((col) => {
    col.sort((a, b) => {
      const ca = COUNTRY_SORT[a.country] ?? 15;
      const cb = COUNTRY_SORT[b.country] ?? 15;
      if (ca !== cb) return ca - cb;
      return (edgeCount[b.id] || 0) - (edgeCount[a.id] || 0);
    });
  });

  // Position each node
  const result: Record<string, Vec2> = {};
  const sortedCols = Object.keys(columns).map(Number).sort((a, b) => a - b);

  sortedCols.forEach((col) => {
    const nodes = columns[col];
    const totalHeight = nodes.length * rowSpacing;
    const yStart = -totalHeight / 2;

    nodes.forEach((c, idx) => {
      result[c.id] = {
        x: col * colSpacing,
        y: yStart + idx * rowSpacing,
      };
    });
  });

  return result;
}

// --- Custom Node ---
function CompanyNode({ data }: NodeProps) {
  const d = data as {
    label: string;
    type: EntityType;
    country: Country;
    isOem: boolean;
    edgeCount: number;
    marketShare?: string;
    shipments?: number;
    dim: boolean;
    focused: boolean;
  };
  const borderColor = COUNTRY_COLORS[d.country] || '#888';

  return (
    <div
      className={`graph-node ${d.isOem ? 'graph-node--oem' : ''} ${d.dim ? 'graph-node--dim' : ''} ${d.focused ? 'graph-node--selected' : ''}`}
      style={{ borderColor }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="graph-node__label">
        <span className="graph-node__country-dot" style={{ background: borderColor }} />
        {d.label}
      </div>
      <div className="graph-node__type">{d.country} · {TYPE_LABELS[d.type] || d.type}</div>
      {d.marketShare && <div className="graph-node__meta">{d.marketShare}</div>}
      {d.isOem && d.shipments ? <div className="graph-node__meta">{d.shipments.toLocaleString()} units</div> : null}
    </div>
  );
}

const nodeTypes = { company: CompanyNode };

// --- Legend ---
const LEGEND_COUNTRIES = [
  { label: 'US', color: '#3b82f6' },
  { label: 'CN', color: '#ef4444' },
  { label: 'JP', color: '#7c3aed' },
  { label: 'DE/KR', color: '#d69e2e' },
  { label: 'Other', color: '#888' },
];

// --- Main Component ---
interface SupplyChainGraphProps {
  onNodeSelect: (id: string) => void;
  countryFilter: string | null;
  highlightedIds?: Set<string> | null;
}

export default function SupplyChainGraph({ onNodeSelect, countryFilter, highlightedIds }: SupplyChainGraphProps) {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Clear internal focus when external highlights change
  useEffect(() => {
    if (highlightedIds && highlightedIds.size > 0) {
      setFocusedId(null);
    }
  }, [highlightedIds]);

  // Compute layout once
  const positions = useMemo(() => {
    return columnLayout(companies, relationships);
  }, []);

  // Edge count per node
  const edgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    relationships.forEach((r) => {
      counts[r.from] = (counts[r.from] || 0) + 1;
      counts[r.to] = (counts[r.to] || 0) + 1;
    });
    return counts;
  }, []);

  // Connected IDs for focus
  const connectedIds = useMemo(() => {
    if (!focusedId) return null;
    const ids = new Set<string>([focusedId]);
    relationships.forEach((r) => {
      if (r.from === focusedId) ids.add(r.to);
      if (r.to === focusedId) ids.add(r.from);
    });
    return ids;
  }, [focusedId]);

  function getCountryGroup(country: string) {
    if (country === 'US') return 'US';
    if (country === 'CN') return 'CN';
    return 'OTHER';
  }

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = companies.map((c) => {
      const pos = positions[c.id] || { x: 0, y: 0 };
      const dim = (highlightedIds && highlightedIds.size > 0 && !highlightedIds.has(c.id)) ||
        (connectedIds !== null && !connectedIds.has(c.id)) ||
        (countryFilter !== null && getCountryGroup(c.country) !== countryFilter);

      return {
        id: c.id,
        type: 'company',
        position: { x: pos.x, y: pos.y },
        data: {
          label: c.name,
          type: c.type,
          country: c.country,
          isOem: c.type === 'oem',
          edgeCount: edgeCounts[c.id] || 0,
          marketShare: c.marketShare,
          shipments: c.robotSpecs?.shipments2025,
          dim,
          focused: focusedId === c.id,
        },
      };
    });

    const edges: Edge[] = relationships.map((r) => {
      const isFocusHighlighted = focusedId !== null && (r.from === focusedId || r.to === focusedId);
      const isQueryHighlighted = highlightedIds && highlightedIds.size > 0 && highlightedIds.has(r.from) && highlightedIds.has(r.to);
      const isHighlighted = isFocusHighlighted || isQueryHighlighted;
      const isDimmed = (highlightedIds && highlightedIds.size > 0 && !isQueryHighlighted) || (connectedIds && !isFocusHighlighted);
      return {
        id: r.id,
        source: r.from,
        target: r.to,
        animated: isFocusHighlighted,
        label: isHighlighted ? r.component : undefined,
        style: {
          stroke: isHighlighted ? '#1a1a1a' : '#d5d0c8',
          strokeWidth: isHighlighted ? 2 : (r.bomPercent ? Math.max(1, r.bomPercent / 20) : 0.8),
          opacity: isDimmed ? 0.15 : 1,
        },
        labelStyle: {
          fill: '#6b6b6b',
          fontSize: 9,
          fontFamily: 'Share Tech Mono, monospace',
        },
        labelBgStyle: {
          fill: 'rgba(245,242,237,0.9)',
        },
        labelBgPadding: [4, 2] as [number, number],
      };
    });

    return { nodes, edges };
  }, [positions, edgeCounts, focusedId, connectedIds, countryFilter, highlightedIds]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setFocusedId((prev) => (prev === node.id ? null : node.id));
    },
    []
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    setFocusedId(null);
  }, []);

  return (
    <div className="graph-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#d5d0c8"
        />
      </ReactFlow>
      <div className="graph-legend">
        {LEGEND_COUNTRIES.map((c) => (
          <span key={c.label} className="graph-legend__item">
            <span className="graph-legend__dot" style={{ background: c.color }} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
