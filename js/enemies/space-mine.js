import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

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

    // Severed alien hand — fleshy palm, 6-8 fingers with knuckled joints,
    // bone-spike fingertips, glowing sigil eye in the palm. Drifts palm-first
    // toward the player; on detonate the fingers snap inward.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);

        ctx.save();
        ctx.translate(this.x, this.y);

        // 6-8 fingers, each with 2 knuckle joints and a bone-spike tip.
        // Independent sin phases so they twitch out of sync. Fingers point
        // mostly forward (-X), splayed across an arc.
        const fingerCount = this.tentacleCount;
        const fleshDark  = 'hsl(130, 25%, 18%)';
        const fleshMid   = 'hsl(130, 22%, 28%)';
        ctx.lineCap = 'round';
        for (let i = 0; i < fingerCount; i++) {
            const splay = ((i / (fingerCount - 1)) - 0.5) * Math.PI * 1.0;
            const baseAngle = Math.PI + splay; // forward = -X
            const phase = i * 1.4 + t * 1.5;
            const twitch = Math.sin(phase) * 0.15;
            const lengthMul = 1.0 + 0.3 * Math.sin(t * 0.7 + i);

            // Bone segment 1 (palm → knuckle)
            const seg1 = r * 0.7 * lengthMul;
            const k1x = Math.cos(baseAngle + twitch) * seg1;
            const k1y = Math.sin(baseAngle + twitch) * seg1;

            // Bone segment 2 (knuckle → next knuckle)
            const seg2 = r * 0.5 * lengthMul;
            const k2x = k1x + Math.cos(baseAngle + twitch * 1.5 + 0.2) * seg2;
            const k2y = k1y + Math.sin(baseAngle + twitch * 1.5 + 0.2) * seg2;

            // Tip
            const seg3 = r * 0.35 * lengthMul;
            const tipX = k2x + Math.cos(baseAngle + twitch * 2.0) * seg3;
            const tipY = k2y + Math.sin(baseAngle + twitch * 2.0) * seg3;

            // Finger shaft
            ctx.strokeStyle = fleshDark;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(k1x, k1y);
            ctx.lineTo(k2x, k2y);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            // Knuckle nodes
            ctx.fillStyle = fleshMid;
            ctx.beginPath(); ctx.arc(k1x, k1y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(k2x, k2y, 2.0, 0, Math.PI * 2); ctx.fill();

            // Bone-spike tip — small triangle pointing outward
            ctx.fillStyle = '#bfbfa8';
            const tipAngle = Math.atan2(tipY - k2y, tipX - k2x);
            const spikeLen = r * 0.10;
            ctx.beginPath();
            ctx.moveTo(tipX + Math.cos(tipAngle) * spikeLen, tipY + Math.sin(tipAngle) * spikeLen);
            ctx.lineTo(tipX + Math.cos(tipAngle + 1.6) * 1.5, tipY + Math.sin(tipAngle + 1.6) * 1.5);
            ctx.lineTo(tipX + Math.cos(tipAngle - 1.6) * 1.5, tipY + Math.sin(tipAngle - 1.6) * 1.5);
            ctx.closePath();
            ctx.fill();
        }

        // Palm — irregular fleshy oval with subtle shadow
        const palmGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
        palmGrad.addColorStop(0, fleshMid);
        palmGrad.addColorStop(0.7, fleshDark);
        palmGrad.addColorStop(1, '#0e1812');
        ctx.fillStyle = palmGrad;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.65, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sigil eye in the palm — glowing detonation warning
        ctx.shadowBlur = 0;
        const sigilColor = `rgba(180, 255, 120, ${0.35 + 0.4 * pulse})`;
        ctx.fillStyle = sigilColor;
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 8 * pulse;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.18, r * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner pupil
        ctx.fillStyle = '#0a1a04';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        // Sigil radial ticks (4 short lines around the eye)
        ctx.strokeStyle = `rgba(180, 255, 120, ${0.4 + 0.3 * pulse})`;
        ctx.lineWidth = 1;
        for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            const ix = Math.cos(a) * r * 0.22;
            const iy = Math.sin(a) * r * 0.13;
            const ox = Math.cos(a) * r * 0.32;
            const oy = Math.sin(a) * r * 0.20;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ox, oy);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ============================================================
// StealthFighter (Space Chameleon) — Color-shifting lizard alien
// ============================================================
