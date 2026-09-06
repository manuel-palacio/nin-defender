import { describe, it, expect, beforeEach } from 'vitest';
import { EnemySpawner, PHASES } from '../js/enemies/spawner.js';

beforeEach(() => clearGameStorage());

describe('PHASES thresholds (early-game pacing)', () => {
    it('reaches phase 1 at 1500 score', () => {
        const spawner = new EnemySpawner();
        expect(spawner.getPhase(0)).toBe(0);
        expect(spawner.getPhase(1499)).toBe(0);
        expect(spawner.getPhase(1500)).toBe(1);
    });

    it('compresses the early curve and keeps 10 phases', () => {
        expect(PHASES.length).toBe(10);
        expect(PHASES[2].threshold).toBe(4000);
        expect(PHASES[3].threshold).toBe(7500);
        const spawner = new EnemySpawner();
        expect(spawner.getPhase(PHASES[9].threshold)).toBe(9);
    });

    it('has strictly increasing thresholds', () => {
        for (let i = 1; i < PHASES.length; i++) {
            expect(PHASES[i].threshold).toBeGreaterThan(PHASES[i - 1].threshold);
        }
    });
});

describe('EnemySpawner.makeElite', () => {
    it('doubles HP, gives 1.5x points, and flags the enemy', () => {
        const spawner = new EnemySpawner();
        const e = { hp: 2, maxHp: 2, points: 20 };
        spawner.makeElite(e);
        expect(e.elite).toBe(true);
        expect(e.hp).toBe(4);
        expect(e.maxHp).toBe(4);
        expect(e.points).toBe(30);
    });
});

describe('EnemySpawner.getSpawnInterval', () => {
    it('starts at baseInterval for phase 0', () => {
        const spawner = new EnemySpawner();
        spawner.baseInterval = 1.5;
        expect(spawner.getSpawnInterval(0)).toBeCloseTo(1.5);
    });

    it('respects difficulty baseInterval (EASY slower than BRUTAL)', () => {
        const easy = new EnemySpawner();
        easy.baseInterval = 2.0;
        const brutal = new EnemySpawner();
        brutal.baseInterval = 1.1;
        for (let phase = 0; phase < 10; phase++) {
            expect(easy.getSpawnInterval(phase)).toBeGreaterThanOrEqual(
                brutal.getSpawnInterval(phase));
        }
        expect(easy.getSpawnInterval(0)).toBeGreaterThan(brutal.getSpawnInterval(0));
    });

    it('decays exponentially with phase and floors at 0.45s', () => {
        const spawner = new EnemySpawner();
        spawner.baseInterval = 1.5;
        expect(spawner.getSpawnInterval(1)).toBeCloseTo(1.5 * 0.82);
        expect(spawner.getSpawnInterval(9)).toBeGreaterThanOrEqual(0.45);
        expect(spawner.getSpawnInterval(30)).toBe(0.45);
    });
});

describe('EnemySpawner.reset', () => {
    it('clears the phase carried over from the previous run', () => {
        const spawner = new EnemySpawner();
        spawner.currentPhase = 6;
        spawner.reset();
        expect(spawner.currentPhase).toBe(0);
    });
});

describe('EnemySpawner during a boss fight', () => {
    const noPool = { get: () => null };
    it('holds the current phase while bossActive even if score crosses a threshold', () => {
        const spawner = new EnemySpawner();
        spawner.timer = 100; // no spawns
        spawner.update(0.016, 1500, 1280, 720, noPool, 360, null, 80);
        expect(spawner.currentPhase).toBe(1);
        spawner.bossActive = true;
        spawner.update(0.016, 9999, 1280, 720, noPool, 360, null, 80);
        expect(spawner.currentPhase).toBe(1);
        spawner.bossActive = false;
        spawner.update(0.016, 9999, 1280, 720, noPool, 360, null, 80);
        expect(spawner.currentPhase).toBe(3);
    });

    it('spawns slower while a boss is alive', () => {
        const spawner = new EnemySpawner();
        spawner.baseInterval = 1.5;
        const normal = spawner.getSpawnInterval(2);
        spawner.bossActive = true;
        expect(spawner.getSpawnInterval(2)).toBeGreaterThan(normal * 1.5);
    });
});
