export function generateSphere(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3    = i * 3;
    const phi   = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    const r     = 5.0 + (Math.random() - 0.5) * 0.8;
    out[i3]     = r * Math.sin(phi) * Math.cos(theta);
    out[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    out[i3 + 2] = r * Math.cos(phi);
  }
  return out;
}

export function generateInfinity(count) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const i3  = i * 3;
    const t   = (i / count) * Math.PI * 2;
    const r   = 0.5 + Math.random() * 0.8;
    // Lemniscate of Bernoulli
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x     = (6 * Math.cos(t)) / denom;
    const y     = (6 * Math.sin(t) * Math.cos(t)) / denom;
    out[i3]     = x + (Math.random() - 0.5) * r;
    out[i3 + 1] = y + (Math.random() - 0.5) * r;
    out[i3 + 2] = (Math.random() - 0.5) * 2.0 * r;
  }
  return out;
}
