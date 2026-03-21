import { useState, useCallback } from 'react';

const BASE_URL = 'https://humanoid-atlas-api.vercel.app/v1';

/* ── Types ── */
interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  params?: Param[];
  body?: Param[];
  exampleRequest: string;
  exampleResponse: string;
}

interface SubTabContent {
  title: string;
  description: string;
  endpoints: Endpoint[];
  preamble?: React.ReactNode;
}

/* ── Markdown generator ── */
const SUB_TAB_FILENAMES: Record<string, string> = {
  api_getting_started: 'GETTING-STARTED',
  api_companies: 'COMPANIES',
  api_supply_chain: 'SUPPLY-CHAIN',
  api_resources: 'RESOURCES',
  api_ai_sim: 'AI-SIM',
  api_safety: 'SAFETY',
  api_query: 'QUERY',
};

function generateMarkdown(tabId: string, content: SubTabContent): string {
  const lines: string[] = [];

  lines.push(`# Humanoid Atlas API – ${content.title}`);
  lines.push('');
  lines.push(content.description);
  lines.push('');
  lines.push(`Base URL: \`${BASE_URL}\``);
  lines.push('');

  if (tabId === 'api_getting_started') {
    lines.push('## Response Format');
    lines.push('');
    lines.push('All successful responses follow:');
    lines.push('```json');
    lines.push('{ "data": ..., "meta": { ... } }');
    lines.push('```');
    lines.push('');
    lines.push('## Error Format');
    lines.push('');
    lines.push('```json');
    lines.push('{ "error": { "code": "...", "message": "..." } }');
    lines.push('```');
    lines.push('');
    lines.push('## Error Codes');
    lines.push('');
    lines.push('| Code | Status |');
    lines.push('|------|--------|');
    lines.push('| INVALID_JSON | 400 |');
    lines.push('| UNAUTHORIZED | 401 |');
    lines.push('| NOT_FOUND | 404 |');
    lines.push('| VALIDATION_ERROR | 422 |');
    lines.push('| INTERNAL_ERROR | 500 |');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  for (const ep of content.endpoints) {
    lines.push(`## ${ep.method} \`${ep.path}\``);
    lines.push('');
    lines.push(ep.description);
    lines.push('');

    if (ep.params && ep.params.length > 0) {
      lines.push('### Query Parameters');
      lines.push('');
      lines.push('| Name | Type | Required | Description |');
      lines.push('|------|------|----------|-------------|');
      for (const p of ep.params) {
        lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? 'Yes' : 'No'} | ${p.description} |`);
      }
      lines.push('');
    }

    if (ep.body && ep.body.length > 0) {
      lines.push('### Request Body (JSON)');
      lines.push('');
      lines.push('| Field | Type | Required | Description |');
      lines.push('|-------|------|----------|-------------|');
      for (const p of ep.body) {
        lines.push(`| \`${p.name}\` | ${p.type} | ${p.required ? 'Yes' : 'No'} | ${p.description} |`);
      }
      lines.push('');
    }

    lines.push('### Example Request');
    lines.push('');
    lines.push('```bash');
    lines.push(ep.exampleRequest);
    lines.push('```');
    lines.push('');

    lines.push('### Example Response');
    lines.push('');
    lines.push('```json');
    lines.push(ep.exampleResponse);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function downloadMarkdown(tabId: string, content: SubTabContent) {
  const md = generateMarkdown(tabId, content);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${SUB_TAB_FILENAMES[tabId] || 'api'}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return (
    <button className="api-copy-btn" onClick={copy}>
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

/* ── Endpoint card ── */
function EndpointCard({ ep }: { ep: Endpoint }) {
  const [showResponse, setShowResponse] = useState(false);

  return (
    <div className="api-endpoint-card">
      <div className="api-endpoint-header">
        <span className={`api-method-badge api-method-badge--${ep.method.toLowerCase()}`}>
          {ep.method}
        </span>
        <code className="api-path">{ep.path}</code>
      </div>

      <p className="api-endpoint-desc">{ep.description}</p>

      {ep.params && ep.params.length > 0 && (
        <div className="api-params-section">
          <h4 className="api-section-label">Query Parameters</h4>
          <table className="api-params-table">
            <thead>
              <tr><th>Name</th><th>Type</th><th>Required</th><th>Description</th></tr>
            </thead>
            <tbody>
              {ep.params.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td>{p.type}</td>
                  <td>{p.required ? 'Yes' : 'No'}</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ep.body && ep.body.length > 0 && (
        <div className="api-params-section">
          <h4 className="api-section-label">Request Body (JSON)</h4>
          <table className="api-params-table">
            <thead>
              <tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr>
            </thead>
            <tbody>
              {ep.body.map((p) => (
                <tr key={p.name}>
                  <td><code>{p.name}</code></td>
                  <td>{p.type}</td>
                  <td>{p.required ? 'Yes' : 'No'}</td>
                  <td>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="api-params-section">
        <h4 className="api-section-label">Example Request</h4>
        <div className="api-code-block">
          <CopyButton text={ep.exampleRequest} />
          <pre><code>{ep.exampleRequest}</code></pre>
        </div>
      </div>

      <div className="api-params-section">
        <button
          className="api-response-toggle"
          onClick={() => setShowResponse(!showResponse)}
        >
          <h4 className="api-section-label">
            Example Response
            <span className="api-toggle-icon">{showResponse ? '−' : '+'}</span>
          </h4>
        </button>
        {showResponse && (
          <div className="api-code-block">
            <pre><code>{ep.exampleResponse}</code></pre>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Endpoint data per sub-tab ── */
const SUB_TAB_DATA: Record<string, SubTabContent> = {
  api_getting_started: {
    title: 'Getting Started',
    description: 'Base URL, response format, and system endpoints.',
    preamble: (
      <>
      <div className="api-base-url-card">
        <div className="api-base-url-header">
          <h4 className="api-preamble-label">Base URL</h4>
          <CopyButton text={BASE_URL} />
        </div>
        <code className="api-preamble-value api-preamble-url">{BASE_URL}</code>
      </div>
      <div className="api-preamble api-preamble-grid">
        <div className="api-preamble-item">
          <h4 className="api-preamble-label">Response Format</h4>
          <code className="api-preamble-value">{'{ "data": ..., "meta": { ... } }'}</code>
        </div>
        <div className="api-preamble-item">
          <h4 className="api-preamble-label">Error Format</h4>
          <code className="api-preamble-value">{'{ "error": { "code": "...", "message": "..." } }'}</code>
        </div>
      </div>
      <div className="api-preamble">
        <h4 className="api-preamble-label">Error Codes</h4>
        <div className="api-error-codes">
          <span className="api-error-code"><code>INVALID_JSON</code> 400</span>
          <span className="api-error-code"><code>UNAUTHORIZED</code> 401</span>
          <span className="api-error-code"><code>NOT_FOUND</code> 404</span>
          <span className="api-error-code"><code>VALIDATION_ERROR</code> 422</span>
          <span className="api-error-code"><code>INTERNAL_ERROR</code> 500</span>
        </div>
      </div>
      </>
    ),
    endpoints: [
      {
        method: 'GET',
        path: '/health',
        description: 'Health check. Returns server status and current timestamp.',
        exampleRequest: `curl -s ${BASE_URL}/health | jq .`,
        exampleResponse: JSON.stringify({ status: 'ok', timestamp: '2026-03-21T00:00:00.000Z' }, null, 2),
      },
      {
        method: 'GET',
        path: '/stats',
        description: 'Aggregate statistics across all resources – company counts, relationships, component categories, AI models, funding, production, and more.',
        exampleRequest: `curl -s ${BASE_URL}/stats | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            totalCompanies: 81, oems: 37, suppliers: 44,
            relationships: 173, componentCategories: 20,
            vlaModels: 19, rewardModels: 10, worldModels: 19,
            simPlatforms: 14, vizTools: 10, headDesigns: 17,
            safetyStandards: 10, safetyProfiles: 12,
            fundingRecords: 26, investors: 12,
            factories: 25, productionRecords: 20,
            oemsByCountry: { US: 10, CN: 19, CA: 1, DE: 1 },
            companiesByType: { oem: 37, component_maker: 37, ai_compute: 4, raw_material: 3 },
          },
          meta: { timestamp: '2026-03-21T00:00:00.000Z' },
        }, null, 2),
      },
    ],
  },

  api_companies: {
    title: 'Companies',
    description: 'List, search, and retrieve detailed company profiles for OEMs and suppliers.',
    endpoints: [
      {
        method: 'GET',
        path: '/companies',
        description: 'List all companies with filtering and pagination. Returns relationship counts per company.',
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter by entity type (comma-separated). E.g. "oem", "component_maker"' },
          { name: 'country', type: 'string', required: false, description: 'Filter by country code (comma-separated). E.g. "US", "CN"' },
          { name: 'status', type: 'string', required: false, description: 'Filter by robotSpecs status. E.g. "In Production"' },
          { name: 'q', type: 'string', required: false, description: 'Search name and description (case-insensitive substring)' },
          { name: 'has_specs', type: 'string', required: false, description: 'If "true", only return companies with robotSpecs' },
          { name: 'limit', type: 'number', required: false, description: 'Max results (default 200, max 500)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default 0)' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/companies?type=oem&country=US&limit=5" | jq .`,
        exampleResponse: JSON.stringify({
          data: [
            {
              id: 'tesla', name: 'Tesla (Optimus)', type: 'oem', country: 'US',
              description: 'The only humanoid OEM with an existing autonomous driving stack to repurpose...',
              ticker: 'TSLA',
              _counts: { suppliersInbound: 8, customersOutbound: 0, vlaModels: 2, simPlatforms: 1 },
            },
          ],
          meta: { total: 10, limit: 5, offset: 0 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/companies/:id',
        description: 'Retrieve a fully hydrated company profile with all resolved relationships, specs, and associated data.',
        params: [
          { name: 'id', type: 'string (path)', required: true, description: 'Company ID. E.g. "tesla"' },
        ],
        exampleRequest: `curl -s ${BASE_URL}/companies/tesla | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            company: {
              id: 'tesla', name: 'Tesla (Optimus)', type: 'oem', country: 'US', ticker: 'TSLA',
              description: 'The only humanoid OEM with an existing autonomous driving stack to repurpose...',
              robotSpecs: { status: 'Prototype', launchDate: 'Q1 2026', height: '173 cm', mass: '47 kg', speed: '2-3 m/s', totalDOF: '72' },
            },
            suppliers: [{ id: 'nidec', name: 'Nidec', component: 'Motors' }],
            customers: [],
            funding: { totalRaised: null, latestValuationM: 1500000 },
            production: { annualCapacity: 10000000, shipped2025: 5000 },
          },
        }, null, 2),
      },
    ],
  },

  api_supply_chain: {
    title: 'Supply Chain',
    description: 'Query supply chain relationships, traverse the dependency graph, analyze bottlenecks, and run what-if scenarios.',
    endpoints: [
      {
        method: 'GET',
        path: '/relationships',
        description: 'List supply chain edges between companies. Each relationship links a supplier to a customer for a specific component.',
        params: [
          { name: 'from', type: 'string', required: false, description: 'Filter by source company ID (comma-separated)' },
          { name: 'to', type: 'string', required: false, description: 'Filter by destination company ID (comma-separated)' },
          { name: 'component', type: 'string', required: false, description: 'Filter by component name (substring, case-insensitive)' },
          { name: 'category', type: 'string', required: false, description: 'Filter by component category (comma-separated)' },
          { name: 'from_country', type: 'string', required: false, description: 'Filter by source company country (comma-separated)' },
          { name: 'to_country', type: 'string', required: false, description: 'Filter by destination company country (comma-separated)' },
          { name: 'from_type', type: 'string', required: false, description: 'Filter by source entity type (comma-separated)' },
          { name: 'to_type', type: 'string', required: false, description: 'Filter by destination entity type (comma-separated)' },
          { name: 'limit', type: 'number', required: false, description: 'Max results (default 500, max 1000)' },
          { name: 'offset', type: 'number', required: false, description: 'Pagination offset (default 0)' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/relationships?to=tesla&category=motors" | jq .`,
        exampleResponse: JSON.stringify({
          data: [
            { id: 'r6', from: { id: 'nidec', name: 'Nidec', type: 'component_maker', country: 'JP' }, to: { id: 'tesla', name: 'Tesla (Optimus)', type: 'oem', country: 'US' }, component: 'Motors', componentCategoryId: 'motors', description: 'Frameless and coreless motors' },
          ],
          meta: { total: 2, limit: 500, offset: 0 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/supply-chain/:id',
        description: 'Graph traversal from a given company. Walk upstream (suppliers), downstream (customers), or both to a configurable depth.',
        params: [
          { name: 'id', type: 'string (path)', required: true, description: 'Starting company ID' },
        ],
        body: [
          { name: 'direction', type: 'string', required: false, description: '"upstream", "downstream", or "both" (default "both")' },
          { name: 'maxDepth', type: 'number', required: false, description: 'Traversal depth, 1-10 (default 3)' },
        ],
        exampleRequest: `curl -s -X POST ${BASE_URL}/supply-chain/tesla \\
  -H "Content-Type: application/json" \\
  -d '{"direction":"upstream","maxDepth":2}' | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            root: 'tesla',
            nodes: ['tesla', 'maxon', 'nvidia'],
            edges: [{ from: 'maxon', to: 'tesla', component: 'EC-i Series BLDC' }],
          },
          meta: { direction: 'upstream', maxDepth: 2 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/bottlenecks',
        description: 'Identify supply chain bottlenecks – component categories where a small number of suppliers serve many OEMs.',
        params: [
          { name: 'country', type: 'string', required: false, description: 'Filter bottlenecks by supplier country' },
        ],
        exampleRequest: `curl -s ${BASE_URL}/bottlenecks | jq .`,
        exampleResponse: JSON.stringify({
          data: [
            { category: { id: 'reducers', name: 'Reducers (Harmonic Drive)', bottleneckReason: 'Harmonic Drive holds 20-25% market share...', avgCostPercent: 36 }, suppliers: [{ id: 'harmonic_drive', name: 'Harmonic Drive Systems', country: 'JP', marketShare: '20-25%', customerCount: 10 }] },
          ],
          meta: { total_bottleneck_categories: 4, total_exposed_oems: 18 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/scenario',
        description: 'What-if scenario analysis. Simulate the impact of a supplier going offline, a country ban, or a component shortage across the supply chain.',
        body: [
          { name: 'mode', type: 'string', required: true, description: '"supplier-loss", "country-ban", or "component-shortage"' },
          { name: 'offlineEntities', type: 'string[]', required: false, description: '1-5 company IDs to take offline (required for supplier-loss)' },
          { name: 'bannedCountries', type: 'string[]', required: false, description: 'Country codes to ban (required for country-ban)' },
          { name: 'affectedCategories', type: 'string[]', required: false, description: 'Component categories (required for component-shortage)' },
        ],
        exampleRequest: `curl -s -X POST ${BASE_URL}/scenario \\
  -H "Content-Type: application/json" \\
  -d '{"mode":"supplier-loss","offlineEntities":["nvidia"]}' | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            affectedOems: [{ id: 'tesla', impactedComponents: ['Jetson AGX Orin'] }],
          },
          meta: { mode: 'supplier-loss' },
        }, null, 2),
      },
    ],
  },

  api_resources: {
    title: 'Resources',
    description: 'Reference data – components, funding, investors, production, factories, and manufacturing partners.',
    endpoints: [
      {
        method: 'GET',
        path: '/components',
        description: 'List component categories used across the supply chain.',
        params: [
          { name: 'bottleneck', type: 'string', required: false, description: 'If "true", only return bottleneck components' },
        ],
        exampleRequest: `curl -s ${BASE_URL}/components | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'skeleton', name: 'Skeleton / Frame', description: 'Structural frame providing rigidity and mounting points...', bottleneck: false, keyMetrics: { 'Common Materials': 'Aluminum alloy, Carbon fiber, Titanium' } }],
          meta: { total: 20 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/funding',
        description: 'List company funding records. Sortable by valuation or total raised.',
        params: [
          { name: 'sort', type: 'string', required: false, description: '"valuation" or "raised" (descending)' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/funding?sort=valuation" | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ companyId: 'tesla', name: 'Tesla (Optimus)', country: 'US', status: 'public', ticker: 'TSLA', latestValuationM: 1500000, latestValuationNote: 'market cap', keyInvestors: [], rounds: [{ name: 'IPO', date: '2010-06', amountM: 226 }] }],
          meta: { total: 26 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/investors',
        description: 'List top investors in the humanoid robotics space with their portfolio companies.',
        exampleRequest: `curl -s ${BASE_URL}/investors | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'nvidia_ventures', name: 'NVIDIA / NVentures', country: 'US', type: 'Corporate VC', portfolioCompanyIds: ['figure', 'agility'], description: 'Dual strategy: sell Jetson compute modules and take equity in top OEMs.' }],
          meta: { total: 12 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/production',
        description: 'List company production records. Sortable by capacity or shipments.',
        params: [
          { name: 'sort', type: 'string', required: false, description: '"capacity" or "shipments" (descending)' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/production?sort=capacity" | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ companyId: 'tesla', name: 'Tesla', country: 'US', mfgModel: 'in-house', annualCapacity: 10000000, capacityNote: 'aspirational, by 2027', shipped2025: 5000, shipped2025Note: 'internal use only' }],
          meta: { total: 20 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/factories',
        description: 'List factory directory with location, status, and capacity.',
        params: [
          { name: 'country', type: 'string', required: false, description: 'Filter by country code' },
          { name: 'status', type: 'string', required: false, description: 'Filter by factory status' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/factories?country=US" | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'giga_texas_optimus', name: 'Giga Texas Optimus Factory', companyId: 'tesla', companyName: 'Tesla', country: 'US', location: 'Austin, TX', status: 'under-construction', sizeSqft: '1-2M sqft (planned)', mfgModel: 'in-house' }],
          meta: { total: 8 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/manufacturing-partners',
        description: 'List manufacturing partners that provide contract manufacturing for OEMs.',
        exampleRequest: `curl -s ${BASE_URL}/manufacturing-partners | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'jabil', name: 'Jabil', country: 'US', type: 'EMS', partnerCompanyIds: ['apptronik'], description: 'Worldwide manufacturing partner for Apollo humanoid robots.' }],
          meta: { total: 6 },
        }, null, 2),
      },
    ],
  },

  api_ai_sim: {
    title: 'AI & Sim',
    description: 'Vision-Language-Action models, reward models, world models, simulation platforms, and visualization tools.',
    endpoints: [
      {
        method: 'GET',
        path: '/vla-models',
        description: 'List Vision-Language-Action models with their type, provider, and associated OEMs.',
        params: [
          { name: 'type', type: 'string', required: false, description: 'Filter by relationship type' },
        ],
        exampleRequest: `curl -s ${BASE_URL}/vla-models | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'helix_02', name: 'Helix 02', developer: 'Figure', country: 'US', relationshipType: 'proprietary', description: 'Figure\'s second-gen VLA...', release: '2026', availability: 'Internal / Figure-only' }],
          meta: { total: 19 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/reward-models',
        description: 'List reward models used for humanoid robot training.',
        exampleRequest: `curl -s ${BASE_URL}/reward-models | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'robometer', name: 'Robometer', developer: 'USC / MIT / NVIDIA / AI2 / UW', country: 'US', modelType: 'trained', backbone: 'Qwen3-VL-4B', params: '4B', release: 'Mar 2026', availability: 'Open weights + code (MIT)' }],
          meta: { total: 10 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/reward-comparisons',
        description: 'List reward model comparison benchmarks across training approaches.',
        exampleRequest: `curl -s ${BASE_URL}/reward-comparisons | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'sweater_inversion', instruction: 'Retrieve the collar and correctly invert the plain sweater', numFrames: 10, models: [{ id: 'topreward', name: 'TOPReward', voc: 0.92 }, { id: 'robometer', name: 'Robometer', voc: 0.55 }] }],
          meta: { total: 3 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/world-models',
        description: 'List world models used for simulation and planning in humanoid robotics.',
        exampleRequest: `curl -s ${BASE_URL}/world-models | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'dreamdojo', name: 'DreamDojo', developer: 'NVIDIA / HKUST / UC Berkeley', country: 'US', modelType: 'video-generation', backbone: 'Autoregressive video diffusion', params: '14B', release: '2026', availability: 'Open source (GitHub)' }],
          meta: { total: 19 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/sim-platforms',
        description: 'List simulation platforms used for humanoid robot training and testing.',
        exampleRequest: `curl -s ${BASE_URL}/sim-platforms | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'isaac_sim', name: 'NVIDIA Isaac Sim / Lab', developer: 'NVIDIA', country: 'US', platformType: 'physics-engine', physicsEngine: 'PhysX', license: 'Open source (free for R&D)', gpuAccelerated: true, humanoidModels: true, simToReal: true }],
          meta: { total: 14 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/viz-tools',
        description: 'List visualization tools used for robot telemetry, URDF inspection, and debugging.',
        exampleRequest: `curl -s ${BASE_URL}/viz-tools | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'foxglove', name: 'Foxglove', developer: 'Foxglove Technologies', country: 'US', toolType: 'platform', language: 'TypeScript', frameworks: 'ROS 1/2, MCAP, Protobuf', deployment: 'Desktop + Web + Self-hosted', license: 'Commercial (free tier available)' }],
          meta: { total: 10 },
        }, null, 2),
      },
    ],
  },

  api_safety: {
    title: 'Safety',
    description: 'Safety standards, OEM compliance profiles, and head/face design catalog.',
    endpoints: [
      {
        method: 'GET',
        path: '/safety/standards',
        description: 'List safety standards relevant to humanoid robots (ISO, IEC, etc.).',
        exampleRequest: `curl -s ${BASE_URL}/safety/standards | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'iso_25785', name: 'ISO 25785-1', scope: 'Dynamically stable industrial mobile robots (bipedal, legged)', issuingBody: 'ISO TC 299', region: 'International', status: 'working-draft', expectedDate: '2026-2027' }],
          meta: { total: 10 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/safety/profiles',
        description: 'List OEM safety compliance profiles showing which standards each manufacturer meets.',
        params: [
          { name: 'level', type: 'string', required: false, description: 'Filter by compliance level' },
        ],
        exampleRequest: `curl -s ${BASE_URL}/safety/profiles | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'agility_safety', companyId: 'agility', name: 'Agility Robotics', country: 'US', complianceLevel: 'certified', forceLimiting: true, eStop: true, speedLimiting: true, collisionDetection: true, fallProtection: true }],
          meta: { total: 12 },
        }, null, 2),
      },
      {
        method: 'GET',
        path: '/head-designs',
        description: 'List head and face design records for humanoid robots – display type, expression capability, and design rationale.',
        params: [
          { name: 'face_type', type: 'string', required: false, description: 'Filter by face type (e.g. "oled-screen", "led-array", "static-mask")' },
        ],
        exampleRequest: `curl -s "${BASE_URL}/head-designs?face_type=oled-screen" | jq .`,
        exampleResponse: JSON.stringify({
          data: [{ id: 'optimus_gen3', name: 'Optimus (Gen 3)', developer: 'Tesla', developerCompanyId: 'tesla', country: 'US', faceType: 'oled-screen', displayTech: 'Samsung 8-inch curved OLED', headCameras: '8 (Autopilot multi-camera unit)', depthApproach: 'Stereo vision (neural depth estimation)' }],
          meta: { total: 17 },
        }, null, 2),
      },
    ],
  },

  api_query: {
    title: 'Query',
    description: 'LLM-powered search and side-by-side OEM comparison.',
    endpoints: [
      {
        method: 'POST',
        path: '/query',
        description: 'Natural language search across the entire dataset. Powered by Groq (Llama 3.1). Returns a generated answer, matched company IDs, and intent classification.',
        body: [
          { name: 'q', type: 'string', required: true, description: 'Natural language query' },
          { name: 'max_results', type: 'number', required: false, description: 'Max company results to return' },
        ],
        exampleRequest: `curl -s -X POST ${BASE_URL}/query \\
  -H "Content-Type: application/json" \\
  -d '{"q":"Which OEMs use NVIDIA compute?"}' | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            answer: 'Several OEMs integrate NVIDIA compute modules...',
            companyIds: ['tesla', 'figure', 'apptronik'],
            intent: 'list',
          },
          meta: { model: 'llama-3.1-8b-instant', tokens_used: 1240 },
        }, null, 2),
      },
      {
        method: 'POST',
        path: '/compare',
        description: 'Side-by-side comparison of 2-5 OEMs. Returns a structured comparison across specs, supply chain, and capabilities.',
        body: [
          { name: 'companyIds', type: 'string[]', required: true, description: 'Array of 2-5 OEM company IDs to compare' },
        ],
        exampleRequest: `curl -s -X POST ${BASE_URL}/compare \\
  -H "Content-Type: application/json" \\
  -d '{"companyIds":["tesla","figure"]}' | jq .`,
        exampleResponse: JSON.stringify({
          data: {
            companies: [
              { id: 'tesla', name: 'Tesla (Optimus)', height: '173 cm', mass: '47 kg', speed: '2-3 m/s' },
              { id: 'figure', name: 'Figure (Figure 03)', height: '170 cm', mass: '60 kg', speed: '2.0 m/s' },
            ],
          },
          meta: { companyCount: 2 },
        }, null, 2),
      },
    ],
  },
};

/* ── Main Component ── */
export default function ApiDocs({ activeSubTab }: { activeSubTab: string }) {
  const content = SUB_TAB_DATA[activeSubTab];
  const [methodFilter, setMethodFilter] = useState<'all' | 'GET' | 'POST'>('all');
  const [mdDownloaded, setMdDownloaded] = useState(false);

  if (!content) return null;

  const methods = new Set(content.endpoints.map((ep) => ep.method));
  const hasBoth = methods.has('GET') && methods.has('POST');

  const filtered = methodFilter === 'all'
    ? content.endpoints
    : content.endpoints.filter((ep) => ep.method === methodFilter);

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div className="api-docs-header-top">
          <div>
            <div className="api-docs-title-row">
              <h2 className="api-docs-title">{content.title}</h2>
              <button className="api-md-btn" onClick={() => {
                downloadMarkdown(activeSubTab, content);
                setMdDownloaded(true);
                setTimeout(() => setMdDownloaded(false), 3000);
              }}>
                {mdDownloaded ? 'Downloaded!' : '.md file for agents'}
              </button>
            </div>
            <p className="api-docs-desc">{content.description}</p>
          </div>
          {hasBoth && (
            <div className="api-method-filter">
              <button
                className={`api-method-filter-btn ${methodFilter === 'all' ? 'api-method-filter-btn--active' : ''}`}
                onClick={() => setMethodFilter('all')}
              >ALL</button>
              <button
                className={`api-method-filter-btn api-method-filter-btn--get ${methodFilter === 'GET' ? 'api-method-filter-btn--active' : ''}`}
                onClick={() => setMethodFilter('GET')}
              >GET</button>
              <button
                className={`api-method-filter-btn api-method-filter-btn--post ${methodFilter === 'POST' ? 'api-method-filter-btn--active' : ''}`}
                onClick={() => setMethodFilter('POST')}
              >POST</button>
            </div>
          )}
        </div>
      </div>

      {content.preamble}

      {filtered.map((ep) => (
        <EndpointCard key={`${ep.method}-${ep.path}`} ep={ep} />
      ))}
    </div>
  );
}
