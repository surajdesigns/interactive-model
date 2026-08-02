/**
 * Pure utility functions for landmark geometry.
 * All functions are stateless — testable without DOM/Three.
 *
 * Landmark format: { x, y, z }  (normalized 0-1 from MediaPipe)
 */

/** Euclidean 2D distance */
export function dist2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Euclidean 3D distance */
export function dist3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Palm scale: wrist(0) → middle MCP(9) distance.
 * Use as normalization denominator for all other measurements.
 */
export function palmScale(lm) {
  return dist2D(lm[0], lm[9]) + 1e-6;
}

/** Palm center: average of wrist + four MCP landmarks */
export function palmCenter(lm) {
  const pts = [lm[0], lm[5], lm[9], lm[13], lm[17]];
  let x = 0, y = 0, z = 0;
  for (const p of pts) { x += p.x; y += p.y; z += (p.z ?? 0); }
  const n = pts.length;
  return { x: x / n, y: y / n, z: z / n };
}

/**
 * Normalized pinch ratio: thumb-tip to finger-tip distance / palm scale.
 * Values below ~0.28 = pinching.
 */
export function pinchRatio(lm, fingerTipIdx) {
  return dist2D(lm[4], lm[fingerTipIdx]) / palmScale(lm);
}

/**
 * Extension score for a single finger [0..1].
 * 1 = fully extended, 0 = fully curled.
 * Uses tip vs MCP distance normalized by palm scale.
 *
 * Finger landmark groups:
 *   thumb: 1-4, index: 5-8, middle: 9-12, ring: 13-16, pinky: 17-20
 */
export function fingerExtension(lm, mcpIdx, tipIdx) {
  const scale = palmScale(lm);
  const tipDist = dist2D(lm[mcpIdx], lm[tipIdx]);
  // At full extension, tipDist ≈ 1.8× palmScale for index/middle
  // We clamp to [0,1]
  return Math.min(tipDist / (scale * 1.6), 1.0);
}

/**
 * Curl score [0..1]: 1 = fully curled.
 * Convenience: 1 - extensionScore
 */
export function fingerCurl(lm, mcpIdx, tipIdx) {
  return 1 - fingerExtension(lm, mcpIdx, tipIdx);
}

/** All four main fingers extension scores [index, middle, ring, pinky] */
export function allFingersExtension(lm) {
  return [
    fingerExtension(lm, 5, 8),
    fingerExtension(lm, 9, 12),
    fingerExtension(lm, 13, 16),
    fingerExtension(lm, 17, 20),
  ];
}

/** Average curl of index + middle + ring + pinky */
export function avgFingerCurl(lm) {
  const [i, m, r, p] = allFingersExtension(lm);
  return 1 - (i + m + r + p) / 4;
}

/** Joint angle in radians using three landmark points (vertex = b) */
export function jointAngle(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const dot = v1x * v2x + v1y * v2y;
  const mag = Math.sqrt((v1x ** 2 + v1y ** 2) * (v2x ** 2 + v2y ** 2)) + 1e-9;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag)));
}

/** Palm orientation angle (wrist → index MCP) in radians */
export function palmAngle(lm) {
  return Math.atan2(lm[5].y - lm[0].y, lm[5].x - lm[0].x);
}

/**
 * Unwrap angular delta to avoid ±π jumps.
 * Returns delta in [-π, π].
 */
export function unwrapDelta(current, previous) {
  let delta = current - previous;
  if (delta > Math.PI)  delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** Exponential moving average */
export function ema(prev, next, alpha) {
  return prev + alpha * (next - prev);
}

/** Linear interpolate */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Velocity of a landmark across two frames (normalized coords/frame).
 */
export function landmarkVelocity(prev, curr) {
  if (!prev || !curr) return 0;
  return dist2D(prev, curr);
}
