import { describe, it, expect, beforeEach } from 'vitest';
import { WEAPON_DEFS, WEAPON_ORDER } from '../js/weapons.js';
import { Player } from '../js/player.js';

const mockCanvas = { width: 1280, height: 720 };
const noAssets = {};

beforeEach(() => clearGameStorage());

// Captures every projectile handed out plus the init args it received.
function mockPool() {
    const fired = [];
    return {
        fired,
        get() {
            const p = {
                bounces: 0, pierce: false, splitOnBounce: false,
                init(x, y, vx, vy, color, glow, isEnemy, dmg = 1) {
                    Object.assign(p, { x, y, vx, vy, color, isEnemy, dmg });
                },
            };
            fired.push(p);
            return p;
        },
    };
}

describe('WEAPON_DEFS', () => {
    it('defines the three weapons in cycle order', () => {
        expect(WEAPON_ORDER).toEqual(['BLASTER', 'SPREAD', 'RAILGUN']);
        for (const id of WEAPON_ORDER) expect(WEAPON_DEFS[id]).toBeDefined();
    });

    it('BLASTER is free, others have costs', () => {
        expect(WEAPON_DEFS.BLASTER.cost).toBe(0);
        expect(WEAPON_DEFS.SPREAD.cost).toBe(150);
        expect(WEAPON_DEFS.RAILGUN.cost).toBe(250);
    });
});

describe('Player weapon ownership', () => {
    it('starts owning only BLASTER, selected', () => {
        const p = new Player(mockCanvas, noAssets);
        expect(p.ownedWeapons).toEqual(['BLASTER']);
        expect(p.weapon).toBe('BLASTER');
    });

    it('unlockWeapon adds and persists; rejects dupes and unknowns', () => {
        const p = new Player(mockCanvas, noAssets);
        expect(p.unlockWeapon('SPREAD')).toBe(true);
        expect(p.unlockWeapon('SPREAD')).toBe(false);
        expect(p.unlockWeapon('NOPE')).toBe(false);
        const p2 = new Player(mockCanvas, noAssets);
        expect(p2.ownedWeapons).toContain('SPREAD');
    });

    it('cycleWeapon wraps through owned weapons only and persists', () => {
        const p = new Player(mockCanvas, noAssets);
        p.cycleWeapon();
        expect(p.weapon).toBe('BLASTER'); // nothing else owned
        p.unlockWeapon('RAILGUN');
        p.cycleWeapon();
        expect(p.weapon).toBe('RAILGUN');
        p.cycleWeapon();
        expect(p.weapon).toBe('BLASTER');
        p.weapon = 'RAILGUN';
        p.cycleWeapon(); // persist check happens via reload below
        p.cycleWeapon();
        const selected = p.weapon;
        const p2 = new Player(mockCanvas, noAssets);
        expect(p2.weapon).toBe(selected);
    });

    it('selected weapon falls back to BLASTER if not owned on load', () => {
        localStorage.setItem('ninDefenderWeapon', 'RAILGUN'); // not owned
        const p = new Player(mockCanvas, noAssets);
        expect(p.weapon).toBe('BLASTER');
    });
});

describe('Player.shoot per weapon', () => {
    it('BLASTER fires one cyan bullet with base cooldown', () => {
        const p = new Player(mockCanvas, noAssets);
        const pool = mockPool();
        p.shoot(pool);
        expect(pool.fired.length).toBe(1);
        expect(pool.fired[0].color).toBe('#00ffff');
        expect(pool.fired[0].dmg).toBe(p.baseDamage);
        expect(p.shootCooldown).toBeCloseTo(p.fireRate);
    });

    it('SPREAD fires 5 pellets in an arc at half damage, slower cooldown', () => {
        const p = new Player(mockCanvas, noAssets);
        p.unlockWeapon('SPREAD');
        p.weapon = 'SPREAD';
        const pool = mockPool();
        p.shoot(pool);
        expect(pool.fired.length).toBe(5);
        const angles = pool.fired.map(b => Math.atan2(b.vy, b.vx)).sort((a, b) => a - b);
        expect(angles[4] - angles[0]).toBeCloseTo(WEAPON_DEFS.SPREAD.arc, 5);
        for (const b of pool.fired) {
            expect(b.dmg).toBeCloseTo(p.baseDamage * 0.5);
            expect(b.color).toBe(WEAPON_DEFS.SPREAD.color);
        }
        expect(p.shootCooldown).toBeCloseTo(p.fireRate * WEAPON_DEFS.SPREAD.fireRateMul);
    });

    it('RAILGUN fires one fast piercing bolt at 2.5x damage', () => {
        const p = new Player(mockCanvas, noAssets);
        p.unlockWeapon('RAILGUN');
        p.weapon = 'RAILGUN';
        const pool = mockPool();
        p.shoot(pool);
        expect(pool.fired.length).toBe(1);
        const b = pool.fired[0];
        expect(b.pierce).toBe(true);
        expect(b.dmg).toBeCloseTo(p.baseDamage * 2.5);
        const speed = Math.hypot(b.vx, b.vy);
        expect(speed).toBeCloseTo(WEAPON_DEFS.RAILGUN.speed);
        expect(p.shootCooldown).toBeCloseTo(p.fireRate * WEAPON_DEFS.RAILGUN.fireRateMul);
    });

    it('triple-shot powerup only shapes BLASTER, not SPREAD/RAILGUN', () => {
        const p = new Player(mockCanvas, noAssets);
        p.unlockWeapon('RAILGUN');
        p.weapon = 'RAILGUN';
        p.tripleShot = true;
        const pool = mockPool();
        p.shoot(pool);
        expect(pool.fired.length).toBe(1);
    });
});
