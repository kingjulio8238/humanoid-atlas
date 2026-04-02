import { describe, it, expect } from 'vitest';
import {
  formatTags,
  getSampleCategory,
  getSampleTypeLabel,
  getAcceptFilter,
  getUploadHint,
  getPreviewScore,
  MODALITY_ACCEPT_MAP,
  TIME_SERIES_MODALITIES,
  type Sample,
} from './sample-utils';

// ═══════════════════════════════════════════════════════════
// Phase 1: Content-Type Dispatcher
// ═══════════════════════════════════════════════════════════

describe('getSampleCategory', () => {
  describe('video detection', () => {
    it('detects video by content type', () => {
      expect(getSampleCategory('video/mp4', 'file.mp4')).toBe('video');
      expect(getSampleCategory('video/webm', 'file.webm')).toBe('video');
      expect(getSampleCategory('video/quicktime', 'file.mov')).toBe('video');
    });
    it('detects video by extension when content type is missing', () => {
      expect(getSampleCategory(undefined, 'recording.mp4')).toBe('video');
      expect(getSampleCategory('', 'recording.avi')).toBe('video');
      expect(getSampleCategory('application/octet-stream', 'file.mkv')).toBe('video');
    });
  });

  describe('image detection', () => {
    it('detects images by content type', () => {
      expect(getSampleCategory('image/png', 'file.png')).toBe('image');
      expect(getSampleCategory('image/jpeg', 'file.jpg')).toBe('image');
      expect(getSampleCategory('image/webp', 'file.webp')).toBe('image');
    });
    it('detects images by extension', () => {
      expect(getSampleCategory(undefined, 'depth.tiff')).toBe('image');
      expect(getSampleCategory('', 'frame.bmp')).toBe('image');
      expect(getSampleCategory(undefined, 'icon.svg')).toBe('image');
    });
    it('handles depth maps as images', () => {
      expect(getSampleCategory('image/png', 'depth_16bit.png')).toBe('image');
    });
  });

  describe('audio detection', () => {
    it('detects audio by content type', () => {
      expect(getSampleCategory('audio/wav', 'file.wav')).toBe('audio');
      expect(getSampleCategory('audio/mpeg', 'file.mp3')).toBe('audio');
      expect(getSampleCategory('audio/ogg', 'file.ogg')).toBe('audio');
    });
    it('detects audio by extension', () => {
      expect(getSampleCategory(undefined, 'recording.flac')).toBe('audio');
      expect(getSampleCategory('', 'clip.aac')).toBe('audio');
      expect(getSampleCategory(undefined, 'voice.m4a')).toBe('audio');
    });
  });

  describe('JSON detection', () => {
    it('detects JSON by content type', () => {
      expect(getSampleCategory('application/json', 'annotations.json')).toBe('json');
    });
    it('detects JSON by extension', () => {
      expect(getSampleCategory(undefined, 'metadata.json')).toBe('json');
      expect(getSampleCategory('', 'labels.json')).toBe('json');
    });
  });

  describe('Rerun detection (Phase 2)', () => {
    it('detects .rrd as rerun', () => {
      expect(getSampleCategory(undefined, 'preview.rrd')).toBe('rerun');
      expect(getSampleCategory('application/octet-stream', 'scene.rrd')).toBe('rerun');
    });
    it('detects .rosbag as rerun', () => {
      expect(getSampleCategory('', 'recording.rosbag')).toBe('rerun');
    });
    it('detects .mcap as rerun', () => {
      expect(getSampleCategory(undefined, 'log.mcap')).toBe('rerun');
    });
  });

  describe('timeseries detection (Phase 3)', () => {
    it('detects .parquet as timeseries for IMU listing', () => {
      expect(getSampleCategory('', 'imu_data.parquet', ['imu'])).toBe('timeseries');
    });
    it('detects .parquet as timeseries for force_torque listing', () => {
      expect(getSampleCategory(undefined, 'ft.parquet', ['force_torque'])).toBe('timeseries');
    });
    it('detects .parquet as timeseries for proprioception listing', () => {
      expect(getSampleCategory(undefined, 'joints.parquet', ['proprioception'])).toBe('timeseries');
    });
    it('detects .parquet as timeseries for tactile listing', () => {
      expect(getSampleCategory(undefined, 'touch.parquet', ['tactile'])).toBe('timeseries');
    });
    it('does NOT detect .parquet as timeseries for non-time-series modalities', () => {
      expect(getSampleCategory(undefined, 'data.parquet', ['rgb'])).toBe('download');
      expect(getSampleCategory(undefined, 'data.parquet', ['lidar'])).toBe('download');
      expect(getSampleCategory(undefined, 'data.parquet', ['point_cloud'])).toBe('download');
    });
    it('detects .parquet as timeseries when mixed modalities include time-series', () => {
      expect(getSampleCategory(undefined, 'data.parquet', ['lidar', 'imu'])).toBe('timeseries');
    });
    it('does NOT detect .hdf5 as timeseries (parquet-wasm cant read hdf5)', () => {
      expect(getSampleCategory(undefined, 'data.hdf5', ['imu'])).toBe('download');
    });
    it('does NOT detect .parquet as timeseries without modalities', () => {
      expect(getSampleCategory(undefined, 'data.parquet')).toBe('download');
      expect(getSampleCategory(undefined, 'data.parquet', [])).toBe('download');
    });
  });

  describe('download fallback', () => {
    it('falls to download for unknown extensions', () => {
      expect(getSampleCategory(undefined, 'data.xyz')).toBe('download');
      expect(getSampleCategory('application/octet-stream', 'file.bin')).toBe('download');
    });
    it('falls to download for .hdf5', () => {
      expect(getSampleCategory(undefined, 'dataset.hdf5')).toBe('download');
    });
    it('falls to download for .parquet without time-series modality', () => {
      expect(getSampleCategory(undefined, 'scan.parquet', ['rgb'])).toBe('download');
    });
  });

  describe('edge cases', () => {
    it('handles undefined content type and filename', () => {
      expect(getSampleCategory(undefined, undefined)).toBe('download');
    });
    it('handles empty strings', () => {
      expect(getSampleCategory('', '')).toBe('download');
    });
    it('is case-insensitive for content type', () => {
      expect(getSampleCategory('VIDEO/MP4', 'file.mp4')).toBe('video');
      expect(getSampleCategory('Image/PNG', 'file.png')).toBe('image');
    });
  });
});

describe('getSampleTypeLabel', () => {
  it('returns known labels for common formats', () => {
    expect(getSampleTypeLabel('video.mp4')).toBe('MP4');
    expect(getSampleTypeLabel('image.png')).toBe('PNG');
    expect(getSampleTypeLabel('audio.wav')).toBe('WAV');
    expect(getSampleTypeLabel('data.json')).toBe('JSON');
    expect(getSampleTypeLabel('preview.rrd')).toBe('RRD');
    expect(getSampleTypeLabel('recording.rosbag')).toBe('BAG');
    expect(getSampleTypeLabel('log.mcap')).toBe('MCAP');
    expect(getSampleTypeLabel('data.parquet')).toBe('PQT');
    expect(getSampleTypeLabel('data.hdf5')).toBe('HDF5');
  });
  it('jpeg maps to JPG', () => {
    expect(getSampleTypeLabel('photo.jpeg')).toBe('JPG');
  });
  it('truncates unknown extensions to 4 chars', () => {
    expect(getSampleTypeLabel('file.custom')).toBe('CUST');
  });
  it('truncates filename without dot to 4 chars', () => {
    expect(getSampleTypeLabel('noextension')).toBe('NOEX');
  });
});

describe('formatTags', () => {
  it('handles single string', () => {
    expect(formatTags('force_torque')).toBe('force torque');
  });
  it('handles array of strings', () => {
    expect(formatTags(['imu', 'force_torque'])).toBe('imu, force torque');
  });
  it('handles single-element array', () => {
    expect(formatTags(['rgb'])).toBe('rgb');
  });
});

// ═══════════════════════════════════════════════════════════
// Phase 5: Upload Validation
// ═══════════════════════════════════════════════════════════

describe('getAcceptFilter', () => {
  it('returns permissive filter for empty modalities', () => {
    const result = getAcceptFilter([]);
    expect(result).toContain('video/*');
    expect(result).toContain('image/*');
    expect(result).toContain('audio/*');
    expect(result).toContain('.parquet');
    expect(result).toContain('.rrd');
  });

  it('returns video/image for rgb modality', () => {
    const result = getAcceptFilter(['rgb']);
    expect(result).toContain('video/*');
    expect(result).toContain('image/*');
    expect(result).not.toContain('audio/*');
  });

  it('returns audio/* for audio modality', () => {
    const result = getAcceptFilter(['audio']);
    expect(result).toBe('audio/*');
  });

  it('returns .rosbag,.mcap,.rrd,.parquet,.hdf5 for lidar', () => {
    const result = getAcceptFilter(['lidar']);
    expect(result).toContain('.rosbag');
    expect(result).toContain('.mcap');
    expect(result).toContain('.rrd');
    expect(result).toContain('.parquet');
    expect(result).toContain('.hdf5');
  });

  it('unions filters for multiple modalities', () => {
    const result = getAcceptFilter(['rgb', 'audio']);
    expect(result).toContain('video/*');
    expect(result).toContain('image/*');
    expect(result).toContain('audio/*');
  });

  it('falls back to permissive for unknown modality', () => {
    const result = getAcceptFilter(['unknown_modality']);
    expect(result).toContain('video/*');
    expect(result).toContain('.rrd');
  });

  it('includes .rrd for all spatial modalities', () => {
    for (const mod of ['lidar', 'point_cloud', 'depth', 'rgbd', 'motion_capture']) {
      expect(getAcceptFilter([mod])).toContain('.rrd');
    }
  });
});

describe('MODALITY_ACCEPT_MAP', () => {
  it('covers all 15 non-other modalities', () => {
    const expected = ['rgb', 'rgbd', 'depth', 'lidar', 'point_cloud', 'motion_capture', 'tactile', 'force_torque', 'proprioception', 'imu', 'audio', 'language_annotations', 'thermal'];
    for (const mod of expected) {
      expect(MODALITY_ACCEPT_MAP[mod]).toBeDefined();
    }
  });
});

describe('getUploadHint', () => {
  it('returns spatial hint for lidar', () => {
    const hint = getUploadHint(['lidar']);
    expect(hint).toContain('.rrd');
    expect(hint).toContain('atlas-preview-generator');
  });

  it('returns time-series hint for imu', () => {
    const hint = getUploadHint(['imu']);
    expect(hint).toContain('.parquet');
    expect(hint).toContain('atlas-preview-generator');
  });

  it('returns spatial hint when mixed (spatial takes precedence)', () => {
    const hint = getUploadHint(['lidar', 'imu']);
    expect(hint).toContain('.rrd');
  });

  it('returns null for rgb', () => {
    expect(getUploadHint(['rgb'])).toBeNull();
  });

  it('returns null for audio', () => {
    expect(getUploadHint(['audio'])).toBeNull();
  });

  it('returns null for empty', () => {
    expect(getUploadHint([])).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════
// Phase 5: Preview Quality Scoring
// ═══════════════════════════════════════════════════════════

describe('getPreviewScore', () => {
  const makeSample = (filename: string, content_type?: string): Sample => ({
    id: Math.random().toString(), url: `https://r2.example.com/${filename}`, filename, content_type,
  });

  it('returns score 0 for empty samples', () => {
    const result = getPreviewScore([], ['rgb']);
    expect(result.score).toBe(0);
    expect(result.label).toBe('None');
    expect(result.level).toBe('low');
    expect(result.suggestions).toHaveLength(1);
  });

  it('returns score 0 for null samples', () => {
    const result = getPreviewScore(null as unknown as Sample[], ['rgb']);
    expect(result.score).toBe(0);
  });

  it('scores 1 video sample for rgb listing as Good (score 2)', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['rgb']);
    expect(result.score).toBe(2); // base + video
    expect(result.label).toBe('Good');
    expect(result.level).toBe('mid');
  });

  it('scores video + rrd + parquet for lidar,imu listing as Excellent (score 4, needs 5 samples)', () => {
    const samples = [
      makeSample('video.mp4', 'video/mp4'),
      makeSample('preview.rrd'),
      makeSample('imu.parquet'),
    ];
    const result = getPreviewScore(samples, ['lidar', 'imu']);
    expect(result.score).toBe(4); // base + video + rerun + chart (only 3 samples, need 5)
    expect(result.label).toBe('Excellent');
    expect(result.level).toBe('high');
    expect(result.suggestions).toContain('Add more samples (3/5 required)');
  });

  it('scores 1 parquet for imu listing as Good (score 2)', () => {
    const result = getPreviewScore([makeSample('imu.parquet')], ['imu']);
    expect(result.score).toBe(2); // base + chart
    expect(result.label).toBe('Good');
    expect(result.level).toBe('mid');
  });

  it('suggests .rrd for spatial modality without rerun sample', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['lidar']);
    expect(result.suggestions).toContain('Upload a .rrd file for interactive 3D preview');
  });

  it('suggests .parquet for time-series modality without chart sample', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['imu']);
    expect(result.suggestions).toContain('Upload a .parquet sample for chart preview');
  });

  it('does not suggest .rrd for non-spatial modality', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['rgb']);
    expect(result.suggestions.find(s => s.includes('.rrd'))).toBeUndefined();
  });

  it('does not suggest .parquet for non-time-series modality', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['rgb']);
    expect(result.suggestions.find(s => s.includes('.parquet'))).toBeUndefined();
  });

  it('suggests more samples when fewer than 5', () => {
    const result = getPreviewScore([makeSample('video.mp4', 'video/mp4')], ['rgb']);
    expect(result.suggestions).toContain('Add more samples (1/5 required)');
  });

  it('level thresholds: low < 2, mid 2-3, high >= 4', () => {
    expect(getPreviewScore([], ['rgb']).level).toBe('low');
    expect(getPreviewScore([makeSample('v.mp4', 'video/mp4')], ['rgb']).level).toBe('mid');
    const high = getPreviewScore([
      makeSample('v.mp4', 'video/mp4'),
      makeSample('p.rrd'),
      makeSample('d.parquet'),
      makeSample('e.png', 'image/png'),
    ], ['lidar', 'imu']);
    expect(high.level).toBe('high');
  });
});

// ═══════════════════════════════════════════════════════════
// Cross-Phase: Taxonomy Constants
// ═══════════════════════════════════════════════════════════

describe('TIME_SERIES_MODALITIES', () => {
  it('contains exactly 3 modalities (tactile has its own category)', () => {
    expect(TIME_SERIES_MODALITIES).toHaveLength(3);
    expect(TIME_SERIES_MODALITIES).toContain('imu');
    expect(TIME_SERIES_MODALITIES).toContain('force_torque');
    expect(TIME_SERIES_MODALITIES).toContain('proprioception');
    expect(TIME_SERIES_MODALITIES).not.toContain('tactile');
  });
  it('does not contain spatial modalities', () => {
    expect(TIME_SERIES_MODALITIES).not.toContain('lidar');
    expect(TIME_SERIES_MODALITIES).not.toContain('point_cloud');
    expect(TIME_SERIES_MODALITIES).not.toContain('rgb');
  });
});
