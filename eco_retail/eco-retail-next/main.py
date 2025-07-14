import cv2
import threading
import time
from typing import Callable
from ultralytics import YOLO
import numpy as np

# Path to the video file to play when the object is detected
VIDEO_PATH = 'boat_video.mp4'
# Target object name (e.g., 'book')
TARGET_OBJECT = 'book'
# Detection confidence threshold
CONFIDENCE_THRESHOLD = 0.5

# Shared state for the current frame and mode
class DetectionState:
    def __init__(self):
        self.frame = None
        self.lock = threading.Lock()
        self.playing_video = False
        self.last_detection_time = 0
        self.object_present = False
        self.stop_video = False

state = DetectionState()

def run_detector_loop(should_continue: Callable[[], bool]):
    """
    Main loop for object detection and video playback.
    Should be run in a separate thread. Updates the global state.frame for streaming.
    """
    try:
        # Load YOLOv8n model
        model = YOLO('yolov8n.pt')
        # Open webcam
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            raise RuntimeError('Could not open webcam.')
        print('[INFO] Webcam opened.')
        last_seen = 0
        object_present = False
        state.playing_video = False
        state.stop_video = False
        while should_continue():
            if not state.playing_video:
                ret, frame = cap.read()
                if not ret:
                    print('[ERROR] Failed to read from webcam.')
                    break
                # Run YOLO detection
                results = model(frame)
                detected = False
                for r in results:
                    for box in r.boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        label = model.names[cls]
                        if label == TARGET_OBJECT and conf > CONFIDENCE_THRESHOLD:
                            detected = True
                            last_seen = time.time()
                            # Draw bounding box
                            xyxy = box.xyxy[0].cpu().numpy().astype(int)
                            cv2.rectangle(frame, (xyxy[0], xyxy[1]), (xyxy[2], xyxy[3]), (0,255,0), 2)
                            cv2.putText(frame, f'{label} {conf:.2f}', (xyxy[0], xyxy[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
                # If detected, play video
                if detected:
                    print(f'[INFO] {TARGET_OBJECT} detected. Playing video...')
                    state.playing_video = True
                    play_video(VIDEO_PATH, should_continue)
                    state.playing_video = False
                    last_seen = time.time()
                # Update frame for streaming
                with state.lock:
                    state.frame = frame.copy()
            else:
                # If playing video, skip webcam
                time.sleep(0.05)
            # If object not seen for 3 seconds, resume detection
            if not detected and (time.time() - last_seen) > 3:
                state.playing_video = False
        cap.release()
        print('[INFO] Webcam released.')
    except Exception as e:
        print(f'[ERROR] Exception in detector loop: {e}')

def play_video(video_path, should_continue):
    """
    Play a video file frame by frame, updating the global state.frame for streaming.
    """
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f'[ERROR] Could not open video file: {video_path}')
            return
        while cap.isOpened() and should_continue() and not state.stop_video:
            ret, frame = cap.read()
            if not ret:
                break
            with state.lock:
                state.frame = frame.copy()
            # Show each frame for the correct duration
            time.sleep(1/30)  # Assume 30 FPS
        cap.release()
        print('[INFO] Video playback finished.')
    except Exception as e:
        print(f'[ERROR] Exception in play_video: {e}') 