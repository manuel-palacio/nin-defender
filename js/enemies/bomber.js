import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, hsl, volume, paint, orb, rim, eye, spine, ribbon, healthBar } from './creature-art.js'

export class Bomber extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'bomber';
        this.radius = 22 * GAME_SCALE;
        this.hp = 4;
        this.maxHp = 4;
        this.points = 60;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-70, -35);
        this.vy = 0;

        // Ink bomb drop
        this.shootTimer = Utils.random(1, 2.5);
        this.shootInterval = Utils.random(2, 3.5);
        this.canvas_w = canvasW;

        // Visual
        this.time = 0;
        this.tentacleCount = 6;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.x += this.vx * dt;
        this.time += dt;

        // Undulating vertical drift
        this.vy = Math.sin(this.time * 1.5) * 25;
        this.y += this.vy * dt;

        // Drop ink bombs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.dropBombs(projectilePool, audio);
        }
    }

    dropBombs(projectilePool, audio) {
        // 3-shot spread: ink blobs
        const angles = [-Math.PI * 0.85, -Math.PI, Math.PI * 0.85];
        const speed = 200;
        for (const angle of angles) {
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y + this.radius * 0.5,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#8833cc', '#6622aa', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    // Gore octopus — a mottled violet mantle, one live eye with a barred
    // pupil and one milky dead one, a clacking beak, and six sucker-lined
    // arms coiling beneath. Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const hue = 282;

        ctx.save();
        ctx.translate(this.x, this.y);

        for (let i = 0; i < this.tentacleCount; i++) {
            const fan = i / (this.tentacleCount - 1) - 0.5;
            const points = spine(fan * r * 1.0, r * 0.25, Math.PI / 2 + fan * 1.3, r * 1.25, {
                t, phase: i * 1.1, wave: 0.7, speed: 2.6, curl: fan * 1.6, segments: 8,
            });
            ribbon(ctx, points, r * 0.3, hsl(hue, 55, 30 + (i % 2) * 6), { highlight: hsl(hue, 70, 62, 0.7) });
            ctx.fillStyle = hsl(hue + 30, 60, 78, 0.85);
            for (let s = 2; s < points.length - 1; s += 2) {
                ctx.beginPath();
                ctx.arc(points[s].x, points[s].y, r * 0.045, 0, TAU);
                ctx.fill();
            }
        }

        // Mantle
        const breathe = 1 + 0.04 * Math.sin(t * 2.2);
        orb(ctx, r * 0.08, -r * 0.2, r * 0.86 * breathe, r * 0.74 / breathe, hue, 58, 40);
        ctx.fillStyle = hsl(hue, 60, 20, 0.5);
        for (const [sx, sy, sr] of [[0.45, -0.5, 0.13], [0.6, -0.1, 0.09], [0.15, -0.62, 0.08], [-0.3, -0.55, 0.1]]) {
            ctx.beginPath();
            ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
            ctx.fill();
        }
        rim(ctx, r * 0.08, -r * 0.2, r * 0.86, r * 0.74, 'rgba(255, 220, 255, 0.65)', r * 0.05);

        // Live eye, dead eye, beak
        eye(ctx, -r * 0.4, -r * 0.02, r * 0.2, { iris: '#ffd23b', sclera: '#f5e9c8', lookX: -0.5, lid: 0.3 });
        ctx.fillStyle = '#050208';
        ctx.fillRect(-r * 0.5, -r * 0.045, r * 0.16, r * 0.05);
        ctx.beginPath();
        ctx.arc(r * 0.16, r * 0.02, r * 0.17, 0, TAU);
        paint(ctx, volume(ctx, r * 0.16, r * 0.02, r * 0.17, 260, 12, 70), 1.2);
        // Old wound raked across the dead eye
        ctx.strokeStyle = 'rgba(110, 16, 36, 0.9)';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.lineCap = 'round';
        for (const off of [-0.07, 0.05]) {
            ctx.beginPath();
            ctx.moveTo(r * (0.0 + off), -r * 0.2);
            ctx.lineTo(r * (0.28 + off), r * 0.24);
            ctx.stroke();
        }
        const clack = r * 0.05 * (0.5 + 0.5 * Math.sin(t * 7));
        ctx.fillStyle = '#1a0d12';
        ctx.beginPath();
        ctx.moveTo(-r * 0.24, r * 0.3);
        ctx.lineTo(-r * 0.02, r * 0.3);
        ctx.lineTo(-r * 0.13, r * 0.5 + clack);
        ctx.closePath();
        ctx.fill();

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
