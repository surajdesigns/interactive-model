import { generateHeart }     from './shapes/heart.js';
import { generateBlackHole } from './shapes/blackHole.js';
import { generateCube }      from './shapes/cube.js';
import { generateDNA }       from './shapes/dna.js';
import { generateGalaxy }    from './shapes/galaxy.js';
import { generateSaturn }    from './shapes/saturn.js';
import { generateSphere, generateInfinity } from './shapes/sphere.js';

export const SHAPE_DEFS = [
  { id: 'heart',     label: 'NEON HEART',     theme: { h: 0.95, s: 1.0, l: 0.6 }, gen: generateHeart },
  { id: 'blackhole', label: 'EVENT HORIZON',   theme: { h: 0.55, s: 1.0, l: 0.6 }, gen: generateBlackHole },
  { id: 'cube',      label: 'HYPER CUBE',      theme: { h: 0.10, s: 1.0, l: 0.6 }, gen: generateCube },
  { id: 'dna',       label: 'DNA HELIX',       theme: { h: 0.33, s: 1.0, l: 0.6 }, gen: generateDNA },
  { id: 'galaxy',    label: 'SPIRAL GALAXY',   theme: { h: 0.75, s: 0.9, l: 0.7 }, gen: generateGalaxy },
  { id: 'saturn',    label: 'SATURN RINGS',    theme: { h: 0.05, s: 0.8, l: 0.8 }, gen: generateSaturn },
  { id: 'sphere',    label: 'ENERGY SPHERE',   theme: { h: 0.60, s: 1.0, l: 0.6 }, gen: generateSphere },
  { id: 'infinity',  label: 'INFINITY LOOP',   theme: { h: 0.82, s: 1.0, l: 0.7 }, gen: generateInfinity },
];

/**
 * Manages shape target buffers and eased morphing between them.
 */
export class ShapeManager {
  constructor(particleCount) {
    this._count   = particleCount;
    this._index   = 0;

    // Two target buffers: from/to for morphing
    this._from    = new Float32Array(particleCount * 3);
    this._to      = new Float32Array(particleCount * 3);
    this._current = new Float32Array(particleCount * 3);

    // Morph progress [0..1]
    this._morphT  = 1.0;
    this._morphSpeed = 0.04; // per frame ~60fps → ~0.67s transition

    this._generate(0);
    this._current.set(this._to);
  }

  get shapeIndex() { return this._index; }
  get shapeDef()   { return SHAPE_DEFS[this._index]; }
  get count()      { return SHAPE_DEFS.length; }

  next() { this.goTo((this._index + 1) % SHAPE_DEFS.length); }
  prev() { this.goTo((this._index - 1 + SHAPE_DEFS.length) % SHAPE_DEFS.length); }

  goTo(idx) {
    if (idx === this._index && this._morphT >= 1.0) return;
    // Snapshot current interpolated positions as new "from"
    this._from.set(this._current);
    this._index = idx;
    this._generate(idx);
    this._morphT = 0.0;
  }

  /**
   * Update morph per frame. Returns current target positions.
   * @param {Float32Array} posArray  live position array to write into
   */
  updateMorph(posArray) {
    if (this._morphT >= 1.0) {
      // No morph active — posArray drives itself via lerp in ParticleEngine
      return this._to;
    }

    // easeInOutCubic
    this._morphT = Math.min(1.0, this._morphT + this._morphSpeed);
    const t = easeInOutCubic(this._morphT);

    for (let i = 0; i < this._count * 3; i++) {
      this._current[i] = this._from[i] + (this._to[i] - this._from[i]) * t;
    }
    return this._current;
  }

  getTargets() {
    return this._morphT >= 1.0 ? this._to : this._current;
  }

  _generate(idx) {
    const buf = SHAPE_DEFS[idx].gen(this._count);
    this._to.set(buf);
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
