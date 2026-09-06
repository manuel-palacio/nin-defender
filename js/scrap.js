// ============================================================
// scrap.js — Physical scrap pickups dropped where enemies die
// ============================================================
// Scrap used to be credited straight to the wallet on a kill. Dropping it
// on the field gives the player a reason to leave the safe left edge: drops
// drift left and are lost if they cross the screen edge.

import { Utils } from './utils.js';

const DRIFT_SPEED = -55;
const MAGNET_RADIUS = 130;
const MAGNET_SPEED = 520;
const PICKUP_RADIUS = 16;
const LIFETIME = 9;
const MAX_DROPS = 80;

export class ScrapField {
    constructor() {
        this.drops = [];
    }

    // Splits `amount` into a handful of drops scattered around (x, y).
    spawn(x, y, amount) {
        const pieces = Math.min(6, Math.max(1, Math.ceil(amount / 4)));
        const perPiece = Math.floor(amount / pieces);
        let remainder = amount - perPiece * pieces;
        for (let i = 0; i < pieces; i++) {
            if (this.drops.length >= MAX_DROPS) break;
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(40, 120);
            this.drops.push({
                x, y,
                vx: DRIFT_SPEED + Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                value: perPiece + (remainder-- > 0 ? 1 : 0),
                life: LIFETIME,
                spin: Utils.random(0, Math.PI * 2),
            });
        }
    }

    // Moves drops, pulls nearby ones to the player, and returns the total
    // value collected this frame.
    update(dt, player) {
        let collected = 0;
        for (const drop of this.drops) {
            drop.life -= dt;
            drop.spin += dt * 4;
            const dx = player.x - drop.x;
            const dy = player.y - drop.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (player.alive && dist < MAGNET_RADIUS) {
                drop.vx = (dx / dist) * MAGNET_SPEED;
                drop.vy = (dy / dist) * MAGNET_SPEED;
            } else {
                drop.vx += (DRIFT_SPEED - drop.vx) * Math.min(1, 2 * dt);
                drop.vy *= Math.max(0, 1 - 2 * dt);
            }
            drop.x += drop.vx * dt;
            drop.y += drop.vy * dt;
            if (player.alive && dist < PICKUP_RADIUS + player.radius) {
                collected += drop.value;
                drop.life = 0;
            }
        }
        this.drops = this.drops.filter(drop => drop.life > 0 && drop.x > -20);
        return collected;
    }

    draw(ctx) {
        if (this.drops.length === 0) return;
        ctx.save();
        for (const drop of this.drops) {
            const fade = Math.min(1, drop.life / 1.5);
            const size = 4 + Math.min(4, drop.value);
            ctx.globalAlpha = fade * (drop.life < 2 && Math.sin(drop.life * 20) < 0 ? 0.4 : 1);
            ctx.translate(drop.x, drop.y);
            ctx.rotate(drop.spin);
            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.fillStyle = '#fff2cc';
            ctx.shadowBlur = 0;
            ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
            ctx.rotate(-drop.spin);
            ctx.translate(-drop.x, -drop.y);
        }
        ctx.restore();
    }
}
