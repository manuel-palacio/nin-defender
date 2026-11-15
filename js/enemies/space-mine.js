import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { hsl, paint, rim, light, eye, tentacle } from './creature-art.js'

export class SpaceMine extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'mine';
        this.radius = 12 * GAME_SCALE;
        this.hp = 1;
        this.maxHp = 1;
        this.points = 20;

        this.x = canvasW + this.radius + Utils.random(10, 80);
        this.y = Utils.random(this.radius + 20, canvasH - this.radius - 20);
        this.vx = Utils.random(-80, -30);
        this.vy = Utils.random(-15, 15);

        // Proximity sting
        this.detonateRadius = 80;
        this.detonated = false;

        // Visual
        this.time = Math.random() * Math.PI * 2;
        this.tentacleCount = Utils.randomInt(5, 8);
        this.hue = Utils.randomInt(300, 340); // pink-magenta
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio, playerX) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.time += dt;

        // Proximity detonation check
        if (playerX !== undefined && playerY !== undefined && !this.detonated) {
            const dist = Utils.distance(this.x, this.y, playerX, playerY);
            if (dist < this.detonateRadius) {
                this.detonate(projectilePool, audio);
            }
        }
    }

    detonate(projectilePool, audio) {
        this.detonated = true;
        // Fire stinger projectiles in a ring
        const count = 8;
        const speed = 220;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#ff66cc', '#ff44aa', true);
            }
        }
        if (audio) audio.playExplosion();
        this.active = false;
    }

    // Jellyfish — a translucent bell with a slit eye suspended inside it,
    // trailing stinging tentacles tipped with light. Drifts, then bursts
    // into a ring of stingers when the player comes close.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const hue = this.hue;
        const squeeze = Math.sin(t * 3);
        const bellW = r * (1.02 - 0.08 * squeeze);
        const bellH = r * (1.0 + 0.1 * squeeze);
        const hemY = r * 0.12;

        ctx.save();
        ctx.translate(this.x, this.y);

        for (let i = 0; i < this.tentacleCount; i++) {
            const across = this.tentacleCount === 1 ? 0 : i / (this.tentacleCount - 1) - 0.5;
            const tip = tentacle(ctx, across * bellW * 1.5, hemY, Math.PI / 2 + across * 0.5,
                r * (1.25 + 0.45 * (i % 2)), r * 0.17, hsl(hue, 75, 62, 0.75), {
                    t, phase: i * 1.7, wave: 0.6, speed: 3, segments: 7,
                    lineWidth: 0.8, stroke: hsl(hue, 80, 18, 0.7),
                });
            light(ctx, '#ffb3ee', tip.x, tip.y, r * 0.32, 0.9);
        }

        light(ctx, hsl(hue, 100, 65), 0, -r * 0.2, r * 1.9, 0.45);

        // Bell: dome above, scalloped hem below
        const scallops = 5;
        ctx.beginPath();
        ctx.ellipse(0, hemY, bellW, bellH, 0, Math.PI, 0);
        for (let i = 0; i < scallops; i++) {
            const from = bellW - (i / scallops) * bellW * 2;
            const to = bellW - ((i + 1) / scallops) * bellW * 2;
            ctx.quadraticCurveTo((from + to) / 2, hemY + r * 0.3, to, hemY);
        }
        ctx.closePath();
        const membrane = ctx.createRadialGradient(-bellW * 0.35, -bellH * 0.6, r * 0.05, 0, -r * 0.1, r * 1.25);
        membrane.addColorStop(0, hsl(hue, 90, 88, 0.92));
        membrane.addColorStop(0.45, hsl(hue, 80, 58, 0.72));
        membrane.addColorStop(1, hsl(hue, 85, 26, 0.8));
        paint(ctx, membrane, 1.2, hsl(hue, 80, 16, 0.9));
        rim(ctx, 0, hemY, bellW, bellH, 'rgba(255, 255, 255, 0.7)', r * 0.07);

        eye(ctx, 0, -r * 0.3, r * 0.34, { iris: '#fff06b', slit: true, lookX: -0.6 });

        ctx.restore();
    }
}
