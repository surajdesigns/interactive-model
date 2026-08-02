export function generateBlackHole(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const pt  = i / count;
    const theta = pt * Math.PI * 2;
    // Inward spiral accretion disk
    const turns = 6;
    const r = 2 + (1 - pt) * 9; // outermost first
    const spiral = theta * turns + r * 0.3;
    const diskY = (Math.random() - 0.5) * (r * 0.18);
    out[i3]     = r * Math.cos(spiral);
    out[i3 + 1] = diskY;
    out[i3 + 2] = r * Math.sin(spiral);
  }
  return out;
}
