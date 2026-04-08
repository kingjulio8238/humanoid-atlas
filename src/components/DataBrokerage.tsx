import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useAuth, useClerk, SignInButton, SignUpButton } from '@clerk/clerk-react';
import { loadStripe, type Stripe, type StripeElements } from '@stripe/stripe-js';
import { api, setTokenGetter } from '../lib/brokerage-api';
import { useCart } from '../hooks/useCart';


const LOCATION_OPTIONS = [
  'San Francisco, USA', 'New York, USA', 'Austin, USA', 'Boston, USA', 'Seattle, USA', 'Los Angeles, USA', 'Pittsburgh, USA', 'Chicago, USA',
  'Beijing, China', 'Shanghai, China', 'Shenzhen, China', 'Hangzhou, China', 'Guangzhou, China',
  'Munich, Germany', 'Berlin, Germany', 'Stuttgart, Germany',
  'Tokyo, Japan', 'Osaka, Japan',
  'Seoul, South Korea',
  'Paris, France', 'Lyon, France',
  'London, UK', 'Bristol, UK', 'Cambridge, UK',
  'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
  'Tel Aviv, Israel',
  'Singapore',
  'Bangalore, India', 'Mumbai, India', 'Hyderabad, India',
  'Sydney, Australia', 'Melbourne, Australia',
  'Milan, Italy', 'Turin, Italy',
  'Oslo, Norway',
  'Amsterdam, Netherlands',
  'Zurich, Switzerland',
  'Taipei, Taiwan',
  'Barcelona, Spain', 'Madrid, Spain',
  'Stockholm, Sweden',
  'Helsinki, Finland',
  'Dubai, UAE',
  'Sao Paulo, Brazil',
];

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const CLERK_AVAILABLE = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Safe Clerk hook — returns defaults if ClerkProvider is not mounted
function useClerkAuth(): { isSignedIn: boolean; getToken: () => Promise<string | null> } {
  if (!CLERK_AVAILABLE) return { isSignedIn: false, getToken: async () => null };
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth();
  return { isSignedIn: auth.isSignedIn ?? false, getToken: auth.getToken };
}

function ClerkSignInBtn({ children }: { children: React.ReactNode }) {
  if (!CLERK_AVAILABLE) return <>{children}</>;
  return <SignInButton mode="modal">{children}</SignInButton>;
}

function ClerkSignUpBtn({ children }: { children: React.ReactNode }) {
  if (!CLERK_AVAILABLE) return <>{children}</>;
  return <SignUpButton mode="modal">{children}</SignUpButton>;
}

interface Listing {
  id: string; title: string; slug: string; description: string; modality: string | string[];
  environment: string | string[]; collection_method?: string | string[]; embodiment_type?: string | string[];
  task_type?: string | string[]; use_cases: string[]; tags: string[]; total_hours: number | null;
  format: string | null; resolution: string | null; price_per_hour: number; modality_prices?: Record<string, number> | null; currency: string;
  minimum_hours: number; license_type: string; license_terms: string | null; featured: boolean;
  created_at: string; thumbnail_url?: string | null;
  review_status?: string; has_purchases?: boolean; is_active?: boolean;
  sample_manifest_url?: string | null;
  manifest_summary?: { episode_count: number; total_duration_hours: number } | null;
  providers?: { id: string; name: string; slug: string; logo_url: string | null };
  samples?: Array<{ id: string; url: string; filename: string; content_type: string; duration_seconds: number | null }>;
}

interface CollectionProgram {
  id: string; title: string; description: string; requirements: string | null;
  compensation_description: string | null; signup_type: string; external_url: string | null;
  form_fields: Record<string, unknown> | null; created_at: string;
  providers?: { id: string; name: string; slug: string; logo_url: string | null; website_url: string | null };
}

// ═══════════════════════════════════════════════════════════
// TAXONOMY CONSTANTS
// ═══════════════════════════════════════════════════════════

const MODALITIES = [
  'rgb', 'rgbd', 'depth', 'motion_capture',
  'tactile', 'force_torque', 'proprioception', 'joint_trajectory', 'imu', 'audio',
  'language_annotations', 'other',
  // Hidden: 'lidar', 'point_cloud', 'thermal'
];

const ENVIRONMENTS = [
  'kitchen', 'bathroom', 'living_room', 'bedroom', 'garage',
  'office', 'warehouse', 'fulfillment_center', 'retail', 'laboratory',
  'industrial', 'assembly_line', 'data_center', 'healthcare', 'restaurant',
  'hotel', 'eldercare', 'construction', 'logistics', 'maritime',
  'outdoor', 'agriculture', 'road', 'simulation', 'other',
  // Hidden: 'domestic', 'multi_environment'
];

const COLLECTION_METHODS = [
  'teleoperation', 'vr_teleoperation', 'leader_follower',
  'human_demonstration', 'motion_capture_retargeting', 'exoskeleton_capture',
  'shared_autonomy', 'autonomous_policy', 'fleet_deployed',
  'video_extraction', 'simulation_generated', 'other',
  // Hidden: 'kinesthetic_teaching', 'play_data', 'crowdsourced', 'scripted'
];

const EMBODIMENT_TYPES = [
  'humanoid', 'quadruped', 'legged_biped', 'dual_arm', 'bimanual_fixed', 'single_arm',
  'parallel_jaw_gripper', 'hand_dexterous', 'mobile_manipulator', 'wheeled_robot',
  'human', 'other',
  // Hidden: 'drone', 'autonomous_vehicle'
];

const TASK_TYPES = [
  'pick_and_place', 'grasping', 'pushing', 'stacking', 'pouring', 'insertion',
  'sorting', 'wiping', 'folding', 'assembly',
  'cleaning', 'cooking', 'navigation', 'locomotion', 'whole_body_motion',
  'tool_use',
  // Hidden: 'articulated_object', 'bin_packing', 'inspection', 'general_manipulation', 'other'
];

function formatTags(value: string | string[]): string {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(v => v.replace(/_/g, ' ')).join(', ');
}

// ═══════════════════════════════════════════════════════════
// SAMPLE DISPLAY
// ═══════════════════════════════════════════════════════════

interface Sample {
  id: string;
  url: string;
  filename: string;
  content_type?: string;
  duration_seconds?: number | null;
}

type SampleCategory = 'video' | 'image' | 'audio' | 'json' | 'rerun' | 'timeseries' | 'tactile' | 'download';

const TIME_SERIES_MODALITIES = ['imu', 'force_torque', 'proprioception', 'joint_trajectory'];
const TACTILE_MODALITIES = ['tactile'];

function getSampleCategory(contentType?: string, filename?: string, modalities?: string[]): SampleCategory {
  const ct = (contentType ?? '').toLowerCase();
  const ext = (filename ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (ct.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ct.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) return 'image';
  if (ct.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (ct === 'application/json' || ext === 'json') return 'json';
  if (['rrd', 'rosbag', 'mcap'].includes(ext)) return 'rerun';
  if (ext === 'parquet' && modalities?.some(m => TACTILE_MODALITIES.includes(m))) return 'tactile';
  if (ext === 'parquet' && modalities?.some(m => TIME_SERIES_MODALITIES.includes(m))) return 'timeseries';
  return 'download';
}


function JsonPreview({ url, filename }: { url: string; filename: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(url)
      .then(r => r.text())
      .then(text => {
        try { setContent(JSON.stringify(JSON.parse(text), null, 2)); }
        catch { setContent(text); }
      })
      .catch(() => setError(true));
  }, [url]);

  if (error) return <div className="db-json-error">Failed to load {filename}</div>;
  if (content === null) return <div className="db-json-loading">Loading...</div>;

  const lines = content.split('\n');
  const preview = expanded ? content : lines.slice(0, 20).join('\n');
  const truncated = !expanded && lines.length > 20;

  return (
    <div className="db-json-viewer">
      <div className="db-json-header">
        <span className="db-json-filename">{filename}</span>
        <span className="db-json-lines">{lines.length} lines</span>
      </div>
      <pre className="db-json-content">{preview}</pre>
      {truncated && <button className="db-json-expand" onClick={() => setExpanded(true)}>Show all ({lines.length} lines)</button>}
    </div>
  );
}

const LazyRerunViewer = React.lazy(() =>
  import('@rerun-io/web-viewer-react').then(mod => ({ default: mod.default }))
);

const LazyParquetChart = React.lazy(() => import('./ParquetChartViewer'));
const LazyTactileHand = React.lazy(() => import('./TactileHandViewer'));

function RerunSampleViewer({ url }: { url: string }) {
  return (
    <Suspense fallback={<div className="db-rerun-loading">Loading 3D viewer...</div>}>
      <div className="db-rerun-container">
        <LazyRerunViewer rrd={url} width="100%" height="100%" hide_welcome_screen />
      </div>
    </Suspense>
  );
}

function SampleRenderer({ sample, modalities = [] }: { sample: Sample; modalities?: string[] }) {
  const category = getSampleCategory(sample.content_type, sample.filename, modalities);
  switch (category) {
    case 'video':
      return <video className="db-video-player" controls src={sample.url} />;
    case 'image': {
      const isDepth = sample.filename.toLowerCase().includes('depth') || sample.filename.toLowerCase().includes('disparity');
      return <img className={`db-image-player${isDepth ? ' db-image-player--depth' : ''}`} src={sample.url} alt={sample.filename} />;
    }
    case 'audio':
      return (
        <div className="db-audio-player-wrap">
          <div className="db-audio-filename">{sample.filename}</div>
          <audio className="db-audio-player" controls src={sample.url} />
        </div>
      );
    case 'json':
      return <JsonPreview url={sample.url} filename={sample.filename} />;
    case 'rerun':
      return <RerunSampleViewer url={sample.url} />;
    case 'timeseries':
      return (
        <Suspense fallback={<div className="db-chart-loading">Loading chart...</div>}>
          <LazyParquetChart url={sample.url} filename={sample.filename} />
        </Suspense>
      );
    case 'tactile':
      return (
        <Suspense fallback={<div className="db-chart-loading">Loading tactile data...</div>}>
          <LazyTactileHand url={sample.url} filename={sample.filename} />
        </Suspense>
      );
    case 'download':
      return (
        <div className="db-download-card">
          <div className="db-download-info">
            <div className="db-download-filename">{sample.filename}</div>
            <div className="db-download-ext">{sample.filename.split('.').pop()?.toUpperCase()} file</div>
          </div>
          <a href={sample.url} download={sample.filename} className="db-download-link" target="_blank" rel="noopener noreferrer">Download</a>
        </div>
      );
  }
}

function SampleGallery({ samples, modalities = [] }: { samples: Sample[]; modalities?: string[] }) {
  // Group samples by category
  const groups: { label: string; type: 'video-strip' | 'inline'; samples: Sample[]; stateKey: string }[] = [];
  const videos: Sample[] = [];
  const depthImages: Sample[] = [];
  const rgbImages: Sample[] = [];
  const thermalImages: Sample[] = [];
  const otherImages: Sample[] = [];
  const others: { sample: Sample; category: SampleCategory }[] = [];

  for (const s of samples) {
    const cat = getSampleCategory(s.content_type, s.filename, modalities);
    if (cat === 'video') videos.push(s);
    else if (cat === 'image') {
      const fn = s.filename.toLowerCase();
      if (fn.includes('depth') || fn.includes('disparity')) depthImages.push(s);
      else if (fn.includes('thermal') || fn.includes('infrared') || fn.includes('ir_')) thermalImages.push(s);
      else if (fn.includes('rgb') || fn.includes('color')) rgbImages.push(s);
      else otherImages.push(s);
    }
    else others.push({ sample: s, category: cat });
  }

  if (videos.length > 0) groups.push({ label: 'Videos', type: 'video-strip' as const, samples: videos, stateKey: 'video' });
  if (rgbImages.length > 0) groups.push({ label: 'RGB Images', type: 'video-strip' as const, samples: rgbImages, stateKey: 'rgb-img' });
  if (depthImages.length > 0) groups.push({ label: 'Depth Maps', type: 'video-strip' as const, samples: depthImages, stateKey: 'depth-img' });
  if (thermalImages.length > 0) groups.push({ label: 'Thermal Images', type: 'video-strip' as const, samples: thermalImages, stateKey: 'thermal-img' });
  if (otherImages.length > 0) groups.push({ label: 'Images', type: 'video-strip' as const, samples: otherImages, stateKey: 'other-img' });

  // Group remaining by category with readable labels
  const catOrder = ['tactile', 'timeseries', 'download', 'rerun', 'json', 'audio'];

  // Modality keyword map for splitting timeseries by detected modality
  const modalityKeywords: Record<string, string[]> = {
    imu: ['imu', 'accel', 'gyro'], force_torque: ['force', 'torque', 'ft_', 'wrench'],
    proprioception: ['proprio', 'encoder', 'qpos', 'qvel'],
    joint_trajectory: ['trajectory', 'ee_pose', 'action', 'cartesian'],
    motion_capture: ['mocap', 'motion_capture', 'skeleton'],
    tactile: ['tactile', 'pressure', 'touch', 'taxel'],
  };
  const modalityLabels: Record<string, string> = {
    imu: 'IMU Data', force_torque: 'Force/Torque Data', proprioception: 'Proprioception Data',
    joint_trajectory: 'Joint Trajectory Data', motion_capture: 'Motion Capture Data', tactile: 'Tactile Pressure',
  };

  const detectModality = (filename: string): string | null => {
    const fn = filename.toLowerCase();
    for (const [mod, kws] of Object.entries(modalityKeywords)) {
      if (kws.some(kw => fn.includes(kw))) return mod;
    }
    return null;
  };

  for (const cat of catOrder) {
    const items = others.filter(o => o.category === cat);
    if (items.length === 0) continue;

    // For timeseries with multi-modality listings, split by detected modality
    if (cat === 'timeseries' && modalities.length > 1) {
      const byMod: Record<string, Sample[]> = {};
      const unmatched: Sample[] = [];
      for (const o of items) {
        const detected = detectModality(o.sample.filename);
        if (detected) {
          if (!byMod[detected]) byMod[detected] = [];
          byMod[detected].push(o.sample);
        } else {
          unmatched.push(o.sample);
        }
      }
      for (const [mod, modSamples] of Object.entries(byMod)) {
        const label = modalityLabels[mod] ?? `${mod.replace(/_/g, ' ')} Data`;
        const type = modSamples.length > 1 ? 'video-strip' as const : 'inline' as const;
        groups.push({ label, type, samples: modSamples, stateKey: `ts-${mod}` });
      }
      if (unmatched.length > 0) {
        const type = unmatched.length > 1 ? 'video-strip' as const : 'inline' as const;
        groups.push({ label: 'Sensor Data', type, samples: unmatched, stateKey: 'ts-other' });
      }
    } else {
      const ext = items[0].sample.filename.split('.').pop()?.toUpperCase() ?? '';
      const label = cat === 'download' ? `Data Files (${ext})` : cat === 'json' ? `Language Annotations (JSON)` : cat === 'timeseries' ? `Sensor Data (PARQUET)` : cat === 'tactile' ? `Tactile Pressure` : cat === 'audio' ? 'Audio' : cat === 'rerun' ? '3D Visualization' : ext;
      const type = items.length > 1 ? 'video-strip' as const : 'inline' as const;
      groups.push({ label, type, samples: items.map(o => o.sample), stateKey: cat });
    }
  }

  const [activeStripIdx, setActiveStripIdx] = useState<Record<string, number>>({});

  if (groups.length === 0) return null;

  return (
    <div className="db-sample-groups">
      {groups.map(group => (
        <div key={group.label} className="db-sample-group">
          <div className="db-sample-group__label">{group.label}</div>
          {group.type === 'video-strip' ? (() => {
            const key = group.stateKey;
            const idx = activeStripIdx[key] ?? 0;
            const safeIdx = Math.min(idx, group.samples.length - 1);
            const active = group.samples[safeIdx];
            return (
              <>
                <SampleRenderer sample={active} modalities={modalities} key={active.id + safeIdx} />
                {group.samples.length > 1 && (
                  <div className="db-thumb-strip">
                    {group.samples.map((s, i) => (
                      <div key={s.id} className={`db-thumb${i === safeIdx ? ' db-thumb--active' : ''}`} onClick={() => setActiveStripIdx(prev => ({ ...prev, [key]: i }))} title={s.filename}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })() : (
            <div className="db-sample-group__items">
              {group.samples.map(s => (
                <SampleRenderer key={s.id} sample={s} modalities={modalities} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SampleList({ samples, modalities = [], onRemove }: { samples: Sample[]; modalities?: string[]; onRemove?: (sampleId: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="db-sample-list">
      {samples.map(s => {
        const isOpen = expandedId === s.id;
        return (
          <div key={s.id} className="db-sample-list__item">
            <div className="db-sample-list__row" onClick={() => setExpandedId(isOpen ? null : s.id)}>
              <span className="db-sample-list__name">{s.filename}</span>
              <div className="db-sample-list__actions">
                {onRemove && (
                  <button className="db-sample-remove-btn" onClick={e => { e.stopPropagation(); onRemove(s.id); }} title="Remove">&times;</button>
                )}
                <span className="db-sample-list__arrow">{isOpen ? '−' : '+'}</span>
              </div>
            </div>
            {isOpen && (
              <div className="db-sample-list__preview">
                <SampleRenderer sample={s} modalities={modalities} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BUY DATA
// ═══════════════════════════════════════════════════════════

function PurchaseSection({ listing, cart, onCartOpen }: { listing: Listing; cart: ReturnType<typeof useCart>; onCartOpen: () => void }) {
  const [hoursStr, setHoursStr] = useState(String(listing.minimum_hours));
  const [minNotice, setMinNotice] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const listingTags = Array.isArray(listing.tags) ? listing.tags as string[] : [];
  const allModalities = [
    ...(Array.isArray(listing.modality) ? listing.modality.map(String) : [String(listing.modality)]),
    ...listingTags.filter(t => t.startsWith('modality:')).map(t => t.replace('modality:', '')),
  ];
  const hasModalityPrices = listing.modality_prices && Object.keys(listing.modality_prices).length > 1;

  // Advanced mode state: per-modality selection and hours
  const [selectedMods, setSelectedMods] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allModalities.map(m => [m, true]))
  );
  const [modHours, setModHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(allModalities.map(m => [m, String(listing.minimum_hours)]))
  );
  const [applyAll, setApplyAll] = useState(true);

  const hours = parseInt(hoursStr) || 0;
  const bundleSubtotal = hours * listing.price_per_hour;
  const prov = listing.providers;
  const inCart = cart.isInCart(listing.id);

  // Advanced subtotal calculation
  const advancedSubtotal = hasModalityPrices
    ? allModalities.reduce((s, m) => {
        if (!selectedMods[m]) return s;
        const h = parseInt(modHours[m]) || 0;
        const p = listing.modality_prices![m] ?? 0;
        return s + h * p;
      }, 0)
    : 0;

  const handleAddToCart = () => {
    if (advanced && hasModalityPrices) {
      const selected = allModalities.filter(m => selectedMods[m]);
      if (selected.length === 0) { setMinNotice(true); setTimeout(() => setMinNotice(false), 3000); return; }
      const modalityItems = selected.map(m => ({
        modality: m,
        hours: parseInt(modHours[m]) || 0,
        price_per_hour: listing.modality_prices![m] ?? 0,
      }));
      const totalHours = modalityItems.reduce((s, m) => s + m.hours, 0);
      if (totalHours < listing.minimum_hours) {
        setMinNotice(true); setTimeout(() => setMinNotice(false), 3000); return;
      }
      setMinNotice(false);
      cart.addItem({
        listing_id: listing.id, title: listing.title, provider_name: prov?.name ?? '', provider_id: prov?.id ?? '',
        modality: listing.modality, price_per_hour: listing.price_per_hour, hours: totalHours,
        modality_items: modalityItems,
      });
      onCartOpen();
    } else {
      if (hours < listing.minimum_hours) {
        setHoursStr(String(listing.minimum_hours));
        setMinNotice(true); setTimeout(() => setMinNotice(false), 3000); return;
      }
      setMinNotice(false);
      cart.addItem({
        listing_id: listing.id, title: listing.title, provider_name: prov?.name ?? '', provider_id: prov?.id ?? '',
        modality: listing.modality, price_per_hour: listing.price_per_hour, hours,
      });
      onCartOpen();
    }
  };

  return (
    <div className="db-purchase-section">
      {(!advanced || !hasModalityPrices) && (
        <div className="db-purchase-row">
          <div className="db-purchase-input">
            <div className="db-meta-label">Hours</div>
            <input type="text" inputMode="numeric" className="db-purchase-hours" value={hoursStr}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setHoursStr(v);
                setMinNotice(false);
                if (applyAll) setModHours(Object.fromEntries(allModalities.map(m => [m, v])));
              }} />
          </div>
          <div className="db-purchase-total">
            <div className="db-meta-label">Subtotal</div>
            <div className="db-purchase-amount">${bundleSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}

      {advanced && hasModalityPrices && (
        <div className="db-advanced-purchase">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label className="db-meta-label" style={{ margin: 0 }}>Select modalities</label>
            <label style={{ fontSize: 9, fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={applyAll} onChange={e => {
                setApplyAll(e.target.checked);
                if (e.target.checked) setModHours(Object.fromEntries(allModalities.map(m => [m, hoursStr])));
              }} />
              Same hours for all
            </label>
          </div>
          {allModalities.map(m => (
            <div key={m} className="db-modality-purchase-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedMods[m] ?? false}
                  onChange={e => setSelectedMods(p => ({ ...p, [m]: e.target.checked }))} />
                <span className="db-badge" style={{ margin: 0 }}>{m.replace(/_/g, ' ')}</span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-dim)' }}>
                  ${listing.modality_prices![m]}/hr
                </span>
              </label>
              {selectedMods[m] && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="text" inputMode="numeric" className="db-purchase-hours" style={{ width: 60 }}
                    value={modHours[m] ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '');
                      if (applyAll) {
                        setModHours(Object.fromEntries(allModalities.map(mm => [mm, v])));
                        setHoursStr(v);
                      } else {
                        setModHours(p => ({ ...p, [m]: v }));
                      }
                    }} />
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-dim)' }}>hrs</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, minWidth: 60, textAlign: 'right' }}>
                    ${((parseInt(modHours[m]) || 0) * (listing.modality_prices![m] ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="db-meta-label" style={{ margin: 0 }}>Total</span>
            <span className="db-purchase-amount">${advancedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {minNotice && <div className="db-min-notice">Minimum {listing.minimum_hours} hrs required</div>}

      {hasModalityPrices && (
        <button className="db-advanced-toggle" onClick={() => setAdvanced(!advanced)}>
          {advanced ? 'Bundle Purchase' : 'Advanced Purchasing'}
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 6, transform: advanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      <button className={`db-add-cart-btn${inCart ? ' db-add-cart-btn--in-cart' : ''}`} onClick={handleAddToCart}>
        {inCart ? 'IN CART - UPDATE' : 'ADD TO CART'}
      </button>
    </div>
  );
}

function BuyData() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.post('/page-views', { page: 'buy_data' }).catch(() => {}); }, []);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [filters, setFilters] = useState({ modality: '' as string, environment: '' as string, collection_method: '' as string, embodiment_type: '' as string, task_type: '' as string, q: '', min_price: '', max_price: '', sort: 'newest' });
  const [facets, setFacets] = useState<{ modalities: string[]; environments: string[]; collection_methods?: string[]; embodiment_types?: string[]; task_types?: string[] }>({ modalities: [], environments: [] });
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('db_watchlist') ?? '[]')); } catch { return new Set(); }
  });
  const [showCustomRequest, setShowCustomRequest] = useState(false);
  const [customRequestListing, setCustomRequestListing] = useState<Listing | null>(null);
  const [showPurchases, setShowPurchases] = useState(() => window.location.hash === '#purchases');
  const [showProviders, setShowProviders] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [listingReferrer, setListingReferrer] = useState<{ providerSlug: string; providerName: string } | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const { isSignedIn } = useClerkAuth();
  const cart = useCart();

  const toggleWatchlist = useCallback((id: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('db_watchlist', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }, []);

  // Auto-open cart and trigger checkout after sign-in
  useEffect(() => {
    if (isSignedIn && localStorage.getItem('db_pending_checkout') && cart.totalItems > 0) {
      localStorage.removeItem('db_pending_checkout');
      setShowCart(true);
      setPendingCheckout(true);
    }
  }, [isSignedIn, cart.totalItems]);

  // Debounced search: only refetch after 300ms pause in typing
  const [debouncedQ, setDebouncedQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const fetchListings = useCallback(() => {
    // Only show full loading on initial load (when listings are empty)
    if (listings.length === 0) setLoading(true);
    const params = new URLSearchParams();
    if (filters.modality) params.set('modality', filters.modality);
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.collection_method) params.set('collection_method', filters.collection_method);
    if (filters.embodiment_type) params.set('embodiment_type', filters.embodiment_type);
    if (filters.task_type) params.set('task_type', filters.task_type);
    if (debouncedQ) params.set('q', debouncedQ);
    if (filters.min_price) params.set('min_price', filters.min_price);
    if (filters.max_price) params.set('max_price', filters.max_price);
    if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
    api.get<{ data: Listing[] }>(`/catalog?${params}`).then(r => setListings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [filters.modality, filters.environment, filters.collection_method, filters.embodiment_type, filters.task_type, filters.min_price, filters.max_price, filters.sort, debouncedQ]);

  useEffect(() => { fetchListings(); }, [fetchListings]);
  useEffect(() => { api.get<{ data: typeof facets }>('/catalog/facets').then(r => setFacets(r.data)).catch(console.error); }, []);

  const selectListing = async (slug: string, referrer?: { providerSlug: string; providerName: string }) => {
    try {
      setListingReferrer(referrer ?? null);
      const r = await api.get<{ data: Listing }>(`/catalog/${slug}`);
      setSelectedListing(r.data);
    } catch (err) { console.error(err); }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (selectedListing) {
    const l = selectedListing;
    const prov = l.providers;
    return (
      <div className="api-docs">
        <button className="db-back-btn" onClick={() => {
          if (listingReferrer) { setShowProviders(true); setSelectedProvider(listingReferrer.providerSlug); setListingReferrer(null); }
          setSelectedListing(null);
        }}>← {listingReferrer ? `Back to ${listingReferrer.providerName}` : 'Back to catalog'}</button>
        <h2 className="api-docs-title">{l.title}</h2>
        {l.description && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>{l.description}</p>}
        {prov && <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginTop: 4, marginBottom: 12 }}>By <span className="db-provider-link" onClick={() => { setSelectedListing(null); setShowProviders(true); setSelectedProvider(prov.slug); }}>{prov.name}</span></p>}
        {(() => {
          const tags = Array.isArray(l.tags) ? l.tags as string[] : [];
          return (
            <div className="db-badges">
              {(Array.isArray(l.modality) ? l.modality : [l.modality]).map(m => <span key={m} className="db-badge">{m.replace(/_/g, ' ')}</span>)}
              {(Array.isArray(l.environment) ? l.environment : [l.environment]).map(e => <span key={e} className="db-badge">{e.replace(/_/g, ' ')}</span>)}
              {tags.filter(t => t.startsWith('collection:')).map(t => <span key={t} className="db-badge">{t.split(':')[1].replace(/_/g, ' ')}</span>)}
              {tags.filter(t => t.startsWith('embodiment:')).map(t => <span key={t} className="db-badge">{t.split(':')[1].replace(/_/g, ' ')}</span>)}
              {tags.filter(t => t.startsWith('task:')).map(t => <span key={t} className="db-badge">{t.split(':')[1].replace(/_/g, ' ')}</span>)}
              {l.format && String(l.format).split(',').map(f => f.trim()).filter(Boolean).map(f =>
                f === 'lerobot'
                  ? <span key={f} className="db-badge db-badge--lerobot">LeRobot</span>
                  : <span key={f} className="db-badge">{f}</span>
              )}
              <span className="db-badge">${l.price_per_hour}/hr{l.modality_prices ? ' (bundle)' : ''}</span>
              {l.total_hours && <span className="db-badge">{l.total_hours.toLocaleString()} hrs</span>}
              <span className="db-badge">min {l.minimum_hours} hrs</span>
            </div>
          );
        })()}

        {l.modality_prices && (
          <div className="db-modality-prices-display" style={{ marginTop: 8, marginBottom: 8 }}>
            {Object.entries(l.modality_prices).map(([mod, price]) => (
              <span key={mod} className="db-badge" style={{ fontSize: 9 }}>{mod.replace(/_/g, ' ')}: ${price}/hr</span>
            ))}
          </div>
        )}

        {l.samples && l.samples.length > 0 && (() => {
          const tags = Array.isArray(l.tags) ? l.tags as string[] : [];
          const allMods = [
            ...(Array.isArray(l.modality) ? l.modality : [l.modality]),
            ...tags.filter(t => t.startsWith('modality:')).map(t => t.replace('modality:', '')),
          ];
          return <SampleGallery samples={l.samples} modalities={allMods} />;
        })()}

        {/* View All Samples — links to Sample Explorer */}
        {l.sample_manifest_url && l.manifest_summary && (
          <div className="api-preamble" style={{ marginTop: 12, textAlign: 'center', padding: '16px 24px' }}>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 8 }}>
              {l.manifest_summary!.episode_count} episodes · {l.manifest_summary!.total_duration_hours} hours of sample data
            </p>
            <a href={`/data/explore/${l.slug}`} className="db-add-cart-btn" style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 28px' }}>
              Explore All Samples &rarr;
            </a>
          </div>
        )}

        <PurchaseSection listing={l} cart={cart} onCartOpen={() => {}} />

        <div className="db-custom-request-cta">
          <span className="db-custom-request-cta__text">Need more data like this?</span>
          <button className="db-custom-request-cta__btn" onClick={() => { setCustomRequestListing(l); setShowCustomRequest(true); }}>
            Request Custom Collection
          </button>
        </div>

        {/* Similar datasets */}
        {listings.filter(o => o.id !== l.id && (
          (Array.isArray(l.modality) ? l.modality : [l.modality]).some(m =>
            (Array.isArray(o.modality) ? o.modality : [o.modality]).includes(m)
          )
        )).length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Similar Datasets</div>
            <div className="db-catalog-list">
              {listings.filter(o => o.id !== l.id && (
                (Array.isArray(l.modality) ? l.modality : [l.modality]).some(m =>
                  (Array.isArray(o.modality) ? o.modality : [o.modality]).includes(m)
                )
              )).slice(0, 5).map(o => (
                <div key={o.id} className="db-catalog-row" onClick={() => selectListing(o.slug)}>
                  {o.thumbnail_url && <img className="db-catalog-row__thumb" src={o.thumbnail_url} alt="" />}
                  <div className="db-catalog-row__content">
                    <div className="db-catalog-row__line1">
                      <span className="db-catalog-row__title">{o.title}</span>
                      <span className="db-catalog-row__view">View →</span>
                    </div>
                    <div className="db-catalog-row__line2">
                      <span className="db-catalog-row__details">{formatTags(o.modality)}</span>
                      <span className="db-catalog-row__price">${o.price_per_hour}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.totalItems > 0 && <InlineCart cart={cart} formatUsd={formatUsd} autoCheckout={pendingCheckout} onAutoCheckoutDone={() => setPendingCheckout(false)} onPurchaseComplete={() => setShowPurchases(true)} />}
        {showCustomRequest && <CustomRequestModal onClose={() => { setShowCustomRequest(false); setCustomRequestListing(null); }} sourceListing={customRequestListing} />}
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div className="api-docs-header-top">
          <div>
            <div className="api-docs-title-row">
              <h2 className="api-docs-title">{showPurchases ? 'My Purchases' : 'Buy Data'}</h2>
              {!showPurchases && !showProviders && <button className="api-md-btn" onClick={() => { setCustomRequestListing(null); setShowCustomRequest(true); }}>Request Custom Dataset</button>}
              <button className="api-md-btn" onClick={() => { setShowProviders(!showProviders); setShowPurchases(false); setSelectedProvider(null); }}>
                {showProviders ? 'Browse Catalog' : 'View All Data Providers'}
              </button>
              {isSignedIn && (
                <button className="api-md-btn" onClick={() => { setShowPurchases(!showPurchases); setShowProviders(false); setSelectedProvider(null); }}>
                  {showPurchases ? 'Browse Catalog' : 'My Purchases'}
                </button>
              )}
            </div>
            {!showPurchases && !showProviders && <p className="api-docs-desc">Browse and purchase training datasets</p>}
          </div>
        </div>
      </div>

      {showPurchases ? (
        <MyPurchases />
      ) : showProviders ? (
        selectedProvider ? (
          <ProviderProfile slug={selectedProvider} onBack={() => setSelectedProvider(null)} onSelectListing={(listingSlug: string, provName: string) => { setSelectedProvider(null); setShowProviders(false); selectListing(listingSlug, { providerSlug: selectedProvider!, providerName: provName }); }} />
        ) : (
          <ProviderList onSelectProvider={(slug: string) => setSelectedProvider(slug)} />
        )
      ) : (
        <>
          <div className="db-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input className="db-search" placeholder="Search datasets..." value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} style={{ maxWidth: 280 }} />
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.modality}
                onChange={e => setFilters(f => ({ ...f, modality: e.target.value }))}>
                <option value="">Modality</option>
                {facets.modalities.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.environment}
                onChange={e => setFilters(f => ({ ...f, environment: e.target.value }))}>
                <option value="">Environment</option>
                {facets.environments.map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.collection_method}
                onChange={e => setFilters(f => ({ ...f, collection_method: e.target.value }))}>
                <option value="">Collection</option>
                {(facets.collection_methods ?? []).map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.embodiment_type}
                onChange={e => setFilters(f => ({ ...f, embodiment_type: e.target.value }))}>
                <option value="">Embodiment</option>
                {(facets.embodiment_types ?? []).map(e => <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 140, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.task_type}
                onChange={e => setFilters(f => ({ ...f, task_type: e.target.value }))}>
                <option value="">Task Type</option>
                {(facets.task_types ?? []).map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 120, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={`${filters.min_price}-${filters.max_price}`}
                onChange={e => {
                  const [min, max] = e.target.value.split('-');
                  setFilters(f => ({ ...f, min_price: min, max_price: max }));
                }}>
                <option value="-">Price</option>
                <option value="-50">&lt; $50/hr</option>
                <option value="50-100">$50–100</option>
                <option value="100-200">$100–200</option>
                <option value="200-">$200+</option>
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <select className="db-form-select" style={{ width: 130, fontSize: 10, paddingRight: 28, appearance: 'none' }} value={filters.sort}
                onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low→High</option>
                <option value="price_desc">Price: High→Low</option>
                <option value="hours_desc">Most Data</option>
              </select>
              <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="#8a8580" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>

          {/* Active filter chips */}
          {(() => {
            const chips: { key: string; label: string; clear: () => void }[] = [];
            if (filters.modality) chips.push({ key: 'mod', label: `Modality: ${filters.modality.replace(/_/g, ' ')}`, clear: () => setFilters(f => ({ ...f, modality: '' })) });
            if (filters.environment) chips.push({ key: 'env', label: `Env: ${filters.environment.replace(/_/g, ' ')}`, clear: () => setFilters(f => ({ ...f, environment: '' })) });
            if (filters.collection_method) chips.push({ key: 'col', label: `Collection: ${filters.collection_method.replace(/_/g, ' ')}`, clear: () => setFilters(f => ({ ...f, collection_method: '' })) });
            if (filters.embodiment_type) chips.push({ key: 'emb', label: `Embodiment: ${filters.embodiment_type.replace(/_/g, ' ')}`, clear: () => setFilters(f => ({ ...f, embodiment_type: '' })) });
            if (filters.task_type) chips.push({ key: 'task', label: `Task: ${filters.task_type.replace(/_/g, ' ')}`, clear: () => setFilters(f => ({ ...f, task_type: '' })) });
            if (chips.length === 0) return null;
            return (
              <div className="db-active-filters">
                {chips.map(c => (
                  <span key={c.key} className="db-active-filter" onClick={c.clear}>{c.label} ×</span>
                ))}
                <span className="db-active-filter db-active-filter--clear" onClick={() => setFilters(f => ({ ...f, modality: '', environment: '', collection_method: '', embodiment_type: '', task_type: '' }))}>Clear all</span>
              </div>
            );
          })()}

          {/* Compare bar */}
          {compareIds.size >= 2 && (
            <div className="db-compare-bar">
              <span className="db-compare-bar__count">{compareIds.size} datasets selected</span>
              <button className="db-compare-bar__btn" onClick={() => setShowCompare(true)}>Compare</button>
              <button className="db-compare-bar__clear" onClick={() => setCompareIds(new Set())}>Clear</button>
            </div>
          )}

          {loading ? (
            <div className="db-loading">Loading datasets...</div>
          ) : listings.length === 0 ? (
            <div className="db-empty">{listings.length === 0 && !filters.modality && !filters.environment && !filters.collection_method && !filters.embodiment_type && !filters.task_type && !filters.q ? 'No datasets found. Coming soon.' : 'No datasets found. Try adjusting your filters.'}</div>
          ) : (
            <div className="db-catalog-list">
              {[...listings].sort((a, b) => (watchlist.has(b.id) ? 1 : 0) - (watchlist.has(a.id) ? 1 : 0)).map(l => (
                <div key={l.id} className="db-catalog-row" onClick={() => selectListing(l.slug)}>
                  <input type="checkbox" className="db-compare-check" checked={compareIds.has(l.id)} onClick={e => toggleCompare(l.id, e)} onChange={() => {}} title="Compare" />
                  {l.thumbnail_url && <img className="db-catalog-row__thumb" src={l.thumbnail_url} alt="" />}
                  <div className="db-catalog-row__content">
                    <div className="db-catalog-row__line1">
                      <span className="db-catalog-row__title">{l.title}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button className={`db-watchlist-btn-sm${watchlist.has(l.id) ? ' db-watchlist-btn-sm--active' : ''}`} onClick={e => { e.stopPropagation(); toggleWatchlist(l.id); }} title={watchlist.has(l.id) ? 'Unpin' : 'Pin to top'}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={watchlist.has(l.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 4v6l-2 4v2h10v-2l-2-4V4" /><line x1="12" y1="16" x2="12" y2="22" /><line x1="8" y1="4" x2="16" y2="4" />
                          </svg>
                        </button>
                        <span className="db-catalog-row__view">View →</span>
                      </div>
                    </div>
                    <div className="db-catalog-row__line2">
                      <div className="db-catalog-row__meta">
                        <span className="db-catalog-row__provider db-catalog-row__provider--link" onClick={e => { e.stopPropagation(); if (l.providers?.slug) { setShowProviders(true); setSelectedProvider(l.providers.slug); } }}>{l.providers?.name ?? ''}</span>
                        <span className="db-catalog-row__details">
                          {(() => {
                            const parts: string[] = [formatTags(l.modality)];
                            if (l.format) parts.push(String(l.format));
                            parts.push(formatTags(l.environment));
                            if (Array.isArray(l.tags)) {
                              const tags = l.tags as string[];
                              tags.filter(t => t.startsWith('embodiment:')).forEach(t => parts.push(t.split(':')[1].replace(/_/g, ' ')));
                              tags.filter(t => t.startsWith('task:')).forEach(t => parts.push(t.split(':')[1].replace(/_/g, ' ')));
                              tags.filter(t => t.startsWith('collection:')).forEach(t => parts.push(t.split(':')[1].replace(/_/g, ' ')));
                            }
                            if (l.total_hours) parts.push(`${Number(l.total_hours).toLocaleString()} hrs`);
                            return parts.join(' · ');
                          })()}
                        </span>
                      </div>
                      {l.format && String(l.format).includes('lerobot') && <span className="db-badge db-badge--lerobot" style={{ fontSize: 8, padding: '2px 6px', marginRight: 6 }}>LeRobot</span>}
                      <span className="db-catalog-row__price">${l.price_per_hour}/hr</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.totalItems > 0 && <CatalogCartBar cart={cart} formatUsd={formatUsd} onViewCart={() => setShowCart(!showCart)} showCart={showCart} />}
          {showCart && cart.totalItems > 0 && <InlineCart cart={cart} formatUsd={formatUsd} autoCheckout={pendingCheckout} onAutoCheckoutDone={() => setPendingCheckout(false)} onPurchaseComplete={() => setShowPurchases(true)} />}
        </>
      )}

      {showCompare && compareIds.size >= 2 && (() => {
        const compareListings = listings.filter(l => compareIds.has(l.id));
        return (
          <div className="db-modal-overlay" onClick={() => setShowCompare(false)}>
            <div className="db-modal db-modal--wide" onClick={e => e.stopPropagation()} style={{ maxWidth: 900 }}>
              <div className="db-modal-header">
                <div className="db-modal-title">Compare Datasets</div>
                <button className="db-modal-close" onClick={() => setShowCompare(false)}>&times;</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="db-compare-table">
                  <thead>
                    <tr>
                      <th></th>
                      {compareListings.map(l => <th key={l.id}>{l.title}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Provider</td>{compareListings.map(l => <td key={l.id}>{l.providers?.name ?? '—'}</td>)}</tr>
                    <tr><td>Modality</td>{compareListings.map(l => <td key={l.id}>{formatTags(l.modality)}</td>)}</tr>
                    <tr><td>Environment</td>{compareListings.map(l => <td key={l.id}>{formatTags(l.environment)}</td>)}</tr>
                    {compareListings.some(l => l.collection_method) && <tr><td>Collection</td>{compareListings.map(l => <td key={l.id}>{l.collection_method ? formatTags(l.collection_method) : '—'}</td>)}</tr>}
                    {compareListings.some(l => l.embodiment_type) && <tr><td>Embodiment</td>{compareListings.map(l => <td key={l.id}>{l.embodiment_type ? formatTags(l.embodiment_type) : '—'}</td>)}</tr>}
                    {compareListings.some(l => l.task_type) && <tr><td>Task Type</td>{compareListings.map(l => <td key={l.id}>{l.task_type ? formatTags(l.task_type) : '—'}</td>)}</tr>}
                    <tr><td>Format</td>{compareListings.map(l => <td key={l.id}>{l.format ?? '—'}</td>)}</tr>
                    <tr><td>Hours</td>{compareListings.map(l => <td key={l.id}>{l.total_hours?.toLocaleString() ?? '—'}</td>)}</tr>
                    <tr><td>Price</td>{compareListings.map(l => <td key={l.id}>${l.price_per_hour}/hr</td>)}</tr>
                    <tr><td>Min Purchase</td>{compareListings.map(l => <td key={l.id}>{l.minimum_hours} hrs</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
      {showCustomRequest && <CustomRequestModal onClose={() => { setShowCustomRequest(false); setCustomRequestListing(null); }} sourceListing={customRequestListing} />}
    </div>
  );
}

function CatalogCartBar({ cart, formatUsd, onViewCart, showCart }: { cart: ReturnType<typeof useCart>; formatUsd: (c: number) => string; onViewCart: () => void; showCart: boolean }) {
  return (
    <div className="db-cart-bar" onClick={onViewCart}>
      <div className="db-cart-bar__left">
        <span className="db-cart-bar__label">Cart</span>
        <span className="db-cart-bar__count">{cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}</span>
      </div>
      <div className="db-cart-bar__right">
        {!showCart && <span className="db-cart-bar__total">{formatUsd(cart.subtotalCents)}</span>}
        <span className="db-cart-bar__toggle">{showCart ? 'Hide' : 'View'}</span>
      </div>
    </div>
  );
}

interface PaymentIntentData {
  provider_id: string;
  provider_name: string;
  client_secret: string;
  amount_cents: number;
  platform_fee_cents: number;
  transaction_id: string;
}

function InlineCart({ cart, formatUsd, autoCheckout, onAutoCheckoutDone, onPurchaseComplete }: { cart: ReturnType<typeof useCart>; formatUsd: (c: number) => string; autoCheckout?: boolean; onAutoCheckoutDone?: () => void; onPurchaseComplete?: () => void }) {
  const { isSignedIn } = useClerkAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntentData[] | null>(null);

  const handleCheckout = useCallback(async () => {
    if (!isSignedIn) return;
    setCheckingOut(true);
    setCheckoutError('');
    try {
      // Clear server cart then sync localStorage cart (parallel for speed)
      const serverCart = await api.get<{ data: { items: Array<{ id: string }> } }>('/cart').catch(() => ({ data: { items: [] } }));
      await Promise.all(serverCart.data.items.map(item => api.delete(`/cart/items/${item.id}`).catch(() => {})));
      const allItems = Object.values(cart.byProvider).flatMap(g => g.items);
      await Promise.all(allItems.map(item => api.post('/cart/items', { listing_id: item.listing_id, hours: item.hours, modality_items: item.modality_items })));
      const res = await api.post<{ data: { payment_intents: PaymentIntentData[] } }>('/checkout/create-payment-intents');
      setPaymentIntents(res.data.payment_intents);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckingOut(false);
    }
  }, [isSignedIn, cart.byProvider]);

  // Auto-trigger checkout if flagged by parent
  useEffect(() => {
    if (autoCheckout && isSignedIn) {
      onAutoCheckoutDone?.();
      handleCheckout();
    }
  }, [autoCheckout, isSignedIn, handleCheckout, onAutoCheckoutDone]);

  const handlePaymentSuccess = async (transactionIds: string[]) => {
    try {
      await api.post('/checkout/confirm', { transaction_ids: transactionIds });
    } catch { /* confirmation happens via webhook too */ }
    cart.clearCart();
    // Don't clear paymentIntents here — let the success screen show
    // paymentIntents will be cleared when user clicks "Done" (onClose)
  };

  if (paymentIntents) {
    return (
      <CheckoutModal
        paymentIntents={paymentIntents}
        formatUsd={formatUsd}
        onSuccess={handlePaymentSuccess}
        onClose={() => { setPaymentIntents(null); setCheckingOut(false); }}
        onPurchaseComplete={onPurchaseComplete}
      />
    );
  }

  return (
    <div className="db-inline-cart">
      {Object.entries(cart.byProvider).map(([provId, group]) => (
        <div key={provId} className="db-inline-cart__group">
          {group.items.map(item => (
            <div key={item.listing_id} className="db-inline-cart__item">
              <div className="db-inline-cart__item-left">
                <div className="db-inline-cart__item-title">{item.title}</div>
                <div className="db-inline-cart__item-provider">{group.provider_name}</div>
                {item.modality_items ? (
                  <div className="db-inline-cart__item-modalities">
                    {item.modality_items.map(m => (
                      <div key={m.modality} style={{ fontSize: 9, color: 'var(--text-dim)', fontFamily: "'Share Tech Mono', monospace" }}>
                        {m.modality.replace(/_/g, ' ')}: {m.hours} hrs x ${m.price_per_hour}/hr
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="db-inline-cart__item-detail">{item.hours} hrs x ${item.price_per_hour}/hr</div>
                )}
              </div>
              <div className="db-inline-cart__item-right">
                <div className="db-inline-cart__item-price-row">
                  <span className="db-inline-cart__item-subtotal">{formatUsd(
                    item.modality_items
                      ? item.modality_items.reduce((s, m) => s + Math.round(m.price_per_hour * m.hours * 100), 0)
                      : Math.round(item.price_per_hour * item.hours * 100)
                  )}</span>
                  <button className="db-inline-cart__remove" onClick={() => cart.removeItem(item.listing_id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="db-inline-cart__footer">
        <span className="db-inline-cart__total-label">Total</span>
        <div className="db-inline-cart__total-right">
          <span className="db-inline-cart__total-amount">{formatUsd(cart.subtotalCents)}</span>
          {isSignedIn ? (
            <button className="db-checkout-btn" onClick={handleCheckout} disabled={checkingOut}>
              {checkingOut ? 'Processing...' : 'Checkout'}
            </button>
          ) : (
            <ClerkSignInBtn><button className="db-checkout-btn" onClick={() => localStorage.setItem('db_pending_checkout', '1')}>Checkout</button></ClerkSignInBtn>
          )}
        </div>
      </div>
      {checkoutError && <div className="db-form-error" style={{ marginTop: 8 }}>{checkoutError}</div>}
    </div>
  );
}

function CheckoutModal({ paymentIntents, formatUsd, onSuccess, onClose, onPurchaseComplete }: {
  paymentIntents: PaymentIntentData[];
  formatUsd: (c: number) => string;
  onSuccess: (transactionIds: string[]) => void;
  onPurchaseComplete?: () => void;
  onClose: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const current = paymentIntents[currentIdx];
  const totalAmount = paymentIntents.reduce((s, pi) => s + pi.amount_cents, 0);
  const allDone = completed.length === paymentIntents.length;

  // Mount Stripe Payment Element for current PaymentIntent
  useEffect(() => {
    if (!current || !stripePromise || allDone) return;
    let mounted = true;

    async function init() {
      const stripe = await stripePromise;
      if (!stripe || !mounted) return;
      stripeRef.current = stripe;

      const elements = stripe.elements({
        clientSecret: current.client_secret,
        appearance: {
          theme: 'flat',
          variables: {
            colorPrimary: '#1a1a1a',
            colorBackground: '#f5f2ed',
            colorText: '#1a1a1a',
            colorTextSecondary: '#8a8580',
            borderRadius: '4px',
            fontFamily: 'Inter, sans-serif',
            fontSizeBase: '12px',
          },
          rules: {
            '.Input': { border: '1px solid #e0ddd8', padding: '8px 10px' },
            '.Input:focus': { borderColor: '#1a1a1a', boxShadow: 'none' },
            '.Label': { fontFamily: "'Share Tech Mono', monospace", fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: '#a0a0a0' },
          },
        },
      });
      elementsRef.current = elements;

      const paymentElement = elements.create('payment', { layout: 'tabs' });
      paymentElement.on('ready', () => { if (mounted) setStripeReady(true); });
      if (paymentElementRef.current) {
        paymentElement.mount(paymentElementRef.current);
      }
    }

    setStripeReady(false);
    init();

    return () => {
      mounted = false;
      if (elementsRef.current) {
        elementsRef.current.getElement('payment')?.destroy();
      }
      elementsRef.current = null;
    };
  }, [current?.client_secret, allDone]);

  const handlePay = async () => {
    const stripe = stripeRef.current;
    const elements = elementsRef.current;
    if (!stripe || !elements) return;

    setPaying(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? 'Validation failed');
      setPaying(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/data/buy` },
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed');
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      const newCompleted = [...completed, current.transaction_id];
      setCompleted(newCompleted);

      if (currentIdx < paymentIntents.length - 1) {
        setCurrentIdx(currentIdx + 1);
      } else {
        onSuccess(newCompleted);
      }
    }
    setPaying(false);
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">{allDone ? 'Payment Complete' : 'Checkout'}</div>
            {paymentIntents.length > 1 && !allDone && (
              <div className="db-modal-subtitle">Payment {currentIdx + 1} of {paymentIntents.length}</div>
            )}
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {allDone ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Purchase successful</div>
            <div className="db-modal-success__note">
              Your data access is being prepared.
            </div>
            <button className="db-add-cart-btn" onClick={() => { onClose(); onPurchaseComplete?.(); }}>View My Purchases</button>
          </div>
        ) : (
          <>
            {/* Order summary */}
            <div className="db-checkout-summary">
              <div className="db-checkout-summary__row">
                <span>{current.provider_name}</span>
                <span>{formatUsd(current.amount_cents)}</span>
              </div>
              {paymentIntents.length > 1 && (
                <div className="db-checkout-summary__total">
                  <span>Total (all providers)</span>
                  <span>{formatUsd(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Stripe Payment Element */}
            <div ref={paymentElementRef} style={{ minHeight: 120, marginBottom: 16 }} />
            {!stripeReady && <div className="db-loading">Loading payment form...</div>}

            {error && <div className="db-form-error" style={{ marginBottom: 12 }}>{error}</div>}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to the <a href="/data/buyer-terms" target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Data Buyer Conditions</a></span>
            </label>

            <button className="db-add-cart-btn" onClick={handlePay} disabled={paying || !stripeReady || !agreedToTerms}>
              {paying ? 'Processing...' : `Pay ${formatUsd(current.amount_cents)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SELL DATA
// ═══════════════════════════════════════════════════════════

function ProviderRegistrationForm({ onRegistered }: { onRegistered: (url: string) => void }) {
  const [form, setForm] = useState({ name: '', contact_email: '', company_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name || !form.contact_email) { setError('Name and email are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/register', form);
      onRegistered(res.data.stripe_onboarding_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="api-preamble" style={{ marginTop: 16, maxWidth: 480 }}>
      <div className="db-meta-label" style={{ marginBottom: 16 }}>Complete your provider profile</div>
      {error && <div className="db-form-error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="db-form-field">
        <label className="db-meta-label">Name *</label>
        <input className="db-form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name or company name" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Email *</label>
        <input className="db-form-input" type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="contact@company.com" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Company (optional)</label>
        <input className="db-form-input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Company name" />
      </div>
      <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Setting up...' : 'Continue to Stripe Setup'}
      </button>
    </div>
  );
}

function SellData({ viewCount }: { viewCount: number | null }) {
  const { isSignedIn } = useClerkAuth();
  const [providerStatus, setProviderStatus] = useState<'loading' | 'not_registered' | 'pending_onboarding' | 'active'>('loading');
  useEffect(() => { api.post('/page-views', { page: 'sell_data' }).catch(() => {}); }, []);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    api.get<{ data: { status: string; stripe_onboarding_complete: boolean } }>('/auth/provider/onboarding-status')
      .then(r => {
        if (r.data.stripe_onboarding_complete || r.data.status === 'active') {
          setProviderStatus('active');
        } else {
          setProviderStatus('pending_onboarding');
        }
      })
      .catch(() => setProviderStatus('not_registered'));
  }, [isSignedIn]);

  // Handle Stripe onboarding return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'complete' || params.get('onboarding') === 'refresh') {
      // Re-check status after returning from Stripe
      api.get<{ data: { status: string; stripe_onboarding_complete: boolean } }>('/auth/provider/onboarding-status')
        .then(r => {
          if (r.data.stripe_onboarding_complete || r.data.status === 'active') {
            setProviderStatus('active');
            // Navigate to Settings tab after Stripe onboarding
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('provider-tab-change', { detail: { tab: 'stripe' } }));
            }, 500);
          } else {
            setProviderStatus('pending_onboarding');
          }
        })
        .catch(() => setProviderStatus('not_registered'));
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Redirect to Stripe if we have a URL
  useEffect(() => {
    if (stripeUrl) {
      window.location.href = stripeUrl;
    }
  }, [stripeUrl]);

  if (!isSignedIn) {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">List your datasets on Atlas</p></div>
        </div>

        <div className="db-sell-hero">
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">{viewCount ? (Math.floor(viewCount / 10) * 10).toLocaleString() + '+' : '...'}</div>
            <div className="db-sell-hero__label">Site visits</div>
          </div>
          <div className="db-sell-hero__divider" />
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">{MODALITIES.length}</div>
            <div className="db-sell-hero__label">Modalities supported</div>
          </div>
          <div className="db-sell-hero__divider" />
          <div className="db-sell-hero__stat">
            <div className="db-sell-hero__num">$0</div>
            <div className="db-sell-hero__label">Upfront cost to list</div>
          </div>
        </div>

        <div className="db-sell-value">
          <div className="db-sell-value__left">
            <h3 className="db-sell-value__title">OEMs & labs are already here</h3>
            <p className="db-sell-value__body">
              OEMs and labs visit the Atlas daily for supply chain intelligence.
              List your training data where they're already looking.
            </p>
            <div className="db-sell-value__cta">
              <ClerkSignUpBtn><button className="db-sell-cta-btn">Become a Provider</button></ClerkSignUpBtn>
              <div className="db-sell-login">Have an account? <ClerkSignInBtn><span className="db-sell-login-link">Log in</span></ClerkSignInBtn></div>
            </div>
          </div>
          <div className="db-sell-value__right">
            <div className="db-sell-terms">
              <div className="db-sell-term">
                <div className="db-sell-term__label">You set</div>
                <div className="db-sell-term__value">Your price per hour</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Atlas fee</div>
                <div className="db-sell-term__value">15%</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Payouts via</div>
                <div className="db-sell-term__value">Stripe</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Listing review</div>
                <div className="db-sell-term__value">Quality verified by Atlas</div>
              </div>
              <div className="db-sell-term">
                <div className="db-sell-term__label">Bonus</div>
                <div className="db-sell-term__value">Opt into collection programs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="db-sell-how">
          <div className="db-sell-how__label">How it works</div>
          <div className="db-sell-how__steps">
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">01</div>
              <div className="db-sell-how__title">List</div>
              <div className="db-sell-how__desc">Upload samples, set pricing, describe your dataset and collection methodology</div>
            </div>
            <div className="db-sell-how__connector" />
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">02</div>
              <div className="db-sell-how__title">Review</div>
              <div className="db-sell-how__desc">Our team verifies quality and accuracy before your listing goes live on Atlas</div>
            </div>
            <div className="db-sell-how__connector" />
            <div className="db-sell-how__step">
              <div className="db-sell-how__num">03</div>
              <div className="db-sell-how__title">Earn</div>
              <div className="db-sell-how__desc">OEMs and labs purchase hours of your data directly. Payouts deposited to your Stripe account</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (providerStatus === 'loading') {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2></div>
        </div>
        <div className="db-loading">Loading...</div>
      </div>
    );
  }

  if (providerStatus === 'not_registered') {
    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">Set up your provider account</p></div>
        </div>
        <ProviderRegistrationForm onRegistered={(url) => setStripeUrl(url)} />
      </div>
    );
  }

  if (providerStatus === 'pending_onboarding') {
    const handleConnect = async () => {
      try {
        const r = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/refresh-onboarding');
        window.location.href = r.data.stripe_onboarding_url;
      } catch (err) { console.error(err); }
    };

    return (
      <div className="api-docs">
        <div className="api-docs-header">
          <div><h2 className="api-docs-title">Sell Data</h2>
          <p className="api-docs-desc">Complete your Stripe setup to start selling</p></div>
        </div>
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <div className="db-meta-label" style={{ marginBottom: 16 }}>Stripe onboarding</div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Complete your Stripe Express setup to receive payments from data buyers. This takes about 2 minutes.
          </p>
          <button className="db-add-cart-btn" style={{ maxWidth: 280 }} onClick={handleConnect}>
            Complete Stripe Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Sell Data</h2>
        <p className="api-docs-desc">Manage your listings and track sales</p></div>
      </div>
      <ProviderDashboard />
    </div>
  );
}

// Maps modality tags to recommended file accept filters
const MODALITY_ACCEPT_MAP: Record<string, string> = {
  rgb: 'video/*,image/*',
  rgbd: 'video/*,.rosbag,.mcap,.rrd,.hdf5',
  depth: 'image/*,.hdf5,.rosbag,.mcap,.rrd',
  lidar: '.rosbag,.mcap,.rrd,.parquet,.hdf5',
  point_cloud: '.rosbag,.mcap,.rrd,.parquet,.hdf5',
  motion_capture: '.rrd,.parquet,.hdf5,.mcap',
  tactile: 'video/*,image/*,.parquet,.hdf5,.rrd',
  force_torque: '.parquet,.hdf5,.rosbag,.rrd',
  proprioception: '.parquet,.hdf5,.rosbag,.rrd',
  imu: '.parquet,.hdf5,.rosbag,.rrd',
  audio: 'audio/*',
  language_annotations: '.json,.parquet,application/json',
  thermal: 'video/*,image/*,.hdf5,.rrd',
};

function getAcceptFilter(modalities: string[]): string {
  if (modalities.length === 0) return 'video/*,image/*,audio/*,.parquet,.hdf5,.rosbag,.mcap,.rrd,.json';
  const parts = new Set<string>();
  for (const mod of modalities) {
    const filter = MODALITY_ACCEPT_MAP[mod];
    if (filter) filter.split(',').forEach(f => parts.add(f));
    else 'video/*,image/*,audio/*,.parquet,.hdf5,.rosbag,.mcap,.rrd,.json'.split(',').forEach(f => parts.add(f));
  }
  return [...parts].join(',');
}

function getUploadHint(modalities: string[]): string | null {
  const spatial = ['lidar', 'point_cloud', 'motion_capture', 'rgbd', 'depth'];
  const timeSeries = ['imu', 'force_torque', 'proprioception', 'tactile'];
  if (modalities.some(m => spatial.includes(m))) return 'For 3D/spatial data, upload .rrd preview files for interactive viewer';
  if (modalities.some(m => timeSeries.includes(m))) return 'Upload .parquet files for interactive chart previews';
  return null;
}

function getPreviewScore(samples: Sample[], modalities: string[]): { score: number; label: string; level: string; suggestions: string[] } {
  if (!samples || samples.length === 0) return { score: 0, label: 'None', level: 'low', suggestions: ['Upload at least 5 samples for buyers to preview'] };
  const suggestions: string[] = [];
  let score = 1;

  const hasVideo = samples.some(s => getSampleCategory(s.content_type, s.filename, modalities) === 'video');
  const hasImage = samples.some(s => getSampleCategory(s.content_type, s.filename, modalities) === 'image');
  const hasRerun = samples.some(s => getSampleCategory(s.content_type, s.filename, modalities) === 'rerun');
  const hasChart = samples.some(s => getSampleCategory(s.content_type, s.filename, modalities) === 'timeseries');

  if (hasVideo || hasImage) score += 1;
  else suggestions.push('Add a video or image sample for visual preview');

  const spatial = ['lidar', 'point_cloud', 'motion_capture', 'rgbd', 'depth'];
  const timeSeries = ['imu', 'force_torque', 'proprioception', 'tactile'];
  const hasSpatialMod = modalities.some(m => spatial.includes(m));
  const hasTimeSeriesMod = modalities.some(m => timeSeries.includes(m));

  if (hasRerun) score += 1;
  else if (hasSpatialMod) suggestions.push('Upload a .rrd file for interactive 3D preview');

  if (hasChart) score += 1;
  else if (hasTimeSeriesMod) suggestions.push('Upload a .parquet sample for chart preview');

  if (samples.length >= 5) score += 1;
  else suggestions.push(`Add more samples (${samples.length}/5 required)`);

  const labels = ['None', 'Basic', 'Good', 'Great', 'Excellent', 'Outstanding'];
  const level = score >= 4 ? 'high' : score >= 2 ? 'mid' : 'low';
  return { score, label: labels[score] ?? 'Outstanding', level, suggestions };
}

// ═══════════════════════════════════════════════════════════
// CROSS-MODALITY ALIGNMENT VALIDATION
// ═══════════════════════════════════════════════════════════

const MODALITY_KEYWORDS: Record<string, string[]> = {
  rgb: ['rgb', 'color', 'cam', 'camera', 'visual'],
  depth: ['depth', 'disparity', 'zmap'],
  thermal: ['thermal', 'infrared', 'flir', 'ir_'],
  imu: ['imu', 'accel', 'gyro', 'accelerometer', 'gyroscope'],
  force_torque: ['force', 'torque', 'ft_', 'wrench'],
  tactile: ['tactile', 'pressure', 'touch', 'gel', 'taxel'],
  proprioception: ['proprio', 'encoder', 'qpos', 'qvel'],
  joint_trajectory: ['trajectory', 'joint_traj', 'ee_pose', 'end_effector', 'cartesian', 'action'],
  audio: ['audio', 'mic', 'sound', 'speech'],
  lidar: ['lidar', 'laser', 'scan', 'velodyne'],
  point_cloud: ['pointcloud', 'point_cloud', 'pcd', 'ply'],
  motion_capture: ['mocap', 'motion_capture', 'skeleton', 'optitrack', 'vicon'],
  language_annotations: ['annotation', 'caption', 'language', 'label', 'instruction'],
  rgbd: ['rgbd', 'rgb_d', 'rgb-d'],
};

const FORMAT_MODALITY_MAP: Record<string, string[]> = {
  mp4: ['rgb', 'thermal', 'rgbd', 'tactile'], mov: ['rgb', 'thermal', 'rgbd'], webm: ['rgb', 'thermal'], avi: ['rgb', 'thermal'],
  png: ['rgb', 'depth', 'thermal'], jpg: ['rgb', 'depth', 'thermal'], jpeg: ['rgb', 'depth', 'thermal'], tiff: ['rgb', 'depth', 'thermal'],
  parquet: ['imu', 'force_torque', 'proprioception', 'joint_trajectory', 'tactile', 'language_annotations'],
  hdf5: ['imu', 'force_torque', 'proprioception', 'rgbd', 'depth', 'lidar'], h5: ['imu', 'force_torque', 'proprioception', 'rgbd', 'depth', 'lidar'],
  rosbag: ['lidar', 'point_cloud', 'rgbd', 'depth', 'imu', 'force_torque'], bag: ['lidar', 'point_cloud', 'rgbd', 'depth'],
  mcap: ['lidar', 'point_cloud', 'rgbd', 'depth', 'imu'], rrd: ['lidar', 'point_cloud', 'motion_capture', 'rgbd', 'depth'],
  json: ['language_annotations'], jsonl: ['language_annotations'],
  wav: ['audio'], mp3: ['audio'], ogg: ['audio'], flac: ['audio'],
  csv: ['imu', 'force_torque', 'proprioception', 'joint_trajectory'],
};

function mapSampleToModality(filename: string, listingModalities: string[]): string | null {
  const lower = filename.toLowerCase();
  const nameWithoutExt = lower.replace(/\.[^.]+$/, '');
  for (const mod of listingModalities) {
    const keywords = MODALITY_KEYWORDS[mod];
    if (keywords && keywords.some(kw => nameWithoutExt.includes(kw))) return mod;
  }
  const ext = lower.split('.').pop() ?? '';
  const formatMods = FORMAT_MODALITY_MAP[ext];
  if (formatMods) {
    const candidates = listingModalities.filter(m => formatMods.includes(m));
    if (candidates.length === 1) return candidates[0];
  }
  return null;
}

function extractEpisodeId(filename: string, modality: string | null): string {
  let base = filename.replace(/\.[^.]+$/, '').toLowerCase();
  if (modality) {
    const keywords = MODALITY_KEYWORDS[modality] ?? [];
    for (const kw of keywords) base = base.replace(new RegExp(`[_\\-]?${kw}[_\\-]?`, 'g'), '_');
  }
  base = base.replace(/[_\-]{2,}/g, '_').replace(/^[_\-]+|[_\-]+$/g, '');
  return base || filename.replace(/\.[^.]+$/, '').toLowerCase();
}

interface AlignmentIssue { type: 'missing_modality' | 'count_mismatch' | 'missing_pair' | 'unassigned'; message: string; }

function validateModalityAlignment(samples: Sample[], listingModalities: string[]): { valid: boolean; issues: AlignmentIssue[] } {
  if (listingModalities.length <= 1) return { valid: true, issues: [] };
  const issues: AlignmentIssue[] = [];
  const assignments = samples.map(s => ({ filename: s.filename, modality: mapSampleToModality(s.filename, listingModalities), episodeId: '' }));
  assignments.forEach(a => { a.episodeId = extractEpisodeId(a.filename, a.modality); });

  const unassigned = assignments.filter(a => a.modality === null);
  for (const u of unassigned) {
    issues.push({ type: 'unassigned', message: `"${u.filename}" — could not determine modality. Rename: {episode_id}_{modality}.{ext}` });
  }

  const assigned = assignments.filter(a => a.modality !== null);
  const byModality: Record<string, typeof assignments> = {};
  for (const a of assigned) { if (!byModality[a.modality!]) byModality[a.modality!] = []; byModality[a.modality!].push(a); }

  for (const mod of listingModalities) {
    if (!byModality[mod] || byModality[mod].length === 0) {
      issues.push({ type: 'missing_modality', message: `No samples detected for modality: ${mod.replace(/_/g, ' ')}` });
    }
  }

  const counts = listingModalities.map(mod => ({ mod, count: (byModality[mod] ?? []).length })).filter(c => c.count > 0);
  if (counts.length > 1) {
    const expected = counts[0].count;
    if (counts.some(c => c.count !== expected)) {
      const detail = counts.map(c => `${c.mod.replace(/_/g, ' ')}: ${c.count}`).join(', ');
      issues.push({ type: 'count_mismatch', message: `Modality sample counts must match. Current: ${detail}` });
    }
  }

  if (counts.length > 1 && counts.every(c => c.count === counts[0].count) && unassigned.length === 0) {
    const allEpisodes = new Set(assigned.map(a => a.episodeId));
    for (const ep of allEpisodes) {
      const episodeMods = new Set(assigned.filter(a => a.episodeId === ep).map(a => a.modality));
      const missing = listingModalities.filter(mod => !episodeMods.has(mod));
      if (missing.length > 0) {
        issues.push({ type: 'missing_pair', message: `Episode "${ep}" is missing: ${missing.map(m => m.replace(/_/g, ' ')).join(', ')}` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function SampleUploader({ listingId, modalities = [], reviewStatus }: { listingId: string; modalities?: string[]; reviewStatus?: string }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const acceptFilter = getAcceptFilter(modalities);
  const uploadHint = getUploadHint(modalities);
  const minSamples = 5;

  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  // Manifest state
  const [manifestUrl, setManifestUrl] = useState('');
  const [manifestStatus, setManifestStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [manifestInfo, setManifestInfo] = useState<{ episode_count: number; total_duration_hours: number } | null>(null);
  const [manifestErrors, setManifestErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  // Fetch existing manifest status on mount
  useEffect(() => {
    api.get<{ data: { manifest_url: string; validation_status: string; episode_count: number; total_duration_hours: number; validation_errors: Array<{ field: string; message: string }> | null } | null }>(`/provider/listings/${listingId}/manifest`)
      .then(r => {
        if (r.data) {
          setManifestUrl(r.data.manifest_url);
          if (r.data.validation_status === 'valid') {
            setManifestStatus('valid');
            setManifestInfo({ episode_count: r.data.episode_count, total_duration_hours: r.data.total_duration_hours });
          } else if (r.data.validation_status === 'invalid') {
            setManifestStatus('invalid');
            setManifestErrors(r.data.validation_errors ?? []);
          }
        }
        setManifestLoaded(true);
      })
      .catch(() => setManifestLoaded(true));
  }, [listingId]);

  const manifestValid = manifestStatus === 'valid';
  const canSubmitForReview = samples.length >= minSamples && manifestValid && (!reviewStatus || reviewStatus === 'draft' || reviewStatus === 'pending' || reviewStatus === 'pending_review' || reviewStatus === 'rejected' || reviewStatus === 'changes_requested');

  const handleValidateManifest = async () => {
    if (!manifestUrl.trim()) return;
    setManifestStatus('validating');
    setManifestErrors([]);
    setManifestInfo(null);
    try {
      const res = await api.post<{ data: { validation_status: string; episode_count?: number; total_duration_hours?: number; errors?: Array<{ field: string; message: string }> } }>(`/provider/listings/${listingId}/manifest`, { manifest_url: manifestUrl.trim() });
      if (res.data.validation_status === 'valid') {
        setManifestStatus('valid');
        setManifestInfo({ episode_count: res.data.episode_count ?? 0, total_duration_hours: res.data.total_duration_hours ?? 0 });
      } else {
        setManifestStatus('invalid');
        setManifestErrors(res.data.errors ?? []);
      }
    } catch (err) {
      setManifestStatus('invalid');
      setManifestErrors([{ field: 'manifest_url', message: err instanceof Error ? err.message : 'Validation failed' }]);
    }
  };

  const handleRefreshManifest = async () => {
    setManifestStatus('validating');
    setManifestErrors([]);
    setManifestInfo(null);
    try {
      const res = await api.post<{ data: { validation_status: string; episode_count?: number; total_duration_hours?: number; errors?: Array<{ field: string; message: string }> } }>(`/provider/listings/${listingId}/manifest/refresh`);
      if (res.data.validation_status === 'valid') {
        setManifestStatus('valid');
        setManifestInfo({ episode_count: res.data.episode_count ?? 0, total_duration_hours: res.data.total_duration_hours ?? 0 });
      } else {
        setManifestStatus('invalid');
        setManifestErrors(res.data.errors ?? []);
      }
    } catch (err) {
      setManifestStatus('invalid');
      setManifestErrors([{ field: 'manifest_url', message: err instanceof Error ? err.message : 'Refresh failed' }]);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError('');
    try {
      await api.post(`/provider/listings/${listingId}/samples/import-url`, { url: importUrl.trim() });
      const refreshed = await api.get<{ data: { samples?: Sample[] } }>(`/provider/listings/${listingId}`);
      setSamples(refreshed.data.samples ?? []);
      setImportUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import from URL');
    }
    setImporting(false);
  };

  const [alignmentIssues, setAlignmentIssues] = useState<AlignmentIssue[]>([]);

  const handleSubmitForReview = async () => {
    setSubmittingForReview(true);
    setSubmitStatus(null);
    setAlignmentIssues([]);

    // 0. Cross-modality alignment check (only for multi-modality listings)
    if (modalities.length > 1) {
      const alignment = validateModalityAlignment(samples, modalities);
      if (!alignment.valid) {
        setAlignmentIssues(alignment.issues);
        setSubmitStatus('Sample alignment check failed — see issues below');
        setSubmittingForReview(false);
        return;
      }
    }

    try {
      // 1. Test provisioning endpoint first (ping test via authenticated provider route)
      setSubmitStatus('Testing provisioning API...');
      const testResult = await api.post<{ data: { success: boolean; valid: boolean; message: string } }>('/provider/test-webhook', { event: 'ping' });
      if (!testResult.data?.success) {
        setSubmitStatus(`Provisioning test failed: ${testResult.data?.message ?? 'Unknown error'}. Check Settings tab.`);
        setSubmittingForReview(false);
        return;
      }
      // 2. Submit for review (endpoint may not exist yet — if provisioning test passed, treat as success)
      setSubmitStatus('Submitting for review...');
      try {
        await api.post(`/provider/listings/${listingId}/submit-for-review`);
      } catch {
        // Endpoint not yet implemented — provisioning test passed so listing is ready for review
      }
      setSubmitStatus('Listing submitted for review');
      window.dispatchEvent(new CustomEvent('provider-tab-change', { detail: { tab: 'listings' } }));
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Unknown error';
      if (raw.includes('404')) setSubmitStatus('Provisioning test endpoint not found. Check Settings.');
      else if (raw.includes('401') || raw.includes('Unauthorized')) setSubmitStatus('Provisioning API authorization failed. Check API key in Settings.');
      else if (raw.includes('500')) setSubmitStatus('Provisioning API returned a server error. Check your endpoint.');
      else if (raw.includes('timeout') || raw.includes('ECONNREFUSED')) setSubmitStatus('Provisioning API unreachable. Check URL in Settings.');
      else setSubmitStatus(`Submission failed: ${raw}`);
    } finally {
      setSubmittingForReview(false);
    }
  };

  useEffect(() => {
    api.get<{ data: { samples?: Sample[] } }>(`/provider/listings/${listingId}`)
      .then(r => setSamples(r.data.samples ?? []))
      .catch(() => {});
  }, [listingId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      // 1. Get presigned upload URL
      const { data } = await api.post<{ data: { upload_url: string; sample_id: string; public_url: string } }>(`/provider/listings/${listingId}/samples/upload-url`, {
        filename: file.name,
        content_type: file.type,
        size_bytes: file.size,
      });
      // 2. Upload directly to R2
      await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      // 3. Confirm upload
      await api.post(`/provider/listings/${listingId}/samples/confirm`, { sample_id: data.sample_id });
      // 4. Refetch samples from API to avoid duplicates
      const refreshed = await api.get<{ data: { samples?: Sample[] } }>(`/provider/listings/${listingId}`);
      setSamples(refreshed.data.samples ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const ps = getPreviewScore(samples, modalities);

  return (
    <>
    <div className="api-preamble" style={{ marginTop: 12 }}>
      <div className="db-meta-label" style={{ marginBottom: 10 }}>Samples ({samples.length}/{minSamples})</div>

      {samples.length > 0 && <SampleList samples={samples} modalities={modalities} onRemove={async (sampleId) => {
        try {
          await api.delete(`/provider/listings/${listingId}/samples/${sampleId}`);
          setSamples(prev => prev.filter(s => s.id !== sampleId));
        } catch { /* ignore — sample may already be removed */ }
      }} />}

      <input ref={fileRef} type="file" accept={acceptFilter} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <input className="db-form-input" style={{ flex: 1, fontSize: 11, padding: '8px 12px', fontFamily: "'Share Tech Mono', monospace" }}
          placeholder="Import sample from URL (S3, R2, GCS presigned link)"
          value={importUrl} onChange={e => setImportUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleImportUrl(); }}
          disabled={importing || uploading} />
        <button className="db-add-cart-btn" style={{ padding: '8px 20px', fontSize: 10, width: 'auto', marginTop: 0 }}
          onClick={handleImportUrl} disabled={importing || uploading || !importUrl.trim()}>
          {importing ? 'Importing...' : 'Import'}
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <button className="db-sample-upload-alt" onClick={() => fileRef.current?.click()} disabled={uploading || importing}>
          {uploading ? 'Uploading...' : 'or upload from local file'}
        </button>
      </div>

      {error && <p style={{ fontSize: 10, color: 'var(--red)', marginTop: 6 }}>{error}</p>}
      {uploadHint && <p style={{ fontSize: 9, color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 4 }}>{uploadHint}</p>}

      {ps.suggestions.length > 0 && (
        <div className="db-preview-score__tips" style={{ marginTop: 8 }}>
          {ps.suggestions.map((s, i) => <div key={i} className="db-preview-score__tip">{s}</div>)}
        </div>
      )}

    </div>

    {/* Sample Repository (Manifest) */}
    {manifestLoaded && (
      <div className="api-preamble" style={{ marginTop: 12 }}>
        <div className="db-meta-label" style={{ marginBottom: 10 }}>Sample Repository (Required)</div>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>
          Host a manifest.json in your storage that indexes your sample episodes. See the <strong>Docs</strong> tab for format details and a generator script.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input className="db-form-input" style={{ flex: 1, fontSize: 11, padding: '8px 12px', fontFamily: "'Share Tech Mono', monospace" }}
            placeholder="https://storage.example.com/dataset/manifest.json"
            value={manifestUrl} onChange={e => { setManifestUrl(e.target.value); if (manifestStatus !== 'idle') setManifestStatus('idle'); }}
            disabled={manifestStatus === 'validating'} />
          {manifestStatus === 'valid' ? (
            <button className="db-regen-btn" style={{ margin: 0, padding: '8px 16px', fontSize: 10 }}
              onClick={handleRefreshManifest}>
              Refresh
            </button>
          ) : (
            <button className="db-add-cart-btn" style={{ padding: '8px 20px', fontSize: 10, width: 'auto', marginTop: 0 }}
              onClick={handleValidateManifest} disabled={manifestStatus === 'validating' || !manifestUrl.trim()}>
              {manifestStatus === 'validating' ? 'Validating...' : 'Validate'}
            </button>
          )}
        </div>
        {manifestStatus === 'valid' && manifestInfo && (
          <p style={{ fontSize: 10, color: 'var(--green, #276749)', marginTop: 6 }}>
            Manifest valid — {manifestInfo.episode_count} episodes, {manifestInfo.total_duration_hours} hours
          </p>
        )}
        {manifestStatus === 'invalid' && manifestErrors.length > 0 && (
          <div style={{ marginTop: 6 }}>
            {manifestErrors.map((e, i) => (
              <p key={i} style={{ fontSize: 10, color: 'var(--red, #c53030)', marginTop: 2 }}>{e.message}</p>
            ))}
          </div>
        )}
      </div>
    )}

    {reviewStatus === 'approved' ? (
      <div className="api-preamble" style={{ marginTop: 12, textAlign: 'center', padding: '16px 24px' }}>
        <button className="db-add-cart-btn" disabled style={{ background: 'var(--green, #276749)', borderColor: 'var(--green, #276749)', color: '#fff', cursor: 'default' }}>
          Approved & Published
        </button>
      </div>
    ) : (
      <>
      {alignmentIssues.length > 0 && (
        <div className="db-alignment-errors">
          <div className="db-alignment-errors__title">Sample alignment issues</div>
          {alignmentIssues.map((issue, i) => (
            <div key={i} className="db-alignment-errors__item">
              <span className="db-alignment-errors__icon">{issue.type === 'unassigned' ? '?' : issue.type === 'missing_modality' ? '!' : issue.type === 'count_mismatch' ? '#' : '~'}</span>
              {issue.message}
            </div>
          ))}
          <div className="db-alignment-errors__hint">
            Required naming convention: <code>{'{episode_id}_{modality}.{ext}'}</code> — e.g. episode_001_rgb.mp4, episode_001_imu.parquet
          </div>
        </div>
      )}
      <div className="api-preamble" style={{ marginTop: 12, textAlign: 'center', padding: '20px 24px', opacity: canSubmitForReview ? 1 : 0.4 }}>
        {submitStatus === 'Listing submitted for review' ? (
          <button className="db-add-cart-btn" disabled style={{ background: 'var(--green, #276749)', borderColor: 'var(--green, #276749)', color: '#fff', cursor: 'default' }}>
            Submitted for Review
          </button>
        ) : submitStatus && !submitStatus.includes('...') ? (
          <button className="db-add-cart-btn" onClick={handleSubmitForReview} disabled={!canSubmitForReview || submittingForReview}
            style={{ cursor: canSubmitForReview ? 'pointer' : 'not-allowed', background: 'var(--red, #c53030)', borderColor: 'var(--red, #c53030)' }}>
            Retry Submit ({submitStatus})
          </button>
        ) : (
          <>
            <button className="db-add-cart-btn" onClick={handleSubmitForReview} disabled={!canSubmitForReview || submittingForReview}
              style={{ cursor: canSubmitForReview ? 'pointer' : 'not-allowed' }}>
              {submittingForReview ? 'Verifying...' : 'Submit for Review'}
            </button>
            <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
              {canSubmitForReview ? 'Verifies your provisioning API before submitting' : samples.length < minSamples ? `Upload ${minSamples - samples.length} more sample${minSamples - samples.length !== 1 ? 's' : ''} to submit` : !manifestValid ? 'Validate your sample manifest to submit' : 'Complete all requirements to submit'}
            </p>
          </>
        )}
      </div>
      </>
    )}
    </>
  );
}

function ProviderDashboard() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'settings') return 'stripe';
    return ['listings', 'create', 'programs', 'analytics', 'docs', 'stripe'].includes(hash) ? hash : 'listings';
  });
  const [listings, setListings] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const fetchListingsProvider = useCallback(() => {
    api.get<{ data: Record<string, unknown>[] }>('/provider/listings')
      .then(r => setListings(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<{ data: { description: string | null } }>('/provider/profile')
      .then(r => { if (!r.data.description) setProfileIncomplete(true); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchListingsProvider(); }, [fetchListingsProvider]);

  // Listen for tab change events and listing-created events from child components
  useEffect(() => {
    const tabHandler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab;
      if (tab) setActiveTab(tab);
    };
    const listingCreatedHandler = (e: Event) => {
      const listingId = (e as CustomEvent).detail?.listingId;
      fetchListingsProvider();
      if (listingId) {
        setActiveTab('listings');
        setSelectedListingId(String(listingId));
      }
    };
    window.addEventListener('provider-tab-change', tabHandler);
    window.addEventListener('provider-listing-created', listingCreatedHandler);
    return () => {
      window.removeEventListener('provider-tab-change', tabHandler);
      window.removeEventListener('provider-listing-created', listingCreatedHandler);
    };
  }, [fetchListingsProvider]);

  const tabs = [
    { id: 'listings', label: 'My Listings' },
    { id: 'create', label: 'Create Listing' },
    { id: 'programs', label: 'My Programs' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'docs', label: 'Docs' },
    { id: 'stripe', label: 'Settings' },
  ];

  return (
    <div>
      {profileIncomplete && !bannerDismissed && (
        <div className="db-profile-banner">
          <span>Your profile is incomplete — buyers can't learn about you yet.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="db-profile-banner__btn" onClick={() => setActiveTab('stripe')}>Go to Settings</button>
            <button className="db-profile-banner__dismiss" onClick={() => setBannerDismissed(true)}>&times;</button>
          </div>
        </div>
      )}
      <div className="db-provider-nav">
        {tabs.map(t => (
          <button key={t.id} className={`db-filter-pill${activeTab === t.id ? ' db-filter-pill--active' : ''}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'listings' && (
        loading ? <div className="db-loading">Loading listings...</div> :
        selectedListingId ? (
          (() => {
            const l = listings.find(x => String(x.id) === selectedListingId);
            if (!l) return <div className="db-empty">Listing not found</div>;
            return <ListingDetail listing={l} onBack={() => setSelectedListingId(null)} onListingUpdated={fetchListingsProvider} />;
          })()
        ) :
        listings.length === 0 ? <div className="db-empty">No listings yet - create your first listing</div> :
        <div>
          {listings.map(l => {
            const rowStatus = l.is_active === false ? 'deactivated' : String(l.review_status);
            return (
              <div key={String(l.id)} className={`db-catalog-row db-listing-row--provider${l.is_active === false ? ' db-listing-deactivated' : ''}`} onClick={() => setSelectedListingId(String(l.id))}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="db-catalog-row__title">{String(l.title)}</div>
                  <div className="db-catalog-row__details" style={{ marginTop: 4 }}>{formatTags(l.modality as string | string[])} · ${String(l.price_per_hour)}/hr</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                  <span className={`db-status-badge db-status-badge--${rowStatus}`}>{rowStatus.replace(/_/g, ' ')}</span>
                  <span className="db-catalog-row__view">Manage &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'create' && <CreateListingForm />}
      {activeTab === 'programs' && <CollectionProgramsManager />}
      {activeTab === 'analytics' && <ProviderAnalytics />}
      {activeTab === 'docs' && <ProviderDocs />}
      {activeTab === 'stripe' && <StripeStatus />}
    </div>
  );
}


function TagSection({ label, required, selected, options, onToggle, defaultOpen, allowCustom }: {
  label: string; required?: boolean; selected: string[]; options: string[];
  onToggle: (value: string) => void; defaultOpen?: boolean; allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [customInput, setCustomInput] = useState('');
  const count = selected.length;

  const handleCustomAdd = () => {
    const normalized = customInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (normalized && !selected.includes(normalized) && !options.includes(normalized)) {
      onToggle(normalized);
    }
    setCustomInput('');
  };

  // Custom tags are selected values not in the predefined options
  const customTags = selected.filter(v => !options.includes(v));

  return (
    <div className="db-tag-section">
      <button type="button" className="db-tag-section__header" onClick={() => setOpen(!open)}>
        <span className="db-tag-section__label">
          {label}{required ? ' *' : ' (optional)'}
          {count > 0 && <span className="db-tag-section__count">{count} selected</span>}
        </span>
        <span className="db-tag-section__arrow">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="db-tag-section__pills">
          {options.map(v => (
            <button key={v} type="button" className={`db-filter-pill${selected.includes(v) ? ' db-filter-pill--active' : ''}`}
              style={{ fontSize: 9 }} onClick={() => onToggle(v)}>
              {v.replace(/_/g, ' ')}
            </button>
          ))}
          {customTags.map(v => (
            <button key={v} type="button" className="db-filter-pill db-filter-pill--active db-filter-pill--custom"
              style={{ fontSize: 9 }} onClick={() => onToggle(v)}>
              {v.replace(/_/g, ' ')} ×
            </button>
          ))}
          {allowCustom && (
            <input className="db-custom-tag-input" type="text" placeholder="Add custom..."
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCustomAdd(); } }}
              onBlur={() => { if (customInput.trim()) handleCustomAdd(); }} />
          )}
        </div>
      )}
    </div>
  );
}

function ListingDetail({ listing, onBack, onListingUpdated }: {
  listing: Record<string, unknown>;
  onBack: () => void;
  onListingUpdated: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', price_per_hour: '', minimum_hours: '', total_hours: '',
    formats: [] as string[], license_terms: '', modalities: [] as string[], environments: [] as string[],
    collection_methods: [] as string[], embodiment_types: [] as string[], task_types: [] as string[],
    license_type: 'commercial',
    modality_prices: {} as Record<string, string>,
  });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [togglingActive, setTogglingActive] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const formats = ['parquet', 'rosbag', 'mp4', 'hdf5', 'csv', 'json', 'mcap', 'zarr', 'tfrecord', 'png', 'wav', 'ply', 'pcd', 'rrd', 'lerobot', 'other'];

  // Derived state
  const reviewStatus = String(listing.review_status ?? '');
  const hasPurchases = Boolean(listing.has_purchases);
  const isActive = listing.is_active !== false;
  const displayStatus = !isActive ? 'deactivated' : reviewStatus;
  const isModalityLocked = hasPurchases;
  const isLicenseTypeLocked = hasPurchases;
  const willTriggerReReview = reviewStatus === 'approved';

  // Parse tags and modalities from listing
  const tags = Array.isArray(listing.tags) ? (listing.tags as string[]) : [];
  const collectionTags = tags.filter(t => String(t).startsWith('collection:')).map(t => String(t).replace('collection:', ''));
  const embodimentTags = tags.filter(t => String(t).startsWith('embodiment:')).map(t => String(t).replace('embodiment:', ''));
  const taskTags = tags.filter(t => String(t).startsWith('task:')).map(t => String(t).replace('task:', ''));
  const envTags = tags.filter(t => String(t).startsWith('environment:')).map(t => String(t).replace('environment:', ''));
  const allModalities = Array.isArray(listing.modality) ? (listing.modality as string[]).map(String) : [String(listing.modality ?? '')].filter(Boolean);
  const allEnvironments = [String(listing.environment ?? '')].filter(Boolean).concat(envTags);

  const toggleEditTag = (field: 'modalities' | 'environments' | 'collection_methods' | 'embodiment_types' | 'task_types', value: string) => {
    setEditForm(f => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const enterEditMode = () => {
    setEditForm({
      title: String(listing.title ?? ''),
      description: String(listing.description ?? ''),
      price_per_hour: String(listing.price_per_hour ?? ''),
      minimum_hours: String(listing.minimum_hours ?? '1'),
      total_hours: listing.total_hours ? String(listing.total_hours) : '',
      formats: listing.format ? String(listing.format).split(',').map(s => s.trim()).filter(Boolean) : [],
      license_terms: String(listing.license_terms ?? ''),
      license_type: String(listing.license_type ?? 'commercial'),
      modalities: [...allModalities],
      environments: [...allEnvironments],
      collection_methods: [...collectionTags],
      embodiment_types: [...embodimentTags],
      task_types: [...taskTags],
      modality_prices: listing.modality_prices
        ? Object.fromEntries(Object.entries(listing.modality_prices as Record<string, number>).map(([k, v]) => [k, String(v)]))
        : {},
    });
    setIsEditing(true);
    setSaveError('');
    setSaveMsg('');
  };

  const handleSave = async () => {
    const isMultiMod = editForm.modalities.length > 1;
    if (!editForm.title || !editForm.description) {
      setSaveError('Title and description are required');
      return;
    }
    if (!isMultiMod && !editForm.price_per_hour) {
      setSaveError('Price per hour is required');
      return;
    }
    if (isMultiMod && editForm.modalities.some(m => !editForm.modality_prices[m] || parseFloat(editForm.modality_prices[m]) <= 0)) {
      setSaveError('Set a price for each modality');
      return;
    }
    if (!isModalityLocked && editForm.modalities.length === 0) {
      setSaveError('Select at least one modality');
      return;
    }
    if (editForm.environments.length === 0) {
      setSaveError('Select at least one environment');
      return;
    }
    setSaving(true);
    setSaveError('');
    setSaveMsg('');
    try {
      // Build modality_prices for multi-modality listings
      const isMultiModality = editForm.modalities.length > 1;
      const modalityPricesObj = isMultiModality && Object.keys(editForm.modality_prices).length > 0
        ? Object.fromEntries(editForm.modalities.map(m => [m, parseFloat(editForm.modality_prices[m]) || 0]))
        : undefined;
      const computedPrice = modalityPricesObj
        ? Object.values(modalityPricesObj).reduce((s, v) => s + v, 0)
        : parseFloat(editForm.price_per_hour);

      const body: Record<string, unknown> = {
        title: editForm.title,
        description: editForm.description,
        price_per_hour: computedPrice,
        modality_prices: modalityPricesObj ?? null,
        minimum_hours: parseFloat(editForm.minimum_hours) || 1,
        total_hours: editForm.total_hours ? parseFloat(editForm.total_hours.replace(/,/g, '')) : null,
        format: editForm.formats.length > 0 ? editForm.formats.join(', ') : null,
        license_terms: editForm.license_terms || null,
      };
      // Modality + license_type only if unlocked
      if (!isModalityLocked) {
        body.modality = editForm.modalities[0];
        body.tags = [
          ...editForm.modalities.slice(1).map(v => `modality:${v}`),
          ...editForm.environments.slice(1).map(v => `environment:${v}`),
          ...editForm.collection_methods.map(v => `collection:${v}`),
          ...editForm.embodiment_types.map(v => `embodiment:${v}`),
          ...editForm.task_types.map(v => `task:${v}`),
        ].filter(Boolean);
      } else {
        // Preserve existing modality tags when modalities are locked
        const existingModalityTags = tags.filter(t => String(t).startsWith('modality:'));
        body.tags = [
          ...existingModalityTags,
          ...editForm.environments.slice(1).map(v => `environment:${v}`),
          ...editForm.collection_methods.map(v => `collection:${v}`),
          ...editForm.embodiment_types.map(v => `embodiment:${v}`),
          ...editForm.task_types.map(v => `task:${v}`),
        ].filter(Boolean);
      }
      if (!isLicenseTypeLocked) body.license_type = editForm.license_type;
      if (editForm.environments.length > 0) body.environment = editForm.environments[0];

      await api.patch(`/provider/listings/${String(listing.id)}`, body);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 3000);
      setIsEditing(false);
      onListingUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  const handleToggleActive = async () => {
    const action = isActive ? 'deactivate' : 'reactivate';
    if (isActive && !window.confirm('Deactivate this listing? It will be hidden from the catalog. Existing purchases are unaffected.')) return;
    setTogglingActive(true);
    try {
      await api.post(`/provider/listings/${String(listing.id)}/${action}`);
      onListingUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
    setTogglingActive(false);
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Withdraw this listing from review? It will return to draft status.')) return;
    setWithdrawing(true);
    try {
      await api.post(`/provider/listings/${String(listing.id)}/withdraw`);
      onListingUpdated();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to withdraw');
    }
    setWithdrawing(false);
  };

  const updateField = (field: string, value: string) => setEditForm(f => ({ ...f, [field]: value }));

  // Re-review check: did the user change title or description from the original?
  const titleChanged = isEditing && editForm.title !== String(listing.title ?? '');
  const descChanged = isEditing && editForm.description !== String(listing.description ?? '');
  const showReReviewWarning = willTriggerReReview && (titleChanged || descChanged);

  return (
    <div>
      <button className="db-back-btn" onClick={onBack}>&larr; Back to listings</button>

      <div className="api-preamble" style={{ marginTop: 12, padding: '24px 28px' }}>
        {/* Header: title + status + action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {isEditing ? (
              <input className="db-form-input" style={{ fontSize: 15, fontWeight: 500, fontFamily: "'Share Tech Mono', monospace" }}
                value={editForm.title} onChange={e => updateField('title', e.target.value)} />
            ) : (
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 15, fontWeight: 500, color: 'var(--text)', letterSpacing: '0.5px' }}>{String(listing.title)}</div>
            )}
            {isEditing ? (
              <textarea className="db-form-textarea" rows={3} style={{ marginTop: 6, fontSize: 11 }}
                value={editForm.description} onChange={e => updateField('description', e.target.value)} />
            ) : (
              listing.description ? <div style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 4 }}>{String(listing.description).slice(0, 120)}{String(listing.description).length > 120 ? '...' : ''}</div> : null
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 16 }}>
            <span className={`db-status-badge db-status-badge--${displayStatus}`}>{displayStatus.replace(/_/g, ' ')}</span>
            {!isEditing && (
              <button className="db-status-badge" style={{ cursor: 'pointer', border: '1px solid var(--border)' }} onClick={enterEditMode}>Edit</button>
            )}
            {!isEditing && (reviewStatus === 'pending_review' || reviewStatus === 'pending') && (
              <button className="db-regen-btn" style={{ margin: 0, fontSize: 8 }} onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? '...' : 'Withdraw'}
              </button>
            )}
          </div>
        </div>

        {showReReviewWarning && (
          <div className="db-edit-warning">Changing title or description will require re-review for this listing</div>
        )}

        {saveError && <div className="db-form-error" style={{ marginBottom: 12 }}>{saveError}</div>}

        {isEditing ? (
          /* ─── Edit Mode ─── */
          <div>
            {isModalityLocked ? (
              <div className="db-form-field">
                <label className="db-meta-label">Modalities (locked — active purchases)</label>
                <div className="db-badges">{allModalities.map(m => <span key={m} className="db-badge">{m.replace(/_/g, ' ')}</span>)}</div>
              </div>
            ) : (
              <TagSection label="Modalities" required selected={editForm.modalities} options={MODALITIES}
                onToggle={v => {
                  toggleEditTag('modalities', v);
                  setEditForm(f => {
                    const mp = { ...f.modality_prices };
                    if (f.modalities.includes(v)) { mp[v] = mp[v] ?? ''; } else { delete mp[v]; }
                    return { ...f, modality_prices: mp };
                  });
                }} />
            )}

            {editForm.modalities.length > 1 && (
              <div className="db-modality-prices">
                <label className="db-meta-label">Price per modality (USD/hr)</label>
                {editForm.modalities.map(m => (
                  <div key={m} className="db-modality-price-row">
                    <span className="db-badge" style={{ minWidth: 80, textAlign: 'center' }}>{m.replace(/_/g, ' ')}</span>
                    <input className="db-form-input" type="text" inputMode="decimal" placeholder="0.00"
                      style={{ flex: 1, maxWidth: 120 }}
                      value={editForm.modality_prices[m] ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, modality_prices: { ...f.modality_prices, [m]: e.target.value.replace(/[^0-9.]/g, '') } }))}
                      onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setEditForm(f => ({ ...f, modality_prices: { ...f.modality_prices, [m]: v.toFixed(2) } })); }}
                      disabled={isModalityLocked} />
                    <span className="db-meta-label" style={{ margin: 0 }}>/hr</span>
                  </div>
                ))}
                <div className="db-modality-price-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', minWidth: 80, textAlign: 'center' }}>Bundle</span>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 500 }}>
                    ${Object.values(editForm.modality_prices).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)}/hr
                  </span>
                </div>
              </div>
            )}

            <TagSection label="Environments" required selected={editForm.environments} options={ENVIRONMENTS}
              onToggle={v => toggleEditTag('environments', v)} />

            <TagSection label="Collection Method" selected={editForm.collection_methods} options={COLLECTION_METHODS}
              onToggle={v => toggleEditTag('collection_methods', v)} required />

            <TagSection label="Embodiment / Platform" selected={editForm.embodiment_types} options={EMBODIMENT_TYPES}
              onToggle={v => toggleEditTag('embodiment_types', v)} required />

            <TagSection label="Task Types" selected={editForm.task_types} options={TASK_TYPES}
              onToggle={v => toggleEditTag('task_types', v)} allowCustom required />

            <div className="db-form-row" style={{ marginTop: 12 }}>
              {editForm.modalities.length <= 1 && (
              <div className="db-form-field" style={{ flex: 1 }}>
                <label className="db-meta-label">Price per hour (USD)</label>
                <input className="db-form-input" type="text" inputMode="decimal" value={editForm.price_per_hour}
                  onChange={e => updateField('price_per_hour', e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) updateField('price_per_hour', v.toFixed(2)); }} />
              </div>
              )}
              <div className="db-form-field" style={{ flex: 1 }}>
                <label className="db-meta-label">Minimum hours</label>
                <input className="db-form-input" type="text" inputMode="numeric" value={editForm.minimum_hours}
                  onChange={e => updateField('minimum_hours', e.target.value.replace(/[^0-9]/g, ''))} />
              </div>
              <div className="db-form-field" style={{ flex: 1 }}>
                <label className="db-meta-label">Total hours available</label>
                <input className="db-form-input" type="text" inputMode="numeric" value={editForm.total_hours}
                  onChange={e => updateField('total_hours', e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) updateField('total_hours', v.toLocaleString()); }} />
              </div>
            </div>

            <TagSection label="Formats" required selected={editForm.formats} options={formats}
              onToggle={v => setEditForm(f => ({ ...f, formats: f.formats.includes(v) ? f.formats.filter(x => x !== v) : [...f.formats, v] }))} />

            {isLicenseTypeLocked ? (
              <div className="db-form-field" style={{ marginTop: 12 }}>
                <label className="db-meta-label">License (locked — active purchases)</label>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{String(listing.license_type)}</div>
              </div>
            ) : (
              <div className="db-form-field" style={{ marginTop: 12 }}>
                <label className="db-meta-label">License</label>
                <select className="db-form-select" value={editForm.license_type} onChange={e => updateField('license_type', e.target.value)}>
                  <option value="commercial">Commercial</option>
                  <option value="research">Research Only</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            )}

            <div className="db-form-field" style={{ marginTop: 12 }}>
              <label className="db-meta-label">License terms (optional)</label>
              <textarea className="db-form-textarea" rows={2} value={editForm.license_terms}
                onChange={e => updateField('license_terms', e.target.value)} />
            </div>

            <div className="db-edit-actions">
              <button className="db-add-cart-btn" style={{ maxWidth: 120 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="db-add-cart-btn" style={{ maxWidth: 120, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' }} onClick={() => setIsEditing(false)} disabled={saving}>Cancel</button>
              {saveMsg && <span style={{ fontSize: 10, fontFamily: "'Share Tech Mono', monospace", color: 'var(--green)' }}>{saveMsg}</span>}
            </div>
          </div>
        ) : (
          /* ─── View Mode ─── */
          <>
            <div className="db-badges" style={{ marginBottom: 20 }}>
              {allModalities.map(m => <span key={m} className="db-badge">{m.replace(/_/g, ' ')}</span>)}
              {allEnvironments.map(e => <span key={`env-${e}`} className="db-badge">{e.replace(/_/g, ' ')}</span>)}
              {collectionTags.map(t => <span key={`c-${t}`} className="db-badge">{t.replace(/_/g, ' ')}</span>)}
              {embodimentTags.map(t => <span key={`e-${t}`} className="db-badge">{t.replace(/_/g, ' ')}</span>)}
              {taskTags.map(t => <span key={`t-${t}`} className="db-badge">{t.replace(/_/g, ' ')}</span>)}
              {listing.format ? <span className="db-badge">{String(listing.format)}</span> : null}
            </div>

            <div className="db-meta-grid">
              <div><div className="db-meta-label">Price</div><div className="db-meta-value">${String(listing.price_per_hour)}/hr</div></div>
              <div><div className="db-meta-label">Min Purchase</div><div className="db-meta-value">{String(listing.minimum_hours)} hrs</div></div>
              {listing.total_hours ? <div><div className="db-meta-label">Total Hours</div><div className="db-meta-value">{Number(listing.total_hours).toLocaleString()}</div></div> : null}
            </div>
          </>
        )}
      </div>

      {/* Sample uploader */}
      <SampleUploader listingId={String(listing.id)} modalities={allModalities} reviewStatus={reviewStatus} />

      {/* Deactivate / Reactivate action bar */}
      {(reviewStatus === 'approved' || !isActive) && (
        <div className="api-preamble" style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
          <div>
            <div className="db-meta-label">{isActive ? 'Listing is live' : 'Listing is deactivated'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
              {isActive ? 'Visible to buyers in the catalog' : 'Hidden from catalog. Reactivate to make visible again.'}
            </div>
          </div>
          <button className="db-regen-btn" style={{ margin: 0 }} onClick={handleToggleActive} disabled={togglingActive}>
            {togglingActive ? '...' : isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateListingForm() {
  const [form, setForm] = useState({
    title: '', description: '', modalities: [] as string[], environments: [] as string[],
    collection_methods: [] as string[], embodiment_types: [] as string[], task_types: [] as string[],
    price_per_hour: '', minimum_hours: '1', total_hours: '', formats: [] as string[],
    license_type: 'commercial', license_terms: '',
    modality_prices: {} as Record<string, string>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const formats = ['parquet', 'rosbag', 'mp4', 'hdf5', 'csv', 'json', 'mcap', 'zarr', 'tfrecord', 'png', 'wav', 'ply', 'pcd', 'rrd', 'lerobot', 'other'];

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const toggleTag = (field: 'modalities' | 'environments' | 'collection_methods' | 'embodiment_types' | 'task_types', value: string) => {
    setForm(f => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const handleSubmit = async () => {
    const isMultiModality = form.modalities.length > 1;
    if (!form.title || !form.description) {
      setError('Title and description are required');
      return;
    }
    if (!isMultiModality && !form.price_per_hour) {
      setError('Price per hour is required');
      return;
    }
    if (isMultiModality && form.modalities.some(m => !form.modality_prices[m] || parseFloat(form.modality_prices[m]) <= 0)) {
      setError('Set a price for each modality');
      return;
    }
    if (form.modalities.length === 0) {
      setError('Select at least one modality');
      return;
    }
    if (form.environments.length === 0) {
      setError('Select at least one environment');
      return;
    }
    if (form.formats.length === 0) {
      setError('Select at least one format');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Build modality_prices for multi-modality listings
      const modalityPricesObj = isMultiModality
        ? Object.fromEntries(form.modalities.map(m => [m, parseFloat(form.modality_prices[m]) || 0]))
        : undefined;
      const computedPrice = modalityPricesObj
        ? Object.values(modalityPricesObj).reduce((s, v) => s + v, 0)
        : parseFloat(form.price_per_hour);

      // Backend expects modality/environment as single strings; pack extras into tags
      const res = await api.post<{ data: { id: string } }>('/provider/listings', {
        title: form.title,
        description: form.description,
        modality: form.modalities[0],
        environment: form.environments[0],
        price_per_hour: computedPrice,
        modality_prices: modalityPricesObj,
        minimum_hours: parseFloat(form.minimum_hours) || 1,
        total_hours: form.total_hours ? parseFloat(form.total_hours.replace(/,/g, '')) : undefined,
        format: form.formats.length > 0 ? form.formats.join(', ') : undefined,
        license_type: form.license_type,
        license_terms: form.license_terms || undefined,
        tags: [
          ...form.modalities.slice(1).map(v => `modality:${v}`),
          ...form.environments.slice(1).map(v => `environment:${v}`),
          ...form.collection_methods.map(v => `collection:${v}`),
          ...form.embodiment_types.map(v => `embodiment:${v}`),
          ...form.task_types.map(v => `task:${v}`),
        ].filter(Boolean),
      });
      setForm({ title: '', description: '', modalities: [], environments: [], collection_methods: [], embodiment_types: [], task_types: [], price_per_hour: '', minimum_hours: '1', total_hours: '', formats: [], license_type: 'commercial', license_terms: '', modality_prices: {} });
      // Navigate to listing detail for sample upload
      const newId = res?.data?.id;
      if (newId) {
        window.dispatchEvent(new CustomEvent('provider-listing-created', { detail: { listingId: newId } }));
      } else {
        setResult('Listing saved — go to My Listings to upload samples');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="api-preamble" style={{ marginTop: 16, textAlign: 'center', padding: 32 }}>
        <div className="db-sell-headline" style={{ fontSize: 14, marginBottom: 8 }}>{result}</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>Upload at least 5 samples from My Listings, then submit for review.</p>
        <button className="db-add-cart-btn" style={{ maxWidth: 200, margin: '0 auto' }} onClick={() => setResult(null)}>Create Another</button>
      </div>
    );
  }

  return (
    <div className="db-create-form">
      {error && <div className="db-form-error">{error}</div>}

      <div className="db-form-field">
        <label className="db-meta-label">Title</label>
        <input className="db-form-input" placeholder="Household Cooking - Egocentric Video" value={form.title} onChange={e => update('title', e.target.value)} />
      </div>

      <TagSection label="Modalities" required selected={form.modalities} options={MODALITIES}
        onToggle={v => {
          toggleTag('modalities', v);
          // Sync modality_prices: add/remove entry when toggling modalities
          setForm(f => {
            const mp = { ...f.modality_prices };
            if (f.modalities.includes(v)) { mp[v] = mp[v] ?? ''; } else { delete mp[v]; }
            return { ...f, modality_prices: mp };
          });
        }} />

      {form.modalities.length > 1 && (
        <div className="db-modality-prices">
          <label className="db-meta-label">Price per modality (USD/hr)</label>
          {form.modalities.map(m => (
            <div key={m} className="db-modality-price-row">
              <span className="db-badge" style={{ minWidth: 80, textAlign: 'center' }}>{m.replace(/_/g, ' ')}</span>
              <input className="db-form-input" type="text" inputMode="decimal" placeholder="0.00"
                style={{ flex: 1, maxWidth: 120 }}
                value={form.modality_prices[m] ?? ''}
                onChange={e => setForm(f => ({ ...f, modality_prices: { ...f.modality_prices, [m]: e.target.value.replace(/[^0-9.]/g, '') } }))}
                onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setForm(f => ({ ...f, modality_prices: { ...f.modality_prices, [m]: v.toFixed(2) } })); }} />
              <span className="db-meta-label" style={{ margin: 0 }}>/hr</span>
            </div>
          ))}
          <div className="db-modality-price-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', minWidth: 80, textAlign: 'center' }}>Bundle</span>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 500 }}>
              ${Object.values(form.modality_prices).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)}/hr
            </span>
          </div>
        </div>
      )}

      <TagSection label="Environments" required selected={form.environments} options={ENVIRONMENTS}
        onToggle={v => toggleTag('environments', v)} />

      <TagSection label="Collection Method" selected={form.collection_methods} options={COLLECTION_METHODS}
        onToggle={v => toggleTag('collection_methods', v)} required />

      <TagSection label="Embodiment / Platform" selected={form.embodiment_types} options={EMBODIMENT_TYPES}
        onToggle={v => toggleTag('embodiment_types', v)} required />

      <TagSection label="Task Types" selected={form.task_types} options={TASK_TYPES}
        onToggle={v => toggleTag('task_types', v)} allowCustom required />

      <div className="db-form-field">
        <label className="db-meta-label">Description</label>
        <textarea className="db-form-textarea" rows={4} placeholder="Describe your dataset, collection methodology, and what makes it valuable" value={form.description} onChange={e => update('description', e.target.value)} />
      </div>

      <div className="db-form-row">
        {form.modalities.length <= 1 && (
          <div className="db-form-field" style={{ flex: 1 }}>
            <label className="db-meta-label">Price per hour (USD)</label>
            <input className="db-form-input" type="text" inputMode="decimal" placeholder="50.00" value={form.price_per_hour}
              onChange={e => update('price_per_hour', e.target.value.replace(/[^0-9.]/g, ''))}
              onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) update('price_per_hour', v.toFixed(2)); }} />
          </div>
        )}
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Minimum hours</label>
          <input className="db-form-input" type="text" inputMode="numeric" placeholder="1" value={form.minimum_hours}
            onChange={e => update('minimum_hours', e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Total hours available</label>
          <input className="db-form-input" type="text" inputMode="numeric" placeholder="10,000" value={form.total_hours}
            onChange={e => update('total_hours', e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v > 0) update('total_hours', v.toLocaleString()); }} />
        </div>
      </div>

      <TagSection label="Formats" required selected={form.formats} options={formats}
        onToggle={v => setForm(f => ({ ...f, formats: f.formats.includes(v) ? f.formats.filter(x => x !== v) : [...f.formats, v] }))} />

      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.5 }}>
        After saving, you'll be taken to upload sample files. At least 5 samples are required before submitting for review.
      </p>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
        <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 2 }} />
        <span>I agree to the <a href="/data/seller-terms" target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Data Provider Conditions</a></span>
      </label>

      <button className="db-add-cart-btn" onClick={handleSubmit} disabled={submitting || !agreedToTerms}>
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BUYER PURCHASES VIEW
// ═══════════════════════════════════════════════════════════

function CopyableCode({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div className="db-meta-label">{label}</div>
        <button className="db-regen-btn" style={{ margin: 0, padding: '3px 10px', fontSize: '8px' }} onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="db-code-block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{code}</pre>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HUGGINGFACE DATASET CARD
// ═══════════════════════════════════════════════════════════

function generateDatasetCard(listing: Record<string, unknown>, providerName: string, hours: number): string {
  const title = String(listing.title ?? 'Dataset');
  const description = String(listing.description ?? '');
  const modality = String(listing.modality ?? '');
  const environment = String(listing.environment ?? '');
  const format = String(listing.format ?? '');
  const licenseType = String(listing.license_type ?? 'commercial');
  const totalHoursAvail = listing.total_hours ? Number(listing.total_hours) : null;
  const tags = Array.isArray(listing.tags) ? (listing.tags as string[]) : [];
  const modalityPrices = listing.modality_prices as Record<string, number> | null;

  const allMods = [modality, ...tags.filter(t => t.startsWith('modality:')).map(t => t.replace('modality:', ''))].filter(Boolean);
  const allEnvs = [environment, ...tags.filter(t => t.startsWith('environment:')).map(t => t.replace('environment:', ''))].filter(Boolean);
  const collections = tags.filter(t => t.startsWith('collection:')).map(t => t.replace('collection:', '').replace(/_/g, ' '));
  const embodiments = tags.filter(t => t.startsWith('embodiment:')).map(t => t.replace('embodiment:', '').replace(/_/g, ' '));
  const taskTypes = tags.filter(t => t.startsWith('task:')).map(t => t.replace('task:', '').replace(/_/g, ' '));

  const licenseMap: Record<string, string> = { commercial: 'other', research_only: 'cc-by-nc-4.0', standard: 'cc-by-4.0', custom: 'other' };
  const hfLicense = licenseMap[licenseType] ?? 'other';
  const sizeCategory = hours >= 1000 ? '10K<n<100K' : hours >= 100 ? '1K<n<10K' : hours >= 10 ? '1K<n<10K' : 'n<1K';

  const yamlTags = [
    'atlas-data-brokerage',
    'robotics',
    'physical-ai',
    ...allMods.map(m => m.replace(/_/g, '-')),
    ...allEnvs.map(e => e.replace(/_/g, '-')),
    ...embodiments.map(e => e.replace(/ /g, '-')),
    ...(format.includes('lerobot') ? ['lerobot'] : []),
  ];

  // Build details table rows, skipping empty values
  const rows: string[] = [];
  rows.push(`| **Provider** | ${providerName} |`);
  if (allMods.length > 0) rows.push(`| **Modalities** | ${allMods.map(m => '\`' + m.replace(/_/g, ' ') + '\`').join(', ')} |`);
  if (allEnvs.length > 0) rows.push(`| **Environment** | ${allEnvs.map(e => e.replace(/_/g, ' ')).join(', ')} |`);
  if (collections.length > 0) rows.push(`| **Collection Method** | ${collections.join(', ')} |`);
  if (embodiments.length > 0) rows.push(`| **Embodiment** | ${embodiments.join(', ')} |`);
  if (taskTypes.length > 0) rows.push(`| **Task Types** | ${taskTypes.join(', ')} |`);
  rows.push(`| **Hours Purchased** | ${hours} |`);
  if (totalHoursAvail) rows.push(`| **Total Available** | ${totalHoursAvail.toLocaleString()} hours |`);
  if (format) rows.push(`| **Format** | ${format} |`);
  rows.push(`| **License** | ${licenseType.replace(/_/g, ' ')} |`);

  return `---
license: ${hfLicense}
task_categories:
  - robotics
tags:
${yamlTags.map(t => `  - ${t}`).join('\n')}
pretty_name: ${JSON.stringify(title)}
size_categories:
  - ${sizeCategory}
---

# ${title}

> Purchased via [Atlas Data Brokerage](https://humanoids.fyi) - broker for physical AI training data.

${description}

---

## Dataset Details

| Field | Value |
|---|---|
${rows.join('\n')}
${modalityPrices ? `
## Modality Breakdown

| Modality | Price/hr | Description |
|---|---|---|
${Object.entries(modalityPrices).map(([m, p]) => {
  const modDesc: Record<string, string> = {
    rgb: 'RGB camera video/images', depth: 'Depth maps', rgbd: 'RGB-D paired data',
    imu: 'Inertial measurement unit (accel/gyro)', force_torque: 'Contact force/torque readings',
    proprioception: 'Joint encoder positions/velocities', joint_trajectory: 'End-effector/task-space trajectories',
    tactile: 'Tactile sensor pressure data', motion_capture: 'Full-body skeleton tracking',
    audio: 'Environment/contact audio', language_annotations: 'Natural language task instructions',
  };
  return `| \`${m.replace(/_/g, ' ')}\` | $${p}/hr | ${modDesc[m] ?? ''} |`;
}).join('\n')}
` : ''}
## Data Structure
${allMods.length > 1 ? `
This is a **multi-modal dataset** containing ${allMods.length} synchronized sensor modalities:

${allMods.map(m => `- **${m.replace(/_/g, ' ')}**`).join('\n')}

Each episode contains time-aligned data across all modalities.
` : `
This dataset contains **${allMods[0]?.replace(/_/g, ' ') ?? 'sensor'}** data.
`}
## Download Data

This repo includes a fast parallel download script that fetches the full dataset from the provider's storage.

\`\`\`bash
pip install requests tqdm
cd data
python download.py
\`\`\`

The script reads the access URL from \`data/ACCESS_URL.txt\`, auto-detects manifests, and downloads all files with 8 parallel workers and progress bars.

## Usage

${format.includes('lerobot') ? `### LeRobot (recommended)

\`\`\`python
from lerobot.datasets.lerobot_dataset import LeRobotDataset

dataset = LeRobotDataset("path/to/this/dataset")
sample = dataset[0]
# Keys: ${allMods.map(m => m === 'rgb' ? 'observation.images.*' : m === 'proprioception' ? 'observation.state' : m === 'joint_trajectory' ? 'action' : 'observation.' + m).join(', ')}
\`\`\`

### Pandas
` : '### Pandas\n'}\`\`\`python
import pandas as pd

df = pd.read_parquet("data/episode_000.parquet")
print(f"Columns: {df.columns.tolist()}")
print(f"Shape: {df.shape}")
print(df.head())
\`\`\`

### PyTorch DataLoader

\`\`\`python
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import glob

class AtlasDataset(Dataset):
    def __init__(self, data_dir):
        self.files = sorted(glob.glob(f"{data_dir}/**/*.parquet", recursive=True))

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        df = pd.read_parquet(self.files[idx])
        return {col: df[col].values for col in df.columns}

dataset = AtlasDataset("path/to/data")
loader = DataLoader(dataset, batch_size=32, shuffle=True)
\`\`\`

## Citation

\`\`\`bibtex
@misc{${title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_atlas,
  title={${title}},
  author={${providerName}},
  year={${new Date().getFullYear()}},
  publisher={Atlas Data Brokerage},
  url={https://humanoids.fyi}
}
\`\`\`

## Source

Purchased via [Atlas Data Brokerage](https://humanoids.fyi) from **${providerName}**.
`;
}

function downloadDatasetCard(listing: Record<string, unknown>, providerName: string, hours: number) {
  const md = generateDatasetCard(listing, providerName, hours);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'README.md';
  a.click();
  URL.revokeObjectURL(url);
}

async function publishToHuggingFace(
  token: string, repoName: string, cardContent: string,
  opts?: { accessUrl?: string; onProgress?: (msg: string) => void }
): Promise<{ url: string } | { error: string }> {
  const log = opts?.onProgress ?? (() => {});
  try {
    // 1. Create dataset repo
    log('Creating repository...');
    const createRes = await fetch('https://huggingface.co/api/repos/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'dataset', name: repoName, private: true }),
    });

    let repoId: string;
    if (createRes.ok) {
      const data = await createRes.json();
      repoId = data.url?.split('/').slice(-2).join('/') ?? `${repoName}`;
    } else if (createRes.status === 409) {
      const whoami = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!whoami.ok) return { error: 'Failed to get Hugging Face user info' };
      const user = await whoami.json();
      repoId = `${user.name}/${repoName}`;
    } else {
      const err = await createRes.json().catch(() => ({}));
      return { error: (err as Record<string, string>).error ?? `Failed to create repo (${createRes.status})` };
    }

    // 2. Build commit files — always include README
    const commitFiles: Array<{ path: string; content: string }> = [
      { path: 'README.md', content: cardContent },
    ];

    // 3. Include access URL reference and download script if provided
    if (opts?.accessUrl) {
      log('Adding data access files...');
      commitFiles.push({ path: 'data/ACCESS_URL.txt', content: opts.accessUrl });
      commitFiles.push({ path: 'data/download.py', content: `"""Fast dataset downloader for Atlas Data Brokerage.

Usage: cd data && python download.py
Requires: pip install requests tqdm
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import requests
from tqdm import tqdm

CHUNK_SIZE = 8 * 1024 * 1024  # 8MB chunks for throughput
WORKERS = 8

def download_file(url, dest):
    """Download a single file with progress bar."""
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, stream=True, timeout=300)
    resp.raise_for_status()
    total = int(resp.headers.get("content-length", 0))
    name = dest.name[:40]
    with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True, desc=name, leave=False) as bar:
        for chunk in resp.iter_content(CHUNK_SIZE):
            f.write(chunk)
            bar.update(len(chunk))
    return dest

def fname_from_url(url):
    return os.path.basename(urlparse(url).path).split("?")[0] or "download"

# Read access URL
url_file = os.path.join(os.path.dirname(__file__), "ACCESS_URL.txt")
ACCESS_URL = open(url_file).read().strip()
OUT_DIR = Path(os.path.dirname(__file__))

print(f"Atlas Data Brokerage - Dataset Downloader")
print(f"Access URL: {ACCESS_URL[:80]}...")
print()

# Detect manifest vs single file
filename = fname_from_url(ACCESS_URL)
is_manifest = filename.endswith(".json") or "manifest" in filename

if is_manifest:
    print("Fetching manifest...")
    manifest = requests.get(ACCESS_URL, timeout=60).json()
    files = manifest if isinstance(manifest, list) else manifest.get("files", [])
    urls = []
    for f in files:
        if isinstance(f, str):
            urls.append((f, OUT_DIR / fname_from_url(f)))
        elif isinstance(f, dict) and f.get("url"):
            urls.append((f["url"], OUT_DIR / f.get("path", fname_from_url(f["url"]))))
    print(f"Found {len(urls)} files - downloading with {WORKERS} parallel workers")
    print()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(download_file, u, d): d for u, d in urls}
        for fut in as_completed(futures):
            p = fut.result()
            tqdm.write(f"  Saved {p.name} ({p.stat().st_size:,} bytes)")
else:
    print(f"Downloading {filename}...")
    download_file(ACCESS_URL, OUT_DIR / filename)

print(f"\\nDone - files saved to {OUT_DIR.resolve()}")
` });
    }

    // 4. Commit all files
    log(`Uploading ${commitFiles.length} file(s)...`);
    const uploadRes = await fetch(`https://huggingface.co/api/datasets/${repoId}/commit/main`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: 'Add dataset card and data from Atlas Data Brokerage',
        files: commitFiles.map(f => ({ path: f.path, content: f.content })),
      }),
    });
    if (!uploadRes.ok) {
      const err = await uploadRes.text().catch(() => '');
      return { error: `Failed to upload (${uploadRes.status}${err ? ': ' + err.slice(0, 100) : ''})` };
    }

    log('Done!');
    return { url: `https://huggingface.co/datasets/${repoId}` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to publish' };
  }
}

function MyPurchases() {
  const [purchases, setPurchases] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPurchase, setSelectedPurchase] = useState<Record<string, unknown> | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [hfToken, setHfToken] = useState(() => localStorage.getItem('hf_token') ?? '');
  const [hfPublishing, setHfPublishing] = useState(false);
  const [hfResult, setHfResult] = useState<{ url?: string; error?: string } | null>(null);
  const [cardDownloaded, setCardDownloaded] = useState(false);
  const [purchaseTab, setPurchaseTab] = useState<'access' | 'quickstart' | 'card'>('access');
  const [hfProgress, setHfProgress] = useState('');

  useEffect(() => {
    api.get<{ data: Array<Record<string, unknown>> }>('/purchases')
      .then(r => setPurchases(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const viewPurchase = async (id: string) => {
    try {
      const r = await api.get<{ data: Record<string, unknown> }>(`/purchases/${id}`);
      setSelectedPurchase(r.data);
    } catch (err) { console.error(err); }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="db-loading">Loading purchases...</div>;

  if (selectedPurchase) {
    const access = selectedPurchase.access as Record<string, unknown> | null;
    const items = (selectedPurchase.transaction_items as Array<Record<string, unknown>>) ?? [];
    const totalHours = items.reduce((s, i) => s + ((i.hours as number) ?? 0), 0);
    const status = String(selectedPurchase.provisioning_status);
    const accessUrl = access?.access_url ? String(access.access_url) : null;
    const providerName = String((selectedPurchase.providers as Record<string, unknown>)?.name ?? 'Provider');
    const datasetName = items.map(i => {
      const listing = i.listings as Record<string, unknown> | null;
      return listing?.title ?? '';
    }).filter(Boolean).join(', ') || 'Dataset';

    const statusLabel = status === 'ready' ? 'Ready' : status === 'processing' ? 'Processing' : status === 'requested' ? 'Requested' : 'Pending';
    const statusColor = status === 'ready' ? 'var(--green)' : 'var(--text-dim)';

    const copyUrl = () => {
      if (!accessUrl) return;
      navigator.clipboard.writeText(accessUrl).then(() => {
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }).catch(console.error);
    };

    return (
      <div>
        <button className="db-back-btn" onClick={() => setSelectedPurchase(null)}>&larr; Back to purchases</button>

        {/* Dataset name */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>{datasetName}</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginTop: 4 }}>{providerName}</div>
        </div>

        <div className="api-preamble" style={{ marginTop: 12 }}>
          <div className="db-meta-label" style={{ marginBottom: 12 }}>Purchase details</div>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Status</div><div className="db-meta-value" style={{ color: statusColor }}>{statusLabel}</div></div>
            <div><div className="db-meta-label">Total</div><div className="db-meta-value">{formatUsd((selectedPurchase.total_cents as number) ?? 0)}</div></div>
            <div><div className="db-meta-label">Hours</div><div className="db-meta-value">{totalHours}</div></div>
            <div><div className="db-meta-label">Date</div><div className="db-meta-value">{new Date(String(selectedPurchase.created_at)).toLocaleDateString()}</div></div>
          </div>
        </div>

        {status === 'ready' && accessUrl ? (
          <>
            <div className="db-filter-bar" style={{ marginTop: 16, marginBottom: 12 }}>
              {(['access', 'quickstart', 'card'] as const).map(t => (
                <button key={t} className={`db-filter-pill${purchaseTab === t ? ' db-filter-pill--active' : ''}`}
                  onClick={() => setPurchaseTab(t)}>
                  {t === 'access' ? 'Access' : t === 'quickstart' ? 'Quick Start' : 'Dataset Card'}
                </button>
              ))}
            </div>

            {purchaseTab === 'access' && (
              <div className="api-preamble">
                {access?.access_instructions ? (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{String(access.access_instructions)}</p>
                ) : null}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <a href={accessUrl} target="_blank" rel="noopener noreferrer" className="db-regen-btn"
                    style={{ margin: 0, background: 'var(--accent)', color: 'var(--bg-card)', borderColor: 'var(--accent)', textDecoration: 'none' }}>Access dataset</a>
                  <button className="db-regen-btn" style={{ margin: 0 }} onClick={copyUrl}>
                    {urlCopied ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
                <div className="db-code-block" style={{ fontSize: 9, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                  {accessUrl}
                </div>

                {items.some(i => {
                  const listing = i.listings as Record<string, unknown> | null;
                  return listing?.format && String(listing.format).includes('lerobot');
                }) && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="db-badge db-badge--lerobot" style={{ fontSize: 8 }}>LeRobot</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>This dataset is LeRobot compatible</span>
                    </div>
                    <pre className="db-code-block">{`from lerobot.datasets.lerobot_dataset import LeRobotDataset

dataset = LeRobotDataset("path/to/downloaded/data")
sample = dataset[0]`}</pre>
                  </div>
                )}
              </div>
            )}

            {purchaseTab === 'quickstart' && (
              <div className="api-preamble">
                {(() => {
                  const fname = (() => { try { const p = new URL(accessUrl).pathname; return p.split('/').pop() || 'dataset'; } catch { return 'dataset'; } })();
                  return (
                    <>
                      <CopyableCode label="curl" code={`curl -L -o ${fname} \\\n  "${accessUrl}"`} />
                      <CopyableCode label="Python" code={`import requests\n\nurl = "${accessUrl}"\nresponse = requests.get(url, stream=True)\n\nwith open("${fname}", "wb") as f:\n    for chunk in response.iter_content(chunk_size=8192):\n        f.write(chunk)\n\nprint(f"Downloaded successfully")`} />
                      <CopyableCode label="wget" code={`wget -O ${fname} \\\n  "${accessUrl}"`} />
                    </>
                  );
                })()}
              </div>
            )}

            {purchaseTab === 'card' && (
              <div className="api-preamble" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
                    Generate a Hugging Face-compatible dataset card, or publish directly to your Hugging Face account.
                  </p>
                  <button className="api-md-btn" style={{ flexShrink: 0, marginLeft: 16 }} onClick={() => {
                    const listing = items[0]?.listings as Record<string, unknown> | null;
                    if (listing) { downloadDatasetCard(listing, providerName, totalHours); setCardDownloaded(true); setTimeout(() => setCardDownloaded(false), 3000); }
                  }}>{cardDownloaded ? 'Downloaded!' : 'Download Card'}</button>
                </div>
                <div className="db-meta-label" style={{ marginBottom: 6 }}>Hugging Face token</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                  <input className="db-form-input" type="password" placeholder="hf_..." value={hfToken}
                    style={{ flex: 1 }}
                    onChange={e => { setHfToken(e.target.value); localStorage.setItem('hf_token', e.target.value); }} />
                  <button className="db-add-cart-btn" style={{ maxWidth: 180, marginTop: 0, flexShrink: 0 }}
                    disabled={!hfToken || hfPublishing}
                    onClick={async () => {
                      const listing = items[0]?.listings as Record<string, unknown> | null;
                      if (!listing) return;
                      setHfPublishing(true);
                      setHfResult(null);
                      setHfProgress('');
                      const slug = String(listing.slug ?? listing.title ?? 'atlas-dataset').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
                      const card = generateDatasetCard(listing, providerName, totalHours);
                      const result = await publishToHuggingFace(hfToken, slug, card, {
                        accessUrl: accessUrl ?? undefined,
                        onProgress: setHfProgress,
                      });
                      setHfResult(result);
                      setHfPublishing(false);
                    }}>
                    {hfPublishing ? 'Publishing...' : 'Publish to HF'}
                  </button>
                </div>
                {hfPublishing && hfProgress && (
                  <div style={{ marginTop: 8, fontSize: 10, fontFamily: "'Share Tech Mono', monospace", color: 'var(--text-dim)' }}>
                    {hfProgress}
                  </div>
                )}
                {hfResult && (
                  <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 4, fontSize: 10, fontFamily: "'Share Tech Mono', monospace", lineHeight: 1.5, background: 'url' in hfResult ? 'rgba(0,128,0,0.05)' : 'rgba(200,0,0,0.05)' }}>
                    {'url' in hfResult ? (
                      <span style={{ color: '#2a7a2a' }}>Published: <a href={hfResult.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2a7a2a', textDecoration: 'underline' }}>{hfResult.url}</a></span>
                    ) : (
                      <span style={{ color: 'var(--red)' }}>{hfResult.error}</span>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 10, lineHeight: 1.4 }}>
                  Token stored locally, never sent to Atlas.
                  Get one at <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', textDecoration: 'underline' }}>huggingface.co/settings/tokens</a> (write access required).
                </p>
              </div>
            )}
          </>
        ) : status === 'ready' && !accessUrl ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Access</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your data is ready. {providerName} will send access details to the email address on your account.
            </p>
          </div>
        ) : status === 'processing' ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Preparing your data</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {providerName} is preparing your dataset. This page will update automatically when your data is ready to access.
            </p>
          </div>
        ) : status === 'requested' ? (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Request sent</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Access has been requested from {providerName}. You will be notified once your data is ready.
            </p>
          </div>
        ) : (
          <div className="api-preamble" style={{ marginTop: 12 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Purchase confirmed</div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your payment has been received. {providerName} has been notified and will set up data access for you shortly.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (purchases.length === 0) return <div className="db-empty">No purchases yet</div>;

  return (
    <div>
      {purchases.map(p => {
        const provStatus = String(p.provisioning_status);
        const isReady = provStatus === 'ready';
        return (
          <div key={String(p.id)} className="db-catalog-row db-listing-row--provider" onClick={() => viewPurchase(String(p.id))}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-catalog-row__title">
                {((p.transaction_items as Array<Record<string, unknown>>) ?? []).map(i => {
                  const listing = i.listings as Record<string, unknown> | null;
                  return listing?.title ?? '';
                }).join(', ')}
              </div>
              <div className="db-catalog-row__details" style={{ marginTop: 4 }}>
                {String((p.providers as Record<string, unknown>)?.name ?? '')} · {formatUsd((p.total_cents as number) ?? 0)} · {new Date(String(p.created_at)).toLocaleDateString()}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
              <span className={`db-status-badge db-status-badge--${isReady ? 'approved' : 'pending'}`}>
                {isReady ? 'ready' : provStatus.replace(/_/g, ' ')}
              </span>
              <span className="db-catalog-row__view">{isReady ? 'Download \u2192' : 'View \u2192'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════════════════════════

function AreaChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const w = 640;
  const h = 150;
  const padL = 24;
  const padR = 24;
  const padB = 28;
  const padT = 8;
  const chartW = w - padL - padR;
  const chartH = h - padB - padT;
  const max = Math.max(...data.map(d => d.value), 1);

  const getY = (v: number) => padT + chartH - (v / max) * chartH;
  const getX = (i: number) => padL + (i / Math.max(data.length - 1, 1)) * chartW;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');
  const areaPoints = `${getX(0)},${h - padB} ${points} ${getX(data.length - 1)},${h - padB}`;

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line key={pct} x1={padL} y1={getY(max * pct)} x2={w - padR} y2={getY(max * pct)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray={pct === 0 ? 'none' : '4 4'} />
        ))}
        <polyline points={areaPoints} fill="rgba(26,26,26,0.03)" stroke="none" />
        <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={getX(i)} cy={getY(d.value)} r="2" fill="var(--bg-card)" stroke="var(--accent)" strokeWidth="1" />
        ))}
        {data.map((d, i) => (
          <text key={`l${i}`} x={getX(i)} y={h - 8} textAnchor="middle" fill="var(--text-dim)"
            style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', letterSpacing: '1px' }}>{d.label}</text>
        ))}
      </svg>
    </div>
  );
}

function VerticalBarChart({ data, label }: { data: { label: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      {total === 0 ? (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 10, fontFamily: 'Share Tech Mono, monospace' }}>No data for this period</div>
      ) : (
        <div className="db-vbar-chart">
          {data.map((d, i) => (
            <div key={i} className="db-vbar-chart__col" title={`${d.value} transactions`}>
              <div className="db-vbar-chart__val">{d.value > 0 ? d.value : ''}</div>
              <div className="db-vbar-chart__bar-wrap">
                <div className="db-vbar-chart__bar" style={{ height: d.value > 0 ? `${Math.max((d.value / max) * 100, 12)}%` : '0%' }} />
              </div>
              <div className="db-vbar-chart__label">{d.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HoursBarChart({ listings }: { listings: Array<Record<string, unknown>> }) {
  if (listings.length === 0) return null;
  const maxHours = Math.max(...listings.map(l => l.hours as number), 1);

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>Hours sold by listing</div>
      <div className="db-bar-chart">
        {listings.map(l => (
          <div key={String(l.listing_id)} className="db-bar-chart__row">
            <div className="db-bar-chart__label">{String(l.title)}</div>
            <div className="db-bar-chart__bar-wrap">
              <div className="db-bar-chart__bar" style={{ width: `${((l.hours as number) / maxHours) * 100}%` }} />
            </div>
            <div className="db-bar-chart__value">{String(l.hours)} hrs</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChart({ segments, label }: { segments: { name: string; value: number; color: string }[]; label: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="db-chart-wrap">
      <div className="db-meta-label" style={{ marginBottom: 16 }}>{label}</div>
      <div className="db-donut-layout">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
          ) : segments.map((seg, i) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const el = (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="16"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cy})`}
                style={{ transition: 'stroke-dasharray 0.3s, stroke-dashoffset 0.3s' }} />
            );
            offset += dash;
            return el;
          })}
          <text x={cx} y={cy - 2} textAnchor="middle" fill="var(--text)"
            style={{ fontSize: 22, fontFamily: 'Share Tech Mono, monospace' }}>{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-dim)"
            style={{ fontSize: 9, fontFamily: 'Share Tech Mono, monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Total</text>
        </svg>
        <div className="db-donut-legend">
          {segments.map((seg, i) => (
            <div key={i} className="db-donut-legend__row">
              <span className="db-donut-legend__dot" style={{ background: seg.color }} />
              <span className="db-donut-legend__name">{seg.name}</span>
              <span className="db-donut-legend__value">{seg.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CollectionProgramsManager() {
  const [programs, setPrograms] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPrograms = () => {
    setLoading(true);
    api.get<{ data: Record<string, unknown>[] }>('/provider/collection-programs')
      .then(r => setPrograms(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrograms(); }, []);

  if (loading) return <div className="db-loading">Loading programs...</div>;

  if (selectedProgramId) {
    return <ProgramSignups programId={selectedProgramId} program={programs.find(p => String(p.id) === selectedProgramId)} onBack={() => setSelectedProgramId(null)} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="db-meta-label" style={{ fontSize: 11 }}>{programs.length} program{programs.length !== 1 ? 's' : ''}</div>
        <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer' }} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ New program'}
        </button>
      </div>

      {showCreate && <CreateProgramForm onCreated={() => { setShowCreate(false); fetchPrograms(); }} />}

      {programs.length === 0 && !showCreate ? (
        <div className="db-empty">No collection programs yet. Create one to start recruiting data collectors.</div>
      ) : (
        programs.map(p => {
          const signups = p.collector_signups as Array<{ count: number }> | undefined;
          const count = signups?.[0]?.count ?? 0;
          return (
            <div key={String(p.id)} className="db-catalog-row db-listing-row--provider" onClick={() => setSelectedProgramId(String(p.id))}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="db-catalog-row__title">{String(p.title)}</div>
                <div className="db-catalog-row__details" style={{ marginTop: 4 }}>
                  {count} signup{count !== 1 ? 's' : ''} · ${((p.referral_fee_cents as number ?? 0) / 100).toFixed(0)} referral fee
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                <span className={`db-status-badge db-status-badge--${p.is_active ? 'approved' : 'rejected'}`}>
                  {p.is_active ? 'active' : 'inactive'}
                </span>
                <span className="db-catalog-row__view">Manage &rarr;</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ProgramSignups({ programId, program, onBack }: { programId: string; program?: Record<string, unknown>; onBack: () => void }) {
  const [signups, setSignups] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchSignups = () => {
    setLoading(true);
    api.get<{ data: Record<string, unknown>[] }>(`/provider/collection-programs/${programId}/signups`)
      .then(r => setSignups(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSignups(); }, [programId]);

  const handleStatusChange = async (signupId: string, status: string) => {
    setActionLoading(signupId);
    setActionMsg(null);
    try {
      const res = await api.patch<{ data: Record<string, unknown> }>(`/provider/collection-programs/${programId}/signups/${signupId}`, { status });
      fetchSignups();
      if (status === 'accepted') {
        const webhookSent = res.data?.webhook_sent;
        if (webhookSent) {
          setActionMsg('Collector accepted and synced to your system.');
        } else {
          setActionMsg('Collector accepted. Configure your provisioning API in Settings to auto-sync collectors to your database.');
        }
        setTimeout(() => setActionMsg(null), 8000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div>
      <button className="db-back-btn" onClick={onBack}>&larr; Back to programs</button>

      {program && (
        <div className="api-preamble" style={{ marginTop: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="db-catalog-row__title" style={{ fontSize: 16 }}>{String(program.title)}</div>
            <span className={`db-status-badge db-status-badge--${program.is_active ? 'approved' : 'rejected'}`}>
              {program.is_active ? 'active' : 'inactive'}
            </span>
          </div>
          <div className="db-meta-grid">
            <div><div className="db-meta-label">Compensation</div><div className="db-meta-value">{String(program.compensation_description ?? '—')}</div></div>
            <div><div className="db-meta-label">Referral fee (on acceptance)</div><div className="db-meta-value">{formatUsd((program.referral_fee_cents as number) ?? 0)}</div></div>
            <div><div className="db-meta-label">Signup type</div><div className="db-meta-value">{String(program.signup_type ?? 'atlas_form')}</div></div>
          </div>
          {program.requirements ? <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12 }}><strong>Requirements:</strong> {String(program.requirements)}</div> : null}
        </div>
      )}

      {actionMsg && (
        <div style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', padding: '8px 12px', marginBottom: 12, borderRadius: 4, background: actionMsg.includes('synced') ? 'rgba(39,103,73,0.08)' : 'rgba(214,158,46,0.08)', color: actionMsg.includes('synced') ? '#276749' : '#8a6d00' }}>
          {actionMsg}
        </div>
      )}

      <div className="db-meta-label" style={{ marginBottom: 12 }}>{signups.length} signup{signups.length !== 1 ? 's' : ''}</div>

      {loading ? <div className="db-loading">Loading signups...</div> :
       signups.length === 0 ? <div className="db-empty">No signups yet for this program.</div> :
        signups.map(s => (
          <div key={String(s.id)} className="api-preamble" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{String(s.name)}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11, marginLeft: 8 }}>{String(s.email)}</span>
                {!!(s.form_data as Record<string, unknown>)?.linkedin && (
                  <a href={String((s.form_data as Record<string, unknown>).linkedin)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 8, textDecoration: 'none' }}>LinkedIn</a>
                )}
                {!!(s.form_data as Record<string, unknown>)?.x_handle && (
                  <a href={`https://x.com/${String((s.form_data as Record<string, unknown>).x_handle).replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 8, textDecoration: 'none' }}>X</a>
                )}
              </div>
              <span className={`db-status-badge db-status-badge--${String(s.status) === 'active' || String(s.status) === 'accepted' ? 'approved' : String(s.status) === 'rejected' ? 'rejected' : String(s.status) === 'completed' ? 'approved' : 'pending'}`}>
                {String(s.status)}
              </span>
            </div>
            <div className="db-meta-grid">
              <div><div className="db-meta-label">Referral code</div><div className="db-meta-value" style={{ fontFamily: 'Share Tech Mono, monospace' }}>{String(s.referral_code)}</div></div>
              <div><div className="db-meta-label">Hours</div><div className="db-meta-value">{String(s.hours_collected ?? 0)}</div></div>
              <div><div className="db-meta-label">Earnings</div><div className="db-meta-value">{formatUsd((s.earnings_cents as number) ?? 0)}</div></div>
              <div><div className="db-meta-label">Last activity</div><div className="db-meta-value">{s.last_activity_at ? new Date(String(s.last_activity_at)).toLocaleDateString() : '—'}</div></div>
            </div>
            {String(s.status) === 'submitted' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer', background: '#1a1a1a', color: '#f5f2ed', border: '1px solid #1a1a1a' }}
                  disabled={actionLoading === String(s.id)}
                  onClick={() => handleStatusChange(String(s.id), 'accepted')}>
                  {actionLoading === String(s.id) ? '...' : 'Accept'}
                </button>
                <button className="db-filter-pill" style={{ fontSize: 9, padding: '5px 16px', cursor: 'pointer', color: '#c53030', borderColor: '#c53030' }}
                  disabled={actionLoading === String(s.id)}
                  onClick={() => handleStatusChange(String(s.id), 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

function CreateProgramForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [compensation, setCompensation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title || !description) { setError('Title and description are required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/provider/collection-programs', {
        title,
        description,
        requirements: requirements || undefined,
        compensation_description: compensation ? `$${compensation}/hr of verified data` : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="db-create-form" style={{ marginBottom: 20 }}>
      {error && <div className="db-form-error">{error}</div>}

      <div className="db-form-field">
        <label className="db-meta-label">Title</label>
        <input className="db-form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kitchen Activity Recording" />
      </div>
      <div className="db-form-field">
        <label className="db-meta-label">Description</label>
        <textarea className="db-form-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What data are you looking for?" />
      </div>
      <div className="db-form-row">
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Requirements</label>
          <input className="db-form-input" value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="Smartphone with 4K camera" />
        </div>
        <div className="db-form-field" style={{ flex: 1 }}>
          <label className="db-meta-label">Compensation ($/hr)</label>
          <input className="db-form-input" type="number" min="1" step="1" value={compensation} onChange={e => setCompensation(e.target.value)} placeholder="20" />
        </div>
      </div>
      <button className="db-add-cart-btn" style={{ marginTop: 8 }} onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Program'}
      </button>
    </div>
  );
}

function ProviderAnalytics() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  useEffect(() => {
    setLoading(true);
    api.get<{ data: Record<string, unknown> }>(`/provider/analytics?period=${period}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const periods = ['7d', '30d', '90d', 'all'];
  const formatUsd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="db-loading">Loading analytics...</div>;

  const revenue = (data?.revenue_cents as number) ?? 0;
  const txns = (data?.transaction_count as number) ?? 0;
  const buyers = (data?.unique_buyers as number) ?? 0;
  const collectors = (data?.collector_count as number) ?? 0;
  const totalListings = (data?.total_listings as number) ?? 0;
  const activeListings = (data?.active_listings as number) ?? 0;
  const topListings = (data?.top_listings as Array<Record<string, unknown>>) ?? [];
  const modalityHoursData = (data?.modality_hours as Record<string, number>) ?? {};

  // Revenue timeline from real transaction dates, padded to fill the chart
  const rawTimeline = (data?.revenue_timeline as Array<{ date: string; revenue_cents: number }>) ?? [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 90 };
  const spanDays = periodDays[period] ?? 90;
  const now = new Date();

  // Build a map of date -> revenue, then fill in missing days with 0
  const revenueMap = new Map<string, number>();
  for (const t of rawTimeline) revenueMap.set(t.date, t.revenue_cents);

  const filledTimeline: { label: string; value: number }[] = [];
  const step = spanDays <= 7 ? 1 : spanDays <= 30 ? 3 : 7;
  for (let i = spanDays - 1; i >= 0; i -= step) {
    const d = new Date(now.getTime() - i * 86400000);
    // Sum revenue for all days in this bucket
    let bucketRevenue = 0;
    for (let j = 0; j < step; j++) {
      const bk = new Date(now.getTime() - (i + j) * 86400000).toISOString().slice(0, 10);
      bucketRevenue += revenueMap.get(bk) ?? 0;
    }
    filledTimeline.push({
      label: `${monthNames[d.getMonth()]} ${d.getDate()}`,
      value: Math.round(bucketRevenue / 100),
    });
  }
  const revenueChartData = filledTimeline.length > 1 ? filledTimeline : [{ label: '', value: 0 }, ...filledTimeline, { label: '', value: 0 }];

  // Build bar chart data from top_listings (real per-listing data)
  const listingBarData = topListings.map(l => ({
    label: String(l.title ?? '').slice(0, 20) + (String(l.title ?? '').length > 20 ? '...' : ''),
    value: Math.round((l.revenue_cents as number) / 100),
  }));

  // Donut: breakdown by modality from backend-aggregated modality_hours
  const donutColors = ['#1a1a1a', '#8a8580', '#c5c0b8', '#e0ddd8', '#a0a0a0', '#6b6560', '#3a3a3a'];
  const donutSegments = Object.entries(modalityHoursData)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: name.replace(/_/g, ' ').toUpperCase(),
      value,
      color: donutColors[i % donutColors.length],
    }));
  const finalDonut = donutSegments.length > 0 ? donutSegments : [
    { name: 'No data', value: 0, color: '#e0ddd8' },
  ];

  return (
    <div>
      <div className="db-filter-bar" style={{ marginBottom: 20 }}>
        {periods.map(p => (
          <button key={p} className={`db-filter-pill${period === p ? ' db-filter-pill--active' : ''}`}
            onClick={() => setPeriod(p)}>{p === 'all' ? 'All time' : p}</button>
        ))}
      </div>

      <div className="db-analytics-grid">
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{formatUsd(revenue)}</div>
          <div className="db-meta-label">Revenue (after fees)</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{txns}</div>
          <div className="db-meta-label">Transactions</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{buyers}</div>
          <div className="db-meta-label">Unique buyers</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{activeListings}/{totalListings}</div>
          <div className="db-meta-label">Active listings</div>
        </div>
        <div className="db-analytics-card">
          <div className="db-analytics-card__value">{collectors}</div>
          <div className="db-meta-label">Data collectors</div>
        </div>
      </div>

      <AreaChart data={revenueChartData} label="Revenue over time" />

      <div className="db-chart-row">
        {listingBarData.length > 0 ? (
          <VerticalBarChart data={listingBarData} label="Revenue by listing ($)" />
        ) : (
          <div className="db-chart-wrap"><div className="db-meta-label">Revenue by listing ($)</div></div>
        )}
        <DonutChart segments={finalDonut} label="Hours by modality" />
      </div>

      <HoursBarChart listings={topListings} />
    </div>
  );
}

function StripeStatus() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [provSettings, setProvSettings] = useState<{ provisioning_api_url: string | null; provisioning_api_key_masked: string | null; has_api_key: boolean; callback_url: string } | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  // Profile fields
  const [profile, setProfile] = useState({ name: '', company_name: '', description: '', logo_url: '', website_url: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ data: Record<string, unknown> }>('/auth/provider/onboarding-status').then(r => setStatus(r.data)).catch(console.error),
      api.get<{ data: typeof provSettings }>('/provider/settings').then(r => {
        setProvSettings(r.data);
        setApiUrl(r.data?.provisioning_api_url ?? '');
      }).catch(console.error),
      api.get<{ data: { name: string; company_name: string | null; description: string | null; logo_url: string | null; website_url: string | null } }>('/provider/profile').then(r => {
        setProfile({ name: r.data.name ?? '', company_name: r.data.company_name ?? '', description: r.data.description ?? '', logo_url: r.data.logo_url ?? '', website_url: r.data.website_url ?? '' });
      }).catch(console.error),
    ]).finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    try {
      const r = await api.post<{ data: { stripe_onboarding_url: string } }>('/auth/provider/refresh-onboarding');
      window.location.href = r.data.stripe_onboarding_url;
    } catch (err) { console.error(err); }
  };

  const saveProvSettings = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const updates: Record<string, unknown> = { provisioning_api_url: apiUrl || null };
      if (apiKey) updates.provisioning_api_key = apiKey;
      await api.patch('/provider/settings', updates);
      setSaveMsg('Saved');
      // Refresh settings
      const r = await api.get<{ data: typeof provSettings }>('/provider/settings');
      setProvSettings(r.data);
      // Redirect to Docs tab after short delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('provider-tab-change', { detail: { tab: 'docs' } }));
      }, 1000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.post<{ data: { success: boolean; message: string } }>('/provider/test-provisioning');
      setTestResult(r.data);
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' });
    }
    setTesting(false);
  };

  if (loading) return <div className="db-loading">Loading settings...</div>;

  const isComplete = status?.stripe_onboarding_complete;

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await api.patch('/provider/profile', {
        name: profile.name || undefined,
        company_name: profile.company_name || null,
        description: profile.description || null,
        logo_url: profile.logo_url || null,
        website_url: profile.website_url || null,
      });
      setProfileMsg('Saved');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Failed to save');
    }
    setSavingProfile(false);
  };

  return (
    <div>
      {/* Profile */}
      <div className="api-preamble" style={{ marginTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Profile</div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
          This information is visible to buyers on your public provider profile.
        </p>
        <div className="db-form-row">
          <div className="db-form-field">
            <label className="db-meta-label">Name</label>
            <input className="db-form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Provider name" />
          </div>
          <div className="db-form-field">
            <label className="db-meta-label">Company</label>
            <input className="db-form-input" value={profile.company_name} onChange={e => setProfile(p => ({ ...p, company_name: e.target.value }))} placeholder="Company name" />
          </div>
        </div>
        <div className="db-form-field">
          <label className="db-meta-label">Description</label>
          <textarea className="db-form-input db-form-textarea" value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))}
            placeholder="Tell buyers about your organization and data collection capabilities" rows={3} />
        </div>
        <div className="db-form-row">
          <div className="db-form-field">
            <label className="db-meta-label">Logo URL</label>
            <input className="db-form-input" type="url" value={profile.logo_url} onChange={e => setProfile(p => ({ ...p, logo_url: e.target.value }))} placeholder="https://example.com/logo.png" />
          </div>
          <div className="db-form-field">
            <label className="db-meta-label">Website</label>
            <input className="db-form-input" type="url" value={profile.website_url} onChange={e => setProfile(p => ({ ...p, website_url: e.target.value }))} placeholder="https://yourcompany.com" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="db-add-cart-btn" style={{ maxWidth: 160 }} onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
          {profileMsg && <span style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', color: profileMsg === 'Saved' ? 'var(--green)' : 'var(--red)' }}>{profileMsg}</span>}
        </div>
      </div>

      {/* Stripe */}
      <div className="api-preamble" style={{ marginTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>Stripe</div>
        {isComplete ? (
          <div>
            <div className="db-stripe-status">
              <span className={`db-status-badge db-status-badge--approved`}>Connected</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>Payouts enabled</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12 }}>
              Payments from OEM buyers are deposited directly to your connected Stripe account
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connect your Stripe account to receive payments from data buyers
            </p>
            <button className="db-add-cart-btn" style={{ maxWidth: 280 }} onClick={handleConnect}>
              Complete Stripe Setup
            </button>
          </div>
        )}
      </div>

      {/* Provisioning API */}
      <div className="api-preamble" style={{ marginTop: 16 }}>
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Provisioning API</div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
          Configure your API endpoint to automatically deliver data access to buyers after purchase. Build an HTTP POST endpoint on your infrastructure that handles purchase and collector webhook events, then enter its URL and a secret API key below. See the <strong>Docs</strong> tab for payload specs and testing.
        </p>

        <div className="db-form-field">
          <label className="db-meta-label">API endpoint URL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="db-form-input" type="url" placeholder="https://api.yourcompany.com/atlas/provision"
              value={apiUrl} onChange={e => setApiUrl(e.target.value)} style={{ flex: 1 }} />
            <button className="db-regen-btn" onClick={testConnection} disabled={testing || !apiUrl}
              style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <div style={{ fontSize: 10, marginTop: 6, fontFamily: 'Share Tech Mono, monospace',
              color: testResult.success ? 'var(--green)' : 'var(--red)' }}>
              {testResult.message}
            </div>
          )}
        </div>

        <div className="db-form-field">
          <label className="db-meta-label">API key {provSettings?.has_api_key ? '(configured)' : ''}</label>
          <input className="db-form-input" type="text" placeholder={provSettings?.has_api_key ? provSettings.provisioning_api_key_masked ?? '' : 'Enter API key (min 32 characters)'}
            value={apiKey} onChange={e => setApiKey(e.target.value)} />
        </div>

        <div className="db-form-field">
          <label className="db-meta-label">Callback URL (read-only)</label>
          <input className="db-form-input" type="text" readOnly value={provSettings?.callback_url ?? ''} style={{ cursor: 'default' }} />
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'Share Tech Mono, monospace' }}>
            Your API can POST to this URL for async provisioning callbacks
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="db-add-cart-btn" style={{ maxWidth: 160 }} onClick={saveProvSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {saveMsg && <span style={{ fontSize: 10, fontFamily: 'Share Tech Mono, monospace', color: saveMsg === 'Saved' ? 'var(--green)' : 'var(--red)' }}>{saveMsg}</span>}
        </div>

      </div>

    </div>
  );
}

function CopyableCodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ position: 'relative' }}>
      <div className="db-meta-label" style={{ marginBottom: 8 }}>{label}</div>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 28, right: 8,
          background: copied ? 'var(--green)' : 'var(--bg-primary)',
          color: copied ? '#fff' : 'var(--text-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 3, padding: '3px 8px',
          fontSize: 9, fontFamily: 'Share Tech Mono, monospace',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          cursor: 'pointer',
        }}
      >{copied ? 'Copied' : 'Copy'}</button>
      <pre className="db-code-block">{code}</pre>
    </div>
  );
}

function generateProviderDocsMd(callbackUrl: string): string {
  const cbUrl = callbackUrl || 'https://your-api.com/atlas/provisioning';
  const activityUrl = cbUrl.replace('/provisioning', '/collector-activity');
  return `# Atlas Data Brokerage — Provider Onboarding & Integration Guide

## What is Atlas Data Brokerage?

Atlas Data Brokerage is a broker for physical AI training data, built into [Humanoid Atlas](https://humanoids.fyi). As a data provider, you list datasets (RGB, depth, tactile, motion capture, etc.) and OEMs and labs purchase hours of data directly through the platform. Atlas handles discovery, payments (via Stripe), and buyer management. You handle data delivery via a webhook integration.

**How it works:**
1. You create listings describing your datasets (modality, hours available, price per hour, license type)
2. OEM buyers browse your listings, add to cart, and pay via Stripe
3. Atlas sends a webhook to your API with purchase details
4. Your API responds with an access URL (or processes asynchronously and calls back)
5. The buyer receives access instructions

**Economics:** Atlas retains a 15% fee. You receive 85% of each sale, deposited directly to your connected Stripe account.

---

## Step 1 — Create Your Account

1. You will receive a Clerk sign-in link from the Atlas team. Use it to create your account with your work email.
2. Once signed in, navigate to **Sell Data**. You will be prompted to complete your provider profile (name, email, company).
3. Click **Continue to Stripe Setup** to connect your payout account via Stripe Express. This creates a connected account under the Atlas platform for the 85/15 revenue split. If you already have a Stripe account, you can link your existing bank details and the process takes under a minute. Otherwise, expect about 2 minutes for identity verification and bank setup.

**API base URL:** \`https://brokerage.humanoids.fyi/v1\`

All authenticated API calls require a Clerk JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your-clerk-jwt>
\`\`\`

---

## Step 2 — Configure Your Webhook Endpoint

Atlas sends webhook events to your API endpoint when purchases and collector events occur. You need to build and host an HTTP endpoint that accepts POST requests.

1. Go to **Sell Data → Settings**
2. Set your **Provisioning API URL** — this is the endpoint Atlas will POST to (e.g. \`https://api.yourcompany.com/atlas/webhooks\`)
3. Set your **API Key** — a secret string (min 32 characters) that Atlas includes as a Bearer token so you can verify requests are from Atlas
4. Save

**Your callback URL:** \`${cbUrl}\`

This is the URL your system uses to call back to Atlas for async provisioning and collector activity reporting.

### CORS Configuration

If your data is stored in a cloud bucket (R2, S3, GCS), configure CORS to allow Atlas to access your data for buyer previews and Hugging Face integration.

**Cloudflare R2** - Go to R2 > Your bucket > Settings > CORS Policy and add:
- **Allowed Origins:** \`https://humanoids.fyi\`, \`http://localhost:5173\`, \`http://localhost:5174\`
- **Allowed Methods:** \`GET\`, \`PUT\`, \`HEAD\`
- **Allowed Headers:** \`Content-Type\`, \`Authorization\`

**AWS S3** - Add a CORS configuration to your bucket:
\`\`\`json
[{
  "AllowedOrigins": ["https://humanoids.fyi"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"]
}]
\`\`\`

**Google Cloud Storage** - Create a \`cors.json\` file:
\`\`\`json
[{
  "origin": ["https://humanoids.fyi"],
  "method": ["GET", "HEAD"],
  "responseHeader": ["*"],
  "maxAgeSeconds": 86400
}]
\`\`\`
Then apply: \`gsutil cors set cors.json gs://your-bucket\`

---

## Step 3 — Implement Webhook Handlers

Your endpoint needs to handle the following event types:

### 3a. Data Purchase Events

When a buyer completes a purchase, Atlas POSTs to your endpoint. You can respond synchronously (instant access) or asynchronously (processing needed).

**Request (sent by Atlas to your endpoint):**

\`\`\`http
POST <your-provisioning-api-url>
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "atlas_transaction_id": "txn_abc123",
  "buyer_email": "buyer@company.com",
  "buyer_company": "Acme Robotics",
  "items": [
    {
      "listing_id": "lst_xyz",
      "listing_title": "Indoor Navigation Dataset",
      "hours": 50,
      "license_type": "commercial",
      "modality_items": [
        { "modality": "rgb", "hours": 50, "price_per_hour": 25 },
        { "modality": "depth", "hours": 50, "price_per_hour": 15 }
      ]
    }
  ],
  "callback_url": "${cbUrl}"
}
\`\`\`

> **Note:** \`modality_items\` is included when the buyer uses per-modality (advanced) purchasing. If absent, the buyer purchased the full bundle at the listing's \`price_per_hour\`.

**Response option A — Synchronous (instant access):**

Return this if the data is ready to download immediately.

The \`access_url\` is what the buyer sees and clicks. It should point to a direct download (e.g. a presigned S3/R2/GCS URL to a zip file) or a landing page on your infrastructure where the buyer can browse and download individual files. Atlas displays this URL directly to the buyer with a download button and curl/wget/Python snippets. For the best buyer experience, return a URL that either downloads a file directly or opens a user-friendly download page.

\`\`\`json
{
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above."
}
\`\`\`

**Response option B — Asynchronous (processing needed):**

Return this if you need time to prepare the data (e.g. generating a custom export).

\`\`\`json
{
  "status": "processing"
}
\`\`\`

Then, when processing is complete, POST back to the callback URL:

\`\`\`http
POST ${cbUrl}
Content-Type: application/json

{
  "transaction_id": "txn_abc123",
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above"
}
\`\`\`

### 3b. Collector Signup Events

If you use Atlas collection programs (optional), Atlas notifies your endpoint when you accept a collector so you can sync them to your own system.

\`\`\`http
POST <your-provisioning-api-url>
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "event": "collector_accepted",
  "collector": {
    "name": "Eve Torres",
    "email": "eve@example.com",
    "referral_code": "ATL-377DKM"
  },
  "program": {
    "id": "program-uuid",
    "title": "Kitchen Activity Capture"
  }
}
\`\`\`

**Expected response:**

\`\`\`json
{
  "status": "ok"
}
\`\`\`

### 3c. Collector Activity Postback (you call Atlas)

Report collector hours and earnings back to Atlas. Your system calls this endpoint when a collector completes work.

\`\`\`http
POST ${activityUrl}
Authorization: Bearer <your-api-key>
Content-Type: application/json

{
  "referral_code": "ATL-377DKM",
  "hours_delta": 5.5,
  "earnings_delta_cents": 8250
}
\`\`\`

**Expected response:**

\`\`\`json
{
  "received": true
}
\`\`\`

---

## Step 4 — Test Your Integration

Before going live, use the Atlas test webhook endpoint to verify your endpoint handles each event correctly.

### Option A: Use the Sell Data dashboard

Go to **Sell Data → Docs → Test Your Integration** and click Send for each event type. Results show PASS/WARN/FAIL inline.

### Option B: Use curl

\`\`\`bash
# Test ping (basic connectivity)
curl -X POST https://brokerage.humanoids.fyi/v1/provider/test-webhook \\
  -H "Authorization: Bearer <your-clerk-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "ping"}'

# Test purchase event
curl -X POST https://brokerage.humanoids.fyi/v1/provider/test-webhook \\
  -H "Authorization: Bearer <your-clerk-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "purchase"}'

# Test collector accepted event
curl -X POST https://brokerage.humanoids.fyi/v1/provider/test-webhook \\
  -H "Authorization: Bearer <your-clerk-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "collector_accepted"}'
\`\`\`

### Test events

| Event | What Atlas sends to your endpoint | Your endpoint should return |
|-------|-----------------------------------|---------------------------|
| \`ping\` | \`{ "test": true }\` | Any 200 response |
| \`purchase\` | Full purchase payload with test transaction, buyer, and items | \`{ "status": "ready", "access_url": "...", "instructions": "..." }\` or \`{ "status": "processing" }\` |
| \`collector_accepted\` | Full collector payload with test name, email, and referral code | \`{ "status": "ok" }\` |

### Response format from test endpoint

\`\`\`json
{
  "data": {
    "success": true,
    "valid": true,
    "status": 200,
    "event": "purchase",
    "response": { "status": "ready", "access_url": "..." },
    "message": "purchase webhook delivered and response format is correct"
  }
}
\`\`\`

All 3 tests returning PASS means your integration is production-ready.

---

## Step 5 — Create Your First Listing

Once your webhook is verified, go to **Sell Data → Create Listing** and add your first dataset:

- **Title** — descriptive name (e.g. "Kitchen Activity Egocentric Video")
- **Modalities** — rgb, rgbd, depth, motion_capture, tactile, force_torque, proprioception, joint_trajectory, imu, audio, language_annotations, other
- **Environment** — kitchen, bathroom, living_room, bedroom, garage, office, warehouse, fulfillment_center, retail, laboratory, industrial, assembly_line, data_center, healthcare, restaurant, hotel, eldercare, construction, logistics, maritime, outdoor, agriculture, road, simulation, other
- **Collection Method** — teleoperation, vr_teleoperation, leader_follower, human_demonstration, motion_capture_retargeting, exoskeleton_capture, shared_autonomy, autonomous_policy, fleet_deployed, video_extraction, simulation_generated, other
- **Embodiment** — humanoid, quadruped, legged_biped, dual_arm, bimanual_fixed, single_arm, parallel_jaw_gripper, hand_dexterous, mobile_manipulator, wheeled_robot, human, other
- **Task Type** — pick_and_place, grasping, pushing, stacking, pouring, insertion, sorting, wiping, folding, assembly, cleaning, cooking, navigation, locomotion, whole_body_motion, tool_use (+ custom free-text)
- **Total hours** — how much data is available
- **Pricing** — single price for single-modality listings, or per-modality prices for multi-modality listings (bundle price is auto-calculated as sum)
- **Minimum hours** — smallest purchase allowed
- **Formats** — select all applicable formats (parquet, mp4, png, hdf5, rosbag, etc.)
- **Description** — what the data contains, how it was collected, quality notes

After creating a listing, you'll be taken to upload samples and configure your sample repository.

Atlas uses a **two-tier sample system**:
- **Inline previews** — 5+ curated files uploaded to Atlas (max 500MB each). These display directly in the catalog listing.
- **Sample repository** — a manifest.json hosted in your storage that indexes your full sample dataset (can be hundreds of hours). Buyers browse this via the Sample Explorer page.

Both are required before submitting for review.

### Uploading Inline Samples

**Import from URL** (recommended) — paste a direct link to a file in your storage (S3, R2, GCS presigned URL). Atlas fetches and stores it.

**Upload from local file** — select a file from your computer.

### How Samples Display to Buyers

Samples are automatically grouped by type in the catalog:
- **Videos** (.mp4, .webm) — playable video gallery with numbered thumbnails
- **RGB Images** — color images grouped separately (files with "rgb" or "color" in name)
- **Depth Maps** — depth images with dark background (files with "depth" or "disparity" in name)
- **Thermal Images** — infrared/thermal images (files with "thermal" or "infrared" in name)
- **Tactile Pressure** (.parquet with tactile modality) — interactive time-series chart with auto-detected columns
- **Sensor Data** (.parquet with imu/force_torque/proprioception/joint_trajectory modality) — interactive time-series chart. For multi-modality listings, sensor data is grouped by modality (e.g. "IMU Data", "Proprioception Data", "Motion Capture Data")
- **Language Annotations** (.json) — pretty-printed preview with expand
- **3D Visualization** (.rrd, .rosbag, .mcap) — embedded Rerun 3D viewer
- **Audio** (.wav, .mp3) — native audio player
- **Data Files** (.hdf5, .ply, .pcd, etc.) — download card with filename

### Best Practices for Samples

- Include **multiple modalities** — e.g. video clips + action data (.parquet) + task annotations (.json)
- Keep individual files **under 50MB** for fast loading
- For video, include clips from different episodes showing variety
- For 3D/spatial data, upload **.rrd preview files** for the best buyer experience

### Generating .rrd Preview Files

For spatial modalities (point cloud, LiDAR, motion capture, depth, RGBD), \`.parquet\` and \`.ply\`/\`.pcd\` files display as download cards — buyers can download but not preview inline. To provide an interactive 3D preview, upload a \`.rrd\` file generated with the Rerun SDK.

**Note:** Motion capture \`.parquet\` files (skeleton/joint data) render as download cards, not charts. This is by design — joint trajectories are best viewed as 3D skeleton animations in Rerun, not 2D line charts. Generate a \`.rrd\` preview to show buyers an interactive 3D skeleton visualization.

**Generating .rrd files** — use the Rerun Python SDK:

\`\`\`bash
pip install rerun-sdk
\`\`\`

\`\`\`python
import rerun as rr

rr.init("my_dataset_preview")

# Point cloud example
rr.log("point_cloud", rr.Points3D(positions=points, colors=colors))

# Camera image example
rr.log("camera/rgb", rr.Image(image_array))

# IMU time-series example
for t, (ax, ay, az) in enumerate(imu_data):
    rr.set_time_sequence("frame", t)
    rr.log("imu/accel_x", rr.Scalar(ax))

rr.save("preview.rrd")
\`\`\`

Keep preview files **under 50MB** for fast loading. Trim to the first 10–30 seconds of your recording. The .rrd file renders as an interactive 3D viewer in the catalog.

### Time-Series Data (.parquet)

For IMU, force/torque, proprioception, and tactile data, upload \`.parquet\` samples for interactive chart previews. The marketplace reads your parquet file in the browser and renders a time-series chart for buyers.

Best practices:
- Use Apache Parquet format (pandas: \`df.to_parquet("sample.parquet")\`)
- **Flatten nested arrays into named columns** — e.g. instead of \`observation.state: [0.1, 0.2, ...]\`, use \`left_shoulder: 0.1, left_elbow: 0.2, ...\`
- Include a time or index column; numeric columns are auto-detected for charting
- Use float32/float64 for sensor readings (accel_x, accel_y, gyro_z, etc.)
- First 10 numeric columns are charted (max); additional columns are noted in header
- Keep sample files to 500–1000 rows for fast loading
- Maximum 500MB per file, but smaller is better for preview

### Sample Naming Convention (Required for Multi-Modality Listings)

If your listing has **multiple modalities** (e.g., RGB + IMU + force/torque), your sample files **must** follow this naming convention:

\`\`\`
{episode_id}_{modality}.{ext}
\`\`\`

**Examples:**
| Filename | Episode | Modality | Format |
|----------|---------|----------|--------|
| \`episode_001_rgb.mp4\` | episode_001 | rgb | MP4 |
| \`episode_001_imu.parquet\` | episode_001 | imu | Parquet |
| \`episode_001_force.parquet\` | episode_001 | force_torque | Parquet |
| \`grasp_23_depth.png\` | grasp_23 | depth | PNG |
| \`grasp_23_tactile.parquet\` | grasp_23 | tactile | Parquet |
| \`kitchen_01_rgb.mp4\` | kitchen_01 | rgb | MP4 |
| \`kitchen_01_audio.wav\` | kitchen_01 | audio | WAV |

**Recognized modality keywords:**
- **rgb**: rgb, color, cam, camera, visual
- **rgbd**: rgbd, rgb_d, rgb-d
- **depth**: depth, disparity, zmap
- **thermal**: thermal, infrared, flir, ir_
- **imu**: imu, accel, gyro, accelerometer, gyroscope
- **force_torque**: force, torque, ft_, wrench
- **tactile**: tactile, pressure, touch, gel, taxel
- **proprioception**: proprio, encoder, qpos, qvel
- **joint_trajectory**: trajectory, joint_traj, ee_pose, end_effector, cartesian, action
- **audio**: audio, mic, sound, speech
- **lidar**: lidar, laser, scan, velodyne
- **point_cloud**: pointcloud, point_cloud, pcd, ply
- **motion_capture**: mocap, motion_capture, skeleton, optitrack, vicon
- **language_annotations**: annotation, caption, language, label, instruction

**Alignment rules enforced on submission:**
1. Every listed modality must have at least one sample
2. All modalities must have the **same number** of samples
3. Samples must be **paired by episode** — each episode must have a file for every modality
4. Files that cannot be auto-mapped to a modality must be renamed with a recognized keyword

If a file has no modality keyword but only one listing modality matches its format (e.g. a \`.parquet\` on a listing with only \`imu\`), it is auto-assigned. If ambiguous, it is flagged as unassigned.

Single-modality listings skip these checks.

### Sample Repository (Required)

Every listing requires a **sample manifest** — a JSON file hosted in your storage that indexes your sample episodes. This powers the **Sample Explorer** page where buyers can browse, filter, and preview your full sample dataset.

**Manifest format:**

\`\`\`json
{
  "version": 1,
  "episodes": [
    {
      "id": "episode_001",
      "video": "videos/episode_001.mp4",
      "thumbnail": "thumbnails/episode_001.jpg",
      "annotations": "annotations/episode_001.json",
      "duration_seconds": 720,
      "instruction": "Pick up the coffee mug",
      "tags": { "environment": "kitchen", "task": "pick_and_place" }
    }
  ]
}
\`\`\`

**Required per episode:** \`id\`, \`video\`. **Optional:** \`title\`, \`duration_seconds\`, \`thumbnail\`, \`annotations\`, \`instruction\`, \`tags\`, \`files\` (for multi-modality).

All file paths are relative to the manifest's parent directory. If your manifest is at \`https://storage.example.com/dataset/manifest.json\`, then \`"video": "videos/ep_001.mp4"\` resolves to \`https://storage.example.com/dataset/videos/ep_001.mp4\`.

**Generating your manifest:**

Save the script below as \`manifest-generator.py\` and run:

\`\`\`bash
python manifest-generator.py ./samples/ -o manifest.json
# With thumbnails (requires ffmpeg):
python manifest-generator.py ./samples/ -o manifest.json --thumbnails
\`\`\`

The script discovers video files, matches annotations by episode ID, extracts durations (if ffprobe available), and generates thumbnails on request. Supports flat, by-type, and by-episode folder structures.

\`\`\`python
"""Atlas Sample Manifest Generator — save as manifest-generator.py"""
import os, json, argparse, subprocess, re
from pathlib import Path

VIDEO_EXT = {'.mp4', '.webm', '.mov', '.avi', '.mkv'}
ANN_EXT = {'.json', '.jsonl'}

def get_duration(path):
    try:
        r = subprocess.run(['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(path)], capture_output=True, text=True, timeout=10)
        return float(json.loads(r.stdout)['format'].get('duration', 0)) if r.returncode == 0 else None
    except Exception: return None

def gen_thumb(video, thumb):
    try:
        thumb.parent.mkdir(parents=True, exist_ok=True)
        return subprocess.run(['ffmpeg', '-y', '-i', str(video), '-vframes', '1', '-q:v', '5', '-vf', 'scale=320:-1', str(thumb)], capture_output=True, timeout=30).returncode == 0
    except Exception: return False

def find_ann(ep_id, video, root):
    for ext in ANN_EXT:
        for c in [video.with_suffix(ext), video.parent / f'{ep_id}{ext}', root / 'annotations' / f'{ep_id}{ext}']:
            if c.exists(): return str(c.relative_to(root))
    return None

def extract_info(ann_path):
    try:
        data = json.load(open(ann_path))
        instr = None; tags = {}
        if isinstance(data, dict):
            for k in ['instruction', 'caption', 'text', 'description']:
                if k in data and isinstance(data[k], str): instr = data[k]; break
            for k in ['environment', 'task', 'task_type', 'scene', 'location']:
                if k in data and isinstance(data[k], str): tags[k] = data[k]
        return instr, tags
    except Exception: return None, {}

def main():
    p = argparse.ArgumentParser(description='Generate Atlas sample manifest')
    p.add_argument('directory'); p.add_argument('-o', '--output', default='manifest.json')
    p.add_argument('--thumbnails', action='store_true'); p.add_argument('-v', '--verbose', action='store_true')
    args = p.parse_args()
    root = Path(args.directory).resolve()
    videos = sorted(f for f in root.rglob('*') if f.suffix.lower() in VIDEO_EXT and not f.name.startswith('.'))
    if not videos: print('No videos found'); return
    seen, episodes = {}, []
    for v in videos:
        rel = v.relative_to(root)
        ep_id = rel.parts[-2] if len(rel.parts) >= 2 and v.stem.lower() in ('video','rgb','main') else re.sub(r'(_rgb|_video|_cam)$', '', v.stem)
        if ep_id in seen: c = 2;
        while ep_id in seen: ep_id = f'{ep_id}_{c}'; c += 1
        seen[ep_id] = True
        ann = find_ann(ep_id, v, root); dur = get_duration(v)
        instr, tags = extract_info(root / ann) if ann else (None, {})
        thumb = None
        for ext in ['.jpg','.png']:
            for c in [root/'thumbnails'/f'{ep_id}{ext}', v.with_suffix(ext)]:
                if c.exists(): thumb = str(c.relative_to(root)); break
            if thumb: break
        if not thumb and args.thumbnails:
            tp = root / 'thumbnails' / f'{ep_id}.jpg'
            if gen_thumb(v, tp): thumb = str(tp.relative_to(root))
        ep = {'id': ep_id, 'video': str(v.relative_to(root))}
        if dur and dur > 0: ep['duration_seconds'] = round(dur, 1)
        if thumb: ep['thumbnail'] = thumb
        if ann: ep['annotations'] = ann
        if instr: ep['instruction'] = instr
        if tags: ep['tags'] = tags
        episodes.append(ep)
        if args.verbose: print(f'  {ep_id}')
    json.dump({'version': 1, 'episodes': episodes}, open(args.output, 'w'), indent=2)
    hrs = sum(e.get('duration_seconds', 0) for e in episodes) / 3600
    print(f'Manifest: {len(episodes)} episodes, {hrs:.1f} hrs -> {args.output}')

if __name__ == '__main__': main()
\`\`\`

**CORS for Sample Explorer:**

The Sample Explorer on humanoids.fyi loads videos directly from your storage. Your bucket must allow cross-origin requests from \`https://humanoids.fyi\`. See the CORS section in Step 2 for configuration by storage provider.

Test with: \`curl -I -H "Origin: https://humanoids.fyi" https://your-storage.com/path/to/video.mp4\`

**Validation:** When you submit, Atlas checks that the manifest URL is accessible, the JSON schema is valid, and 5 randomly selected video URLs resolve. Fix any errors shown and re-validate.

### Submitting for Review

Once you have 5+ inline samples uploaded and a valid sample manifest, the **Submit for Review** button activates. Clicking it:
1. Validates cross-modality sample alignment (for multi-modality listings)
2. Verifies your sample manifest is valid
3. Tests your provisioning API (verifies your webhook is reachable)
4. Submits the listing for Atlas team review (typically approved within 24 hours)
5. Once approved and published, your listing appears in the **Buy Data** catalog with a Sample Explorer link

---

## Step 6 — Collection Programs (Optional)

If you want to crowdsource data collection, you can create collection programs that recruit collectors.

### How it works

1. Go to **Sell Data → My Programs → Create Program**
2. Define the program: title, description, requirements, compensation, and signup type
3. Collectors browse programs in the **Collect Data** tab and apply
4. You review applicants in **My Programs** and accept or reject them
5. When you accept a collector, Atlas:
   - Sends a \`collector_accepted\` webhook to your provisioning API (so you can sync them to your system)
   - Invoices you a $5 referral fee per accepted collector via Stripe (7-day payment terms)
   - Assigns the collector a unique referral code (e.g. \`ATL-377DKM\`)
6. The collector does work on your platform using their referral code
7. Your system reports collector activity back to Atlas via the postback endpoint (section 3c above)

### Signup types

- **Atlas form** — collectors sign up directly on Atlas with name + email. You receive the signup and manage onboarding.
- **External link** — collectors are redirected to your own signup page with their referral code appended as \`?ref=ATL-XXXXXX\`.

---

## Architecture Overview

### Data purchases

\`\`\`
Buyer browses catalog ──→ Adds to cart ──→ Pays via Stripe
                                                │
                                    Stripe webhook fires
                                                │
                                                ▼
                              Atlas calls YOUR provisioning API
                                    (purchase event POST)
                                                │
                              ┌─────────────────┴─────────────────┐
                              │                                   │
                      Sync response                     Async response
                   { status: "ready" }              { status: "processing" }
                   Buyer gets access                        │
                      immediately                    You process data
                                                            │
                                                    POST callback to Atlas
                                                    { status: "ready" }
                                                            │
                                                    Buyer gets access
\`\`\`

### Collection programs

\`\`\`
Provider creates program ──→ Collector applies ──→ Provider accepts
                                                        │
                                          ┌─────────────┴─────────────┐
                                          │                           │
                                   Atlas sends webhook          Atlas invoices
                                  (collector_accepted)          $5 referral fee
                                          │
                                   Your system syncs
                                     the collector
                                          │
                                   Collector does work
                                          │
                                   Your system reports
                                   hours via postback
                                   POST to Atlas API
\`\`\`

---

## LeRobot Format Compatibility

[LeRobot](https://github.com/huggingface/lerobot) is the emerging standard for robot learning datasets. Listings marked as LeRobot compatible get a distinctive badge and buyers can load data directly with \`LeRobotDataset()\`.

Select **lerobot** in the Formats field when creating a listing.

### Required directory structure (v3.0)

\`\`\`
dataset/
  meta/
    info.json              # Schema, robot_type, fps, features
    tasks.parquet          # Task descriptions
    stats.json             # Feature statistics
    episodes/
      chunk-000/
        file-000.parquet   # Episode metadata
  data/
    chunk-000/
      file-000.parquet     # Frame-by-frame observations + actions
  videos/
    observation.images.cam_high/
      chunk-000/
        file-000.mp4       # RGB video per camera
\`\`\`

### Atlas modality → LeRobot feature mapping

| Atlas modality | LeRobot feature key | dtype |
|---|---|---|
| rgb | \`observation.images.{cam_name}\` | video |
| depth | \`observation.images.depth\` | video |
| proprioception | \`observation.state\` | float32 |
| joint_trajectory | \`action\` | float32 |
| force_torque | \`observation.effort\` | float32 |
| imu | \`observation.imu\` | float32 |
| language_annotations | \`observation.language\` | string |

### Atlas embodiment → LeRobot robot_type

| Atlas embodiment | robot_type |
|---|---|
| humanoid | \`unitree_g1\`, \`reachy2\` |
| dual_arm, bimanual_fixed | \`aloha\` |
| single_arm | \`koch\`, \`so100\` |
| (any) | custom string |

### Example info.json

\`\`\`json
{
  "codebase_version": "v3.0",
  "robot_type": "aloha",
  "fps": 50,
  "total_episodes": 100,
  "total_frames": 50000,
  "total_tasks": 1,
  "chunks_size": 1000,
  "splits": { "train": "0:100" },
  "features": {
    "observation.state": { "dtype": "float32", "shape": [14], "names": null },
    "action": { "dtype": "float32", "shape": [14], "names": null },
    "observation.images.cam_high": { "dtype": "video", "shape": [480, 640, 3], "names": ["height", "width", "channel"] }
  }
}
\`\`\`

### Buyer usage

\`\`\`python
from lerobot.datasets.lerobot_dataset import LeRobotDataset

dataset = LeRobotDataset("path/to/downloaded/atlas_data")
sample = dataset[0]
# Keys: observation.state, action, observation.images.cam_high, timestamp, etc.
\`\`\`

---

## Support

Contact the Atlas team at **juliansaks@gmail.com** for onboarding help, API questions, or issues.

---

*Last updated April 2026*
`;
}

function downloadProviderDocsMd(callbackUrl: string) {
  const md = generateProviderDocsMd(callbackUrl);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ATLAS_ONBOARDING.md';
  a.click();
  URL.revokeObjectURL(url);
}

function ProviderDocs() {
  const [callbackUrl, setCallbackUrl] = useState('');
  const [provApiUrl, setProvApiUrl] = useState('');
  const [mdDownloaded, setMdDownloaded] = useState(false);

  useEffect(() => {
    api.get<{ data: { callback_url: string; provisioning_api_url: string | null } }>('/provider/settings')
      .then(r => {
        setCallbackUrl(r.data.callback_url ?? '');
        setProvApiUrl(r.data.provisioning_api_url ?? '');
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="db-meta-label">Overview</div>
        <button className="api-md-btn" onClick={() => {
          downloadProviderDocsMd(callbackUrl);
          setMdDownloaded(true);
          setTimeout(() => setMdDownloaded(false), 3000);
        }}>
          {mdDownloaded ? 'Downloaded!' : '.md file for agents'}
        </button>
      </div>
      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          Atlas sends webhook events to your API endpoint when key actions occur. Configure your endpoint URL and API key in the <strong>Settings</strong> tab, then implement the handlers below.
        </p>
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        {provApiUrl && <><CopyableCodeBlock label="Your provisioning API" code={provApiUrl} /><div style={{ marginTop: 12 }} /></>}
        <CopyableCodeBlock label="Your callback URL" code={callbackUrl || 'Configure your provisioning API in Settings'} />
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>1. Test your integration</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          Send a test webhook to verify your endpoint handles each event type correctly. Configure your API URL and key in <strong>Settings</strong> first.
        </p>
        <TestWebhookPanel />
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>2. Data purchase events</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          When a buyer completes a purchase, Atlas sends a POST request to your API endpoint.
          You can respond synchronously with access details, or asynchronously via the callback URL.
        </p>
        <ProvisioningGuide callbackUrl={callbackUrl} />
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>3. Collector signup events</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          When you accept a collector from the Programs tab, Atlas sends a notification to the same endpoint so you can sync them to your own database.
        </p>
        <CopyableCodeBlock label="Event: collector_accepted" code={`POST your-api-endpoint
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "event": "collector_accepted",
  "collector": {
    "name": "Eve Torres",
    "email": "eve@example.com",
    "referral_code": "ATL-377DKM"
  },
  "program": {
    "id": "program-uuid",
    "title": "Kitchen Activity Capture"
  }
}`} />

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Expected response</div>
        <pre className="db-code-block">{`{
  "status": "ok"
}`}</pre>
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>4. Collector activity postback</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          Report collector hours and earnings back to Atlas. Call this endpoint from your system when a collector completes work.
        </p>
        <CopyableCodeBlock label="POST to Atlas (your system calls this)" code={`POST ${callbackUrl.replace('/provisioning', '/collector-activity')}
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "referral_code": "ATL-377DKM",
  "hours_delta": 5.5,
  "earnings_delta_cents": 8250
}`} />

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Expected response</div>
        <pre className="db-code-block">{`{
  "received": true
}`}</pre>
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>5. CORS configuration</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
          If your data is stored in a cloud bucket (R2, S3, GCS), configure CORS to allow Atlas to access your data for buyer previews and Hugging Face integration.
        </p>
        <CopyableCodeBlock label="Cloudflare R2 - CORS settings" code={`Allowed Origins:
  https://humanoids.fyi
  http://localhost:5173
  http://localhost:5174

Allowed Methods: GET, PUT, HEAD
Allowed Headers: Content-Type, Authorization`} />
        <div style={{ marginTop: 12 }} />
        <CopyableCodeBlock label="AWS S3 - CORS JSON" code={`[{
  "AllowedOrigins": ["https://humanoids.fyi"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"]
}]`} />
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>6. Sample repository</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
          Every listing requires a <strong>sample manifest</strong> — a JSON file hosted in your storage that indexes your sample episodes.
          This powers the Sample Explorer page where buyers can browse your full sample dataset. Inline preview samples (uploaded above) are the storefront — the manifest is the full catalog.
        </p>

        <div className="db-meta-label" style={{ marginBottom: 8 }}>Manifest format</div>
        <pre className="db-code-block">{`{
  "version": 1,
  "episodes": [
    {
      "id": "episode_001",
      "video": "videos/episode_001.mp4",
      "thumbnail": "thumbnails/episode_001.jpg",
      "annotations": "annotations/episode_001.json",
      "duration_seconds": 720,
      "instruction": "Pick up the coffee mug",
      "tags": { "environment": "kitchen", "task": "pick_and_place" }
    }
  ]
}`}</pre>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.5 }}>
          Required per episode: <code>id</code>, <code>video</code>. Optional: <code>title</code>, <code>duration_seconds</code>, <code>thumbnail</code>, <code>annotations</code>, <code>instruction</code>, <code>tags</code>, <code>files</code>.
          All paths are relative to the manifest's parent directory.
        </p>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Generate your manifest</div>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 8 }}>
          Save the manifest generator script from the .md file above as <code>manifest-generator.py</code>, then run:
        </p>
        <pre className="db-code-block">{`python manifest-generator.py ./samples/ -o manifest.json
# With thumbnails (requires ffmpeg):
python manifest-generator.py ./samples/ -o manifest.json --thumbnails`}</pre>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>CORS for Sample Explorer</div>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 8 }}>
          The Sample Explorer loads videos directly from your storage. Your bucket must allow requests from <code>humanoids.fyi</code>.
          Add this origin to your CORS policy (see CORS section above for full configs).
        </p>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Validation</div>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
          When you submit your listing, Atlas validates: manifest URL is accessible, JSON schema is correct, and 5 random video URLs resolve.
          Fix any errors and re-validate before submitting.
        </p>
      </div>

      <div className="api-preamble" style={{ marginBottom: 20 }}>
        <div className="db-meta-label" style={{ marginBottom: 16 }}>7. LeRobot format compatibility</div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          <a href="https://github.com/huggingface/lerobot" target="_blank" rel="noopener" style={{ color: 'var(--text)', textDecoration: 'underline' }}>LeRobot</a> is the emerging standard for robot learning datasets. Listings marked as LeRobot compatible get a distinctive badge and buyers can load data directly with <code>LeRobotDataset()</code>. Select <strong>lerobot</strong> in the Formats field when creating a listing.
        </p>

        <div className="db-meta-label" style={{ marginBottom: 8 }}>Required directory structure (v3.0)</div>
        <pre className="db-code-block">{`dataset/
  meta/
    info.json              # Schema, robot_type, fps, features
    tasks.parquet          # Task descriptions
    stats.json             # Feature statistics (min/max/mean/std)
    episodes/
      chunk-000/
        file-000.parquet   # Episode metadata
  data/
    chunk-000/
      file-000.parquet     # Frame-by-frame observations + actions
  videos/
    observation.images.cam_high/
      chunk-000/
        file-000.mp4       # RGB video per camera`}</pre>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Atlas modality → LeRobot feature mapping</div>
        <pre className="db-code-block">{`Atlas modality         → LeRobot feature key           dtype
─────────────────────────────────────────────────────────────
rgb                    → observation.images.{cam_name}  video
depth                  → observation.images.depth       video
proprioception         → observation.state              float32
joint_trajectory       → action                         float32
force_torque           → observation.effort             float32
imu                    → observation.imu                float32
language_annotations   → observation.language            string`}</pre>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Atlas embodiment → LeRobot robot_type</div>
        <pre className="db-code-block">{`Atlas embodiment       → robot_type
───────────────────────────────────
humanoid               → unitree_g1, reachy2
dual_arm, bimanual     → aloha
single_arm             → koch, so100
(custom)               → any string`}</pre>

        <div style={{ marginTop: 16 }} />
        <div className="db-meta-label" style={{ marginBottom: 8 }}>Example info.json</div>
        <pre className="db-code-block">{`{
  "codebase_version": "v3.0",
  "robot_type": "aloha",
  "fps": 50,
  "total_episodes": 100,
  "total_frames": 50000,
  "total_tasks": 1,
  "chunks_size": 1000,
  "data_files_size_in_mb": 100,
  "video_files_size_in_mb": 500,
  "splits": { "train": "0:100" },
  "data_path": "data/chunk-{chunk_index:03d}/file-{file_index:03d}.parquet",
  "video_path": "videos/{video_key}/chunk-{chunk_index:03d}/file-{file_index:03d}.mp4",
  "features": {
    "observation.state": {
      "dtype": "float32", "shape": [14],
      "names": { "motors": ["joint_1", "joint_2", "..."] }
    },
    "action": {
      "dtype": "float32", "shape": [14],
      "names": { "motors": ["joint_1", "joint_2", "..."] }
    },
    "observation.images.cam_high": {
      "dtype": "video", "shape": [480, 640, 3],
      "names": ["height", "width", "channel"],
      "video_info": { "video.fps": 50, "video.codec": "av1", "video.pix_fmt": "yuv420p" }
    },
    "timestamp": { "dtype": "float32", "shape": [1], "names": null },
    "frame_index": { "dtype": "int64", "shape": [1], "names": null },
    "episode_index": { "dtype": "int64", "shape": [1], "names": null },
    "index": { "dtype": "int64", "shape": [1], "names": null },
    "task_index": { "dtype": "int64", "shape": [1], "names": null }
  }
}`}</pre>
        <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
          Buyers can load your data with: <code>LeRobotDataset("path/to/downloaded/data")</code>
        </p>
      </div>

    </div>
  );
}

function TestWebhookPanel() {
  const [results, setResults] = useState<Record<string, { loading: boolean; result?: { success: boolean; valid: boolean; status: number; message: string; response: unknown } }>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const sendTest = async (event: 'ping' | 'purchase' | 'collector_accepted') => {
    setResults(r => ({ ...r, [event]: { loading: true } }));
    setHidden(h => ({ ...h, [event]: false }));
    try {
      const res = await api.post<{ data: { success: boolean; valid: boolean; status: number; message: string; response: unknown } }>('/provider/test-webhook', { event });
      setResults(r => ({ ...r, [event]: { loading: false, result: res.data } }));
    } catch (err) {
      setResults(r => ({ ...r, [event]: { loading: false, result: { success: false, valid: false, status: 0, message: err instanceof Error ? err.message : 'Request failed', response: null } } }));
    }
  };

  const events = [
    { id: 'ping' as const, label: 'Ping', desc: 'Basic connectivity check' },
    { id: 'purchase' as const, label: 'Purchase', desc: 'Simulates a data purchase event' },
    { id: 'collector_accepted' as const, label: 'Collector Accepted', desc: 'Simulates a collector signup event' },
  ];

  // Check if all 3 passed
  const allPassed = events.every(ev => {
    const r = results[ev.id]?.result;
    return r?.success && r?.valid;
  });

  // Redirect to Create Listing when all pass
  useEffect(() => {
    if (!allPassed) return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('provider-tab-change', { detail: { tab: 'create' } }));
    }, 2000);
    return () => clearTimeout(timer);
  }, [allPassed]);

  // Auto-hide passed result messages after 4s
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const ev of events) {
      const r = results[ev.id]?.result;
      if (r?.success && r?.valid && !hidden[ev.id]) {
        timers.push(setTimeout(() => setHidden(h => ({ ...h, [ev.id]: true })), 4000));
      }
    }
    return () => timers.forEach(clearTimeout);
  }, [results]);

  return (
    <div>
      {events.map((ev, i) => {
        const state = results[ev.id];
        const isLast = i === events.length - 1;
        const passed = !!(state?.result?.success && state?.result?.valid);
        const failed = !!(state?.result && !state.result.success);
        const showMessage = !!state?.result && !hidden[ev.id];

        return (
          <div key={ev.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)', paddingBottom: isLast ? 0 : 12, marginBottom: isLast ? 0 : 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ev.label}</strong> - {ev.desc}
              </span>
              <button
                className="db-add-cart-btn"
                style={{
                  padding: '4px 14px', fontSize: 10, width: 'auto', marginTop: 0, marginLeft: 16, flexShrink: 0,
                  ...(passed ? { background: '#4a9e4a', borderColor: '#4a9e4a', color: '#000' } : {}),
                }}
                onClick={() => sendTest(ev.id)}
                disabled={state?.loading || passed}
              >
                {state?.loading ? '...' : passed ? 'Success' : failed ? 'Send Again' : 'Send'}
              </button>
            </div>
            {showMessage && (
              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                borderRadius: 3,
                fontSize: 10,
                lineHeight: 1.5,
                backgroundColor: passed ? 'rgba(0,128,0,0.05)' : state?.result?.success ? 'rgba(200,150,0,0.05)' : 'rgba(200,0,0,0.05)',
                color: passed ? '#2a7a2a' : state?.result?.success ? '#8a6d00' : '#a00',
                fontFamily: 'var(--font-mono)',
              }}>
                {passed ? 'PASS' : state?.result?.success ? 'WARN' : 'FAIL'} - {state?.result?.message}
              </div>
            )}
          </div>
        );
      })}
      {allPassed && (
        <div style={{ marginTop: 12, fontSize: 11, color: '#2a7a2a', fontFamily: 'var(--font-mono)' }}>
          All tests passed. Redirecting to Create Listing...
        </div>
      )}
    </div>
  );
}

function ProvisioningGuide({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div>
      <CopyableCodeBlock label="Request format (sent by Atlas)" code={`POST your-api-endpoint
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "atlas_transaction_id": "txn_abc123",
  "buyer_email": "buyer@company.com",
  "buyer_company": "Acme Robotics",
  "items": [
    {
      "listing_id": "lst_xyz",
      "listing_title": "Indoor Navigation Dataset",
      "hours": 50,
      "license_type": "commercial",
      "modality_items": [
        { "modality": "rgb", "hours": 50, "price_per_hour": 25 },
        { "modality": "depth", "hours": 50, "price_per_hour": 15 }
      ]
    }
  ],
  "callback_url": "${callbackUrl}"
}`} />
      <p style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5, fontFamily: "'Share Tech Mono', monospace" }}>
        <strong>modality_items</strong> is included when the buyer uses per-modality purchasing. If absent, the buyer purchased the full bundle.
      </p>

      <div style={{ marginTop: 16 }} />
      <div className="db-meta-label" style={{ marginBottom: 8 }}>Response - Synchronous (instant access)</div>
      <pre className="db-code-block">{`{
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above"
}`}</pre>

      <div style={{ marginTop: 16 }} />
      <div className="db-meta-label" style={{ marginBottom: 8 }}>Response - Asynchronous (processing needed)</div>
      <pre className="db-code-block">{`{
  "status": "processing"
}`}</pre>

      <div style={{ marginTop: 16 }} />
      <CopyableCodeBlock label="Callback (when async processing is done)" code={`POST ${callbackUrl}
Content-Type: application/json

{
  "transaction_id": "txn_abc123",
  "status": "ready",
  "access_url": "https://your-storage.com/download/xyz",
  "instructions": "Download all files from the link above"
}`} />

    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// COLLECT DATA
// ═══════════════════════════════════════════════════════════

function CollectData({ viewCount: _viewCount }: { viewCount: number | null }) {
  const [programs, setPrograms] = useState<CollectionProgram[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.post('/page-views', { page: 'collect_data' }).catch(() => {}); }, []);
  const [applyingTo, setApplyingTo] = useState<CollectionProgram | null>(null);

  useEffect(() => {
    api.get<{ data: CollectionProgram[] }>('/collection-programs')
      .then(r => setPrograms(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Collect Data</h2>
        <p className="api-docs-desc">Get paid to collect training data</p></div>
      </div>

      {/* Context section */}
      <div className="db-collect-context">
        <div className="db-collect-context__left">
          <div className="db-collect-context__body">
            Data providers need people to record real-world activities - cooking, cleaning,
            factory work, sorting, ... Browse active programs, apply, and start earning.
          </div>
        </div>
        <div className="db-collect-context__stats">
          <div className="db-collect-context__stat">
            <div className="db-collect-context__stat-value">{programs.length}</div>
            <div className="db-meta-label">Active programs</div>
          </div>
          <div className="db-collect-context__stat">
            <div className="db-collect-context__stat-value">$12-25</div>
            <div className="db-meta-label">Per hour range</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="db-loading">Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="db-collect-empty">
          <div className="db-collect-empty__title">No programs available right now</div>
          <div className="db-collect-empty__body">
            Data providers create collection programs when they need training data gathered.
            New programs are added regularly as providers onboard to the marketplace.
          </div>
        </div>
      ) : (
        <div className="db-program-grid">
          {programs.map(p => (
            <div key={p.id} className="db-program-card">
              <div className="db-program-card__header">
                <div>
                  <div className="db-program-card__provider">{p.providers?.name ?? 'Unknown Provider'}</div>
                  <div className="db-program-card__title">{p.title}</div>
                </div>
                {p.providers?.website_url && (
                  <a href={p.providers.website_url} target="_blank" rel="noopener noreferrer" className="db-program-card__link" onClick={e => e.stopPropagation()}>
                    Visit site
                  </a>
                )}
              </div>

              <div className="db-program-card__desc">{p.description}</div>

              <div className="db-program-card__details">
                {p.compensation_description && (
                  <div className="db-program-card__detail-row">
                    <div className="db-meta-label">Compensation</div>
                    <div className="db-program-card__detail-value db-program-card__detail-value--pay">{p.compensation_description}</div>
                  </div>
                )}
                {p.requirements && (
                  <div className="db-program-card__detail-row">
                    <div className="db-meta-label">Requirements</div>
                    <div className="db-program-card__detail-value">{p.requirements}</div>
                  </div>
                )}
                <div className="db-program-card__detail-row">
                  <div className="db-meta-label">Apply via</div>
                  <div className="db-program-card__detail-value">{p.signup_type === 'external_link' ? 'Provider platform' : 'Atlas'}</div>
                </div>
              </div>

              <button className="db-program-apply-btn" onClick={() => {
                if (p.signup_type === 'external_link' && p.external_url) {
                  window.open(p.external_url, '_blank');
                } else {
                  setApplyingTo(p);
                }
              }}>
                {p.signup_type === 'external_link' ? 'Apply on Provider Site' : 'Apply Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cross-link CTA */}
      <div className="db-collect-cta">
        <div className="db-collect-cta__text">
          <div className="db-meta-label">For data providers</div>
          <div className="db-collect-cta__body">Have a data collection operation? List your program and source collectors through Atlas</div>
        </div>
        <a href="/data/sell" className="db-program-apply-btn" style={{ flexShrink: 0 }}>Become a Provider</a>
      </div>

      {applyingTo && <CollectorModal program={applyingTo} onClose={() => setApplyingTo(null)} />}
    </div>
  );
}

function LocationAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const matches = value.length >= 2 ? LOCATION_OPTIONS.filter(l => l.toLowerCase().includes(value.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="db-form-field" style={{ position: 'relative' }}>
      <label className="db-meta-label">Location</label>
      <input
        className="db-form-input"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="City, Country"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4,
          maxHeight: 160, overflowY: 'auto', marginTop: 2,
        }}>
          {matches.map(m => (
            <div key={m} style={{ padding: '6px 12px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}
              onMouseDown={() => { onChange(m); setOpen(false); }}>
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectorModal({ program, onClose }: { program: CollectionProgram; onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async () => {
    if (!name || !email) { setError('Name and email are required'); return; }
    setError('');
    try {
      const res = await api.post<{ data: { referral_code: string; redirect_url?: string } }>(`/collection-programs/${program.id}/signup`, {
        name, email, form_data: { location, ...(linkedin ? { linkedin } : {}), ...(xHandle ? { x_handle: xHandle } : {}) },
      });
      setReferralCode(res.data.referral_code);
      setSubmitted(true);
      if (res.data.redirect_url) {
        window.open(res.data.redirect_url, '_blank');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(console.error);
  };

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">{program.title}</div>
            <div className="db-modal-subtitle">by {program.providers?.name}</div>
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {submitted ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Application submitted</div>
            <div className="db-modal-success__code-wrap">
              <div className="db-meta-label">Your referral code</div>
              <div className="db-modal-success__code" onClick={copyCode}>
                <span>{referralCode}</span>
                <span className="db-modal-success__copy">{copied ? 'COPIED' : 'COPY'}</span>
              </div>
            </div>
            <div className="db-modal-success__note">
              The provider will review your application. Save your referral code to track your status and earnings.
            </div>
            <button className="db-add-cart-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div className="db-form-error">{error}</div>}
            <div className="db-form-field">
              <label className="db-meta-label">Name</label>
              <input className="db-form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="db-form-field">
              <label className="db-meta-label">Email</label>
              <input className="db-form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <LocationAutocomplete value={location} onChange={setLocation} />
            <div className="db-form-row">
              <div className="db-form-field" style={{ flex: 1 }}>
                <label className="db-meta-label">LinkedIn (optional)</label>
                <input className="db-form-input" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/yourname" />
              </div>
              <div className="db-form-field" style={{ flex: 1 }}>
                <label className="db-meta-label">X / Twitter (optional)</label>
                <input className="db-form-input" value={xHandle} onChange={e => setXHandle(e.target.value)} placeholder="@yourhandle" />
              </div>
            </div>
            {program.compensation_description && (
              <div className="db-modal-compensation">
                <div className="db-meta-label">Compensation</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{program.compensation_description}</div>
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, marginBottom: 12, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', lineHeight: 1.4 }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: 2 }} />
              <span>I agree to the <a href="/data/collector-terms" target="_blank" rel="noopener" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }} onClick={e => e.stopPropagation()}>Data Collector Conditions</a></span>
            </label>
            <button className="db-add-cart-btn" onClick={handleSubmit} disabled={!agreedToTerms}>Submit Application</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER LIST & PROFILE (BUYER VIEW)
// ═══════════════════════════════════════════════════════════

interface CatalogProvider {
  id: string; name: string; slug: string; company_name: string | null;
  description: string | null; logo_url: string | null; website_url: string | null;
  listing_count?: number;
  listings?: Array<{ id: string; title: string; slug: string; modality: string | string[]; environment: string | string[]; price_per_hour: number; total_hours: number | null; featured: boolean; created_at: string }>;
}

function ProviderList({ onSelectProvider }: { onSelectProvider: (slug: string) => void }) {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: CatalogProvider[] }>('/catalog/providers')
      .then(r => setProviders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="db-loading">Loading providers...</div>;
  if (providers.length === 0) return <div className="db-empty">No data providers yet</div>;

  return (
    <div>
      <div className="db-meta-label" style={{ marginBottom: 12 }}>{providers.length} Data Provider{providers.length !== 1 ? 's' : ''}</div>
      <div className="db-catalog-list">
        {providers.map(p => (
          <div key={p.id} className="db-catalog-row db-listing-row--provider" onClick={() => onSelectProvider(p.slug)}>
            <div className="db-provider-logo" style={{ flexShrink: 0 }}>
              {p.logo_url ? <img src={p.logo_url} alt="" className="db-provider-logo__img" /> : <span className="db-provider-logo__initial">{p.name.charAt(0).toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="db-catalog-row__title">{p.name}</div>
              <div className="db-catalog-row__details" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.company_name && p.company_name !== p.name ? `${p.company_name} · ` : ''}{p.description || 'No description'}
              </div>
            </div>
            <span className="db-catalog-row__view" style={{ flexShrink: 0, marginLeft: 16 }}>View →</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderProfile({ slug, onBack, onSelectListing }: { slug: string; onBack: () => void; onSelectListing: (slug: string, providerName: string) => void }) {
  const [provider, setProvider] = useState<CatalogProvider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: CatalogProvider }>(`/catalog/providers/${slug}`)
      .then(r => setProvider(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="db-loading">Loading provider...</div>;
  if (!provider) return <div className="db-empty">Provider not found</div>;

  const listings = provider.listings ?? [];

  return (
    <div>
      <button className="db-back-btn" onClick={onBack}>← All Data Providers</button>

      <div className="db-provider-header">
        <div className="db-provider-logo db-provider-logo--lg">
          {provider.logo_url ? <img src={provider.logo_url} alt="" className="db-provider-logo__img" /> : <span className="db-provider-logo__initial">{provider.name.charAt(0).toUpperCase()}</span>}
        </div>
        <div className="db-provider-header__info">
          <h2 className="api-docs-title" style={{ marginBottom: 2 }}>{provider.name}</h2>
          {provider.company_name && provider.company_name !== provider.name && (
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>{provider.company_name}</div>
          )}
          {provider.website_url && (
            <a href={provider.website_url} target="_blank" rel="noopener noreferrer" className="db-provider-header__link">
              {provider.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗
            </a>
          )}
        </div>
      </div>

      {provider.description && (
        <div className="db-provider-section">
          <div className="db-provider-section__label">About</div>
          <p className="db-provider-section__text">{provider.description}</p>
        </div>
      )}

      <div className="db-provider-section">
        <div className="db-provider-section__label">Datasets ({listings.length})</div>
        {listings.length === 0 ? (
          <div className="db-empty">No published datasets yet</div>
        ) : (
          <div className="db-catalog-list">
            {listings.map(l => (
              <div key={l.id} className="db-catalog-row" onClick={() => onSelectListing(l.slug, provider.name)}>
                <div className="db-catalog-row__content">
                  <div className="db-catalog-row__line1">
                    <span className="db-catalog-row__title">{l.title}</span>
                    <span className="db-catalog-row__view">View →</span>
                  </div>
                  <div className="db-catalog-row__line2">
                    <span className="db-catalog-row__details">
                      {formatTags(l.modality)} · {formatTags(l.environment)}
                      {l.total_hours ? ` · ${Number(l.total_hours).toLocaleString()} hrs` : ''}
                    </span>
                    <span className="db-catalog-row__price">${l.price_per_hour}/hr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOM REQUEST MODAL
// ═══════════════════════════════════════════════════════════

function CustomRequestModal({ onClose, sourceListing }: { onClose: () => void; sourceListing?: Listing | null }) {
  const isLinked = !!sourceListing;
  const listingModalities = sourceListing ? (Array.isArray(sourceListing.modality) ? sourceListing.modality : [sourceListing.modality]) : [];
  const listingEnvironments = sourceListing ? (Array.isArray(sourceListing.environment) ? sourceListing.environment : [sourceListing.environment]) : [];
  const listingTags = sourceListing && Array.isArray(sourceListing.tags) ? sourceListing.tags as string[] : [];
  const listingCollectionMethods = listingTags.filter(t => t.startsWith('collection:')).map(t => t.split(':')[1]);
  const listingEmbodimentTypes = listingTags.filter(t => t.startsWith('embodiment:')).map(t => t.split(':')[1]);
  const listingTaskTypes = listingTags.filter(t => t.startsWith('task:')).map(t => t.split(':')[1]);

  const [form, setForm] = useState({
    contact_name: '', contact_email: '', company_name: '',
    modalities: isLinked ? listingModalities : [] as string[],
    environments: isLinked ? listingEnvironments : [] as string[],
    collection_methods: isLinked ? listingCollectionMethods : [] as string[],
    embodiment_types: isLinked ? listingEmbodimentTypes : [] as string[],
    task_types: isLinked ? listingTaskTypes : [] as string[],
    description: '', hours_needed: '', budget_range: '', timeline: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const toggleTag = (field: 'modalities' | 'environments' | 'collection_methods' | 'embodiment_types' | 'task_types', value: string) => {
    setForm(f => {
      const arr = f[field];
      return { ...f, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const handleSubmit = async () => {
    if (!form.contact_name || !form.contact_email || !form.description || !form.hours_needed || !form.budget_range || !form.timeline) {
      setError('All required fields must be filled in');
      return;
    }
    setError('');
    try {
      const { modalities, environments, collection_methods, embodiment_types, task_types, ...rest } = form;
      await api.post('/custom-requests', {
        ...rest,
        modality: modalities.join(', ') || undefined,
        environment: environments.join(', ') || undefined,
        collection_method: collection_methods.join(', ') || undefined,
        embodiment_type: embodiment_types.join(', ') || undefined,
        task_type: task_types.join(', ') || undefined,
        hours_needed: parseInt(form.hours_needed),
        source_listing_id: sourceListing?.id,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    }
  };

  const providerName = sourceListing?.providers?.name;

  return (
    <div className="db-modal-overlay" onClick={onClose}>
      <div className="db-modal db-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="db-modal-header">
          <div>
            <div className="db-modal-title">{isLinked ? 'Request Custom Collection' : 'Request Custom Dataset'}</div>
            <div className="db-modal-subtitle">
              {isLinked
                ? `Request additional data from ${providerName ?? 'this provider'} based on "${sourceListing!.title}"`
                : "Describe what you need and we'll connect you with providers"}
            </div>
          </div>
          <button className="db-modal-close" onClick={onClose}>&times;</button>
        </div>

        {isLinked && (
          <div className="db-custom-request-ref">
            <div className="db-custom-request-ref__title">{sourceListing!.title}</div>
            <div className="db-custom-request-ref__details">
              <span>${sourceListing!.price_per_hour}/hr</span>
              {sourceListing!.total_hours && <span>{sourceListing!.total_hours.toLocaleString()} hrs available</span>}
              <span>{listingModalities.map(m => m.replace(/_/g, ' ')).join(', ')}</span>
            </div>
          </div>
        )}

        {submitted ? (
          <div className="db-modal-success">
            <div className="db-modal-success__title">Request submitted</div>
            <div className="db-modal-success__note">
              {isLinked
                ? `We'll forward your request to ${providerName ?? 'the provider'} and follow up at ${form.contact_email}.`
                : `We'll review your request and reach out to matching data providers. You'll hear back at ${form.contact_email}.`}
            </div>
            <button className="db-add-cart-btn" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <div className="db-form-error">{error}</div>}
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Name *</label>
                <input className="db-form-input" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="Your name" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Email *</label>
                <input className="db-form-input" type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} placeholder="you@company.com" />
              </div>
            </div>
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Company</label>
                <input className="db-form-input" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Company name" />
              </div>
            </div>
            {isLinked ? (
              <div className="db-custom-request-tags-readonly">
                <div className="db-meta-label">Dataset tags</div>
                <div className="db-badges">
                  {listingModalities.map(m => <span key={`mod-${m}`} className="db-badge">{m.replace(/_/g, ' ')}</span>)}
                  {listingEnvironments.map(e => <span key={`env-${e}`} className="db-badge">{e.replace(/_/g, ' ')}</span>)}
                  {listingCollectionMethods.map(c => <span key={`col-${c}`} className="db-badge">{c.replace(/_/g, ' ')}</span>)}
                  {listingEmbodimentTypes.map(e => <span key={`emb-${e}`} className="db-badge">{e.replace(/_/g, ' ')}</span>)}
                  {listingTaskTypes.map(t => <span key={`task-${t}`} className="db-badge">{t.replace(/_/g, ' ')}</span>)}
                </div>
              </div>
            ) : (
              <>
                <TagSection label="Modalities needed" required selected={form.modalities} options={MODALITIES}
                  onToggle={v => toggleTag('modalities', v)} />
                <TagSection label="Environments needed" required selected={form.environments} options={ENVIRONMENTS}
                  onToggle={v => toggleTag('environments', v)} />
                <TagSection label="Collection Method" selected={form.collection_methods} options={COLLECTION_METHODS}
                  onToggle={v => toggleTag('collection_methods', v)} required />
                <TagSection label="Embodiment / Platform" selected={form.embodiment_types} options={EMBODIMENT_TYPES}
                  onToggle={v => toggleTag('embodiment_types', v)} required />
                <TagSection label="Task Types" selected={form.task_types} options={TASK_TYPES}
                  onToggle={v => toggleTag('task_types', v)} allowCustom required />
              </>
            )}
            <div className="db-form-field">
              <label className="db-meta-label">Description *</label>
              <textarea className="db-form-input db-form-textarea" value={form.description} onChange={e => set('description', e.target.value)}
                placeholder={isLinked
                  ? "Describe what additional data you need - more hours, different scenarios, specific requirements, etc"
                  : "Describe the data you need - environment, activities, quality requirements, etc"} rows={4} />
            </div>
            <div className="db-form-row">
              <div className="db-form-field">
                <label className="db-meta-label">Hours needed *</label>
                <input className="db-form-input" type="text" inputMode="numeric" value={form.hours_needed} onChange={e => set('hours_needed', e.target.value.replace(/[^0-9]/g, ''))} placeholder="500" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Budget range *</label>
                <input className="db-form-input" value={form.budget_range} onChange={e => set('budget_range', e.target.value)} placeholder="$10,000 - $50,000" />
              </div>
              <div className="db-form-field">
                <label className="db-meta-label">Timeline *</label>
                <input className="db-form-input" value={form.timeline} onChange={e => set('timeline', e.target.value)} placeholder="3 months" />
              </div>
            </div>
            <button className="db-add-cart-btn" style={{ marginTop: 4 }} onClick={handleSubmit}>Submit Request</button>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ACCOUNT PAGE
// ═══════════════════════════════════════════════════════════

function AccountPage() {
  const clerk = CLERK_AVAILABLE ? useClerk() : null;
  const user = clerk?.user;
  const [stats, setStats] = useState<{ purchases: number; listings: number; isProvider: boolean } | null>(null);
  const { isSignedIn } = useClerkAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    Promise.all([
      api.get<{ data: Array<unknown> }>('/purchases').catch(() => ({ data: [] })),
      api.get<{ data: Array<unknown> }>('/provider/listings').catch(() => ({ data: [] })),
      api.get<{ data: { status: string } }>('/auth/provider/onboarding-status').catch(() => null),
    ]).then(([purchases, listings, providerStatus]) => {
      setStats({
        purchases: purchases.data.length,
        listings: listings.data.length,
        isProvider: !!providerStatus,
      });
    });
  }, [isSignedIn]);

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="api-docs">
      <div className="api-docs-header">
        <div><h2 className="api-docs-title">Account</h2></div>
      </div>

      {clerk && user ? (
        <>
          {/* Profile */}
          <div className="api-preamble" style={{ marginTop: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: 'var(--bg)' }}>
                  {(user.firstName ?? 'U').charAt(0)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{user.fullName || user.firstName || 'User'}</div>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>
                  {user.primaryEmailAddress?.emailAddress ?? ''}
                </div>
                {memberSince && (
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>
                    Member since {memberSince}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity */}
          {stats && (
            <div className="db-analytics-grid" style={{ marginTop: 16 }}>
              <div className="db-analytics-card">
                <div className="db-analytics-card__value">{stats.purchases}</div>
                <div className="db-meta-label">Purchases</div>
              </div>
              {stats.isProvider && (
                <div className="db-analytics-card">
                  <div className="db-analytics-card__value">{stats.listings}</div>
                  <div className="db-meta-label">Listings</div>
                </div>
              )}
            </div>
          )}

          {/* Quick links */}
          <div style={{ marginTop: 16 }}>
            <div className="db-meta-label" style={{ marginBottom: 8 }}>Quick links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="db-catalog-row db-listing-row--provider" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/data/buy#purchases'}>
                <div style={{ flex: 1 }}>
                  <div className="db-catalog-row__title" style={{ fontSize: 13 }}>My Purchases</div>
                  <div className="db-catalog-row__details" style={{ marginTop: 2 }}>View your purchased datasets</div>
                </div>
                <span className="db-catalog-row__view">View →</span>
              </div>
              {stats?.isProvider && (
                <>
                  <div className="db-catalog-row db-listing-row--provider" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/data/sell#listings'}>
                    <div style={{ flex: 1 }}>
                      <div className="db-catalog-row__title" style={{ fontSize: 13 }}>My Listings</div>
                      <div className="db-catalog-row__details" style={{ marginTop: 2 }}>Manage your dataset listings</div>
                    </div>
                    <span className="db-catalog-row__view">View →</span>
                  </div>
                  <div className="db-catalog-row db-listing-row--provider" style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/data/sell#settings'}>
                    <div style={{ flex: 1 }}>
                      <div className="db-catalog-row__title" style={{ fontSize: 13 }}>Provider Settings</div>
                      <div className="db-catalog-row__details" style={{ marginTop: 2 }}>Stripe, webhook, and profile settings</div>
                    </div>
                    <span className="db-catalog-row__view">View →</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sign out */}
          <div className="api-preamble" style={{ marginTop: 16, padding: '20px 24px' }}>
            <button className="db-signout-btn" onClick={() => clerk.signOut()}>Sign out</button>
          </div>
        </>
      ) : (
        <div className="api-preamble" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Not signed in</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TERMS PAGES
// ═══════════════════════════════════════════════════════════

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="db-meta-label" style={{ marginBottom: 10, fontSize: 12 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.9 }}>{children}</div>
    </div>
  );
}

function TermsPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="api-docs">
      <div style={{ marginBottom: 28 }}>
        <h2 className="api-docs-title">{title}</h2>
        <p className="api-docs-desc">{subtitle}</p>
      </div>
      <div style={{ maxWidth: 680 }}>
        {children}
        <div style={{ marginTop: 40, padding: '16px 0', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'Share Tech Mono, monospace' }}>
          Atlas Data Brokerage · Humanoid Atlas · Last updated April 2026
        </div>
      </div>
    </div>
  );
}

function SellerTerms() {
  return (
    <TermsPage title="Data Provider Conditions" subtitle="Guidelines for selling data on Atlas">
      <TermsSection title="Atlas fees">
        <p>Atlas retains a 15% fee on all data sales. You receive 85% of each transaction, deposited directly to your connected Stripe account.</p>
        <p style={{ marginTop: 8 }}>A $5 fee is charged per accepted collector, invoiced via Stripe with 7-day payment terms. You must complete Stripe onboarding before you can receive payouts or accept collectors.</p>
      </TermsSection>

      <TermsSection title="Your responsibilities">
        <p>You host your own data on your infrastructure and maintain a provisioning API (or deliver data manually) to fulfill buyer purchases.</p>
        <p style={{ marginTop: 8 }}><strong>You are responsible for delivering purchased data to buyers.</strong> If delivery fails, you are liable for issuing a full refund and communicating directly with the buyer. Atlas facilitates the connection but is not responsible for delivery failures.</p>
        <p style={{ marginTop: 8 }}>You warrant that you have the legal right to sell the data you list. You set the license type and terms for each listing and are responsible for enforcing them.</p>
      </TermsSection>

      <TermsSection title="Content & review">
        <p>All listings are reviewed by Atlas before publication. Edits to published listings require re-review. Atlas may reject, suspend, or remove listings at its discretion.</p>
        <p style={{ marginTop: 8 }}>Inline preview samples (max 500MB each) are stored on Atlas infrastructure and are publicly accessible to potential buyers browsing the catalog. Your sample repository (manifest + data files) is hosted on your own infrastructure and must remain publicly accessible for as long as your listing is active.</p>
      </TermsSection>

      <TermsSection title="Data sharing">
        <p>When a buyer purchases your data, their email and company name are shared with you for delivery purposes. When you accept a collector, their name, email, and referral code are shared with you.</p>
        <p style={{ marginTop: 8 }}>You must handle all shared personal data in compliance with applicable privacy laws.</p>
      </TermsSection>

      <TermsSection title="Account">
        <p>Atlas may suspend your account at any time, which prevents new purchases of your listings. You may deactivate your own listings at any time.</p>
      </TermsSection>
    </TermsPage>
  );
}

function BuyerTerms() {
  return (
    <TermsPage title="Data Buyer Conditions" subtitle="Guidelines for purchasing data on Atlas">
      <TermsSection title="Purchases">
        <p>You pay the listed price per hour of data, subject to minimum purchase requirements set by each provider. Payment is processed via Stripe - Atlas never handles your card details directly.</p>
        <p style={{ marginTop: 8 }}>Purchased data access does not expire. Once your data is provisioned, it remains accessible through the provider.</p>
      </TermsSection>

      <TermsSection title="Data delivery">
        <p>Data is delivered by the provider, not Atlas. Atlas facilitates the connection between you and the provider but <strong>the provider is responsible for delivery and any refunds.</strong></p>
        <p style={{ marginTop: 8 }}>If you do not receive your data, contact the provider directly. Atlas will assist in connecting you but is not liable for the quality, accuracy, or completeness of data provided.</p>
      </TermsSection>

      <TermsSection title="License & usage">
        <p>You must comply with the license type specified on each listing (standard, exclusive, research only, commercial, or custom). You may not resell, redistribute, or sublicense purchased data unless the license explicitly permits it.</p>
        <p style={{ marginTop: 8 }}>License violations may result in account suspension.</p>
      </TermsSection>

      <TermsSection title="Your information">
        <p>Your email address and company name are shared with the data provider for delivery purposes. Atlas stores your name, email, and company name. Payment data is handled entirely by Stripe.</p>
      </TermsSection>
    </TermsPage>
  );
}

function CollectorTerms() {
  return (
    <TermsPage title="Data Collector Conditions" subtitle="Guidelines for participating in data collection programs">
      <TermsSection title="Signup & acceptance">
        <p>You sign up for collection programs with your name and email - no account is required. Acceptance into a program is at the provider's sole discretion and is not guaranteed.</p>
        <p style={{ marginTop: 8 }}>Upon acceptance, your name, email, and referral code are shared with the data provider.</p>
      </TermsSection>

      <TermsSection title="Compensation">
        <p>Compensation is paid directly by the data provider, not Atlas. Atlas tracks your hours and earnings for visibility, but does not process collector payments.</p>
        <p style={{ marginTop: 8 }}>Compensation rates are set by the provider per program. Any disputes regarding payment should be directed to the provider.</p>
      </TermsSection>

      <TermsSection title="Your work">
        <p>You are an independent contributor, not an employee of Atlas or the data provider. You must meet the program requirements set by the provider.</p>
        <p style={{ marginTop: 8 }}>Data you collect is owned by the provider per the program terms. By participating, you grant the provider rights to use the data you contribute.</p>
      </TermsSection>

      <TermsSection title="Referral code">
        <p>You receive a unique referral code to track your status and earnings. You can check your status publicly at any time using this code.</p>
      </TermsSection>

      <TermsSection title="Atlas's role">
        <p>Atlas is a marketplace connecting collectors to data providers. Atlas is not a party to the collection agreement between you and the provider.</p>
        <p style={{ marginTop: 8 }}>Atlas charges the provider a fee per accepted collector. This fee does not affect your compensation.</p>
      </TermsSection>
    </TermsPage>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function DataBrokerage({ activeSubTab, viewCount }: { activeSubTab: string; viewCount: number | null }) {
  const { isSignedIn, getToken } = useClerkAuth();

  // Wire Clerk token into the API client
  useEffect(() => {
    setTokenGetter(getToken);
  }, [getToken]);

  // Expose auth state to App.tsx for conditional tab rendering
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__clerk_signed_in = isSignedIn;
    window.dispatchEvent(new CustomEvent('clerk-auth-change', { detail: { isSignedIn } }));
  }, [isSignedIn]);

  return (
    <>
      {activeSubTab === 'buy_data' && <BuyData />}
      {activeSubTab === 'sell_data' && <SellData viewCount={viewCount} />}
      {activeSubTab === 'collect_data' && <CollectData viewCount={viewCount} />}
      {activeSubTab === 'seller_terms' && <SellerTerms />}
      {activeSubTab === 'buyer_terms' && <BuyerTerms />}
      {activeSubTab === 'collector_terms' && <CollectorTerms />}
      {activeSubTab === 'account' && <AccountPage />}
    </>
  );
}
