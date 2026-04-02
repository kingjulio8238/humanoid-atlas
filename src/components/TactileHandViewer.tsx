import { useState, useEffect, useCallback, Suspense } from 'react';
import React from 'react';
import { autoMapTaxels, TactileHand3DScene } from './TactileHand3D';

/**
 * Tactile Pressure Viewer
 * Shows 3D hand with pressure overlay (if columns map to hand regions)
 * + always shows a chart fallback via ParquetChartViewer.
 */

const LazyChart = React.lazy(() => import('./ParquetChartViewer'));

interface TactileHandViewerProps {
  url: string;
  filename: string;
}

export default function TactileHandViewer({ url, filename }: TactileHandViewerProps) {
  const [data, setData] = useState<Record<string, number>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ default: initWasm, readParquet }, { tableFromIPC }] = await Promise.all([
          import('parquet-wasm'),
          import('apache-arrow'),
        ]);
        await initWasm();

        const resp = await fetch(url);
        const buffer = new Uint8Array(await resp.arrayBuffer());
        const wasmTable = readParquet(buffer);
        const table = tableFromIPC(wasmTable.intoIPCStream());

        const INDEX_COLS = new Set(['timestamp', 'time', 'frame', 'index', '_idx', 'step']);
        const cols = table.schema.fields
          .filter(f => {
            const dt = f.type.toString().toLowerCase();
            return (dt.includes('float') || dt.includes('int') || dt.includes('double')) && !INDEX_COLS.has(f.name.toLowerCase());
          })
          .map(f => f.name);

        const rows: Record<string, number>[] = [];
        for (let i = 0; i < Math.min(table.numRows, 1000); i++) {
          const row: Record<string, number> = {};
          for (const col of cols) {
            const vec = table.getChild(col);
            if (vec) {
              const val = vec.get(i);
              row[col] = typeof val === 'number' ? val : Number(val);
            }
          }
          rows.push(row);
        }
        setData(rows);
        setColumns(cols);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tactile data');
      }
    })();
  }, [url]);

  // Animation loop
  useEffect(() => {
    if (!playing || !data) return;
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % data.length);
    }, 30);
    return () => clearInterval(interval);
  }, [playing, data]);

  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFrame(parseInt(e.target.value));
    setPlaying(false);
  }, []);

  if (error) return <div className="db-chart-error">{error}</div>;
  if (!data) return <div className="db-chart-loading">Loading tactile data...</div>;

  // Auto-map columns to hand bones
  const taxelToBone = autoMapTaxels(columns);
  const mappedCount = Object.keys(taxelToBone).length;
  const hasMappableData = mappedCount >= 4; // At least 4 columns map to hand regions
  const hasLeft = columns.some(c => c.startsWith('l_') || c.toLowerCase().startsWith('left'));
  const hasRight = columns.some(c => c.startsWith('r_') || c.toLowerCase().startsWith('right'));

  const currentFrame = data[frame] ?? {};

  return (
    <div className="db-tactile-viewer">
      <div className="db-tactile-header">
        <span className="db-chart-filename">{filename}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="db-chart-meta">{data.length} frames · {columns.length} sensors</span>
          {hasMappableData && (
            <button className="db-tactile-toggle" onClick={() => setShowChart(!showChart)}>
              {showChart ? '3D Hand View' : 'Chart View'}
            </button>
          )}
        </div>
      </div>

      {showChart || !hasMappableData ? (
        <Suspense fallback={<div className="db-chart-loading">Loading chart...</div>}>
          <LazyChart url={url} filename={filename} />
        </Suspense>
      ) : (
        <>
          <TactileHand3DScene
            pressures={currentFrame}
            taxelToBone={taxelToBone}
            hasLeft={hasLeft}
            hasRight={hasRight}
          />
          <div className="db-tactile-controls">
            <button className="db-tactile-play" onClick={() => setPlaying(!playing)}>
              {playing ? '❚❚' : '▶'}
            </button>
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={frame}
              onChange={handleScrub}
              className="db-tactile-scrubber"
            />
            <span className="db-tactile-frame">Frame {frame + 1}/{data.length}</span>
          </div>
          <div className="db-tactile-legend">
            <span className="db-tactile-legend-label">0%</span>
            <div className="db-tactile-legend-bar" />
            <span className="db-tactile-legend-label">100%</span>
          </div>
        </>
      )}
    </div>
  );
}
