import { describe, it, expect } from 'vitest';
import { streakLength, ParticlePool } from '../js/particles.js';

describe('streakLength', () => {
    it('keeps slow particles short enough to render as dots', () => {
        expect(streakLength(20, 0)).toBeLessThan(1);
    });

    it('grows with speed along any direction', () => {
        expect(streakLength(0, -300)).toBeCloseTo(streakLength(300, 0));
        expect(streakLength(300, 0)).toBeGreaterThan(streakLength(150, 0));
    });

    it('is capped so very fast sparks do not become lines across the screen', () => {
        expect(streakLength(100000, 0)).toBe(22);
    });
});

describe('ParticlePool.createFlash', () => {
    it('spawns a stationary, short-lived particle sized to the kill radius', () => {
        const pool = new ParticlePool(4);
        pool.createFlash(50, 60, 30);
        const flash = pool.pool.find(p => p.active);
        expect(flash).toMatchObject({ x: 50, y: 60, vx: 0, vy: 0, size: 30 });
        expect(flash.life).toBeLessThan(0.2);
    });
});
