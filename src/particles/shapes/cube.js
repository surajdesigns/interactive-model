export function generateCube(count) {
  const out = new Float32Array(count * 3);
  const dim = 6;
  const half = dim / 2;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r  = Math.random();
    if (r < 0.6) {
      // Edge concentration
      const edge = Math.floor(Math.random() * 12);
      const t    = Math.random() * dim - half;
      const e    = [
        [t, -half, -half], [t, -half,  half], [t,  half, -half], [t,  half,  half],
        [-half, t, -half], [-half, t,  half], [ half, t, -half], [ half, t,  half],
        [-half, -half, t], [-half,  half, t], [ half, -half, t], [ half,  half, t],
      ][edge];
      out[i3] = e[0] + (Math.random() - 0.5) * 0.3;
      out[i3 + 1] = e[1] + (Math.random() - 0.5) * 0.3;
      out[i3 + 2] = e[2] + (Math.random() - 0.5) * 0.3;
    } else {
      // Face fill
      const face = Math.floor(Math.random() * 6);
      const u = Math.random() * dim - half;
      const v = Math.random() * dim - half;
      const faces = [
        [u, v, half], [u, v, -half],
        [u, half, v], [u, -half, v],
        [half, u, v], [-half, u, v],
      ];
      const f = faces[face];
      out[i3] = f[0]; out[i3 + 1] = f[1]; out[i3 + 2] = f[2];
    }
  }
  return out;
}
