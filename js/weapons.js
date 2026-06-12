// ============================================================
// weapons.js — Buyable weapon arsenal definitions
// ============================================================
// BLASTER is the free default; SPREAD and RAILGUN are one-time shop
// purchases. fireRateMul scales the player's cooldown so upgrades and
// the rapid-fire powerup still apply proportionally to every weapon.

export const WEAPON_DEFS = {
    BLASTER: {
        name: 'BLASTER', cost: 0,
        fireRateMul: 1.0, dmgMul: 1.0, speed: 700,
        color: '#00ffff',
        desc: 'BALANCED PULSE CANNON',
    },
    SPREAD: {
        name: 'SPREAD', cost: 150,
        fireRateMul: 1.6, dmgMul: 0.5, speed: 600,
        pellets: 5, arc: 0.5,
        color: '#ffaa00',
        desc: '5-PELLET SHOTGUN ARC',
    },
    RAILGUN: {
        name: 'RAILGUN', cost: 250,
        fireRateMul: 2.2, dmgMul: 2.5, speed: 1100,
        pierce: true,
        color: '#88ffee',
        desc: 'PIERCING SLUG — HITS EVERYTHING IN LINE',
    },
};

export const WEAPON_ORDER = ['BLASTER', 'SPREAD', 'RAILGUN'];
