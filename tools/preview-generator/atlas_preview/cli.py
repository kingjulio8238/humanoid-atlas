"""CLI entry point for atlas-preview-generator."""

import click
import sys
from pathlib import Path


@click.command()
@click.option("--input", "input_path", required=True, type=click.Path(exists=True), help="Input data file (.rosbag, .mcap, .parquet, .hdf5, .mp4)")
@click.option("--output", "output_path", default="preview.rrd", type=click.Path(), help="Output .rrd file path")
@click.option("--duration", default=30, type=int, help="Maximum seconds to include in preview")
@click.option("--modality", default=None, type=str, help="Modality hint (lidar, imu, rgb, etc.) for interpreting data")
def main(input_path: str, output_path: str, duration: int, modality: str | None) -> None:
    """Generate an .rrd preview file from robotics data for Atlas Data Brokerage.

    Reads common robotics data formats and produces a trimmed Rerun recording
    suitable for web preview. Upload the resulting .rrd file as a sample on
    your Atlas listing for interactive 3D/time-series visualization.

    Examples:

        atlas-preview --input recording.rosbag --output preview.rrd

        atlas-preview --input imu_data.parquet --modality imu --duration 10

        atlas-preview --input scene.mcap --output preview.rrd --duration 30
    """
    import rerun as rr

    path = Path(input_path)
    ext = path.suffix.lower()

    rr.init("atlas_preview")

    handlers = {
        ".rosbag": _handle_rosbag,
        ".bag": _handle_rosbag,
        ".mcap": _handle_mcap,
        ".parquet": _handle_parquet,
        ".hdf5": _handle_hdf5,
        ".h5": _handle_hdf5,
        ".mp4": _handle_video,
        ".mov": _handle_video,
        ".avi": _handle_video,
        ".webm": _handle_video,
    }

    handler = handlers.get(ext)
    if handler is None:
        click.echo(f"Unsupported format: {ext}", err=True)
        click.echo(f"Supported: {', '.join(sorted(handlers.keys()))}", err=True)
        sys.exit(1)

    click.echo(f"Reading {path.name}...")
    handler(path, duration=duration, modality=modality)

    rr.save(output_path)
    click.echo(f"Preview saved to {output_path}")


def _handle_rosbag(path: Path, duration: int = 30, modality: str | None = None) -> None:
    """Convert a ROS1 bag file to .rrd preview."""
    import rerun as rr
    from rosbags.rosbag1 import Reader
    from rosbags.typesys import get_types_from_msg, register_types, Stores
    import numpy as np

    with Reader(path) as reader:
        # Register standard message types
        store = Stores.ROS1_NOETIC
        start_time = None
        count = 0

        for connection, timestamp, rawdata in reader.messages():
            if start_time is None:
                start_time = timestamp
            elapsed = (timestamp - start_time) / 1e9
            if elapsed > duration:
                break

            rr.set_time_seconds("timestamp", elapsed)
            topic = connection.topic

            # Log based on message type
            msgtype = connection.msgtype
            if "Image" in msgtype or "CompressedImage" in msgtype:
                # Attempt to log as image
                try:
                    msg = reader.deserialize(rawdata, connection.msgtype)
                    if hasattr(msg, "data"):
                        data = np.frombuffer(msg.data, dtype=np.uint8)
                        if hasattr(msg, "width") and hasattr(msg, "height"):
                            h, w = msg.height, msg.width
                            if len(data) == h * w * 3:
                                rr.log(topic, rr.Image(data.reshape(h, w, 3)))
                            elif len(data) == h * w:
                                rr.log(topic, rr.Image(data.reshape(h, w)))
                except Exception:
                    pass
            elif "PointCloud2" in msgtype:
                try:
                    msg = reader.deserialize(rawdata, connection.msgtype)
                    # Basic XYZ extraction from PointCloud2
                    import struct
                    point_step = msg.point_step
                    data = np.frombuffer(msg.data, dtype=np.uint8)
                    n_points = len(data) // point_step
                    points = np.zeros((n_points, 3), dtype=np.float32)
                    for j in range(min(n_points, 50000)):
                        offset = j * point_step
                        points[j] = struct.unpack_from("fff", data, offset)
                    rr.log(topic, rr.Points3D(points[:min(n_points, 50000)]))
                except Exception:
                    pass
            elif "Imu" in msgtype:
                try:
                    msg = reader.deserialize(rawdata, connection.msgtype)
                    if hasattr(msg, "linear_acceleration"):
                        a = msg.linear_acceleration
                        rr.log(f"{topic}/accel_x", rr.Scalar(a.x))
                        rr.log(f"{topic}/accel_y", rr.Scalar(a.y))
                        rr.log(f"{topic}/accel_z", rr.Scalar(a.z))
                    if hasattr(msg, "angular_velocity"):
                        g = msg.angular_velocity
                        rr.log(f"{topic}/gyro_x", rr.Scalar(g.x))
                        rr.log(f"{topic}/gyro_y", rr.Scalar(g.y))
                        rr.log(f"{topic}/gyro_z", rr.Scalar(g.z))
                except Exception:
                    pass
            count += 1

        click.echo(f"Processed {count} messages ({elapsed:.1f}s)")


def _handle_mcap(path: Path, duration: int = 30, modality: str | None = None) -> None:
    """Convert an MCAP file to .rrd preview."""
    import rerun as rr
    from mcap.reader import make_reader
    import numpy as np

    with open(path, "rb") as f:
        reader = make_reader(f)
        start_time = None
        count = 0

        for schema, channel, message in reader.iter_messages():
            ts = message.log_time / 1e9
            if start_time is None:
                start_time = ts
            elapsed = ts - start_time
            if elapsed > duration:
                break

            rr.set_time_seconds("timestamp", elapsed)

            # Log raw data with topic name as entity path
            topic = channel.topic if channel else f"channel_{message.channel_id}"
            schema_name = schema.name if schema else ""

            if "Image" in schema_name or "image" in topic.lower():
                try:
                    data = np.frombuffer(message.data, dtype=np.uint8)
                    rr.log(topic, rr.Blob(data))
                except Exception:
                    pass
            elif "PointCloud" in schema_name or "pointcloud" in topic.lower():
                try:
                    rr.log(topic, rr.Blob(message.data))
                except Exception:
                    pass
            elif "Imu" in schema_name or "imu" in topic.lower():
                try:
                    # IMU data varies by schema — log raw for Rerun to interpret
                    rr.log(topic, rr.Blob(message.data))
                except Exception:
                    pass
            count += 1

        click.echo(f"Processed {count} messages ({elapsed:.1f}s)")


def _handle_parquet(path: Path, duration: int = 30, modality: str | None = None) -> None:
    """Convert a Parquet file to .rrd preview."""
    import rerun as rr
    import pandas as pd
    import numpy as np

    df = pd.read_parquet(path)

    # Limit rows
    max_rows = min(len(df), duration * 100)  # assume ~100Hz
    df = df.head(max_rows)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    if modality in ("lidar", "point_cloud", "radar"):
        # Look for x, y, z columns
        xyz_cols = [c for c in numeric_cols if c.lower() in ("x", "y", "z")]
        if len(xyz_cols) >= 3:
            points = df[xyz_cols[:3]].values.astype(np.float32)
            rr.log("point_cloud", rr.Points3D(points))
            click.echo(f"Logged {len(points)} points as 3D point cloud")
            return

    # Default: log numeric columns as time series
    for i, row in df.iterrows():
        rr.set_time_sequence("row", int(i) if isinstance(i, (int, np.integer)) else 0)
        for col in numeric_cols[:20]:
            val = row[col]
            if pd.notna(val):
                rr.log(f"data/{col}", rr.Scalar(float(val)))

    click.echo(f"Logged {len(df)} rows x {len(numeric_cols)} columns as time series")


def _handle_hdf5(path: Path, duration: int = 30, modality: str | None = None) -> None:
    """Convert an HDF5 file to .rrd preview."""
    import rerun as rr
    import h5py
    import numpy as np

    with h5py.File(path, "r") as f:
        def visit(name: str, obj: h5py.Dataset | h5py.Group) -> None:
            if not isinstance(obj, h5py.Dataset):
                return
            shape = obj.shape
            dtype = obj.dtype

            if len(shape) == 3 and shape[-1] in (1, 3, 4):
                # Image: (H, W, C)
                data = obj[:]
                rr.log(name, rr.Image(data))
                click.echo(f"Logged {name} as image {shape}")
            elif len(shape) == 4 and shape[-1] in (1, 3, 4):
                # Video frames: (N, H, W, C)
                n_frames = min(shape[0], duration * 30)
                for i in range(n_frames):
                    rr.set_time_sequence("frame", i)
                    rr.log(name, rr.Image(obj[i]))
                click.echo(f"Logged {name} as {n_frames} video frames")
            elif len(shape) == 2 and np.issubdtype(dtype, np.floating):
                # 2D numeric: (N, D) — could be point cloud or time series
                n_rows = min(shape[0], 3000)
                data = obj[:n_rows]
                if shape[1] >= 3 and modality in ("lidar", "point_cloud", "radar"):
                    rr.log(name, rr.Points3D(data[:, :3].astype(np.float32)))
                    click.echo(f"Logged {name} as {n_rows} 3D points")
                else:
                    for i in range(n_rows):
                        rr.set_time_sequence("row", i)
                        for j in range(min(shape[1], 20)):
                            rr.log(f"{name}/col_{j}", rr.Scalar(float(data[i, j])))
                    click.echo(f"Logged {name} as {n_rows}x{shape[1]} time series")
            elif len(shape) == 1 and np.issubdtype(dtype, np.number):
                # 1D numeric array — scalar time series
                n = min(shape[0], 3000)
                for i in range(n):
                    rr.set_time_sequence("row", i)
                    rr.log(name, rr.Scalar(float(obj[i])))
                click.echo(f"Logged {name} as {n}-point scalar series")

        f.visititems(visit)


def _handle_video(path: Path, duration: int = 30, modality: str | None = None) -> None:
    """Convert a video file to .rrd preview by extracting frames."""
    import rerun as rr

    try:
        import cv2
    except ImportError:
        click.echo("Video support requires opencv-python: pip install atlas-preview-generator[video]", err=True)
        return

    cap = cv2.VideoCapture(str(path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    max_frames = int(duration * fps)
    frame_idx = 0

    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        rr.set_time_seconds("timestamp", frame_idx / fps)
        rr.log("video", rr.Image(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
        frame_idx += 1

    cap.release()
    click.echo(f"Logged {frame_idx} frames ({frame_idx / fps:.1f}s)")


if __name__ == "__main__":
    main()
