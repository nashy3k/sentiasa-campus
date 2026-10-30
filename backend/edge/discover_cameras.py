"""
Camera & Video Source Discovery Tool for Windows & Project SENTIASA Edge Agent.
Scans DirectShow and Media Foundation video capture devices (indices 0 to 5)
to identify your Razer Kiyo Pro, phone webcam, or virtual devices.
"""

import sys

try:
    import cv2
except ImportError:
    print("OpenCV is not installed. Run `uv sync` first.")
    sys.exit(1)


def probe_cameras(max_indices: int = 6):
    print("=" * 65)
    print("  PROJECT SENTIASA: HARDWARE & VIRTUAL CAMERA PROBER (WINDOWS)")
    print("=" * 65)
    print(f"Scanning camera indices 0 through {max_indices - 1} via OpenCV DirectShow...\n")

    found_any = False
    for idx in range(max_indices):
        # On Windows, cv2.CAP_DSHOW provides fast enumeration without freezing
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
                print(f"  [Index {idx}] AVAILABLE & RESPONSIVE")
                print(f"            Resolution : {width}x{height}")
                print(f"            Nominal FPS: {fps:.1f}")
                print(f"            Status     : Frame grab OK (mean intensity: {frame.mean():.1f})")
                print(f"            Usage      : uv run python -m backend.edge.stream_sampler --source {idx}\n")
                found_any = True
            else:
                print(f"  [Index {idx}] OPENED BUT BLOCKED / TIMED OUT")
                print("            (Likely a virtual camera waiting for a wireless device connection)\n")
            cap.release()
        else:
            # Device not present
            pass

    if not found_any:
        print("No active camera devices responded to frame capture.")
        print("Tip: If using your phone as a webcam, verify it is connected via USB or Wi-Fi RTSP.")
    print("=" * 65)


if __name__ == "__main__":
    probe_cameras()
