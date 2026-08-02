import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { bus, EVENTS } from '../core/EventBus.js';
import { APP_CONFIG as CFG } from '../config/appConfig.js';
import { LandmarkSmoother, SMOOTHER_PROFILES } from './LandmarkSmoother.js';
import { GestureStateMachine } from './GestureStateMachine.js';

export class HandTracker {
  constructor() {
    this._landmarker   = null;
    this._video        = null;
    this._rafId        = null;
    this._running      = false;
    this._inferring    = false;        // guard against concurrent inference
    this._lastInferTs  = 0;
    this._intervalMs   = 1000 / CFG.tracking.targetFPS;

    this._smoother     = new LandmarkSmoother(SMOOTHER_PROFILES.GESTURE);
    this._cursorSmoother = new LandmarkSmoother(SMOOTHER_PROFILES.CURSOR);
    this._gestureSM    = new GestureStateMachine();
    this._stream       = null;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  async loadModel() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
      );
      this._landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          // Try local first, then CDN
          modelAssetPath: this._resolveModelPath(),
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: CFG.tracking.maxNumHands,
        minHandDetectionConfidence: CFG.tracking.minDetectionConfidence,
        minHandPresenceConfidence: CFG.tracking.minPresenceConfidence,
        minTrackingConfidence:     CFG.tracking.minTrackingConfidence,
      });
    } catch (err) {
      // GPU delegate failed → retry CPU
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm'
        );
        this._landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: CFG.modelCDN,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: CFG.tracking.maxNumHands,
          minHandDetectionConfidence: CFG.tracking.minDetectionConfidence,
          minHandPresenceConfidence:  CFG.tracking.minPresenceConfidence,
          minTrackingConfidence:      CFG.tracking.minTrackingConfidence,
        });
      } catch (err2) {
        throw new Error('MediaPipe model failed to load: ' + err2.message);
      }
    }
  }

  async startCamera(facingMode = 'user') {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API not available in this browser.');
    }
    this._stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width:  { ideal: CFG.camera.width },
        height: { ideal: CFG.camera.height },
        facingMode,
      },
      audio: false,
    });

    this._video = document.getElementById('ncx-video');
    if (!this._video) throw new Error('Video element #ncx-video not found.');
    this._video.srcObject = this._stream;
    await new Promise((res, rej) => {
      this._video.onloadedmetadata = res;
      setTimeout(() => rej(new Error('Camera startup timeout')), 10000);
    });
    await this._video.play();
    this._running = true;
    this._loop();
  }

  stopCamera() {
    this._running = false;
    if (this._rafId) { cancelAnimationFrame(this._rafId); this._rafId = null; }
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this._video) { this._video.srcObject = null; }
    this._smoother.reset();
    this._cursorSmoother.reset();
    bus.emit(EVENTS.HAND_LOST, {});
  }

  setTargetFPS(fps) {
    this._intervalMs = 1000 / Math.max(1, fps);
  }

  dispose() {
    this.stopCamera();
    this._landmarker?.close();
    this._landmarker = null;
  }

  get gestureSM() { return this._gestureSM; }

  // ── Private ──────────────────────────────────────────────────────────────

  _resolveModelPath() {
    // Vite base-aware path → public/models/
    const base = import.meta.env.BASE_URL ?? '/';
    return base + 'models/hand_landmarker.task';
  }

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());

    const now = performance.now();
    if (now - this._lastInferTs < this._intervalMs) return;
    if (this._inferring) return;
    if (!this._video || this._video.readyState < 2) return;

    this._lastInferTs = now;
    this._inferring   = true;

    try {
      const result = this._landmarker.detectForVideo(this._video, now);
      this._processResult(result, now);
    } catch (err) {
      console.warn('[HandTracker] inference error:', err);
    } finally {
      this._inferring = false;
    }
  }

  _processResult(result, now) {
    if (!result.landmarks || result.landmarks.length === 0) {
      this._gestureSM.update(null, now);
      bus.emit(EVENTS.HAND_LOST, {});
      return;
    }

    bus.emit(EVENTS.HAND_DETECTED, {});

    const raw = result.landmarks[0];
    const smoothed = this._smoother.smooth(raw, now);
    const cursor   = this._cursorSmoother.smooth(raw, now);

    this._gestureSM.update(smoothed, now);

    // Cursor position: emit separately so UI can react faster
    bus.emit(EVENTS.HAND_UPDATE, { cursorLandmarks: cursor });
  }
}
