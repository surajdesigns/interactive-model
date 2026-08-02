export function generateSaturn(count) {
  const out = new Float32Array(count * 3);
  const tilt = Math.PI * 0.22; // ring tilt radians
  const sinT = Math.sin(tilt);
  const cosT = Math.cos(tilt);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const isPlanet = i < count * 0.28;

    if (isPlanet) {
      const phi   = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r     = 3.0;
      out[i3]     = r * Math.sin(phi) * Math.cos(theta);
      out[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      out[i3 + 2] = r * Math.cos(phi);
    } else {
      // Multiple ring bands with Cassini-like gap
      let r;
      const rnd = Math.random();
      if (rnd < 0.5)       r = 4.5 + Math.random() * 1.5;   // B ring
      else if (rnd < 0.65) r = 6.5 + Math.random() * 0.3;   // gap (sparse)
      else if (rnd < 0.90) r = 7.0 + Math.random() * 2.0;   // A ring
      else                 r = 9.5 + Math.random() * 0.8;   // outer faint

      const theta = Math.random() * Math.PI * 2;
      const flat  = (Math.random() - 0.5) * 0.12;
      // Tilt ring plane
      const rx = r * Math.cos(theta);
      const rz = r * Math.sin(theta);
      out[i3]     = rx;
      out[i3 + 1] = rz * sinT + flat * cosT;
      out[i3 + 2] = rz * cosT - flat * sinT;
    }
  }
  return out;
}
