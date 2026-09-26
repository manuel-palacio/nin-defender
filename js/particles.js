// ============================================================
// particles.js — Particle system with object pooling
// ============================================================

import { Utils } from './utils.js';

export class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.size = 2;
        this.color = '#fff';
        this.alpha = 1;
        this.active = false;
        this.shrink = true;
        this.friction = 0.98;
    }

    init(x, y, vx, vy, life, size, color, shrink = true, friction = 0.98) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.color = color;
        this.alpha = 1;
        this.active = true;
        this.shrink = shrink;
        this.friction = friction;
    }

    update(dt) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        const progress = this.life / this.maxLife;
        this.alpha = progress;
        if (this.shrink) {
            this.currentSize = this.size * progress;
        } else {
            this.currentSize = this.size;
        }
    }

    // Caller (ParticlePool.draw) owns save/restore and the additive blend —
    // glow comes from overlapping 'lighter' fills plus the PostFX bloom pass
    // rather than a per-particle shadowBlur.
    draw(ctx) {
        if (!this.active || this.alpha <= 0) return;
        ctx.globalAlpha = this.alpha;
        const length = streakLength(this.vx, this.vy);
        const width = Math.max(0.5, this.currentSize);
        if (length > width) {
            this.drawStreak(ctx, length, width);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, width, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStreak(ctx, length, width) {
        const speed = Math.hypot(this.vx, this.vy);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = width * 1.4;
        ctx.beginPath();
        ctx.moveTo(this.x - (this.vx / speed) * length, this.y - (this.vy / speed) * length);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
}

const STREAK_SECONDS = 0.035;
const MAX_STREAK_LENGTH = 22;

// Fast sparks render as motion-blurred streaks; slow particles stay round.
export function streakLength(vx, vy) {
    return Math.min(MAX_STREAK_LENGTH, Math.hypot(vx, vy) * STREAK_SECONDS);
}

// ============================================================
// ParticlePool — Pre-allocated pool to avoid GC pressure
// ============================================================
export class ParticlePool {
    constructor(size) {
        this.pool = [];
        this.maxSize = size;
        for (let i = 0; i < size; i++) {
            this.pool.push(new Particle());
        }
    }

    get() {
        // Find an inactive particle to reuse
        for (let i = 0; i < this.pool.length; i++) {
            if (!this.pool[i].active) {
                return this.pool[i];
            }
        }
        // All in use — expand pool if under 2x limit, else skip
        if (this.pool.length < this.maxSize * 2) {
            const p = new Particle();
            this.pool.push(p);
            return p;
        }
        return null;
    }

    update(dt) {
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].update(dt);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 0; i < this.pool.length; i++) {
            if (this.pool[i].active) {
                this.pool[i].draw(ctx);
            }
        }
        ctx.restore();
    }

    // --- Effect factories ---

    createExplosion(x, y, color, count, speed, life, size) {
        for (let i = 0; i < count; i++) {
            const p = this.get();
            if (!p) continue;
            const angle = Math.random() * Math.PI * 2;
            const spd = Utils.random(speed * 0.3, speed);
            p.init(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                Utils.random(life * 0.5, life),
                Utils.random(size * 0.5, size),
                color
            );
        }
    }

    createColorExplosion(x, y, colors, count, speed, life, size) {
        for (let i = 0; i < count; i++) {
            const p = this.get();
            if (!p) continue;
            const angle = Math.random() * Math.PI * 2;
            const spd = Utils.random(speed * 0.3, speed);
            const color = colors[Utils.randomInt(0, colors.length - 1)];
            p.init(
                x, y,
                Math.cos(angle) * spd,
                Math.sin(angle) * spd,
                Utils.random(life * 0.5, life),
                Utils.random(size * 0.5, size),
                color
            );
        }
    }

    // Brief white-hot core at the kill point — sells the "pop" before debris.
    createFlash(x, y, radius) {
        const p = this.get();
        if (!p) return;
        p.init(x, y, 0, 0, 0.12, radius, '#fff4e0', true, 1);
    }

    createTrail(x, y, color, size) {
        const p = this.get();
        if (!p) return;
        p.init(
            x + Utils.random(-2, 2),
            y + Utils.random(-2, 2),
            Utils.random(-80, -30),
            Utils.random(-15, 15),
            Utils.random(0.1, 0.3),
            Utils.random(size * 0.5, size),
            color
        );
    }

    // Evenly-spaced particles at uniform speed read as an expanding ring.
    createShockwave(x, y, color, count = 16, speed = 320) {
        for (let i = 0; i < count; i++) {
            const p = this.get();
            if (!p) continue;
            const angle = (i / count) * Math.PI * 2;
            p.init(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                0.35, 2.5, color, true, 0.92
            );
        }
    }

    createMuzzleFlash(x, y, angle, color) {
        for (let i = 0; i < 5; i++) {
            const p = this.get();
            if (!p) continue;
            const spread = Utils.random(-0.3, 0.3);
            const spd = Utils.random(200, 400);
            p.init(
                x, y,
                Math.cos(angle + spread) * spd,
                Math.sin(angle + spread) * spd,
                0.08,
                Utils.random(1, 3),
                color
            );
        }
    }
}
