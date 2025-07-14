from flask import Flask, Response, request, jsonify
import threading
import time
from main import run_detector_loop, state
import cv2

app = Flask(__name__)

detector_thread = None
should_run = threading.Event()

@app.route('/start', methods=['POST'])
def start_detection():
    global detector_thread
    if detector_thread and detector_thread.is_alive():
        return jsonify({'status': 'already running'}), 200
    should_run.set()
    detector_thread = threading.Thread(target=run_detector_loop, args=(should_run.is_set,), daemon=True)
    detector_thread.start()
    return jsonify({'status': 'started'}), 200

@app.route('/stop', methods=['POST'])
def stop_detection():
    should_run.clear()
    # Signal to stop video playback if running
    state.stop_video = True
    time.sleep(0.5)
    return jsonify({'status': 'stopped'}), 200

@app.route('/video_feed')
def video_feed():
    def generate():
        while should_run.is_set():
            with state.lock:
                frame = state.frame.copy() if state.frame is not None else None
            if frame is not None:
                ret, jpeg = cv2.imencode('.jpg', frame)
                if not ret:
                    continue
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            else:
                time.sleep(0.05)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 