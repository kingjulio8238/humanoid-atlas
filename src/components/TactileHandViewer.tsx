import { useState, useEffect, Suspense } from 'react';
import React from 'react';

/**
 * Tactile Pressure Viewer
 * Currently shows chart view only. 3D hand view disabled for now.
 */

const LazyChart = React.lazy(() => import('./ParquetChartViewer'));

interface TactileHandViewerProps {
  url: string;
  filename: string;
}

export default function TactileHandViewer({ url, filename }: TactileHandViewerProps) {
  const [data, setData] = useState<Record<string, number>[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  if (error) return <div className="db-chart-error">{error}</div>;
  if (!data) return <div className="db-chart-loading">Loading tactile data...</div>;

  return (
    <div className="db-tactile-viewer">
      <div className="db-tactile-header">
        <span className="db-chart-filename">{filename}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="db-chart-meta">{data.length} frames · {columns.length} sensors</span>
        </div>
      </div>

      <Suspense fallback={<div className="db-chart-loading">Loading chart...</div>}>
        <LazyChart url={url} filename={filename} />
      </Suspense>
    </div>
  );
}
