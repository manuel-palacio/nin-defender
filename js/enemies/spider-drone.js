import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, orb, rim, eye, leg, fangs, horn, healthBar } from './creature-art.js'

export class SpiderDrone extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'spider';
        this.radius = 16 * GAME_SCALE;
        this.hp = 3;
        this.maxHp = 3;
        this.points = 45;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-100, -55);
        this.vy = 0;
        this.canvas_w = canvasW;

        // Erratic crawl movement
        this.crawlTimer = 0;
        this.crawlInterval = Utils.random(0.4, 0.8);
        this.crawlDir = Math.random() > 0.5 ? 1 : -1;
        this.crawlSpeed = Utils.random(80, 160);
        this.canvasH = canvasH;

        // Web shooting
        this.shootTimer = Utils.random(1, 2.5);
        this.shootInterval = Utils.random(2, 3.5);

        // Leg animation
        this.time = 0;
        this.legCount = 4; // per side
        this.legPhaseOffset = Utils.random(0, Math.PI * 2);

        // Eye glow
        this.eyePulse = 0;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.time += dt;
        this.eyePulse += dt;
        this.x += this.vx * dt;

        // Erratic vertical crawl
        this.crawlTimer += dt;
        if (this.crawlTimer >= this.crawlInterval) {
            this.crawlTimer = 0;
            this.crawlDir = Math.random() > 0.5 ? 1 : -1;
            this.crawlInterval = Utils.random(0.3, 0.7);
        }
        this.y += this.crawlDir * this.crawlSpeed * dt;
        this.y = Utils.clamp(this.y, this.radius + 10, this.canvasH - this.radius - 10);

        // Shoot webs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.shootWeb(projectilePool, audio);
        }
    }

    shootWeb(projectilePool, audio) {
        // Fire a spread of 2 slow-moving "web" projectiles
        const speed = 180;
        const spread = Utils.random(0.15, 0.35);
        for (let i = -1; i <= 1; i += 2) {
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    -speed, i * speed * spread,
                    '#44ff22', '#66ff44', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    // Face-spider — a pale abdomen marked like a screaming skull, a dark
    // head studded with red eyes, fangs, and eight high-stepping legs.
    // Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        ctx.save();
        ctx.translate(this.x, this.y);

        for (const side of [-1, 1]) {
            for (let i = 0; i < this.legCount; i++) {
                const fan = i - (this.legCount - 1) / 2;
                const step = Math.sin(t * 10 + this.legPhaseOffset + i * 1.6 + (side > 0 ? 1.1 : 0));
                const hipX = -r * 0.3 + fan * r * 0.17;
                const kneeX = hipX + fan * r * 0.48;
                leg(ctx, hipX, side * r * 0.28,
                    kneeX, side * r * (1.0 + 0.1 * step),
                    kneeX + fan * r * 0.32 + step * r * 0.12, side * r * (1.5 - 0.12 * Math.abs(step)),
                    r * 0.13, '#101a0c', 'rgba(140, 255, 60, 0.7)');
            }
        }

        // Abdomen with the skull marking
        const ax = r * 0.42;
        orb(ctx, ax, 0, r * 0.66, r * 0.6, 48, 26, 64);
        rim(ctx, ax, 0, r * 0.66, r * 0.6, 'rgba(255, 255, 255, 0.7)', r * 0.06);
        const gape = 0.5 + 0.5 * Math.sin(t * 2.5);
        ctx.fillStyle = 'rgba(20, 6, 10, 0.88)';
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.ellipse(ax - r * 0.12, side * r * 0.22, r * 0.15, r * 0.12, side * 0.4, 0, TAU);
            ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(ax + r * 0.28, 0, r * (0.08 + 0.05 * gape), r * (0.16 + 0.08 * gape), 0, 0, TAU);
        ctx.fill();

        // Head, fangs, eye cluster
        const hx = -r * 0.42;
        for (const side of [-1, 1]) {
            horn(ctx, hx - r * 0.3, side * r * 0.14, hx - r * 0.72, side * r * 0.05,
                r * 0.14, side * r * 0.1, '#eadfc8');
        }
        orb(ctx, hx, 0, r * 0.44, r * 0.42, 100, 35, 20);
        rim(ctx, hx, 0, r * 0.44, r * 0.42, 'rgba(160, 255, 90, 0.6)', r * 0.05);
        const glare = 0.6 + 0.4 * Math.sin(this.eyePulse * 5);
        for (const [ex, ey, er] of [[-0.2, -0.14, 0.1], [-0.2, 0.14, 0.1], [-0.02, -0.26, 0.065], [-0.02, 0.26, 0.065]]) {
            eye(ctx, hx + ex * r, ey * r, er * r, { iris: '#ff2a2a', glowAlpha: glare });
        }

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
