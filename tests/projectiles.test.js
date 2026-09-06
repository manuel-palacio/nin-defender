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
