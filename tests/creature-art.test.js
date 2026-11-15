import { describe, it, expect, vi } from 'vitest';

// Glow sprites need a real canvas; the painters only need them not to throw.
vi.mock('../js/glow.js', () => ({ drawGlow: () => {}, drawBolt: () => {} }));

import {
    Boss, BOSS_NAMES, EnemyShip, Drone, SpaceMine, SpiderDrone, AlienGhost,
    Bomber, StealthFighter, AlienDevil,
} from '../js/enemies.js';
import { spine } from '../js/enemies/creature-art.js';

// A 2D context that accepts any call and hands back gradients, counting
// how many shapes were filled.
function recordingContext() {
    const calls = { fill: 0 };
    const gradient = { addColorStop() {} };
    const target = { globalAlpha: 1, globalCompositeOperation: 'source-over' };
    const ctx = new Proxy(target, {
        get(obj, prop) {
            if (prop in obj) return obj[prop];
            if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
            if (prop === 'measureText') return () => ({ width: 10 });
            return () => { if (prop === 'fill') calls.fill++; };
        },
        set(obj, prop, value) { obj[prop] = value; return true; },
    });
    return { ctx, calls };
}

describe('boss portraits', () => {
    it.each(BOSS_NAMES.map((name, type) => [name, type]))('%s paints at full and low health', (_name, type) => {
        for (const health of [1, 0.1]) {
            const boss = new Boss(1280, 720, type);
            boss.hp = boss.maxHp * health;
            boss.time = 3.7;
            boss.coreOpen = health < 1;
            boss.chargeState = health < 1 ? 'windup' : 'idle';
            const { ctx, calls } = recordingContext();
            boss.draw(ctx);
            expect(calls.fill).toBeGreaterThan(10);
        }
    });
});

describe('enemy portraits', () => {
    const makers = {
        critter: () => new EnemyShip(1280, 720, 1),
        'brood critter': () => new EnemyShip(1280, 720, 2),
        firefly: () => new Drone(1280, 720),
        jellyfish: () => new SpaceMine(1280, 720),
        spider: () => new SpiderDrone(1280, 720),
        ghost: () => Object.assign(new AlienGhost(1280, 720), { teleportFlash: 0.2 }),
        octopus: () => new Bomber(1280, 720),
        devil: () => Object.assign(new AlienDevil(1280, 720), { charging: true }),
    };

    it.each(Object.entries(makers))('%s paints', (_name, make) => {
        const enemy = make();
        enemy.hp = Math.max(1, enemy.maxHp - 1);
        const { ctx, calls } = recordingContext();
        enemy.draw(ctx);
        expect(calls.fill).toBeGreaterThan(3);
    });

    it('a cloaked chameleon shows only its eyes', () => {
        const visible = new StealthFighter(1280, 720);
        visible.time = visible.cloakCycle * 0.25;
        const cloaked = new StealthFighter(1280, 720);
        cloaked.time = cloaked.cloakCycle * 0.75;
        const seen = recordingContext();
        const hidden = recordingContext();
        visible.draw(seen.ctx);
        cloaked.draw(hidden.ctx);
        expect(hidden.calls.fill).toBeGreaterThan(0);
        expect(hidden.calls.fill).toBeLessThan(seen.calls.fill);
    });
});

describe('spine', () => {
    it('returns segments + 1 points covering the requested length when straight', () => {
        const points = spine(0, 0, 0, 100, { segments: 5, wave: 0 });
        expect(points).toHaveLength(6);
        expect(points[5].x).toBeCloseTo(100);
        expect(points[5].y).toBeCloseTo(0);
    });
});
