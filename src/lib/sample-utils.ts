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

export const TIME_SERIES_MODALITIES = ['imu', 'force_torque', 'proprioception', 'joint_trajectory'];
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
  joint_trajectory: '.parquet,.hdf5,.rosbag,.rrd',
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
  const timeSeries = ['imu', 'force_torque', 'proprioception', 'joint_trajectory', 'tactile'];
  if (modalities.some(m => spatial.includes(m))) return 'For 3D/spatial data, upload .rrd preview files for interactive viewer';
  if (modalities.some(m => timeSeries.includes(m))) return 'Upload .parquet files for interactive chart previews';
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
  const timeSeries = ['imu', 'force_torque', 'proprioception', 'joint_trajectory', 'tactile'];
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

/** Keyword patterns that map filename tokens to modalities */
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

/** Format-to-modality fallback: when filename has no keyword, use file format + listing modalities */
const FORMAT_MODALITY_MAP: Record<string, string[]> = {
  mp4: ['rgb', 'thermal', 'rgbd', 'tactile'],
  mov: ['rgb', 'thermal', 'rgbd'],
  webm: ['rgb', 'thermal'],
  avi: ['rgb', 'thermal'],
  mkv: ['rgb'],
  png: ['rgb', 'depth', 'thermal'],
  jpg: ['rgb', 'depth', 'thermal'],
  jpeg: ['rgb', 'depth', 'thermal'],
  gif: ['rgb'],
  webp: ['rgb'],
  tiff: ['rgb', 'depth', 'thermal'],
  parquet: ['imu', 'force_torque', 'proprioception', 'joint_trajectory', 'tactile', 'language_annotations'],
  hdf5: ['imu', 'force_torque', 'proprioception', 'rgbd', 'depth', 'lidar'],
  h5: ['imu', 'force_torque', 'proprioception', 'rgbd', 'depth', 'lidar'],
  rosbag: ['lidar', 'point_cloud', 'rgbd', 'depth', 'imu', 'force_torque'],
  bag: ['lidar', 'point_cloud', 'rgbd', 'depth'],
  mcap: ['lidar', 'point_cloud', 'rgbd', 'depth', 'imu'],
  rrd: ['lidar', 'point_cloud', 'motion_capture', 'rgbd', 'depth'],
  json: ['language_annotations'],
  jsonl: ['language_annotations'],
  wav: ['audio'],
  mp3: ['audio'],
  ogg: ['audio'],
  flac: ['audio'],
  aac: ['audio'],
  m4a: ['audio'],
  csv: ['imu', 'force_torque', 'proprioception'],
};

/**
 * Map a sample file to one of the listing's modalities.
 * Returns the matched modality string or null if unassigned.
 */
export function mapSampleToModality(filename: string, listingModalities: string[]): string | null {
  const lower = filename.toLowerCase();
  const nameWithoutExt = lower.replace(/\.[^.]+$/, '');

  // 1. Keyword match: check if filename contains a modality keyword
  for (const mod of listingModalities) {
    const keywords = MODALITY_KEYWORDS[mod];
    if (keywords && keywords.some(kw => nameWithoutExt.includes(kw))) {
      return mod;
    }
  }

  // 2. Format fallback: if only one listing modality matches this file format
  const ext = lower.split('.').pop() ?? '';
  const formatModalities = FORMAT_MODALITY_MAP[ext];
  if (formatModalities) {
    const candidates = listingModalities.filter(m => formatModalities.includes(m));
    if (candidates.length === 1) return candidates[0];
  }

  return null;
}

/**
 * Extract an episode/pair identifier from a filename.
 * Strips modality keywords and extension, returning the base episode name.
 * e.g. "episode_001_rgb.mp4" → "episode_001"
 *      "grasp_23_force.parquet" → "grasp_23"
 *      "kitchen_01_imu_data.parquet" → "kitchen_01_data"
 */
export function extractEpisodeId(filename: string, modality: string | null): string {
  // Remove extension
  let base = filename.replace(/\.[^.]+$/, '').toLowerCase();

  // Remove modality keywords from the base name
  if (modality) {
    const keywords = MODALITY_KEYWORDS[modality] ?? [];
    for (const kw of keywords) {
      // Remove keyword with surrounding separators (_, -)
      base = base.replace(new RegExp(`[_\\-]?${kw}[_\\-]?`, 'g'), '_');
    }
  }

  // Clean up: collapse multiple underscores/dashes, trim separators
  base = base.replace(/[_\-]{2,}/g, '_').replace(/^[_\-]+|[_\-]+$/g, '');

  return base || filename.replace(/\.[^.]+$/, '').toLowerCase();
}

export interface AlignmentIssue {
  type: 'missing_modality' | 'count_mismatch' | 'missing_pair' | 'unassigned';
  message: string;
}

export interface AlignmentResult {
  valid: boolean;
  issues: AlignmentIssue[];
  assignments: Array<{ filename: string; modality: string | null; episodeId: string }>;
}

/**
 * Validate that samples are properly aligned across modalities.
 * Checks: coverage, count alignment, and pair alignment.
 * Skips validation for single-modality listings.
 */
export function validateModalityAlignment(samples: Sample[], listingModalities: string[]): AlignmentResult {
  // Skip for single-modality listings
  if (listingModalities.length <= 1) {
    return { valid: true, issues: [], assignments: samples.map(s => ({ filename: s.filename, modality: listingModalities[0] ?? null, episodeId: '' })) };
  }

  const issues: AlignmentIssue[] = [];

  // Assign each sample to a modality
  const assignments = samples.map(s => {
    const modality = mapSampleToModality(s.filename, listingModalities);
    const episodeId = extractEpisodeId(s.filename, modality);
    return { filename: s.filename, modality, episodeId };
  });

  // Check for unassigned samples
  const unassigned = assignments.filter(a => a.modality === null);
  for (const u of unassigned) {
    issues.push({
      type: 'unassigned',
      message: `"${u.filename}" — could not determine modality. Rename using convention: {episode_id}_{modality}.{ext}`,
    });
  }

  // Group assigned samples by modality
  const assigned = assignments.filter(a => a.modality !== null);
  const byModality: Record<string, typeof assignments> = {};
  for (const a of assigned) {
    if (!byModality[a.modality!]) byModality[a.modality!] = [];
    byModality[a.modality!].push(a);
  }

  // 1. Coverage: every listed modality must have at least one sample
  for (const mod of listingModalities) {
    if (!byModality[mod] || byModality[mod].length === 0) {
      issues.push({
        type: 'missing_modality',
        message: `No samples detected for modality: ${mod.replace(/_/g, ' ')}`,
      });
    }
  }

  // 2. Count alignment: all modalities with samples must have the same count
  const counts = listingModalities.map(mod => ({ mod, count: (byModality[mod] ?? []).length })).filter(c => c.count > 0);
  if (counts.length > 1) {
    const expectedCount = counts[0].count;
    const mismatched = counts.filter(c => c.count !== expectedCount);
    if (mismatched.length > 0) {
      const detail = counts.map(c => `${c.mod.replace(/_/g, ' ')}: ${c.count}`).join(', ');
      issues.push({
        type: 'count_mismatch',
        message: `Modality sample counts must match. Current: ${detail}`,
      });
    }
  }

  // 3. Pair alignment: for each episode, every modality should have a sample
  if (counts.length > 1 && counts.every(c => c.count === counts[0].count) && unassigned.length === 0) {
    const allEpisodes = new Set(assigned.map(a => a.episodeId));
    for (const ep of allEpisodes) {
      const episodeMods = new Set(assigned.filter(a => a.episodeId === ep).map(a => a.modality));
      const missing = listingModalities.filter(mod => !episodeMods.has(mod));
      if (missing.length > 0) {
        issues.push({
          type: 'missing_pair',
          message: `Episode "${ep}" is missing: ${missing.map(m => m.replace(/_/g, ' ')).join(', ')}`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues, assignments };
}
