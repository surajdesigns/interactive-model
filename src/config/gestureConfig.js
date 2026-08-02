/**
 * All gesture thresholds in one place.
 * Values are normalized by palm scale unless noted.
 */
export const GESTURE_CONFIG = {
  // ── FIST ────────────────────────────────────────────────────────────────
  fist: {
    // avg curl score of index+middle+ring+pinky must exceed this
    curlThresholdEnter: 0.60,
    curlThresholdExit:  0.45,
    holdMs: 180,           // must hold this long before triggering
    cooldownMs: 500,
  },

  // ── OPEN PALM ────────────────────────────────────────────────────────────
  openPalm: {
    // all four main fingers extension score must exceed this
    extensionThreshold: 0.65,
    // thumb can be relaxed
    thumbThreshold: 0.40,
    holdMs: 120,
    cooldownMs: 1200,
  },

  // ── INDEX-THUMB PINCH (CHARGE) ────────────────────────────────────────
  pinch: {
    // normalized distance index-tip to thumb-tip relative to palm scale
    enterRatio: 0.28,
    exitRatio:  0.38,
    holdMs: 80,
    chargeRate: 0.025,     // per frame at 60fps
    dischargeRate: 0.04,
  },

  // ── MIDDLE-THUMB SNAP (SHAPE CHANGE) ─────────────────────────────────
  snap: {
    primeRatio: 0.30,      // thumb-middle normalized dist to prime
    releaseRatio: 0.55,    // dist to trigger after primed
    // velocity of middle tip (normalized/frame) required for snap
    velocityThreshold: 0.018,
    cooldownMs: 800,
    holdMs: 0,
  },

  // ── SWIPE ────────────────────────────────────────────────────────────────
  swipe: {
    minVelocity: 0.022,    // normalized units/frame
    minTravel: 0.20,       // total normalized X travel
    maxVerticalRatio: 0.6, // vertical travel must be < this fraction of horiz
    windowFrames: 12,      // frames to evaluate
    cooldownMs: 700,
  },

  // ── ROTATION ─────────────────────────────────────────────────────────────
  rotation: {
    deadZoneRad: 0.015,    // ignore deltas smaller than this
    maxDeltaRad: 0.3,      // clamp sudden jumps
    smoothing: 0.15,       // EMA alpha for velocity
    inertia: 0.94,         // friction per frame
    baseAutoSpin: 0.0015,
  },

  // ── ZOOM / DEPTH ─────────────────────────────────────────────────────────
  zoom: {
    deadZone: 0.05,        // fraction of calibrated neutral before zoom starts
    min: 0.4,
    max: 3.0,
    smoothing: 0.08,
  },

  // ── VICTORY (V-SIGN) ─────────────────────────────────────────────────────
  victory: {
    extensionThreshold: 0.65,
    holdMs: 200,
    cooldownMs: 2000,
    durationMs: 3000,
  },

  // ── POINTING ─────────────────────────────────────────────────────────────
  pointing: {
    extensionThreshold: 0.65,
    otherCurlThreshold: 0.50,
    holdMs: 120,
  },
};
