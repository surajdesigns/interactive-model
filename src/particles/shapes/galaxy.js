export function generateGalaxy(count) {
  const out  = new Float32Array(count * 3);
  const arms = 4;
  for (let i = 0; i < count; i++) {
    const i3   = i * 3;
    const pt   = i / count;
    // Dense core + arm fade
    const r    = pt < 0.15
      ? Math.random() * 1.5
      : 1.5 + Math.random() * 10.5;
    const arm  = Math.floor(Math.random() * arms);
    const spin = (arm / arms) * Math.PI * 2 + r * 0.45 + (Math.random() - 0.5) * 0.6;
    const diskScatter = Math.max(0, (1 - r / 12)) * 0.8;
    out[i3]     = r * Math.cos(spin);
    out[i3 + 1] = (Math.random() - 0.5) * diskScatter + (Math.random() - 0.5) * 0.3;
    out[i3 + 2] = r * Math.sin(spin);
  }
  return out;
}
