import { describe, it, expect } from 'vitest';
import { ProjectilePool } from '../js/projectiles.js';

describe('ProjectilePool bullet caches', () => {
    it('returns empty lists before the first update instead of undefined', () => {
        const pool = new ProjectilePool(10);
        expect(pool.getPlayerBullets()).toEqual([]);
        expect(pool.getEnemyBullets()).toEqual([]);
        expect(pool.getActive()).toEqual([]);
    });
});

describe('ProjectilePool owner stamping', () => {
    it('stamps handed-out projectiles with the current owner', () => {
        const pool = new ProjectilePool(4);
        pool.currentOwner = 'spider';
        const p = pool.get();
        p.init(0, 0, 1, 0, '#fff', '#fff', true);
        expect(p.owner).toBe('spider');
        pool.currentOwner = 'player';
        expect(pool.get().owner).toBe('player');
    });
});
