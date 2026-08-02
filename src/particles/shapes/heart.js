/**
 * Heart shape — volumetric fill with double-beat pulse support.
 * Returns Float32Array of [x, y, z, x, y, z, ...]
 */
export function generateHeart(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3  = i * 3;
    const t   = (i / count) * Math.PI * 2;
    const r   = Math.sqrt(Math.random()); // radial fill
    // Parametric heart surface
    const hx  = 16 * Math.pow(Math.sin(t), 3);
    const hy  = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const scale = 0.30 * r;
    out[i3]     = hx * scale;
    out[i3 + 1] = hy * scale;
    out[i3 + 2] = (Math.random() - 0.5) * 5 * r;
  }
  return out;
}
