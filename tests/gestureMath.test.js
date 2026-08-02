import { describe, it, expect } from 'vitest';
import {
  dist2D, dist3D, palmScale, palmCenter,
  pinchRatio, fingerExtension, fingerCurl,
  allFingersExtension, avgFingerCurl,
  jointAngle, palmAngle, unwrapDelta,
  ema, lerp, clamp, landmarkVelocity,
} from '../src/hand-tracking/gestureMath.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

function makeLandmarks(overrides = {}) {
  // 21 neutral landmarks at default positions
  const lm = Array.from({ length: 21 }, (_, i) => ({ x: i * 0.01, y: 0.5, z: 0 }));
  // Wrist at 0
  lm[0] = { x: 0.5, y: 0.8, z: 0 };
  // Middle MCP at 9 (palm scale ref)
  lm[9] = { x: 0.5, y: 0.55, z: 0 };  // dist ~0.25 from wrist
  Object.assign(lm, overrides);
  return lm;
}

/** Open palm fixture: tips far from wrist */
function openPalmLM() {
  const lm = makeLandmarks();
  // Fingertips far above MCP
  lm[8]  = { x: 0.35, y: 0.2, z: 0 };  // index tip
  lm[12] = { x: 0.45, y: 0.15, z: 0 }; // middle tip
  lm[16] = { x: 0.55, y: 0.17, z: 0 }; // ring tip
  lm[20] = { x: 0.65, y: 0.22, z: 0 }; // pinky tip
  // MCP bases
  lm[5]  = { x: 0.37, y: 0.58, z: 0 };
  lm[9]  = { x: 0.47, y: 0.55, z: 0 };
  lm[13] = { x: 0.57, y: 0.56, z: 0 };
  lm[17] = { x: 0.65, y: 0.59, z: 0 };
  return lm;
}

/** Fist fixture: tips close to wrist */
function fistLM() {
  const lm = makeLandmarks();
  // Tips very close to wrist
  lm[8]  = { x: 0.50, y: 0.72, z: 0 };
  lm[12] = { x: 0.49, y: 0.74, z: 0 };
  lm[16] = { x: 0.51, y: 0.73, z: 0 };
  lm[20] = { x: 0.52, y: 0.71, z: 0 };
  lm[5]  = { x: 0.42, y: 0.60, z: 0 };
  lm[9]  = { x: 0.49, y: 0.58, z: 0 };
  lm[13] = { x: 0.56, y: 0.59, z: 0 };
  lm[17] = { x: 0.62, y: 0.61, z: 0 };
  return lm;
}

/** Index pinch fixture */
function indexPinchLM() {
  const lm = openPalmLM();
  lm[4]  = { x: 0.37, y: 0.22, z: 0 }; // thumb tip near index tip
  lm[8]  = { x: 0.38, y: 0.21, z: 0 };
  return lm;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('dist2D', () => {
  it('computes correct distance', () => {
    expect(dist2D({ x:0, y:0 }, { x:3, y:4 })).toBeCloseTo(5);
  });
  it('returns 0 for same point', () => {
    expect(dist2D({ x:1, y:1 }, { x:1, y:1 })).toBe(0);
  });
});

describe('dist3D', () => {
  it('computes 3D distance', () => {
    expect(dist3D({ x:1,y:2,z:2 }, { x:4,y:6,z:2 })).toBeCloseTo(5);
  });
});

describe('palmScale', () => {
  it('returns positive non-zero value', () => {
    const lm = makeLandmarks();
    expect(palmScale(lm)).toBeGreaterThan(0);
  });
  it('returns larger value for bigger hand', () => {
    const lmSmall = makeLandmarks();
    const lmBig   = makeLandmarks();
    lmBig[9] = { x: 0.5, y: 0.3, z: 0 }; // further from wrist
    expect(palmScale(lmBig)).toBeGreaterThan(palmScale(lmSmall));
  });
});

describe('palmCenter', () => {
  it('returns object with x,y,z', () => {
    const c = palmCenter(makeLandmarks());
    expect(c).toHaveProperty('x');
    expect(c).toHaveProperty('y');
    expect(c).toHaveProperty('z');
  });
  it('result is within landmark bounds', () => {
    const lm = makeLandmarks();
    const c  = palmCenter(lm);
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x).toBeLessThanOrEqual(1);
  });
});

describe('fingerExtension', () => {
  it('open palm returns high extension', () => {
    const lm = openPalmLM();
    const ext = fingerExtension(lm, 9, 12); // middle
    expect(ext).toBeGreaterThan(0.5);
  });
  it('fist returns low extension', () => {
    const lm = fistLM();
    const ext = fingerExtension(lm, 9, 12);
    expect(ext).toBeLessThan(0.5);
  });
  it('value clamped to [0,1]', () => {
    const lm  = openPalmLM();
    const ext = fingerExtension(lm, 9, 12);
    expect(ext).toBeGreaterThanOrEqual(0);
    expect(ext).toBeLessThanOrEqual(1);
  });
});

describe('avgFingerCurl', () => {
  it('open palm → low curl', () => {
    expect(avgFingerCurl(openPalmLM())).toBeLessThan(0.5);
  });
  it('fist → high curl', () => {
    expect(avgFingerCurl(fistLM())).toBeGreaterThan(0.5);
  });
});

describe('pinchRatio', () => {
  it('pinch fixture → ratio below 0.30', () => {
    const lm = indexPinchLM();
    expect(pinchRatio(lm, 8)).toBeLessThan(0.30);
  });
  it('open palm → ratio above 0.5', () => {
    const lm = openPalmLM();
    expect(pinchRatio(lm, 8)).toBeGreaterThan(0.4);
  });
});

describe('unwrapDelta', () => {
  it('handles +PI jump', () => {
    const d = unwrapDelta(0.1, -Math.PI + 0.1);
    expect(Math.abs(d)).toBeLessThanOrEqual(Math.PI);
  });
  it('small angle → returns small delta', () => {
    expect(unwrapDelta(0.5, 0.4)).toBeCloseTo(0.1);
  });
});

describe('ema', () => {
  it('moves toward target', () => {
    const result = ema(0, 10, 0.1);
    expect(result).toBeCloseTo(1.0);
  });
  it('alpha=1 returns target immediately', () => {
    expect(ema(0, 42, 1)).toBe(42);
  });
});

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
  it('passes through in range', () => expect(clamp(5, 0, 10)).toBe(5));
});

describe('landmarkVelocity', () => {
  it('returns 0 when no prev', () => {
    expect(landmarkVelocity(null, { x:0.5, y:0.5 })).toBe(0);
  });
  it('detects movement', () => {
    const v = landmarkVelocity({ x: 0, y: 0 }, { x: 0.1, y: 0 });
    expect(v).toBeGreaterThan(0);
  });
});

describe('jointAngle', () => {
  it('straight line → ~PI', () => {
    const a = { x:0, y:0 };
    const b = { x:1, y:0 };
    const c = { x:2, y:0 };
    expect(jointAngle(a, b, c)).toBeCloseTo(Math.PI, 1);
  });
  it('right angle → ~PI/2', () => {
    const a = { x:0, y:0 };
    const b = { x:1, y:0 };
    const c = { x:1, y:1 };
    expect(jointAngle(a, b, c)).toBeCloseTo(Math.PI / 2, 1);
  });
});

describe('allFingersExtension', () => {
  it('returns array of 4 values', () => {
    expect(allFingersExtension(openPalmLM())).toHaveLength(4);
  });
  it('all values in [0,1]', () => {
    const lm = openPalmLM();
    allFingersExtension(lm).forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});
