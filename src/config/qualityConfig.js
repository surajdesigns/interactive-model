export const QUALITY_PRESETS = {
  LOW: {
    particleCount: 10000,
    pixelRatio: 1.0,
    bloomStrength: 0.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.2,
    trackingFPS: 15,
    label: 'LOW',
  },
  MEDIUM: {
    particleCount: 22000,
    pixelRatio: 1.25,
    bloomStrength: 0.8,
    bloomRadius: 0.5,
    bloomThreshold: 0.15,
    trackingFPS: 20,
    label: 'MEDIUM',
  },
  HIGH: {
    particleCount: 45000,
    pixelRatio: 1.5,
    bloomStrength: 1.0,
    bloomRadius: 0.6,
    bloomThreshold: 0.12,
    trackingFPS: 25,
    label: 'HIGH',
  },
  ULTRA: {
    particleCount: 70000,
    pixelRatio: 2.0,
    bloomStrength: 1.2,
    bloomRadius: 0.7,
    bloomThreshold: 0.10,
    trackingFPS: 30,
    label: 'ULTRA ⚠️',
  },
};

// FPS thresholds for auto-downgrade
export const PERF_CONFIG = {
  // If avg FPS stays below this for evalWindow frames → downgrade
  downgradeFPS: 38,
  // Wait this many frames before evaluating after a quality change
  evalWindow: 120,
  // Min time between auto quality changes (ms)
  cooldownMs: 8000,
};
