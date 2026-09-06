import { describe, it, expect, beforeEach } from 'vitest';
import { Boss } from '../js/enemies/boss.js';

const noPool = { get: () => null };
beforeEach(() => clearGameStorage());

function arrivedBoss(type) {
    const boss = new Boss(1280, 800, type);
    boss.x = boss.stopX; boss.arrived = true;
    return boss;
}

describe('Boss behaviours', () => {
    it('assigns a distinct archetype to consecutive tiers', () => {
        expect(new Boss(1280, 800, 0).behavior).toBe('CHARGER');
        expect(new Boss(1280, 800, 1).behavior).toBe('SUMMONER');
        expect(new Boss(1280, 800, 2).behavior).toBe('WEAKPOINT');
    });

    it('charger winds up, dashes to the left edge, then returns', () => {
        const boss = arrivedBoss(0);
        const states = new Set();
        let minX = boss.x;
        for (let i = 0; i < 60 * 12; i++) {
            boss.update(1 / 60, 400, noPool, null);
            states.add(boss.chargeState);
            minX = Math.min(minX, boss.x);
        }
        expect(states).toEqual(new Set(['idle', 'windup', 'dash', 'return']));
        expect(minX).toBeLessThan(120);
        expect(boss.x).toBeGreaterThan(boss.stopX - 1);
    });

    it('summoner requests minions and takes reduced damage while they live', () => {
        const boss = arrivedBoss(1);
        let request = null;
        for (let i = 0; i < 60 * 4 && !request; i++) {
            boss.update(1 / 60, 400, noPool, null);
            request = boss.summonRequest;
        }
        expect(request).toBe('ship');
        const minion = { active: true };
        boss.minions.push(minion);
        const hp = boss.hp;
        boss.takeDamage(10);
        expect(boss.hp).toBeCloseTo(hp - 3);
        minion.active = false;
        boss.takeDamage(10);
        expect(boss.hp).toBeCloseTo(hp - 13);
    });

    it('weak-point boss is armored until the core opens', () => {
        const boss = arrivedBoss(2);
        expect(boss.coreOpen).toBe(false);
        const hp = boss.hp;
        boss.takeDamage(10);
        expect(boss.hp).toBeCloseTo(hp - 2);
        for (let i = 0; i < 60 * 8 && !boss.coreOpen; i++) boss.update(1 / 60, 400, noPool, null);
        expect(boss.coreOpen).toBe(true);
        boss.takeDamage(10);
        expect(boss.hp).toBeCloseTo(hp - 12);
    });
});
