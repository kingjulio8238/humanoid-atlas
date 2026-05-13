import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CHART_COLORS = [
  '#0f0f0f', '#4a4540', '#166534', '#7c4a1c', '#334e6f',
  '#6b3d5a', '#404040', '#14532d', '#6b4a1a', '#2d4a66',
];

const MAX_ROWS = 1000;
const MAX_COLUMNS = 10;

interface ChartData {
  columns: string[];
  rows: Record<string, number>[];
  totalRows: number;
  totalColumns: number;
  stats: Record<string, { min: number; max: number; mean: number }>;
}

async function loadParquet(url: string): Promise<ChartData> {
  const [{ default: initWasm, readParquet }, { tableFromIPC }] = await Promise.all([
    import('parquet-wasm'),
    import('apache-arrow'),
  ]);

  await initWasm();

  const resp = await fetch(url);
  const buffer = new Uint8Array(await resp.arrayBuffer());
  const wasmTable = readParquet(buffer);
  const table = tableFromIPC(wasmTable.intoIPCStream());

  // Find numeric columns, excluding index/time columns
  const INDEX_COLUMNS = new Set(['timestamp', 'time', 'frame', 'index', '_idx', 'step', 'episode_index', 'frame_index', 'task_index']);
  const allColumns: string[] = [];
  for (const field of table.schema.fields) {
    const dt = field.type.toString().toLowerCase();
    if (dt.includes('float') || dt.includes('int') || dt.includes('decimal') || dt.includes('double')) {
      if (!INDEX_COLUMNS.has(field.name.toLowerCase())) {
        allColumns.push(field.name);
      }
    }
  }

  const totalColumns = allColumns.length;
  const columns = allColumns.slice(0, MAX_COLUMNS);
  const totalRows = table.numRows;
  const rowCount = Math.min(totalRows, MAX_ROWS);

  // Extract rows
  const rows: Record<string, number>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, number> = { _idx: i };
    for (const col of columns) {
      const vec = table.getChild(col);
      if (vec) {
        const val = vec.get(i);
        row[col] = typeof val === 'number' ? val : Number(val);
      }
    }
    rows.push(row);
  }

  // Compute stats
  const stats: Record<string, { min: number; max: number; mean: number }> = {};
  for (const col of columns) {
    const vals = rows.map(r => r[col]).filter(v => v != null && !isNaN(v));
    if (vals.length > 0) {
      stats[col] = {
        min: Math.min(...vals),
        max: Math.max(...vals),
        mean: vals.reduce((s, v) => s + v, 0) / vals.length,
      };
    }
  }

  return { columns, rows, totalRows, totalColumns, stats };
}

export default function ParquetChartViewer({ url, filename }: { url: string; filename: string }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadParquet(url)
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load parquet file'));
  }, [url]);

  if (error) {
    return <div className="db-chart-error">{error}</div>;
  }

  if (!data) {
    return <div className="db-chart-loading">Loading chart...</div>;
  }

  if (data.columns.length === 0) {
    return <div className="db-chart-error">No numeric columns found in {filename}</div>;
  }

  return (
    <div className="db-chart-container">
      <div className="db-chart-header">
        <span className="db-chart-filename">{filename}</span>
        <span className="db-chart-meta">
          {data.totalRows.toLocaleString()} rows &middot; {data.totalColumns} numeric col{data.totalColumns !== 1 ? 's' : ''}
          {data.totalRows > MAX_ROWS ? ` (showing first ${MAX_ROWS})` : ''}
          {data.totalColumns > MAX_COLUMNS ? ` (showing ${MAX_COLUMNS} of ${data.totalColumns})` : ''}
        </span>
      </div>
      <div className="db-chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <XAxis dataKey="_idx" tick={{ fontSize: 13, fontFamily: 'Share Tech Mono' }} stroke="#5a5a5a" />
            <YAxis tick={{ fontSize: 13, fontFamily: 'Share Tech Mono' }} stroke="#5a5a5a" width={60} />
            <Tooltip
              contentStyle={{ fontFamily: 'Share Tech Mono', fontSize: 14, background: '#0f0f0f', border: '1px solid #333', borderRadius: 3 }}
              labelStyle={{ color: '#c4bfb6' }}
              itemStyle={{ color: '#faf8f4' }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: 13 }} />
            {data.columns.map((col, i) => (
              <Line
                key={col}
                type="monotone"
                dataKey={col}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                dot={false}
                strokeWidth={1.5}
                name={col.replace(/_/g, ' ')}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="db-chart-stats">
        {data.columns.map(col => data.stats[col] && (
          <div key={col} className="db-chart-stat">
            <span className="db-chart-stat-label">{col.replace(/_/g, ' ')}:</span>
            <span className="db-chart-stat-value">
              {data.stats[col].min.toFixed(2)} / {data.stats[col].mean.toFixed(2)} / {data.stats[col].max.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
