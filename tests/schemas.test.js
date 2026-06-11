import { describe, it, expect, beforeEach } from 'vitest';
import { Schemas } from '../js/schemas.js';

describe('Schemas.UpgradesSchema', () => {
    it('parses valid upgrades correctly', () => {
        const result = Schemas.UpgradesSchema.safeParse({
            damage: 2, fireRate: 1, speed: 3, bombs: 0, shields: 1, lives: 0,
        });
        expect(result.success).toBe(true);
        expect(result.data.damage).toBe(2);
        expect(result.data.speed).toBe(3);
    });

    it('applies defaults for missing keys', () => {
        const result = Schemas.UpgradesSchema.safeParse({});
        expect(result.success).toBe(true);
        expect(result.data.damage).toBe(0);
        expect(result.data.fireRate).toBe(0);
        expect(result.data.bombs).toBe(0);
    });

    it('rejects values above max level (damage > 5)', () => {
        const result = Schemas.UpgradesSchema.safeParse({ damage: 99 });
        expect(result.success).toBe(false);
    });

    it('rejects shields above 4 (shields max is 4, not 5)', () => {
        const result = Schemas.UpgradesSchema.safeParse({ shields: 5 });
        expect(result.success).toBe(false);
    });

    it('rejects negative values', () => {
        const result = Schemas.UpgradesSchema.safeParse({ damage: -1 });
        expect(result.success).toBe(false);
    });
});

describe('Schemas.LeaderboardSchema', () => {
    const validEntry = { score: 1000, phase: 2, time: 60, maxCombo: 5, date: '2026-05-04' };

    it('accepts a valid leaderboard', () => {
        const result = Schemas.LeaderboardSchema.safeParse([validEntry]);
        expect(result.success).toBe(true);
    });

    it('accepts up to 10 entries', () => {
        const ten = Array(10).fill(validEntry);
        expect(Schemas.LeaderboardSchema.safeParse(ten).success).toBe(true);
    });

    it('rejects arrays longer than 10 entries', () => {
        const eleven = Array(11).fill(validEntry);
        expect(Schemas.LeaderboardSchema.safeParse(eleven).success).toBe(false);
    });

    it('rejects entries with wrong types', () => {
        const bad = [{ ...validEntry, score: 'not a number' }];
        expect(Schemas.LeaderboardSchema.safeParse(bad).success).toBe(false);
    });
});

describe('Schemas loaders — corrupt-input recovery', () => {
    beforeEach(() => clearGameStorage());

    it('loadUpgrades returns defaults when key missing', () => {
        const u = Schemas.loadUpgrades();
        expect(u).toEqual({ damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 });
    });

    it('loadUpgrades returns defaults on invalid JSON', () => {
        localStorage.setItem('ninDefenderUpgrades', '{not valid json');
        const u = Schemas.loadUpgrades();
        expect(u.damage).toBe(0);
    });

    it('loadDifficulty clamps out-of-range to default', () => {
        localStorage.setItem('ninDefenderDifficulty', '99');
        expect(Schemas.loadDifficulty()).toBe(1);
    });

    it('loadDifficulty preserves valid values', () => {
        localStorage.setItem('ninDefenderDifficulty', '2');
        expect(Schemas.loadDifficulty()).toBe(2);
    });

    it('loadLeaderboard returns [] for malformed entries', () => {
        localStorage.setItem('ninDefenderLeaderboard', JSON.stringify([{ score: 'wrong' }]));
        expect(Schemas.loadLeaderboard()).toEqual([]);
    });
});

describe('Schemas daily best', () => {
    beforeEach(() => clearGameStorage());

    it('starts a fresh record when nothing is stored', () => {
        const rec = Schemas.updateDailyBest(1200, '2026-06-12');
        expect(rec).toEqual({ date: '2026-06-12', score: 1200 });
        expect(Schemas.loadDailyBest()).toEqual(rec);
    });

    it('keeps the higher score within the same day', () => {
        Schemas.updateDailyBest(1200, '2026-06-12');
        expect(Schemas.updateDailyBest(800, '2026-06-12').score).toBe(1200);
        expect(Schemas.updateDailyBest(2000, '2026-06-12').score).toBe(2000);
    });

    it('resets on a new day', () => {
        Schemas.updateDailyBest(5000, '2026-06-11');
        const rec = Schemas.updateDailyBest(300, '2026-06-12');
        expect(rec).toEqual({ date: '2026-06-12', score: 300 });
    });

    it('loadDailyBest returns null on corrupt data', () => {
        localStorage.setItem('ninDefenderDaily', '{broken');
        expect(Schemas.loadDailyBest()).toBeNull();
    });
});
