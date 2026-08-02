import { describe, it, expect } from 'vitest';
import { generateHeart }     from '../src/particles/shapes/heart.js';
import { generateBlackHole } from '../src/particles/shapes/blackHole.js';
import { generateCube }      from '../src/particles/shapes/cube.js';
import { generateDNA }       from '../src/particles/shapes/dna.js';
import { generateGalaxy }    from '../src/particles/shapes/galaxy.js';
import { generateSaturn }    from '../src/particles/shapes/saturn.js';
import { generateSphere, generateInfinity } from '../src/particles/shapes/sphere.js';

const COUNT = 1000;
const SHAPES = [
  ['heart',     generateHeart],
  ['blackHole', generateBlackHole],
  ['cube',      generateCube],
  ['dna',       generateDNA],
  ['galaxy',    generateGalaxy],
  ['saturn',    generateSaturn],
  ['sphere',    generateSphere],
  ['infinity',  generateInfinity],
];

for (const [name, gen] of SHAPES) {
  describe(`${name} shape`, () => {
    const out = gen(COUNT);

    it('returns Float32Array', () => {
      expect(out).toBeInstanceOf(Float32Array);
    });

    it('has correct length (count × 3)', () => {
      expect(out.length).toBe(COUNT * 3);
    });

    it('contains no NaN', () => {
      for (let i = 0; i < out.length; i++) {
        if (Number.isNaN(out[i])) throw new Error(`NaN at index ${i}`);
      }
    });

    it('contains no Infinity', () => {
      for (let i = 0; i < out.length; i++) {
        if (!Number.isFinite(out[i])) throw new Error(`Infinity at index ${i}`);
      }
    });

    it('coordinates within reasonable bounds (±100)', () => {
      for (let i = 0; i < out.length; i++) {
        expect(Math.abs(out[i])).toBeLessThan(100);
      }
    });
  });
}
