# Atlas Preview Generator

Generate `.rrd` preview files from robotics data for [Atlas Data Brokerage](https://humanoids.fyi) listings.

## Install

```bash
pip install atlas-preview-generator
```

For video support (requires OpenCV):
```bash
pip install atlas-preview-generator[video]
```

## Usage

```bash
# ROS bag → .rrd preview (first 30 seconds)
atlas-preview --input recording.rosbag --output preview.rrd

# MCAP → .rrd preview
atlas-preview --input recording.mcap --output preview.rrd --duration 20

# Parquet IMU data → .rrd time series
atlas-preview --input imu_data.parquet --modality imu --output preview.rrd

# Parquet point cloud → .rrd 3D visualization
atlas-preview --input scan.parquet --modality lidar --output preview.rrd

# HDF5 → .rrd (auto-detects data shapes)
atlas-preview --input dataset.hdf5 --output preview.rrd

# Video → .rrd frame sequence
atlas-preview --input recording.mp4 --output preview.rrd --duration 10
```

## Supported Formats

| Format | What it does |
|---|---|
| `.rosbag` / `.bag` | Reads ROS1 bags — extracts images, point clouds, IMU topics |
| `.mcap` | Reads MCAP containers — extracts topics by schema type |
| `.parquet` | Reads as time-series (default) or 3D points (with `--modality lidar`) |
| `.hdf5` / `.h5` | Auto-detects: images, video frames, point clouds, or time series by array shape |
| `.mp4` / `.mov` / `.avi` | Extracts video frames (requires `[video]` extra) |

## Tips

- Keep preview files **under 50MB** for fast web loading
- Use `--duration 10-30` to trim long recordings
- Upload the `.rrd` file as a sample on your Atlas listing
- The Rerun viewer renders interactively in the buyer's browser
