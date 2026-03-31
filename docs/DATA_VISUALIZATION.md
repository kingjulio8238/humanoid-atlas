# Data Visualization — Phased Implementation Plan

Atlas Data Brokerage supports 16 sensor modalities across physical AI datasets. The sample preview system must render each modality appropriately so buyers can evaluate data quality before purchasing.

## Current State

- `SampleGallery` renders **all** samples as an HTML5 `<video>` element (`DataBrokerage.tsx:120-134`)
- `SampleUploader` accepts `video/*, image/*, .parquet, .hdf5, .rosbag, .mcap` (`DataBrokerage.tsx:974`)
- Sample metadata includes `content_type` and `duration_seconds` but neither is used for rendering
- No modality-aware upload validation — a listing tagged `audio` can upload `.parquet` with no guidance

## Architecture: Two-Level Dispatch

Sample rendering is determined by a two-level lookup:

1. **Layer 1 — Content type / file extension** (resolves most formats unambiguously)
2. **Layer 2 — Listing modality tags** (resolves ambiguous formats like `.parquet` and `.hdf5`)

```
Sample file arrives → check content_type / extension
  │
  ├── video/*              → HTML5 <video> player
  ├── image/*              → HTML5 <img> tag
  ├── audio/*              → HTML5 <audio> player
  ├── .rosbag / .mcap      → Rerun web viewer
  ├── .rrd                 → Rerun web viewer (native format)
  ├── .json                → JSON / text viewer
  ├── .parquet / .hdf5     → Layer 2: check listing modality
  │     │   NOTE: Rerun web viewer cannot load raw .parquet/.hdf5.
  │     │   Providers must convert to .rrd for 3D preview.
  │     ├── time-series modalities
  │     │   (imu, force_torque, proprioception, tactile)
  │     │                  → Time-series chart (Phase 3)
  │     ├── text modalities
  │     │   (language_annotations)
  │     │                  → JSON / text viewer
  │     └── other          → Download link
  └── anything else        → Download link with file metadata
```

## Modality-Aware Upload Validation

When a provider uploads a sample, the system should validate file type against the listing's modality tags and surface guidance. This is a **soft validation** (warn, don't block) since edge cases exist.

### Recommended file types by modality

| Modality | Recommended uploads | Accept filter |
|---|---|---|
| `rgb` | `.mp4`, `.webm`, `.mov`, `.png`, `.jpg` | `video/*,image/*` |
| `rgbd` | `.rosbag`, `.mcap`, `.rrd`, `.hdf5`, `.mp4` | `video/*,.rosbag,.mcap,.rrd,.hdf5` |
| `depth` | `.png`, `.hdf5`, `.rosbag`, `.mcap`, `.rrd` | `image/*,.hdf5,.rosbag,.mcap,.rrd` |
| `lidar` | `.rosbag`, `.mcap`, `.rrd`, `.parquet`, `.hdf5` | `.rosbag,.mcap,.rrd,.parquet,.hdf5` |
| `radar` | `.rosbag`, `.mcap`, `.rrd`, `.parquet`, `.hdf5` | `.rosbag,.mcap,.rrd,.parquet,.hdf5` |
| `point_cloud` | `.rosbag`, `.mcap`, `.rrd`, `.parquet`, `.hdf5` | `.rosbag,.mcap,.rrd,.parquet,.hdf5` |
| `motion_capture` | `.rrd`, `.parquet`, `.hdf5`, `.mcap` | `.rrd,.parquet,.hdf5,.mcap` |
| `tactile` | `.parquet`, `.hdf5`, `.mp4`, `.png`, `.rrd` | `video/*,image/*,.parquet,.hdf5,.rrd` |
| `force_torque` | `.parquet`, `.hdf5`, `.rosbag`, `.rrd` | `.parquet,.hdf5,.rosbag,.rrd` |
| `proprioception` | `.parquet`, `.hdf5`, `.rosbag`, `.rrd` | `.parquet,.hdf5,.rosbag,.rrd` |
| `imu` | `.parquet`, `.hdf5`, `.rosbag`, `.rrd` | `.parquet,.hdf5,.rosbag,.rrd` |
| `audio` | `.wav`, `.mp3`, `.flac`, `.ogg` | `audio/*` |
| `language_annotations` | `.json`, `.parquet` | `.json,.parquet,application/json` |
| `thermal` | `.mp4`, `.png`, `.hdf5`, `.rrd` | `video/*,image/*,.hdf5,.rrd` |
| `event_camera` | `.hdf5`, `.rosbag`, `.mcap`, `.rrd` | `.hdf5,.rosbag,.mcap,.rrd` |
| `other` | Any | `*` |

When a listing has **multiple modalities**, the accept filter is the union of all applicable filters.

### Validation behavior

- **Dynamic accept filter**: The `<input type="file" accept="...">` attribute should be computed from the listing's modality tags
- **Soft warning**: If a provider uploads a file that doesn't match recommended types, show a yellow warning (not a hard block): *"This file type is uncommon for [modality] datasets. Buyers may not be able to preview it. Consider uploading a .rrd preview alongside your data files."*
- **Encourage .rrd**: For any non-video/image modality, show a tip suggesting providers generate `.rrd` preview files using the Rerun Python SDK

## Phase 1: Content-Type Dispatcher + Native Formats

**Goal**: Replace the monolithic `<video>` player with a component that picks the right renderer based on file type.

### Changes

1. **Update `SampleGallery` to accept `content_type` in sample objects**
   - Currently: `samples: Array<{ id: string; url: string; filename: string }>`
   - After: `samples: Array<{ id: string; url: string; filename: string; content_type: string }>`
   - The Listing interface already has `content_type` on samples — just thread it through

2. **Create `SampleRenderer` dispatcher component**
   ```
   function SampleRenderer({ sample, modalities }) {
     const ext = getExtension(sample.filename);
     const ct = sample.content_type;

     if (ct.startsWith('video/'))  return <video ...>;
     if (ct.startsWith('image/'))  return <img ...>;
     if (ct.startsWith('audio/'))  return <audio ...>;
     if (ext === 'json')           return <JsonViewer ...>;
     // Phase 2: Rerun
     // Phase 3: Charts
     return <DownloadLink ...>;
   }
   ```

3. **Add `<audio>` player styling** (minimal — native controls with consistent border/radius)

4. **Add `<img>` display** with click-to-zoom or lightbox

5. **Add download link fallback** showing filename, file size, and content type

6. **Update `SampleUploader` accept filter** to be modality-aware (dynamic)

### Dependencies
- None (all native HTML elements)

### Estimated scope
- ~150 lines of new component code
- Update SampleGallery props threading
- Update SampleUploader file input

## Phase 2: Rerun Web Viewer Integration

**Goal**: Embed Rerun's WASM viewer for 3D/spatial data and robotics container formats.

**Status**: Phase 1 complete — `.rrd`, `.rosbag`, `.mcap` currently render as download cards. Phase 2 replaces those with an embedded Rerun viewer.

### Step 2.1: Install dependency

```bash
pnpm add @rerun-io/web-viewer-react
```

This pulls in `@rerun-io/web-viewer` (core WASM bundle) as a transitive dependency. The WASM binary is ~16MB unpacked — must be lazy-loaded (Step 2.3).

### Step 2.2: Add `rerun` category to dispatcher

**File**: `src/components/DataBrokerage.tsx`

Update `getSampleCategory()` to return a new `'rerun'` category:

```typescript
type SampleCategory = 'video' | 'image' | 'audio' | 'json' | 'rerun' | 'download';

function getSampleCategory(contentType?: string, filename?: string): SampleCategory {
  // ... existing video/image/audio/json checks ...
  if (['rrd', 'rosbag', 'mcap'].includes(ext)) return 'rerun';
  return 'download';
}
```

This must be inserted **before** the final `return 'download'` fallback so `.rrd`, `.rosbag`, and `.mcap` are caught.

### Step 2.3: Create lazy-loaded RerunViewer component

**File**: `src/components/DataBrokerage.tsx`

Use React.lazy + dynamic import so the ~16MB WASM bundle only loads when a Rerun sample is actually viewed:

```typescript
const RerunViewer = React.lazy(() =>
  import('@rerun-io/web-viewer-react').then(mod => ({ default: mod.default }))
);

function RerunSampleViewer({ url }: { url: string }) {
  return (
    <Suspense fallback={
      <div className="db-rerun-loading">Loading 3D viewer...</div>
    }>
      <div className="db-rerun-container">
        <RerunViewer rrd={url} width="100%" height="100%" hide_welcome_screen />
      </div>
    </Suspense>
  );
}
```

Key decisions:
- `React.lazy` ensures the WASM is not in the main bundle — only fetched when a Rerun sample is active
- `Suspense` shows a loading state while the ~16MB viewer downloads
- `hide_welcome_screen` suppresses Rerun's default splash

### Step 2.4: Wire into SampleRenderer

**File**: `src/components/DataBrokerage.tsx`

Add the `'rerun'` case to the `SampleRenderer` switch:

```typescript
case 'rerun':
  return <RerunSampleViewer url={sample.url} />;
```

This goes between `'json'` and `'download'` cases.

### Step 2.5: Thread modalities through for future Phase 3 use

`SampleRenderer` and `SampleGallery` accept a `modalities` prop (plumbed through from both call sites). This is currently used only for the `getUploadHint` in SampleUploader, but Phase 3 will use it for modality-dependent chart rendering of `.parquet`/`.hdf5` files.

**Important**: The Rerun web viewer **cannot load raw `.parquet` or `.hdf5` files**. It only loads `.rrd`, `.rosbag`, and `.mcap`. Providers with spatial data in parquet/hdf5 should convert to `.rrd` using the Rerun Python SDK (documented in ProviderDocs). Do NOT route `.parquet`/`.hdf5` to the Rerun viewer.

Both call sites pass modalities:
- Buyer detail: `<SampleGallery samples={l.samples} modalities={...} />`
- Provider SampleUploader: `<SampleGallery samples={samples} modalities={modalities} />`

### Step 2.6: Add CSS for Rerun viewer

**File**: `src/App.css`

```css
.db-rerun-container { width: 100%; height: 500px; border-radius: 6px; border: 1px solid var(--border); overflow: hidden; }
.db-rerun-loading { width: 100%; height: 500px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-muted); font-family: 'Share Tech Mono', monospace; font-size: 11px; color: var(--text-dim); }
```

### Step 2.7: Update SampleUploader accepted formats

**File**: `src/components/DataBrokerage.tsx`

`.rrd` is already in `MODALITY_ACCEPT_MAP` for most modalities. Verify the fallback accept filter (line ~1046) includes `.rrd`:

```
'video/*,image/*,audio/*,.parquet,.hdf5,.rosbag,.mcap,.rrd,.json'
```

This is already the case — no change needed.

### Step 2.8: Update ProviderDocs with .rrd generation guide

**File**: `src/components/DataBrokerage.tsx` (ProviderDocs markdown section)

Add a section to the provider documentation explaining how to generate `.rrd` preview files:

```markdown
## Generating Preview Files (.rrd)

For 3D and spatial data (point clouds, depth maps, IMU, motion capture), we recommend
uploading `.rrd` preview files for the best buyer experience. These render as interactive
3D viewers in the catalog.

Install the Rerun SDK:
\`\`\`bash
pip install rerun-sdk
\`\`\`

Generate a preview from your data:
\`\`\`python
import rerun as rr

rr.init("my_dataset_preview")

# Example: log point cloud data
rr.log("point_cloud", rr.Points3D(positions=points, colors=colors))

# Example: log camera images
rr.log("camera/rgb", rr.Image(image_array))

# Example: log IMU as time series
for t, (ax, ay, az) in enumerate(imu_data):
    rr.set_time_sequence("frame", t)
    rr.log("imu/accel_x", rr.Scalar(ax))

rr.save("preview.rrd")
\`\`\`

Keep preview files under 50MB for fast loading. Trim to the first 10-30 seconds of your
recording for a representative sample.
```

### Step 2.9: Test with representative files

Before merging, test with:
- A real `.rrd` file from Rerun examples (https://app.rerun.io)
- A `.mcap` file from a ROS2 recording (experimental support — may need v0.25+)
- A `.rosbag` file from ROS1 (verify Rerun can load standard sensor_msgs)
- Fallback: if Rerun fails to load a file, verify it degrades gracefully (no crash, shows error)

### Dependencies
- `@rerun-io/web-viewer-react` (v0.31.1+) — npm package
- Browser WebGL/WebGPU support (fallback handled by Rerun internally)

### Risks & Mitigations
| Risk | Mitigation |
|---|---|
| WASM bundle (~16MB) bloats page load | React.lazy + dynamic import — only loads when viewer is active |
| Large .rrd files (>100MB) slow to load | Provider guidance: keep previews <50MB; Rerun v0.30+ has on-demand streaming |
| MCAP support is experimental | Test before launch; fall back to download card if Rerun throws |
| WebGL not available (rare) | Rerun handles fallback internally; worst case shows error message |

### Verification
1. `npx tsc -b` — zero errors
2. Upload a `.rrd` file → renders in embedded Rerun viewer
3. Upload a `.rosbag` → renders in Rerun viewer (or graceful fallback)
4. Upload a `.mcap` → renders in Rerun viewer (or graceful fallback)
5. Upload a `.parquet` for a `lidar` listing → shows download card (Rerun can't load raw parquet)
6. Upload a `.parquet` for an `imu` listing → shows download card (Phase 3 will add charts)
7. Non-Rerun samples (video, image, audio) → unchanged behavior
8. Initial page load does NOT include WASM bundle (verify with network tab)
9. Deploy to Vercel — build succeeds

## Phase 3: Time-Series Charts

**Goal**: Render interactive charts for numeric sensor data (IMU, force/torque, proprioception, tactile) stored in `.parquet` files.

**Status**: Phase 2 complete — `.parquet` and `.hdf5` currently render as download cards. Phase 3 adds client-side parquet reading + chart rendering for time-series modalities.

### Step 3.1: Install dependencies

```bash
pnpm add parquet-wasm recharts
```

- **`parquet-wasm`** (~2MB WASM) — reads Apache Parquet files in the browser via WebAssembly. No server-side changes needed.
- **`recharts`** — React-idiomatic charting library for time-series visualization.

Both should be lazy-loaded (dynamic import) so they don't bloat the main bundle.

### Step 3.2: Add `'timeseries'` category to dispatcher

**File**: `src/components/DataBrokerage.tsx`

Update `SampleCategory` type and `getSampleCategory()`:

```typescript
type SampleCategory = 'video' | 'image' | 'audio' | 'json' | 'rerun' | 'timeseries' | 'download';

const TIME_SERIES_MODALITIES = ['imu', 'force_torque', 'proprioception', 'tactile'];

function getSampleCategory(contentType?: string, filename?: string, modalities?: string[]): SampleCategory {
  // ... existing video/image/audio/json/rerun checks ...
  if (ext === 'parquet' && modalities?.some(m => TIME_SERIES_MODALITIES.includes(m))) return 'timeseries';
  return 'download';
}
```

Note: only `.parquet` gets the timeseries treatment — `.hdf5` cannot be read by `parquet-wasm` and remains a download card. Providers with HDF5 time-series data should convert to parquet or `.rrd`.

### Step 3.3: Create lazy-loaded ParquetChartViewer component

**File**: `src/components/DataBrokerage.tsx`

This component:
1. Fetches the `.parquet` file as an ArrayBuffer
2. Uses `parquet-wasm` to read the schema and first 1000 rows
3. Renders a `recharts` `LineChart` with auto-detected numeric columns

```typescript
const LazyParquetChart = React.lazy(() => import('./ParquetChartViewer'));
```

### Step 3.4: Create ParquetChartViewer module

**File**: `src/components/ParquetChartViewer.tsx` (new file)

This is a separate file so React.lazy can code-split it (with its parquet-wasm + recharts dependencies).

Core logic:
1. **Fetch**: `fetch(url).then(r => r.arrayBuffer())`
2. **Parse**: Use `parquet-wasm` to read the parquet file:
   ```typescript
   import { readParquet } from 'parquet-wasm';
   const table = readParquet(new Uint8Array(buffer));
   ```
3. **Extract columns**: Read schema to find numeric columns. Pick the first column as time/index axis. Render remaining numeric columns as line series.
4. **Limit rows**: Only use the first 1000 rows for rendering performance.
5. **Render**: `recharts` `LineChart` with `ResponsiveContainer`, one `Line` per numeric column. Include `Tooltip`, `Legend`, `XAxis`, `YAxis`.
6. **Stats bar**: Below the chart, show column count, row count, and basic stats (min/max/mean for each column).
7. **Loading/error states**: Show styled fallbacks matching the app's design system.

### Step 3.5: Wire into SampleRenderer

**File**: `src/components/DataBrokerage.tsx`

Add the `'timeseries'` case to `SampleRenderer`:

```typescript
case 'timeseries':
  return (
    <Suspense fallback={<div className="db-chart-loading">Loading chart...</div>}>
      <LazyParquetChart url={sample.url} filename={sample.filename} />
    </Suspense>
  );
```

Activate the `_modalities` parameter in `getSampleCategory` (currently prefixed with `_` to suppress unused warning — remove the underscore).

### Step 3.6: Add CSS for chart viewer

**File**: `src/App.css`

```css
.db-chart-container { width: 100%; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: var(--bg-card); }
.db-chart-header { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--border); background: var(--bg-muted); }
.db-chart-filename { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: var(--text-secondary); }
.db-chart-meta { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: var(--text-dim); }
.db-chart-body { padding: 12px; height: 350px; }
.db-chart-stats { display: flex; gap: 16px; padding: 8px 12px; border-top: 1px solid var(--border); background: var(--bg-muted); flex-wrap: wrap; }
.db-chart-stat { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: var(--text-dim); }
.db-chart-stat-label { text-transform: uppercase; letter-spacing: 1px; margin-right: 4px; }
.db-chart-stat-value { color: var(--text); }
.db-chart-loading, .db-chart-error { width: 100%; height: 350px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 6px; background: var(--bg-muted); font-family: 'Share Tech Mono', monospace; font-size: 11px; color: var(--text-dim); }
```

### Step 3.7: Update ProviderDocs

Add guidance for time-series data providers:

```markdown
### Time-Series Data (.parquet)

For IMU, force/torque, proprioception, and tactile data, upload `.parquet` samples
for interactive chart previews. The marketplace reads your parquet file in the browser
and renders a time-series chart for buyers.

Best practices:
- Use Apache Parquet format (pandas: `df.to_parquet("sample.parquet")`)
- Include a time/timestamp column as the first column
- Keep numeric columns (accel_x, accel_y, accel_z, etc.) as float32/float64
- Limit sample files to the first 10-30 seconds (~1000-5000 rows)
- Maximum 500MB per file
```

### Step 3.8: Handle edge cases

- **Empty parquet files**: Show "No data" message
- **Non-numeric columns**: Skip them (only chart numeric columns)
- **Too many columns (>20)**: Show first 10 with a "showing 10 of N columns" note
- **Large files**: Only read first 1000 rows regardless of file size
- **WASM load failure**: Fall back to download card with error message
- **HDF5 files**: Remain as download cards — `parquet-wasm` cannot read HDF5. Provider guidance: convert to parquet or .rrd.

### Dependencies
- `parquet-wasm` — Apache Parquet reader compiled to WASM (~2MB)
- `recharts` — React charting library (well-maintained, 22k+ GitHub stars)

### Risks & Mitigations
| Risk | Mitigation |
|---|---|
| parquet-wasm WASM bundle (~2MB) | React.lazy + dynamic import — only loads when a parquet chart is viewed |
| recharts bundle size (~200KB) | Code-split into ParquetChartViewer module |
| Large parquet files | Read only first 1000 rows; show row count in stats |
| Non-standard parquet schemas | Auto-detect numeric columns; skip non-numeric; show filename as fallback |
| HDF5 files not supported | Documented limitation; providers guided to convert to parquet |

### Verification
1. `npx tsc -b` — zero errors
2. Upload a `.parquet` file for an `imu` listing → renders interactive line chart
3. Upload a `.parquet` file for a `force_torque` listing → renders chart with 6 columns
4. Upload a `.parquet` file for an `rgb` listing → still shows download card (not a time-series modality)
5. Upload a `.hdf5` file for an `imu` listing → still shows download card
6. Chart shows column names in legend, tooltip on hover, row count in stats
7. Rerun viewer (.rrd, .rosbag, .mcap) still works — no regressions
8. Initial page load does NOT include parquet-wasm or recharts (verify with network tab)
9. Deploy to Vercel — build succeeds

## Phase 4: Enhanced Gallery UX

**Goal**: Improve the overall sample browsing experience with thumbnail previews, expanded views, and richer metadata display.

**Status**: Phases 1-3 complete — samples render correctly by type with format labels in the thumbnail strip. Phase 4 enhances the browsing and discovery experience.

### Step 4.1: Catalog row thumbnail previews

**File**: `src/components/DataBrokerage.tsx` (BuyData catalog list, ~line 495)

Currently catalog rows are text-only (title, provider, modality, price). Add a small thumbnail preview:

- The `Listing` interface already has `thumbnail_url?: string | null` (line 65)
- If `thumbnail_url` is set, render a small `<img>` (48x32px) at the left of the catalog row
- If no `thumbnail_url`, show a format-based icon placeholder using the first sample's type label
- Add CSS: `db-catalog-row__thumb` with `width: 48px; height: 32px; object-fit: cover; border-radius: 3px; border: 1px solid var(--border); flex-shrink: 0;`

This is a frontend-only change — `thumbnail_url` is populated by the backend (or could be derived from the first image sample's URL).

### Step 4.2: Rich thumbnail strip with visual previews

**File**: `src/components/DataBrokerage.tsx` (SampleGallery, ~line 240)

Currently thumbnails show format labels (MP4, PNG, BAG). Enhance with visual thumbnails where possible:

- **Video samples**: Use the video URL with a `<video>` element as poster (muted, no controls, first frame)
- **Image samples**: Show a mini `<img>` as the thumbnail
- **Other formats**: Keep the text label (RRD, PQT, BAG, etc.)

Update SampleGallery:
```typescript
function SampleThumb({ sample, active, onClick }: { sample: Sample; active: boolean; onClick: () => void }) {
  const category = getSampleCategory(sample.content_type, sample.filename);
  const isVisual = category === 'image' || category === 'video';

  return (
    <div className={`db-thumb${active ? ' db-thumb--active' : ''}${isVisual ? ' db-thumb--visual' : ''}`}
      onClick={onClick} title={sample.filename}>
      {isVisual ? (
        <img className="db-thumb-img" src={sample.url} alt="" />
      ) : (
        getSampleTypeLabel(sample.filename)
      )}
    </div>
  );
}
```

CSS additions:
```css
.db-thumb--visual { padding: 0; overflow: hidden; }
.db-thumb-img { width: 100%; height: 100%; object-fit: cover; }
```

### Step 4.3: Expanded / fullscreen view

**File**: `src/components/DataBrokerage.tsx`

Add a fullscreen toggle for sample viewers that benefit from more space:

- **Rerun viewer**: Add an "Expand" button that toggles `db-rerun-container` height from 500px to `calc(100vh - 100px)` with a close button overlay
- **Images**: Click-to-expand into a centered lightbox overlay (`db-lightbox`) with a dim background
- **Video**: Theater mode — expand to full-width with dark background padding
- **Charts**: Expand height from 350px to 600px

Implementation:
```typescript
function SampleGallery({ samples, modalities = [] }: { samples: Sample[]; modalities?: string[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);
  // ...
}
```

CSS:
```css
.db-sample-section--expanded { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; padding: 20px; }
.db-sample-section--expanded .db-rerun-container { height: calc(100vh - 100px); }
.db-sample-section--expanded .db-chart-body { height: 600px; }
.db-sample-expand-btn { position: absolute; top: 8px; right: 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-family: 'Share Tech Mono', monospace; font-size: 9px; cursor: pointer; color: var(--text-dim); z-index: 10; }
.db-sample-expand-btn:hover { color: var(--text); border-color: var(--accent); }
```

### Step 4.4: Sample metadata display

**File**: `src/components/DataBrokerage.tsx`

Add a metadata bar below the active sample showing relevant info:

```typescript
function SampleMetadata({ sample }: { sample: Sample & { duration_seconds?: number | null } }) {
  const ext = sample.filename.split('.').pop()?.toUpperCase();
  return (
    <div className="db-sample-meta">
      <span className="db-sample-meta-item">{ext}</span>
      {sample.content_type && <span className="db-sample-meta-item">{sample.content_type}</span>}
      {sample.duration_seconds && <span className="db-sample-meta-item">{sample.duration_seconds}s</span>}
    </div>
  );
}
```

This requires threading `duration_seconds` through the `Sample` interface (currently optional on Listing but not on Sample). Update:
```typescript
interface Sample {
  id: string;
  url: string;
  filename: string;
  content_type?: string;
  duration_seconds?: number | null;
}
```

CSS:
```css
.db-sample-meta { display: flex; gap: 8px; margin-top: 6px; }
.db-sample-meta-item { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; padding: 2px 6px; border: 1px solid var(--border); border-radius: 3px; }
```

### Step 4.5: Keyboard navigation for samples

Add keyboard controls when the sample gallery is focused:
- Left/Right arrows to switch between samples
- `F` key to toggle fullscreen
- `Escape` to exit fullscreen

```typescript
useEffect(() => {
  if (!expanded) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setExpanded(false);
    if (e.key === 'ArrowLeft') setActiveIdx(i => Math.max(0, i - 1));
    if (e.key === 'ArrowRight') setActiveIdx(i => Math.min(samples.length - 1, i + 1));
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [expanded, samples.length]);
```

### Dependencies
- None — all native HTML/CSS/React

### Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Visual thumbnails for video could be slow (loading video for poster) | Use image samples for visual thumbs; video shows format label unless `thumbnail_url` exists |
| Lightbox/fullscreen z-index conflicts | Use z-index: 1000 with portal or fixed positioning |
| Keyboard events capturing when not focused | Only attach keyboard listeners when expanded |
| `duration_seconds` not always available | Conditionally render, graceful null handling |

### Verification
1. `npx tsc -b` — zero errors
2. Catalog browse: listings with `thumbnail_url` show a small image preview
3. Image samples show visual thumbnails in the strip
4. Click expand button → sample fills screen; Escape to close
5. Left/Right arrow keys navigate between samples in expanded mode
6. Sample metadata bar shows file extension and duration where available
7. All Phase 1-3 renderers still work — no regressions
8. Deploy to Vercel — build succeeds

## Phase 5: Provider Tooling

**Goal**: Make it easy for providers to generate high-quality previews and incentivize richer sample uploads.

**Status**: Phases 1-4 complete — the frontend can render video, image, audio, JSON, Rerun 3D, parquet charts, with fullscreen and metadata. Phase 5 focuses on the provider side: making it trivial to produce high-quality previews that drive buyer conversion.

### Step 5.1: Create atlas-preview-generator Python package

**Location**: New repo `atlas-preview-generator` (or `tools/preview-generator/` in this repo)

A CLI tool that reads common robotics data formats and produces trimmed `.rrd` preview files ready for upload to Atlas.

```
atlas-preview --input recording.rosbag --output preview.rrd --duration 30
atlas-preview --input trajectory.parquet --modality imu --output preview.rrd
atlas-preview --input pointcloud.hdf5 --modality lidar --output preview.rrd
```

**Supported input formats:**
- `.rosbag` / `.mcap` → auto-detect topics, log to Rerun (images, point clouds, transforms, IMU)
- `.parquet` → detect numeric columns, log as time-series scalars or Points3D depending on `--modality`
- `.hdf5` → read datasets, log based on shape/dtype (images, arrays, scalars)
- `.mp4` / `.mov` → extract frames, log as Rerun `Image` entities

**Implementation:**
```python
# atlas_preview/cli.py
import click
import rerun as rr

@click.command()
@click.option('--input', required=True, help='Input data file')
@click.option('--output', default='preview.rrd', help='Output .rrd file')
@click.option('--duration', default=30, help='Max seconds to include')
@click.option('--modality', default=None, help='Hint for data interpretation')
def generate(input, output, duration, modality):
    rr.init("atlas_preview")
    # ... format-specific loading logic
    rr.save(output)
```

**Dependencies**: `rerun-sdk`, `rosbags` (for .rosbag reading), `mcap`, `pandas`, `h5py`, `opencv-python`, `click`

**Distribution**: Publish to PyPI as `atlas-preview-generator`. Install via `pip install atlas-preview-generator`.

### Step 5.2: Add downloadable preview script to ProviderDocs

**File**: `src/components/DataBrokerage.tsx` (ProviderDocs section)

Update the existing .rrd generation guide to reference the CLI tool:

```markdown
## Generating Preview Files

### Quick start (CLI tool)
\`\`\`bash
pip install atlas-preview-generator
atlas-preview --input recording.rosbag --output preview.rrd --duration 30
\`\`\`

### Manual (Rerun Python SDK)
[existing code examples...]
```

Also add a "Download preview script" link in the SampleUploader UI for non-video modalities, pointing to the PyPI package or a hosted script.

### Step 5.3: Preview quality indicator on provider listings

**File**: `src/components/DataBrokerage.tsx` (ProviderDashboard My Listings)

Show a "Preview Quality" score on each listing in the provider's dashboard:

```typescript
function getPreviewScore(samples: Sample[]): { score: number; label: string; suggestions: string[] } {
  if (!samples || samples.length === 0) return { score: 0, label: 'None', suggestions: ['Upload at least one sample'] };
  
  const hasVideo = samples.some(s => getSampleCategory(s.content_type, s.filename) === 'video');
  const hasImage = samples.some(s => getSampleCategory(s.content_type, s.filename) === 'image');
  const hasRerun = samples.some(s => getSampleCategory(s.content_type, s.filename) === 'rerun');
  const hasChart = samples.some(s => getSampleCategory(s.content_type, s.filename) === 'timeseries');
  
  let score = 1; // base: has at least one sample
  const suggestions: string[] = [];
  
  if (hasVideo || hasImage) score += 1;
  else suggestions.push('Add a video or image sample for visual preview');
  
  if (hasRerun) score += 1;
  else if (/* listing has spatial modalities */) suggestions.push('Upload a .rrd file for interactive 3D preview');
  
  if (hasChart) score += 1;
  else if (/* listing has time-series modalities */) suggestions.push('Upload a .parquet sample for chart preview');
  
  if (samples.length >= 3) score += 1;
  else suggestions.push('Add more samples (3+ recommended)');
  
  const labels = ['None', 'Basic', 'Good', 'Great', 'Excellent', 'Outstanding'];
  return { score, label: labels[score] ?? 'Outstanding', suggestions };
}
```

Render as a small badge + expandable suggestions list on each listing card in My Listings:

```typescript
<div className="db-preview-score">
  <span className={`db-preview-score__badge db-preview-score--${score >= 4 ? 'high' : score >= 2 ? 'mid' : 'low'}`}>
    {label}
  </span>
  {suggestions.length > 0 && (
    <div className="db-preview-score__tips">
      {suggestions.map((s, i) => <div key={i} className="db-preview-score__tip">{s}</div>)}
    </div>
  )}
</div>
```

### Step 5.4: Preview quality CSS

**File**: `src/App.css`

```css
.db-preview-score { margin-top: 8px; }
.db-preview-score__badge { font-family: 'Share Tech Mono', monospace; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; padding: 2px 8px; border-radius: 3px; }
.db-preview-score--high { background: #1a3a1a; color: #4ade80; border: 1px solid #2d5a2d; }
.db-preview-score--mid { background: #3a3a1a; color: #facc15; border: 1px solid #5a5a2d; }
.db-preview-score--low { background: #3a1a1a; color: #f87171; border: 1px solid #5a2d2d; }
.db-preview-score__tips { margin-top: 6px; }
.db-preview-score__tip { font-family: 'Share Tech Mono', monospace; font-size: 9px; color: var(--text-dim); line-height: 1.6; }
.db-preview-score__tip::before { content: '→ '; color: var(--text-dim); }
```

### Step 5.5: Auto-preview generation (stretch goal — requires backend)

**Scope**: When a provider uploads a `.rosbag` or `.mcap`, the backend automatically generates a `.rrd` preview using the Rerun Python SDK and stores it alongside the sample.

**Architecture**:
1. After `POST /provider/listings/{id}/samples/confirm`, the backend checks the file extension
2. If `.rosbag` or `.mcap`, enqueue a background job:
   - Download the file from R2
   - Run `atlas-preview-generator` to produce a `.rrd` preview (first 30 seconds)
   - Upload the `.rrd` back to R2
   - Update the sample record with a `preview_rrd_url` field
3. The frontend checks for `preview_rrd_url` on the sample and renders the Rerun viewer using that URL instead of the raw file URL

**This step requires backend changes to `brokerage.humanoids.fyi`** — not implementable frontend-only. Document as a future enhancement.

### Dependencies
- **Step 5.1**: Python (rerun-sdk, rosbags, mcap, pandas, h5py, click)
- **Steps 5.2-5.4**: None — frontend-only changes
- **Step 5.5**: Backend changes (out of scope for frontend repo)

### Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Preview generator CLI has many Python deps | Provide a Docker image as alternative |
| Score calculation may not match all edge cases | Score is advisory, not blocking — providers can still list without samples |
| Auto-preview background job could be slow | Queue-based, provider sees "preview generating..." status |
| .rosbag reading requires specific ROS message type support | Use `rosbags` library which handles standard types; fail gracefully for custom types |

### Verification
1. `pip install atlas-preview-generator && atlas-preview --help` — CLI works
2. `atlas-preview --input test.rosbag --output preview.rrd` — produces valid .rrd
3. Preview quality score renders on provider listings with correct color coding
4. Actionable suggestions appear for listings missing key sample types
5. ProviderDocs reference the CLI tool with install instructions
6. `npx tsc -b` — zero errors for frontend changes (steps 5.2-5.4)
7. Deploy to Vercel — build succeeds

## File Format Reference

### Formats that render natively in browser
| Format | Renderer | Notes |
|---|---|---|
| `.mp4`, `.webm`, `.mov` | `<video>` | Most universal |
| `.png`, `.jpg`, `.webp` | `<img>` | Including depth maps stored as 16-bit PNG |
| `.wav`, `.mp3`, `.ogg`, `.flac` | `<audio>` | Native browser support |
| `.json` | JSON viewer | Pretty-printed, collapsible |

### Formats requiring Rerun viewer
| Format | Notes |
|---|---|
| `.rrd` | Rerun native recording — best quality, any modality |
| `.rosbag` | ROS bag — Rerun loads standard message types |
| `.mcap` | MCAP container — experimental Rerun support (v0.25+) |
| `.parquet` / `.hdf5` (3D data) | Requires conversion to `.rrd` at upload time |

### Formats requiring server-side processing
| Format | Processing | Output |
|---|---|---|
| `.parquet` (time-series) | Extract first N rows → JSON | Chart-ready summary |
| `.hdf5` (time-series) | Extract first N rows → JSON | Chart-ready summary |
| `.parquet` / `.hdf5` (3D) | Convert to `.rrd` | Rerun-ready preview |

## Implementation Priority

| Phase | Effort | Impact | Dependencies |
|---|---|---|---|
| **Phase 1**: Content-type dispatcher | Small | High — fixes broken display for images, audio | None |
| **Phase 2**: Rerun integration | Medium | High — enables 3D/spatial data preview | `@rerun-io/web-viewer-react` |
| **Phase 3**: Time-series charts | Medium | Medium — covers IMU/F-T/proprioception | Chart library + backend or parquet-wasm |
| **Phase 4**: Enhanced gallery UX | Medium | Medium — improves browsing experience | Phases 1-2 |
| **Phase 5**: Provider tooling | Large | High long-term — improves data quality | Phases 1-3, Rerun Python SDK |
