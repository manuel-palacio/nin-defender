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

describe('ParticlePool shockwave rings', () => {
    it('createRing spawns a stationary ring particle sized to its final radius', () => {
        const pool = new ParticlePool(4);
        pool.createRing(10, 20, '#ff0000', 80);
        const ring = pool.pool.find(p => p.active);
        expect(ring).toMatchObject({ kind: 'ring', x: 10, y: 20, vx: 0, vy: 0, size: 80 });
    });

    it('a shockwave carries rings along with its sparks', () => {
        const pool = new ParticlePool(32);
        pool.createShockwave(0, 0, '#ff0000', 8);
        const active = pool.pool.filter(p => p.active);
        expect(active.filter(p => p.kind === 'ring')).toHaveLength(2);
        expect(active.filter(p => p.kind === 'spark')).toHaveLength(8);
    });

    it('a reused particle goes back to being a spark', () => {
        const pool = new ParticlePool(1);
        pool.createFlash(0, 0, 10);
        const particle = pool.pool[0];
        particle.active = false;
        pool.createTrail(0, 0, '#fff', 2);
        expect(particle.kind).toBe('spark');
    });
});
