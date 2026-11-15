import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, hsl, orb, rim, eye, tentacle, leg, horn, healthBar } from './creature-art.js'

export class StealthFighter extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'stealth';
        this.radius = 14 * GAME_SCALE;
        this.hp = 2;
        this.maxHp = 2;
        this.points = 40;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 40, canvasH - this.radius - 40);
        this.vx = Utils.random(-220, -140);

        // Zigzag
        this.zigTimer = 0;
        this.zigInterval = Utils.random(0.6, 1.2);
        this.zigDir = Math.random() > 0.5 ? 1 : -1;
        this.zigSpeed = Utils.random(120, 200);
        this.canvasH = canvasH;

        // Stealth cloak — color shifting
        this.time = 0;
        this.cloakCycle = Utils.random(2, 4);
        this.hueShift = Utils.random(0, 360);
        this.active = true;
    }

    update(dt) {
        this.time += dt;
        this.x += this.vx * dt;
        this.hueShift += dt * 60; // color shifts over time

        // Zigzag
        this.zigTimer += dt;
        if (this.zigTimer >= this.zigInterval) {
            this.zigTimer = 0;
            this.zigDir *= -1;
        }
        this.y += this.zigDir * this.zigSpeed * dt;
        this.y = Utils.clamp(this.y, this.radius + 10, this.canvasH - this.radius - 10);
    }

    getAlpha() {
        const t = (this.time % this.cloakCycle) / this.cloakCycle;
        const wave = Math.sin(t * Math.PI * 2);
        return wave > 0.3 ? 0.15 + 0.85 * ((wave - 0.3) / 0.7) : 0.15;
    }

    // Chameleon — a striped, colour-cycling lizard with a coiled tail, a
    // crested head and two turret eyes that track on their own. It fades
    // in and out; fully cloaked (alpha < 0.2) only the eyes remain, staring
    // out of empty space. Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const alpha = this.getAlpha();
        const hue = this.hueShift % 360;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (alpha >= 0.2) {
            ctx.globalAlpha = alpha;
            tentacle(ctx, r * 0.6, r * 0.05, 0.25, r * 1.9, r * 0.34, hsl(hue, 65, 38), {
                t, curl: 5.6, wave: 0.15, speed: 2, segments: 12, tipWidth: 0.6,
                highlight: hsl(hue, 80, 70, 0.6),
            });
            for (const lx of [-0.25, 0.35]) {
                const grip = Math.sin(t * 9 + lx * 8) * r * 0.08;
                leg(ctx, lx * r, r * 0.3, lx * r - r * 0.12, r * 0.72, lx * r - r * 0.3 + grip, r * 0.95,
                    r * 0.13, hsl(hue, 60, 26), hsl(hue, 80, 66, 0.6));
            }
            // Dorsal crest, body, stripes
            ctx.fillStyle = hsl(hue + 40, 80, 60);
            for (let i = 0; i < 5; i++) {
                const cx = -r * 0.45 + i * r * 0.24;
                ctx.beginPath();
                ctx.moveTo(cx - r * 0.1, -r * 0.36);
                ctx.lineTo(cx + r * 0.04, -r * 0.66);
                ctx.lineTo(cx + r * 0.13, -r * 0.36);
                ctx.closePath();
                ctx.fill();
            }
            orb(ctx, 0, 0, r * 0.84, r * 0.5, hue, 68, 42);
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.8, r * 0.46, 0, 0, TAU);
            ctx.clip();
            ctx.strokeStyle = hsl(hue + 50, 90, 68, 0.7);
            ctx.lineWidth = r * 0.09;
            for (let i = 0; i < 4; i++) {
                const sx = -r * 0.35 + i * r * 0.3;
                ctx.beginPath();
                ctx.moveTo(sx, -r * 0.5);
                ctx.quadraticCurveTo(sx + r * 0.16, 0, sx, r * 0.5);
                ctx.stroke();
            }
            ctx.restore();
            rim(ctx, 0, 0, r * 0.84, r * 0.5, 'rgba(255, 255, 255, 0.6)', r * 0.05);
            // Head with a casque
            horn(ctx, -r * 0.62, -r * 0.3, -r * 0.3, -r * 0.82, r * 0.26, -r * 0.06, hsl(hue, 60, 34));
            orb(ctx, -r * 0.78, 0, r * 0.44, r * 0.38, hue, 68, 44);
        }

        // Turret eyes — always at full strength
        ctx.globalAlpha = 1;
        const sclera = hsl(hue, 55, alpha >= 0.2 ? 58 : 30);
        eye(ctx, -r * 0.92, -r * 0.14, r * 0.2, {
            iris: '#fff06b', sclera, lookX: Math.cos(t * 1.7), lookY: Math.sin(t * 1.7),
        });
        eye(ctx, -r * 0.6, r * 0.1, r * 0.16, {
            iris: '#fff06b', sclera, lookX: Math.cos(-t * 1.1 + 2), lookY: Math.sin(-t * 1.1 + 2),
        });

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
