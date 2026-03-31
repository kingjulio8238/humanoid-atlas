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

**Goal**: Improve the overall sample browsing experience.

### Changes

1. **Thumbnail previews in catalog browse view**
   - Show `thumbnail_url` (already on Listing interface) in catalog rows
   - For video samples, generate poster frame server-side at upload time
   - For image samples, use the image itself as thumbnail

2. **Multi-format sample strip**
   - Replace numbered buttons (1, 2, 3) with format-aware thumbnails
   - Show file type icon + filename snippet for each sample
   - Group samples by type (video samples, data samples, etc.)

3. **Fullscreen / expanded view**
   - Click-to-expand for Rerun viewer (needs more space for 3D data)
   - Lightbox for images
   - Theater mode for video

4. **Sample metadata display**
   - Show file size, duration (for video/audio), row count (for parquet)
   - Show content type badge next to each sample

## Phase 5: Provider Tooling

**Goal**: Make it easy for providers to generate high-quality previews.

### Changes

1. **Rerun preview generation CLI/guide**
   - Publish a Python script / notebook that providers can run:
     ```python
     # atlas-preview-generator
     # Reads .rosbag/.mcap/.parquet and produces a trimmed .rrd preview
     import rerun as rr
     rr.init("preview")
     # ... load and log first 10 seconds of data
     rr.save("preview.rrd")
     ```
   - Host in a separate repo or as a downloadable script from provider docs

2. **Auto-preview generation** (stretch goal)
   - When a provider uploads a `.rosbag` or `.mcap`, the backend automatically generates a `.rrd` preview
   - Requires server-side Rerun SDK (Python) or a conversion worker
   - Would eliminate the need for providers to generate previews manually

3. **Preview quality scoring**
   - Show providers a "preview quality" indicator on their listings
   - Listings with video/Rerun previews rank higher in catalog search
   - Encourage richer previews to drive buyer conversion

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
