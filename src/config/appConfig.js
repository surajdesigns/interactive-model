export const APP_CONFIG = {
  name: 'Neural Core X',
  version: '1.0.0',
  // MediaPipe model path (served from /public/models/)
  modelPath: 'models/hand_landmarker.task',
  // Fallback CDN if local model missing
  modelCDN: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  camera: {
    width: 640,
    height: 480,
    facingMode: 'user',
  },
  tracking: {
    targetFPS: 25,           // inference FPS (separate from render FPS)
    maxNumHands: 1,
    minDetectionConfidence: 0.65,
    minPresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  },
  render: {
    fov: 75,
    near: 0.1,
    far: 1000,
    cameraZ: 13,
  },
};
