import { useRef, useEffect, useState, useMemo } from 'react';
import type { RewardComparison } from '../data/types';

interface RewardChartProps {
  comparisons: RewardComparison[];
}

const PAD = { top: 28, right: 20, bottom: 36, left: 44 };

/** Interpolate score at continuous time t (0-1) from discrete scores array. */
function interpolateScore(scores: number[], t: number): number {
  const n = scores.length;
  const idx = t * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi || hi >= n) return scores[Math.min(lo, n - 1)];
  const frac = idx - lo;
  return scores[lo] * (1 - frac) + scores[hi] * frac;
}

function drawChart(
  canvas: HTMLCanvasElement,
  data: RewardComparison,
  enabledModels: Set<string>,
  progress: number, // 0-1, current video progress
  hoverX: number | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const plotW = w - PAD.left - PAD.right;
  const plotH = h - PAD.top - PAD.bottom;
  const toX = (t: number) => PAD.left + t * plotW;
  const toY = (v: number) => PAD.top + plotH * (1 - v);

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const y = PAD.top + plotH * (1 - i / 10);
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();
  }
  for (let i = 0; i <= 10; i++) {
    const x = PAD.left + plotW * (i / 10);
    ctx.beginPath();
    ctx.moveTo(x, PAD.top);
    ctx.lineTo(x, PAD.top + plotH);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = '#999';
  ctx.font = '9px "Share Tech Mono", monospace';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 10; i += 2) {
    const y = PAD.top + plotH * (1 - i / 10);
    ctx.fillText((i / 10).toFixed(1), PAD.left - 6, y + 3);
  }

  // X-axis labels
  ctx.textAlign = 'center';
  for (let i = 0; i <= 10; i += 2) {
    const x = PAD.left + plotW * (i / 10);
    ctx.fillText((i / 10).toFixed(1), x, PAD.top + plotH + 16);
  }

  // Axis titles
  ctx.fillStyle = '#aaa';
  ctx.font = '9px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Normalized Time', PAD.left + plotW / 2, h - 4);
  ctx.save();
  ctx.translate(10, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Progress (0\u20131)', 0, 0);
  ctx.restore();

  // Models to draw
  const models = data.models.filter((m) => enabledModels.has(m.id));
  const n = data.numFrames;

  // Draw each model line - progressively revealed up to `progress`
  for (const model of models) {
    const scores = model.scores;
    ctx.strokeStyle = model.color;
    ctx.lineWidth = model.dashPattern.length === 0 ? 2.5 : 2;
    ctx.setLineDash(model.dashPattern);

    // Draw line up to progress point
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      if (t > progress) break;
      const x = toX(t);
      const y = toY(scores[i]);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }

    // Interpolated leading edge to exact progress position
    if (started && progress > 0 && progress < 1) {
      const interpScore = interpolateScore(scores, progress);
      ctx.lineTo(toX(progress), toY(interpScore));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points only for revealed frames
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      if (t > progress) break;
      ctx.fillStyle = model.color;
      ctx.beginPath();
      ctx.arc(toX(t), toY(scores[i]), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Semi-transparent fill under the revealed line
    if (started) {
      ctx.fillStyle = model.color + '12'; // ~7% opacity
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(scores[0]));
      for (let i = 1; i < n; i++) {
        const t = i / (n - 1);
        if (t > progress) break;
        ctx.lineTo(toX(t), toY(scores[i]));
      }
      if (progress > 0 && progress < 1) {
        ctx.lineTo(toX(progress), toY(interpolateScore(scores, progress)));
      }
      // Close down to x-axis and back
      const lastT = Math.min(progress, 1);
      ctx.lineTo(toX(lastT), toY(0));
      ctx.lineTo(toX(0), toY(0));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Playhead vertical line
  if (progress > 0 && progress < 1) {
    const px = toX(progress);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(px, PAD.top);
    ctx.lineTo(px, PAD.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Percentage label
    const pctText = `${Math.round(progress * 100)}%`;
    ctx.fillStyle = '#555';
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = progress > 0.5 ? 'right' : 'left';
    ctx.fillText(pctText, progress > 0.5 ? px - 6 : px + 6, PAD.top - 6);
  }

  // Hover tooltip (only in revealed area)
  if (hoverX !== null && hoverX >= PAD.left && hoverX <= PAD.left + plotW) {
    const t = (hoverX - PAD.left) / plotW;
    if (t <= progress) {
      const frameIdx = Math.min(Math.round(t * (n - 1)), n - 1);
      const snapT = frameIdx / (n - 1);
      const snapX = toX(snapT);

      // Snap crosshair
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(snapX, PAD.top);
      ctx.lineTo(snapX, PAD.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tooltip box
      if (models.length > 0) {
        const lines = models.map((m) => ({
          name: m.name,
          score: m.scores[frameIdx] ?? 0,
          color: m.color,
        }));
        const lineH = 16;
        const tooltipH = lines.length * lineH + 12;
        const tooltipW = 160;
        let tx = snapX + 14;
        if (tx + tooltipW > w - 4) tx = snapX - tooltipW - 14;
        const ty = PAD.top + 12;

        ctx.fillStyle = 'rgba(245,242,237,0.96)';
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tx, ty, tooltipW, tooltipH, 3);
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const ly = ty + 10 + i * lineH;
          ctx.fillStyle = line.color;
          ctx.beginPath();
          ctx.arc(tx + 10, ly + 2, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#333';
          ctx.font = '10px "Share Tech Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(line.name, tx + 20, ly + 6);
          ctx.textAlign = 'right';
          ctx.fillText(line.score.toFixed(3), tx + tooltipW - 8, ly + 6);
        }
      }
    }
  }
}

export default function RewardChart({ comparisons }: RewardChartProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [selectedDemo, setSelectedDemo] = useState(0);
  const [enabledModels, setEnabledModels] = useState<Set<string>>(() =>
    new Set(comparisons[0]?.models.map((m) => m.id) || [])
  );
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);

  const data = comparisons[selectedDemo];

  // Reset enabled models when switching demos
  const allModelIds = useMemo(() => new Set(data?.models.map((m) => m.id) || []), [data]);
  useEffect(() => {
    queueMicrotask(() => {
      setEnabledModels(allModelIds);
      setVideoProgress(0);
    });
  }, [allModelIds]);

  useEffect(() => {
    const tick = () => {
      const video = videoRef.current;
      if (video && video.duration > 0) {
        const t = video.currentTime / video.duration;
        setVideoProgress(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Draw chart on every state change
  useEffect(() => {
    if (!canvasRef.current || !data) return;
    drawChart(canvasRef.current, data, enabledModels, videoProgress, hoverX);
  }, [data, enabledModels, videoProgress, hoverX]);

  // Resize observer
  useEffect(() => {
    if (!canvasRef.current) return;
    const observer = new ResizeObserver(() => {
      if (canvasRef.current && data) {
        drawChart(canvasRef.current, data, enabledModels, videoProgress, hoverX);
      }
    });
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [data, enabledModels, videoProgress, hoverX]);

  if (!data) return null;

  const toggleModel = (id: string) => {
    setEnabledModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="reward-chart">
      <div className="reward-chart__top-bar">
        <div className="reward-chart__task-select">
          {comparisons.map((c, i) => (
            <button
              key={c.id}
              className={`country-pill ${selectedDemo === i ? 'country-pill--active' : ''}`}
              onClick={() => {
                setSelectedDemo(i);
                setVideoProgress(0);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.pause();
                }
              }}
            >
              {c.id.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div className="reward-chart__instruction">
          &ldquo;{data.instruction}&rdquo;
        </div>
        <div className="reward-chart__legend">
          {data.models.map((m) => (
            <button
              key={m.id}
              className={`reward-chart__legend-item ${!enabledModels.has(m.id) ? 'reward-chart__legend-item--dim' : ''}`}
              onClick={() => toggleModel(m.id)}
            >
              <span className="reward-chart__legend-dot" style={{ background: m.color }} />
              <span className="reward-chart__legend-name">{m.name}</span>
              <span className="reward-chart__legend-voc">VOC: {m.voc.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="reward-chart__body">
        <div className="reward-chart__video-wrap">
          <video
            ref={videoRef}
            key={data.videoUrl}
            src={data.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="reward-chart__video"
          />
        </div>

        <div className="reward-chart__canvas-wrap">
          <canvas
            ref={canvasRef}
            className="reward-chart__canvas"
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (rect) setHoverX(e.clientX - rect.left);
            }}
            onMouseLeave={() => setHoverX(null)}
          />
        </div>
      </div>
    </div>
  );
}
