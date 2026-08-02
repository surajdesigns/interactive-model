import { PERF_CONFIG, QUALITY_PRESETS } from '../config/qualityConfig.js';
import { bus, EVENTS } from '../core/EventBus.js';

const QUALITY_ORDER = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

export class PerformanceManager {
  constructor(initialQuality = 'HIGH') {
    this._qualityKey    = initialQuality;
    this._frameTimes    = [];
    this._maxSamples    = 90;
    this._lastFrameTime = performance.now();
    this._lastDowngrade = 0;
    this._evalCounter   = 0;
    this._autoEnabled   = true;
  }

  tick() {
    const now = performance.now();
    const dt  = now - this._lastFrameTime;
    this._lastFrameTime = now;

    this._frameTimes.push(dt);
    if (this._frameTimes.length > this._maxSamples) this._frameTimes.shift();
    this._evalCounter++;

    if (this._autoEnabled && this._evalCounter >= PERF_CONFIG.evalWindow) {
      this._evalCounter = 0;
      this._evaluate(now);
    }

    return 1000 / (dt + 0.001); // instant FPS
  }

  get avgFPS() {
    if (!this._frameTimes.length) return 60;
    const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    return 1000 / avg;
  }

  get quality() { return QUALITY_PRESETS[this._qualityKey]; }
  get qualityKey() { return this._qualityKey; }

  setQuality(key) {
    if (!QUALITY_PRESETS[key]) return;
    this._qualityKey = key;
    bus.emit(EVENTS.QUALITY_CHANGE, { key, preset: QUALITY_PRESETS[key] });
  }

  setAuto(enabled) { this._autoEnabled = enabled; }

  _evaluate(now) {
    if (now - this._lastDowngrade < PERF_CONFIG.cooldownMs) return;
    if (this.avgFPS < PERF_CONFIG.downgradeFPS) {
      const idx = QUALITY_ORDER.indexOf(this._qualityKey);
      if (idx > 0) {
        this._lastDowngrade = now;
        this.setQuality(QUALITY_ORDER[idx - 1]);
        console.log(`[Perf] Auto-downgrade → ${this._qualityKey} (avg ${this.avgFPS.toFixed(1)} FPS)`);
      }
    }
  }

  /** Run a quick benchmark to pick initial quality preset */
  static async benchmark() {
    return new Promise(resolve => {
      const times = [];
      let frames  = 0;
      let last    = performance.now();
      const run = () => {
        const now = performance.now();
        times.push(now - last);
        last = now;
        frames++;
        if (frames < 30) requestAnimationFrame(run);
        else {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          const fps = 1000 / avg;
          // Rough GPU tier from rAF baseline
          let key = fps > 55 ? 'HIGH' : fps > 35 ? 'MEDIUM' : 'LOW';
          // Downgrade for mobile
          if (/Mobi|Android/i.test(navigator.userAgent)) {
            key = key === 'HIGH' ? 'MEDIUM' : 'LOW';
          }
          resolve(key);
        }
      };
      requestAnimationFrame(run);
    });
  }
}
