import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { volume, paint, light, eye, tentacle, fangs, horn, crack, healthBar } from './creature-art.js'

export class AlienDevil extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'devil';
        this.radius = 18 * GAME_SCALE;
        this.hp = 4;
        this.maxHp = 4;
        this.points = 55;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-80, -40);
        this.vy = 0;
        this.canvasH = canvasH;
        this.canvas_w = canvasW;

        // Charge attack
        this.chargeTimer = Utils.random(1.5, 3);
        this.chargeInterval = Utils.random(2.5, 4);
        this.charging = false;
        this.chargeSpeed = 0;
        this.normalVx = this.vx;

        // Shoot fireballs
        this.shootTimer = Utils.random(1, 2);
        this.shootInterval = Utils.random(1.5, 2.5);

        // Visual
        this.time = 0;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.time += dt;

        if (this.charging) {
            this.x += this.chargeSpeed * dt;
            // Charging lasts briefly then returns to normal
            this.chargeSpeed *= 0.98;
            if (Math.abs(this.chargeSpeed) < 50) {
                this.charging = false;
                this.vx = this.normalVx;
            }
        } else {
            this.x += this.vx * dt;

            // Drift toward player Y aggressively
            if (playerY !== undefined) {
                const diff = playerY - this.y;
                this.vy = Utils.clamp(diff, -1, 1) * 120;
                this.y += this.vy * dt;
                this.y = Utils.clamp(this.y, this.radius + 10, this.canvasH - this.radius - 10);
            }

            // Charge attack
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0 && this.x < this.canvas_w - 100) {
                this.chargeTimer = this.chargeInterval;
                this.charging = true;
                this.chargeSpeed = -400; // fast burst toward player
            }
        }

        // Shoot fireballs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    -280, Utils.random(-60, 60),
                    '#ff4400', '#ff6600', true);
            }
            if (audio) audio.playEnemyLaser();
        }
    }

    // Devil — a horned head of cracked, glowing rock with slit eyes, a
    // furnace grin and a mane of fire that streams out when it charges.
    // Faces the player head-on.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const heat = 0.6 + 0.4 * Math.sin(t * 7);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Fire streaming behind — longer and hotter mid-charge
        const blaze = this.charging ? 2.4 : 1.2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
            const fan = i - 2;
            tentacle(ctx, r * 0.2, fan * r * 0.3, fan * 0.22, r * blaze * (1 - Math.abs(fan) * 0.15),
                r * 0.6, i % 2 ? 'rgba(255, 190, 40, 0.4)' : 'rgba(255, 80, 20, 0.45)', {
                    t, phase: i * 2.1, wave: 0.9, speed: 13, tipWidth: 0.1, lineWidth: 0, segments: 6,
                });
        }
        ctx.restore();
        light(ctx, '#ff5a1f', 0, 0, r * 2.4, 0.45 + 0.2 * heat);

        for (const side of [-1, 1]) {
            horn(ctx, side * r * 0.42, -r * 0.55, side * r * 0.95, -r * 1.45,
                r * 0.36, side * r * 0.22, '#2a1418');
        }
        // Head: wide brow tapering to a pointed chin
        ctx.beginPath();
        ctx.moveTo(-r * 0.82, -r * 0.35);
        ctx.quadraticCurveTo(0, -r * 1.05, r * 0.82, -r * 0.35);
        ctx.quadraticCurveTo(r * 0.78, r * 0.5, 0, r * 1.0);
        ctx.quadraticCurveTo(-r * 0.78, r * 0.5, -r * 0.82, -r * 0.35);
        ctx.closePath();
        paint(ctx, volume(ctx, 0, -r * 0.1, r * 0.95, 4, 82, 30), 1.6);

        crack(ctx, [[-r * 0.1, -r * 0.75], [r * 0.05, -r * 0.5], [-r * 0.06, -r * 0.3]], '#ff9a1f', r * 0.07, r * 0.4);
        crack(ctx, [[r * 0.62, 0], [r * 0.45, r * 0.2], [r * 0.5, r * 0.42]], '#ff9a1f', r * 0.06, r * 0.35);

        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(side * r * 0.34, -r * 0.12);
            ctx.rotate(side * 0.5);
            eye(ctx, 0, 0, r * 0.19, { iris: '#ffe14a', slit: true, lid: 0.5 });
            ctx.restore();
        }

        // Maw: a black gash lit from the throat, teeth meeting across it
        const gape = r * (0.2 + 0.1 * heat);
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, r * 0.26);
        ctx.quadraticCurveTo(0, r * 0.4, r * 0.5, r * 0.26);
        ctx.quadraticCurveTo(0, r * 0.4 + gape * 2.2, -r * 0.5, r * 0.26);
        ctx.closePath();
        paint(ctx, '#160406', 1.2);
        light(ctx, '#ff8a1f', 0, r * 0.5 + gape * 0.5, r * 0.55, 0.9);
        fangs(ctx, -r * 0.42, r * 0.3, r * 0.42, r * 0.3, 7, r * 0.17, 0, 1, '#f1e2c4');
        fangs(ctx, -r * 0.26, r * 0.42 + gape * 1.25, r * 0.26, r * 0.42 + gape * 1.25, 4, r * 0.15, 0, -1, '#f1e2c4');

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
