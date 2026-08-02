import * as THREE from 'three';

// Reused temporaries — NEVER allocate inside the loop
const _tmpColor = new THREE.Color();

/**
 * Manages the BufferGeometry + PointsMaterial + per-frame CPU update.
 * Zero object allocation inside animate().
 */
export class ParticleEngine {
  constructor(scene, particleCount) {
    this._count   = particleCount;
    this._scene   = scene;

    // Typed arrays
    this._pos     = new Float32Array(particleCount * 3);
    this._col     = new Float32Array(particleCount * 3);

    // State mirrored from outside (set by App)
    this.rotAngle      = 0;
    this.rotVelocity   = 0.002;
    this.zoom          = 1.0;
    this.targetZoom    = 1.0;
    this.pulse         = 1.0;
    this.explodeFactor = 0.0;
    this.chargeLevel   = 0.0;
    this.isFrozen      = false;
    this.isExploding   = false;
    this.isCharging    = false;
    this.sceneOffsetX  = 0;
    this.sceneOffsetY  = 0;
    this.handX         = 0;  // world-space
    this.handY         = 0;
    this.handDetected  = false;
    this.theme         = { h: 0.95, s: 1.0, l: 0.6 };
    this.victoryMode   = false;
    this.pointingX     = 0;
    this.pointingY     = 0;
    this.isPointing    = false;

    this._buildGeometry();
    this._initPositions();
  }

  _buildGeometry() {
    this._geo = new THREE.BufferGeometry();
    this._geo.setAttribute('position', new THREE.BufferAttribute(this._pos, 3));
    this._geo.setAttribute('color',    new THREE.BufferAttribute(this._col, 3));

    const tex = this._buildTexture();
    this._mat = new THREE.PointsMaterial({
      size: 0.12,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this._points = new THREE.Points(this._geo, this._mat);
    this._scene.add(this._points);
  }

  _buildTexture() {
    const c   = document.createElement('canvas');
    c.width   = 32; c.height = 32;
    const ctx = c.getContext('2d');
    const g   = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }

  _initPositions() {
    for (let i = 0; i < this._count; i++) {
      const i3 = i * 3;
      this._pos[i3]     = (Math.random() - 0.5) * 50;
      this._pos[i3 + 1] = (Math.random() - 0.5) * 50;
      this._pos[i3 + 2] = (Math.random() - 0.5) * 50;
    }
  }

  /**
   * Call every render frame.
   * @param {Float32Array} targets — shape target positions (from ShapeManager)
   */
  animate(targets) {
    const pos     = this._pos;
    const col     = this._col;
    const count   = this._count;
    const theme   = this.theme;

    // Smooth zoom
    this.zoom += (this.targetZoom - this.zoom) * 0.1;

    const cosRot = Math.cos(this.rotAngle);
    const sinRot = Math.sin(this.rotAngle);
    const explFac = this.explodeFactor;
    const frozen  = this.isFrozen;
    const explode = this.isExploding;
    const charge  = this.isCharging;
    const zoom    = this.zoom;
    const pulse   = this.pulse;
    const offX    = this.sceneOffsetX;
    const offY    = this.sceneOffsetY;
    const hDetect = this.handDetected;
    const hx      = this.handX;
    const hy      = this.handY;
    const chLvl   = this.chargeLevel;
    const thH     = theme.h;
    const thS     = theme.s;
    const thL     = theme.l;
    const pointing = this.isPointing;
    const ptX     = this.pointingX;
    const ptY     = this.pointingY;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // ── FREEZE ─────────────────────────────────────────────────────────
      if (frozen) {
        pos[i3]     += (Math.random() - 0.5) * 0.015;
        pos[i3 + 1] += (Math.random() - 0.5) * 0.015;
        pos[i3 + 2] += (Math.random() - 0.5) * 0.015;
        col[i3]     += (0.75 - col[i3])     * 0.08;
        col[i3 + 1] += (0.90 - col[i3 + 1]) * 0.08;
        col[i3 + 2] += (1.00 - col[i3 + 2]) * 0.08;
        continue;
      }

      // ── BASE TARGET ────────────────────────────────────────────────────
      let tx = targets[i3]     * zoom * pulse;
      let ty = targets[i3 + 1] * zoom * pulse;
      let tz = targets[i3 + 2] * zoom * pulse;

      // ── ROTATION (Y-axis) ──────────────────────────────────────────────
      const rx = tx * cosRot - tz * sinRot;
      const rz = tx * sinRot + tz * cosRot;
      tx = rx; tz = rz;

      // ── EXPLOSION ──────────────────────────────────────────────────────
      if (explFac > 0.01) {
        const dist = Math.sqrt(tx * tx + ty * ty + tz * tz) + 0.1;
        const force = 14 * explFac;
        tx += (tx / dist) * force;
        ty += (ty / dist) * force;
        tz += (tz / dist) * force;
      }

      // ── POINTING ATTRACTOR ─────────────────────────────────────────────
      if (pointing) {
        const dx = ptX - tx;
        const dy = ptY - ty;
        const d  = Math.sqrt(dx * dx + dy * dy) + 0.1;
        if (d < 8) {
          const pull = (8 - d) * 0.04;
          tx += dx * pull;
          ty += dy * pull;
        }
      }

      // ── HAND MAGNET ────────────────────────────────────────────────────
      if (hDetect && !explode && !charge) {
        const dx = hx - tx;
        const dy = hy - ty;
        const d  = Math.sqrt(dx * dx + dy * dy) + 0.1;
        if (d < 5.5) {
          const pull = (5.5 - d) * 0.025;
          tx += dx * pull;
          ty += dy * pull;
        }
      }

      // ── GLOBAL OFFSET ──────────────────────────────────────────────────
      tx += offX;
      ty += offY;

      // ── PHYSICS LERP ───────────────────────────────────────────────────
      const ease = explode ? 0.22 : 0.14;
      pos[i3]     += (tx - pos[i3])     * ease;
      pos[i3 + 1] += (ty - pos[i3 + 1]) * ease;
      pos[i3 + 2] += (tz - pos[i3 + 2]) * ease;

      // ── COLOR ──────────────────────────────────────────────────────────
      const dist2c = Math.sqrt(tx * tx + ty * ty + tz * tz);
      let h = thH + dist2c * 0.009;
      let s = thS;
      let l = thL;

      if (charge)  { l += chLvl * 0.5; s -= chLvl * 0.8; }
      if (explode) { h = 0.05 + Math.random() * 0.08; l = 0.9; }

      // Reuse single Color object — no allocation
      _tmpColor.setHSL(h % 1, Math.max(0, s), Math.min(1, l));
      col[i3]     = _tmpColor.r;
      col[i3 + 1] = _tmpColor.g;
      col[i3 + 2] = _tmpColor.b;
    }

    this._geo.attributes.position.needsUpdate = true;
    this._geo.attributes.color.needsUpdate    = true;
  }

  setParticleSize(size) {
    this._mat.size = size;
  }

  dispose() {
    this._scene.remove(this._points);
    this._geo.dispose();
    this._mat.dispose();
  }
}
