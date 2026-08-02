export function generateDNA(count) {
  const out    = new Float32Array(count * 3);
  const height = 22;
  const radius = 3.5;
  const twist  = 0.65;

  for (let i = 0; i < count; i++) {
    const i3  = i * 3;
    const pt  = i / count;
    const h   = pt * height - height / 2;
    const ang = h * twist;
    const seg = i % 10;

    if (seg < 4) {
      // Strand A
      out[i3]     = Math.cos(ang) * radius + (Math.random() - 0.5) * 0.25;
      out[i3 + 1] = h;
      out[i3 + 2] = Math.sin(ang) * radius + (Math.random() - 0.5) * 0.25;
    } else if (seg < 8) {
      // Strand B
      out[i3]     = Math.cos(ang + Math.PI) * radius + (Math.random() - 0.5) * 0.25;
      out[i3 + 1] = h;
      out[i3 + 2] = Math.sin(ang + Math.PI) * radius + (Math.random() - 0.5) * 0.25;
    } else {
      // Base pair connector
      const t  = Math.random();
      const x1 = Math.cos(ang) * radius;
      const z1 = Math.sin(ang) * radius;
      const x2 = Math.cos(ang + Math.PI) * radius;
      const z2 = Math.sin(ang + Math.PI) * radius;
      out[i3]     = x1 + (x2 - x1) * t;
      out[i3 + 1] = h;
      out[i3 + 2] = z1 + (z2 - z1) * t;
    }
  }
  return out;
}
