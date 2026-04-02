/**
 * Pure utility functions for sample display, upload validation, and preview scoring.
 * Extracted from DataBrokerage.tsx for testability.
 */

export interface Sample {
  id: string;
  url: string;
  filename: string;
  content_type?: string;
  duration_seconds?: number | null;
}

export type SampleCategory = 'video' | 'image' | 'audio' | 'json' | 'rerun' | 'timeseries' | 'tactile' | 'download';

export const TIME_SERIES_MODALITIES = ['imu', 'force_torque', 'proprioception'];
export const TACTILE_MODALITIES = ['tactile'];

export function formatTags(value: string | string[]): string {
  const arr = Array.isArray(value) ? value : [value];
  return arr.map(v => v.replace(/_/g, ' ')).join(', ');
}

export function getSampleCategory(contentType?: string, filename?: string, modalities?: string[]): SampleCategory {
  const ct = (contentType ?? '').toLowerCase();
  const ext = (filename ?? '').split('.').pop()?.toLowerCase() ?? '';
  if (ct.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (ct.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'].includes(ext)) return 'image';
  if (ct.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(ext)) return 'audio';
  if (ct === 'application/json' || ext === 'json') return 'json';
  if (['rrd', 'rosbag', 'mcap'].includes(ext)) return 'rerun';
  if (ext === 'parquet' && modalities?.some(m => TACTILE_MODALITIES.includes(m))) return 'timeseries';
  if (ext === 'parquet' && modalities?.some(m => TIME_SERIES_MODALITIES.includes(m))) return 'timeseries';
  return 'download';
}

export function getSampleTypeLabel(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const labels: Record<string, string> = {
    mp4: 'MP4', webm: 'WEBM', mov: 'MOV', avi: 'AVI',
    png: 'PNG', jpg: 'JPG', jpeg: 'JPG', gif: 'GIF', webp: 'WEBP', svg: 'SVG',
    mp3: 'MP3', wav: 'WAV', ogg: 'OGG', flac: 'FLAC',
    json: 'JSON', parquet: 'PQT', hdf5: 'HDF5', rosbag: 'BAG', mcap: 'MCAP', rrd: 'RRD',
  };
  return labels[ext] ?? (ext.toUpperCase().slice(0, 4) || '?');
}

export const MODALITY_ACCEPT_MAP: Record<string, string> = {
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

export function getAcceptFilter(modalities: string[]): string {
  if (modalities.length === 0) return 'video/*,image/*,audio/*,.parquet,.hdf5,.rosbag,.mcap,.rrd,.json';
  const parts = new Set<string>();
  for (const mod of modalities) {
    const filter = MODALITY_ACCEPT_MAP[mod];
    if (filter) filter.split(',').forEach(f => parts.add(f));
    else 'video/*,image/*,audio/*,.parquet,.hdf5,.rosbag,.mcap,.rrd,.json'.split(',').forEach(f => parts.add(f));
  }
  return [...parts].join(',');
}

export function getUploadHint(modalities: string[]): string | null {
  const spatial = ['lidar', 'point_cloud', 'motion_capture', 'rgbd', 'depth'];
  const timeSeries = ['imu', 'force_torque', 'proprioception', 'tactile'];
  if (modalities.some(m => spatial.includes(m))) return 'For 3D/spatial data, upload .rrd preview files for interactive viewer. Generate with: pip install atlas-preview-generator';
  if (modalities.some(m => timeSeries.includes(m))) return 'Upload .parquet for interactive charts, or .rrd for 3D preview. Generate with: pip install atlas-preview-generator';
  return null;
}

export function getPreviewScore(samples: Sample[], modalities: string[]): { score: number; label: string; level: string; suggestions: string[] } {
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
