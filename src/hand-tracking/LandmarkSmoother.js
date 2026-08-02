/**
 * One Euro Filter per landmark coordinate.
 * Smooths jitter while remaining responsive to fast movement.
 *
 * Reference: Géry Casiez, Nicolas Roussel, Daniel Vogel (2012)
 */

class OneEuroFilter {
  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this._x = null;
    this._dx = 0;
    this._lastTime = null;
  }

  _alpha(cutoff, dt) {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x, timestamp) {
    const dt = this._lastTime !== null
      ? Math.max((timestamp - this._lastTime) / 1000, 0.001)
      : 0.016;
    this._lastTime = timestamp;

    if (this._x === null) { this._x = x; return x; }

    const aDx = this._alpha(this.dCutoff, dt);
    const dx = (x - this._x) / dt;
    this._dx = this._dx + aDx * (dx - this._dx);

    const cutoff = this.minCutoff + this.beta * Math.abs(this._dx);
    const a = this._alpha(cutoff, dt);
    this._x = this._x + a * (x - this._x);
    return this._x;
  }

  reset() {
    this._x = null;
    this._dx = 0;
    this._lastTime = null;
  }
}

/** Profiles control the balance between smoothness and responsiveness. */
export const SMOOTHER_PROFILES = {
  CURSOR:    { minCutoff: 3.0,  beta: 0.8,  dCutoff: 1.0 }, // Responsive
  GESTURE:   { minCutoff: 1.5,  beta: 0.3,  dCutoff: 1.0 }, // Balanced
  ROTATION:  { minCutoff: 2.0,  beta: 0.5,  dCutoff: 1.0 }, // Medium
  VELOCITY:  { minCutoff: 8.0,  beta: 0.0,  dCutoff: 1.0 }, // Raw (no smooth)
  DEPTH:     { minCutoff: 1.0,  beta: 0.1,  dCutoff: 1.0 }, // Slow zoom
};

/**
 * Smooths all 21 landmarks × 3 coords independently.
 * After tracking loss for > resetMs, filters reset to avoid stale carry-over.
 */
export class LandmarkSmoother {
  constructor(profile = SMOOTHER_PROFILES.GESTURE, resetMs = 500) {
    this._profile = profile;
    this._resetMs = resetMs;
    this._filters = this._makeFilters();
    this._lastSeenMs = null;
  }

  _makeFilters() {
    const { minCutoff, beta, dCutoff } = this._profile;
    // 21 landmarks × 3 coords (x, y, z)
    return Array.from({ length: 21 * 3 }, () => new OneEuroFilter(minCutoff, beta, dCutoff));
  }

  /**
   * @param {Array<{x,y,z}>} landmarks  21-element array from MediaPipe
   * @param {number} timestamp  performance.now()
   * @returns {Array<{x,y,z}>}  smoothed landmarks
   */
  smooth(landmarks, timestamp) {
    // Reset if tracking was lost for too long
    if (this._lastSeenMs !== null && timestamp - this._lastSeenMs > this._resetMs) {
      this._filters.forEach(f => f.reset());
    }
    this._lastSeenMs = timestamp;

    return landmarks.map((lm, i) => {
      const base = i * 3;
      return {
        x: this._filters[base + 0].filter(lm.x, timestamp),
        y: this._filters[base + 1].filter(lm.y, timestamp),
        z: this._filters[base + 2].filter(lm.z ?? 0, timestamp),
      };
    });
  }

  reset() {
    this._filters.forEach(f => f.reset());
    this._lastSeenMs = null;
  }

  setProfile(profile) {
    this._profile = profile;
    this._filters = this._makeFilters();
  }
}
