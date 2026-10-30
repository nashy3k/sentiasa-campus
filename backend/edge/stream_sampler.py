"""
Project SENTIASA: Edge Video Stream Sampler & Motion Burst Harvest Agent.
Architecture Ground Truth: docs/deepfake_detection_and_edge_vss_architecture.md

Runs natively on:
1. Windows 11 PC (direct RTX 4070 Ti / CPU host execution via `uv`).
2. Edge AI Gateways / NVIDIA Jetson Orin via Docker (`Dockerfile.edge`).

Monitors RTSP surveillance feeds, webcams, or video files, detects peak motion spikes,
and transmits forensic bursts to the SENTIASA Triage & Palantir Cloud Run Cockpit.
"""

import argparse
import logging
import os
import sys
import time
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("sentiasa.edge")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

try:
    import cv2
    import numpy as np
    HAS_OPENCV = True
except ImportError:
    HAS_OPENCV = False
    logger.warning("OpenCV not found. Install with `uv add opencv-python-headless`.")


def list_available_devices():
    """Enumerate and display available local webcam / video capture devices."""
    if not HAS_OPENCV:
        logger.error("OpenCV is required to enumerate capture devices.")
        return
    print("\n=== SENTIASA Edge: Probing Local Video Capture Devices ===")
    found = 0
    # On Windows, try CAP_DSHOW first, fallback to default
    backend_flag = cv2.CAP_DSHOW if sys.platform.startswith("win") else 0
    for idx in range(8):
        cap = cv2.VideoCapture(idx, backend_flag) if backend_flag else cv2.VideoCapture(idx)
        if cap.isOpened():
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            ret, frame = cap.read()
            cap.release()
            mean_b = float(np.mean(frame)) if (ret and frame is not None) else 0.0
            print(f"  [Index {idx}] Camera Available: {w}x{h} (Active Lens Signal: {mean_b:.1f})")
            found += 1
    if found == 0:
        print("  No active local camera devices detected.")
    else:
        print(f"\nFound {found} capture device(s). Use '--source <index>' to attach.")
    print("===========================================================\n")


def harvest_and_transmit_burst(
    video_source: str,
    backend_url: str = "http://127.0.0.1:8000",
    school_name: str = "SMK Seksyen 11 Shah Alam",
    camera_id: str = "CCTV_RearGate_Cam04",
    motion_threshold: float = 12.0,
    burst_cooldown_sec: float = 5.0,
    forward_duration_sec: float = 12.0,
    max_duration_sec: Optional[float] = None,
    live_api: bool = False,
) -> bool:
    """
    Monitors a video stream or file, detects motion spikes, and transmits bursts.
    """
    logger.info(f"Starting SENTIASA Edge Sampler on source: {video_source}")
    logger.info(f"Target Triage Backend: {backend_url}")

    # Resolve source: integer for camera index or string for path/rtsp
    source_val = int(video_source) if video_source.isdigit() else video_source

    if not HAS_OPENCV:
        logger.error("OpenCV is required for live stream sampling.")
        return False

    if sys.platform.startswith("win") and isinstance(source_val, int):
        cap = cv2.VideoCapture(source_val, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(source_val)
    else:
        cap = cv2.VideoCapture(source_val)

    if not cap.isOpened():
        logger.error(f"Failed to open video source: {video_source}")
        return False

    raw_fps = cap.get(cv2.CAP_PROP_FPS)
    fps = float(raw_fps) if (raw_fps is not None and 1.0 <= raw_fps <= 120.0) else 25.0
    logger.info(f"Stream opened successfully. Nominal FPS: {fps:.1f}")

    downsample_w, downsample_h = 320, 180
    prev_gray = None
    last_burst_time = 0.0
    start_time = time.time()
    success = True

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                logger.info("End of stream or no frame received.")
                break

            current_time = time.time()
            if max_duration_sec and (current_time - start_time) > max_duration_sec:
                logger.info(f"Reached max duration of {max_duration_sec}s. Exiting.")
                break

            small = cv2.resize(frame, (downsample_w, downsample_h))
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                motion_score = float(np.mean(diff))

                if motion_score >= motion_threshold and (current_time - last_burst_time) >= burst_cooldown_sec:
                    logger.warning(
                        f"🚨 Motion Spike Detected! Score: {motion_score:.2f} >= {motion_threshold}. Capturing burst..."
                    )
                    last_burst_time = current_time

                    # Save burst snippet or sample frame in consistent media directory
                    base_media = Path(__file__).resolve().parent.parent / "media" / "edge_bursts"
                    temp_dir = base_media if base_media.parent.exists() else Path("media/edge_bursts")
                    temp_dir.mkdir(parents=True, exist_ok=True)
                    burst_path = temp_dir / f"burst_{camera_id}_{int(current_time)}.mp4"

                    # Prefer mp4v on Windows to eliminate noisy MSMF "unable to create encoder" warnings
                    codecs_to_try = ["mp4v", "avc1"] if sys.platform.startswith("win") else ["avc1", "mp4v"]
                    out = None
                    for codec in codecs_to_try:
                        fourcc = cv2.VideoWriter_fourcc(*codec)
                        out = cv2.VideoWriter(str(burst_path), fourcc, fps, (frame.shape[1], frame.shape[0]))
                        if out.isOpened():
                            break
                    if out.isOpened():
                        out.write(frame)
                        # Capture next ~1 sec
                        burst_frames = max(10, int(fps))
                        for _ in range(burst_frames):
                            r, f = cap.read()
                            if r and f is not None:
                                out.write(f)
                        out.release()
                    else:
                        logger.error(f"Failed to open VideoWriter for {burst_path}")

                    # Transmit 2s probe burst to SENTIASA backend
                    triage_result = upload_burst_to_cockpit(
                        burst_path=burst_path,
                        backend_url=backend_url,
                        school_name=school_name,
                        camera_id=camera_id,
                        live_api=live_api,
                    )

                    # Probe-and-Demand Tiered Retrieval: Forward-Only Archive
                    if triage_result and (
                        triage_result.get("requires_extended_archive")
                        or triage_result.get("action_disposition") == "FETCH_FULL_ARCHIVE"
                        or triage_result.get("severity_tier", 1) >= 4
                    ):
                        inc_id = triage_result.get("incident_id") or triage_result.get("claim_id")
                        logger.warning(
                            f"🚨 Threat Confirmed by Jev (Tier {triage_result.get('severity_tier')})! "
                            f"Capturing forward-only extended archive ({forward_duration_sec}s) for {inc_id}..."
                        )
                        archive_path = temp_dir / f"archive_{camera_id}_{int(current_time)}.mp4"
                        out_arc = None
                        for codec in codecs_to_try:
                            fourcc_arc = cv2.VideoWriter_fourcc(*codec)
                            out_arc = cv2.VideoWriter(str(archive_path), fourcc_arc, fps, (frame.shape[1], frame.shape[0]))
                            if out_arc.isOpened():
                                break
                        if out_arc.isOpened():
                            forward_frames_target = max(25, int(fps * forward_duration_sec))
                            for _ in range(forward_frames_target):
                                r, f = cap.read()
                                if r and f is not None:
                                    out_arc.write(f)
                                else:
                                    break
                            out_arc.release()

                        upload_extended_archive_to_cockpit(
                            archive_path=archive_path,
                            backend_url=backend_url,
                            incident_id=inc_id,
                            school_name=school_name,
                            camera_id=camera_id,
                        )
                    else:
                        logger.info("ℹ️ Jev Gatekeeper: Ephemeral/benign motion. Extended archive not requested.")

            prev_gray = gray
            # Maintain processing pace for files vs live camera
            if not video_source.isdigit() and not video_source.startswith("rtsp"):
                time.sleep(1.0 / (fps * 2))

    except KeyboardInterrupt:
        logger.info("Edge stream sampler stopped by user.")
    finally:
        cap.release()

    return success


def upload_extended_archive_to_cockpit(
    archive_path: Path,
    backend_url: str,
    incident_id: str,
    school_name: str,
    camera_id: str,
) -> Optional[dict]:
    """Transmits the extended 10-20s video archive to FastAPI /api/triage/upload-extended-archive."""
    if not archive_path.exists():
        logger.error(f"Extended archive file does not exist: {archive_path}")
        return None

    url = f"{backend_url.rstrip('/')}/api/triage/upload-extended-archive"
    tenant_id = "smk-seksyen-9" if "9" in school_name else "smk-seksyen-11"
    headers = {"X-Tenant-ID": tenant_id}
    logger.info(f"Uplinking full extended archive ({archive_path.name}) for incident {incident_id} to {url} [tenant={tenant_id}]...")

    try:
        with open(archive_path, "rb") as f:
            files = {"file": (archive_path.name, f, "video/mp4")}
            data = {
                "incident_id": incident_id,
                "school_name": school_name,
                "reporter_alias": camera_id,
                "camera_id": camera_id,
            }
            with httpx.Client(timeout=45.0) as client:
                resp = client.post(url, files=files, data=data, headers=headers)
                if resp.status_code == 200:
                    payload = resp.json()
                    sha256 = payload.get("extended_archive", {}).get("sha256", "")
                    logger.info(
                        f"🔒 Evidence Act 1950 Sec 90A Extended Archive Bound! SHA-256: {sha256[:12]}..."
                    )
                    return payload
                else:
                    logger.warning(f"Backend rejected extended archive with HTTP {resp.status_code}: {resp.text}")
                    return None
    except Exception as exc:
        logger.warning(f"Failed to transmit extended archive: {exc}")
        return None


def upload_burst_to_cockpit(
    burst_path: Path,
    backend_url: str,
    school_name: str,
    camera_id: str,
    live_api: bool = False,
) -> Optional[dict]:
    """Transmits video clip burst to FastAPI /api/triage/upload-video."""
    if not burst_path.exists():
        logger.error(f"Burst file does not exist: {burst_path}")
        return None

    url = f"{backend_url.rstrip('/')}/api/triage/upload-video"
    tenant_id = "smk-seksyen-9" if "9" in school_name else "smk-seksyen-11"
    headers = {"X-Tenant-ID": tenant_id}
    logger.info(f"Transmitting burst ({burst_path.name}) to {url} [tenant={tenant_id}, live_api={live_api}]...")

    cam_upper = camera_id.upper()
    zone_id = "HOTSPOT_PINTU_BELAKANG" if ("REARGATE" in cam_upper or "CAM04" in cam_upper or "CAM-04" in cam_upper) else None

    try:
        with open(burst_path, "rb") as f:
            files = {"file": (burst_path.name, f, "video/mp4")}
            data = {
                "school_name": school_name,
                "reporter_alias": camera_id,
                "camera_id": camera_id,
                "live_api": "true" if live_api else "false",
            }
            if zone_id:
                data["zone_id"] = zone_id
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, files=files, data=data, headers=headers)
                if resp.status_code == 200:
                    payload = resp.json()
                    severity = payload.get("severity_tier", 1)
                    threat = payload.get("threat_tier", "LOW")
                    logger.info(
                        f"✅ Burst Ingested: Tier {severity} [{threat}] - Incident ID: {payload.get('incident_id')}"
                    )
                    return payload
                else:
                    logger.warning(f"Backend returned HTTP {resp.status_code}: {resp.text}")
                    return None
    except Exception as exc:
        logger.warning(f"Failed to transmit burst: {exc}")
        return None


def main():
    parser = argparse.ArgumentParser(description="SENTIASA Edge Stream Sampler & Motion Peak Agent")
    parser.add_argument(
        "--source",
        type=str,
        default="0",
        help="Video source or comma-separated list of sources (e.g. '0,rtsp://192.168.1.100:554/stream1')",
    )
    parser.add_argument(
        "--backend-url",
        type=str,
        default=os.getenv("SENTIASA_BACKEND_URL", "http://127.0.0.1:8000"),
        help="SENTIASA backend triage API URL",
    )
    parser.add_argument("--school-name", type=str, default="SMK Seksyen 11 Shah Alam", help="Campus name")
    parser.add_argument("--camera-id", type=str, default="CCTV_Edge_RearGate04", help="Camera identifier prefix")
    parser.add_argument("--threshold", type=float, default=12.0, help="Motion detection sensitivity threshold")
    parser.add_argument("--cooldown", type=float, default=5.0, help="Cooldown in seconds between bursts")
    parser.add_argument(
        "--forward-duration",
        type=float,
        default=12.0,
        help="Duration in seconds of forward evidentiary recording if threat verified downstream",
    )
    parser.add_argument("--live-api", action="store_true", help="Send keyframes to Nebius VLM for live reasoning")
    parser.add_argument(
        "--list-devices",
        action="store_true",
        help="Enumerate all available local webcam/capture devices and exit",
    )

    args = parser.parse_args()

    if args.list_devices:
        list_available_devices()
        return

    sources = [s.strip() for s in args.source.split(",") if s.strip()]

    if len(sources) <= 1:
        single_src = sources[0] if sources else "0"
        harvest_and_transmit_burst(
            video_source=single_src,
            backend_url=args.backend_url,
            school_name=args.school_name,
            camera_id=args.camera_id,
            motion_threshold=args.threshold,
            burst_cooldown_sec=args.cooldown,
            forward_duration_sec=args.forward_duration,
            live_api=args.live_api,
        )
    else:
        import threading

        threads = []
        logger.info(f"Initializing Multi-Channel Edge Harvest for {len(sources)} camera sources...")
        for idx, src in enumerate(sources):
            cam_alias = f"{args.camera_id}_Ch{idx+1}"
            t = threading.Thread(
                target=harvest_and_transmit_burst,
                kwargs={
                    "video_source": src,
                    "backend_url": args.backend_url,
                    "school_name": args.school_name,
                    "camera_id": cam_alias,
                    "motion_threshold": args.threshold,
                    "burst_cooldown_sec": args.cooldown,
                    "forward_duration_sec": args.forward_duration,
                    "live_api": args.live_api,
                },
                daemon=True,
            )
            t.start()
            threads.append(t)
            logger.info(f"Spawned worker thread for camera channel [{cam_alias}] on source: {src}")

        try:
            while any(t.is_alive() for t in threads):
                time.sleep(1.0)
        except KeyboardInterrupt:
            logger.info("Stopping all edge camera channel workers...")


if __name__ == "__main__":
    main()
