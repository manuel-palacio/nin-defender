import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../js/player.js';

const mockCanvas = { width: 1280, height: 720 };
const noAssets = {};

beforeEach(() => clearGameStorage());

describe('Player.getComboMultiplier', () => {
    it('returns 1 below 3 kills', () => {
        const p = new Player(mockCanvas, noAssets);
        p.combo = 0; expect(p.getComboMultiplier()).toBe(1);
        p.combo = 2; expect(p.getComboMultiplier()).toBe(1);
    });

    it('ladders 3 → 2x, 6 → 3x, 10 → 4x, 20+ → 5x cap', () => {
        const p = new Player(mockCanvas, noAssets);
        p.combo = 3;  expect(p.getComboMultiplier()).toBe(2);
        p.combo = 6;  expect(p.getComboMultiplier()).toBe(3);
        p.combo = 10; expect(p.getComboMultiplier()).toBe(4);
        p.combo = 20; expect(p.getComboMultiplier()).toBe(5);
        p.combo = 99; expect(p.getComboMultiplier()).toBe(5); // cap holds
    });
});

describe('Player.registerKill milestone rewards', () => {
    it('returns the milestone when combo crosses 10, 25, 50', () => {
        const p = new Player(mockCanvas, noAssets);
        const results = [];
        for (let i = 0; i < 50; i++) results.push(p.registerKill());
        expect(results[9]).toBe(10);
        expect(results[24]).toBe(25);
        expect(results[49]).toBe(50);
    });

    it('returns null on non-milestone kills', () => {
        const p = new Player(mockCanvas, noAssets);
        for (let i = 0; i < 9; i++) {
            expect(p.registerKill()).toBeNull();
        }
        p.registerKill(); // 10th
        expect(p.registerKill()).toBeNull(); // 11th
    });

    it('fires again after a combo reset', () => {
        const p = new Player(mockCanvas, noAssets);
        for (let i = 0; i < 10; i++) p.registerKill();
        p.combo = 0; // simulate timer reset
        let milestone = null;
        for (let i = 0; i < 10; i++) milestone = p.registerKill();
        expect(milestone).toBe(10);
    });
});

describe('Player skin unlocks', () => {
    it('starts with only CLASSIC unlocked', () => {
        const p = new Player(mockCanvas, noAssets);
        expect(p.skinsUnlocked).toBe(0);
    });

    it('cycleSkin stays on CLASSIC when nothing else is unlocked', () => {
        const p = new Player(mockCanvas, noAssets);
        p.cycleSkin();
        expect(p.skinIndex).toBe(0);
    });

    it('unlockSkin(1) makes STEALTH cyclable and persists', () => {
        const p = new Player(mockCanvas, noAssets);
        expect(p.unlockSkin(1)).toBe(true);
        p.cycleSkin();
        expect(p.skinIndex).toBe(1);
        p.cycleSkin();
        expect(p.skinIndex).toBe(0); // wraps within unlocked set
        const p2 = new Player(mockCanvas, noAssets);
        expect(p2.skinsUnlocked).toBe(1);
    });

    it('unlockSkin returns false when already unlocked', () => {
        const p = new Player(mockCanvas, noAssets);
        p.unlockSkin(2);
        expect(p.unlockSkin(2)).toBe(false);
        expect(p.unlockSkin(1)).toBe(false); // lower than current
    });

    it('clamps a saved skinIndex above the unlocked ceiling', () => {
        localStorage.setItem('ninDefenderSkin', '3');
        const p = new Player(mockCanvas, noAssets);
        expect(p.skinIndex).toBe(0);
    });
});

describe('Player.hit()', () => {
    it('with active shield absorbs damage and does not decrement lives', () => {
        const p = new Player(mockCanvas, noAssets);
        p.lives = 5;
        p.activeShield = true;
        p.activeShieldTimer = 1;
        const dead = p.hit();
        expect(dead).toBe(false);
        expect(p.lives).toBe(5);
        expect(p.activeShield).toBe(false);
        expect(p.invincible).toBe(true);
    });

    it('with no shield decrements lives', () => {
        const p = new Player(mockCanvas, noAssets);
        p.lives = 5;
        p.invincible = false;
        const dead = p.hit();
        expect(dead).toBe(false);
        expect(p.lives).toBe(4);
    });

    it('with 1 life returns true (dead)', () => {
        const p = new Player(mockCanvas, noAssets);
        p.lives = 1;
        p.invincible = false;
        const dead = p.hit();
        expect(dead).toBe(true);
        expect(p.alive).toBe(false);
    });

    it('with invincible flag absorbs hit', () => {
        const p = new Player(mockCanvas, noAssets);
        p.lives = 3;
        p.invincible = true;
        const dead = p.hit();
        expect(dead).toBe(false);
        expect(p.lives).toBe(3);
    });
});

describe('Player.applyUpgrades', () => {
    it('correctly scales every stat per upgrade level', () => {
        const p = new Player(mockCanvas, noAssets);
        p.skinIndex = 0; // CLASSIC, no skin modifier
        p.upgrades = { damage: 3, fireRate: 3, speed: 3, bombs: 3, shields: 3, lives: 3 };
        p.applyUpgrades();
        expect(p.baseDamage).toBe(2.5);          // 1 + 3 * 0.5
        expect(p.baseFireRate).toBeCloseTo(0.135, 5); // 0.18 - 3 * 0.015
        expect(p.speed).toBe(510);               // 420 + 3 * 30
        expect(p.maxBombs).toBe(5);              // 2 + 3
        expect(p.maxShieldCharges).toBe(6);      // 3 + 3
        expect(p.maxLives).toBe(11);             // 8 + 3
    });

    it('applies STEALTH skin (+15% speed, -1 max life)', () => {
        const p = new Player(mockCanvas, noAssets);
        p.skinIndex = 1;
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.applyUpgrades();
        expect(p.speed).toBeCloseTo(420 * 1.15, 5);
        expect(p.maxLives).toBe(7);
    });

    it('applies VIPER skin (always triple, -20% damage)', () => {
        const p = new Player(mockCanvas, noAssets);
        p.skinIndex = 2;
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.applyUpgrades();
        expect(p.baseDamage).toBeCloseTo(0.8, 5);
        expect(p.tripleShotPassive).toBe(true);
    });

    it('applies TANK skin (+1 max life, -20% speed)', () => {
        const p = new Player(mockCanvas, noAssets);
        p.skinIndex = 3;
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.applyUpgrades();
        expect(p.speed).toBeCloseTo(420 * 0.8, 5);
        expect(p.maxLives).toBe(9);
    });
});

describe('Player.activateBomb', () => {
    it('returns false when no bombs', () => {
        const p = new Player(mockCanvas, noAssets);
        p.bombs = 0;
        p.bombCooldown = 0;
        expect(p.activateBomb()).toBe(false);
    });

    it('returns true and decrements bombs when fired', () => {
        const p = new Player(mockCanvas, noAssets);
        p.bombs = 2;
        p.bombCooldown = 0;
        const result = p.activateBomb();
        expect(result).toBe(true);
        expect(p.bombs).toBe(1);
        expect(p.bombCooldown).toBeGreaterThan(0);
    });

    it('returns false when on cooldown', () => {
        const p = new Player(mockCanvas, noAssets);
        p.bombs = 2;
        p.bombCooldown = 0.5;
        expect(p.activateBomb()).toBe(false);
    });
});

describe('Player.getActiveSynergy', () => {
    it('returns null with no power-ups stacked', () => {
        const p = new Player(mockCanvas, noAssets);
        expect(p.getActiveSynergy()).toBeNull();
    });

    it('detects each pairing', () => {
        const cases = [
            { flags: { ricochet: true,  tripleShot: true },         expected: 'CHAIN_REACTION' },
            { flags: { rapidFire: true, wingman: true },            expected: 'FIRE_SUPPORT' },
            { flags: { shield: true,    tripleShot: true },         expected: 'PIERCE_SHOT' },
            { flags: { rapidFire: true, tripleShot: true },         expected: 'PENTA_SPREAD' },
            { flags: { wingman: true,   ricochet: true },           expected: 'BOUNCE_DRONE' },
        ];
        for (const c of cases) {
            const p = new Player(mockCanvas, noAssets);
            Object.assign(p, c.flags);
            expect(p.getActiveSynergy()).toBe(c.expected);
        }
    });

    it('VIPER passive triple counts as triple for synergy', () => {
        const p = new Player(mockCanvas, noAssets);
        p.skinIndex = 2; // VIPER
        p.applyUpgrades();
        p.ricochet = true;
        expect(p.getActiveSynergy()).toBe('CHAIN_REACTION');
    });
});
