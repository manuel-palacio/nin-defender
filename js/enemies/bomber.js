import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

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

    // Gore octopus — torn-edged mantle, exposed clacking beak, one cloudy
    // dead eye, ink stains across the body, hooked sucker tips.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Tentacles with hooked sucker tips
        ctx.lineCap = 'round';
        for (let i = 0; i < this.tentacleCount; i++) {
            const angle = (i / this.tentacleCount) * Math.PI * 1.4 + Math.PI * 0.3;
            const wave1 = Math.sin(t * 3 + i * 1.2) * 0.3;
            const wave2 = Math.sin(t * 2.5 + i * 0.8) * 0.2;
            const startX = Math.cos(angle) * r * 0.5;
            const startY = Math.sin(angle) * r * 0.5;
            const midX = Math.cos(angle + wave1) * r * 1.1;
            const midY = Math.sin(angle + wave1) * r * 1.1;
            const endX = Math.cos(angle + wave1 + wave2) * r * 1.6;
            const endY = Math.sin(angle + wave1 + wave2) * r * 1.4;

            ctx.strokeStyle = `hsla(275, 50%, ${30 + i * 3}%, 0.85)`;
            ctx.lineWidth = 3.5 - i * 0.3;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();

            // Hooked sucker at tip — small inward arc
            ctx.strokeStyle = '#220033';
            ctx.lineWidth = 1.5;
            const hookAngle = Math.atan2(endY - midY, endX - midX);
            ctx.beginPath();
            ctx.arc(endX, endY, r * 0.06, hookAngle - 0.5, hookAngle + Math.PI * 0.6);
            ctx.stroke();
        }

        // Mantle — irregular torn-edge polygon (8-point with sin perturbation)
        const mantleGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r * 0.7);
        mantleGrad.addColorStop(0, '#9944cc');
        mantleGrad.addColorStop(0.5, '#5e1a88');
        mantleGrad.addColorStop(1, '#2a0a44');
        ctx.fillStyle = mantleGrad;
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const N = 14;
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 - Math.PI * 0.5;
            const tear = 0.85 + 0.15 * Math.sin(a * 5 + t * 0.7) - Math.abs(Math.sin(a * 4 + i)) * 0.1;
            const rx = Math.cos(a) * r * 0.65 * tear;
            const ry = Math.sin(a) * r * 0.55 * tear - r * 0.1;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();

        // Ink stains — irregular dark splotches on the body surface
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15, 0, 25, 0.55)';
        const stains = [
            { x: -r * 0.30, y: -r * 0.10, w: r * 0.13, h: r * 0.09 },
            { x:  r * 0.10, y: -r * 0.30, w: r * 0.10, h: r * 0.07 },
            { x:  r * 0.25, y:  r * 0.08, w: r * 0.08, h: r * 0.06 },
            { x: -r * 0.05, y:  r * 0.15, w: r * 0.11, h: r * 0.05 },
        ];
        for (const s of stains) {
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.w, s.h, Math.sin(t + s.x) * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes — one normal, one cloudy/dead. The dead one is on the left.
        ctx.fillStyle = '#222';
        ctx.beginPath(); // socket shadow
        ctx.ellipse(-r * 0.22, -r * 0.05, r * 0.18, r * 0.13, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.05, r * 0.18, r * 0.13, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // LEFT eye — cloudy/dead (light grey-blue, no clear pupil)
        ctx.fillStyle = 'rgba(200, 200, 220, 0.92)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.22, -r * 0.05, r * 0.14, r * 0.10, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Faint cataract streak
        ctx.fillStyle = 'rgba(230, 230, 240, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.22, -r * 0.06, r * 0.10, r * 0.04, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // RIGHT eye — alive, dilated pupil
        ctx.fillStyle = '#eeddff';
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.05, r * 0.14, r * 0.10, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#110022';
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.03, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Beak — two chitinous triangular pieces clacking together at the mouth
        const clack = Math.sin(t * 6) * 0.18;
        ctx.fillStyle = '#0a0010';
        ctx.strokeStyle = '#332244';
        ctx.lineWidth = 1;
        const beakBaseX = 0;
        const beakBaseY = r * 0.18;
        // Upper beak
        ctx.save();
        ctx.translate(beakBaseX, beakBaseY);
        ctx.rotate(clack);
        ctx.beginPath();
        ctx.moveTo(-r * 0.10, 0);
        ctx.lineTo(0, r * 0.13);
        ctx.lineTo(r * 0.04, 0.0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Lower beak
        ctx.save();
        ctx.translate(beakBaseX, beakBaseY);
        ctx.rotate(-clack);
        ctx.beginPath();
        ctx.moveTo(r * 0.10, 0);
        ctx.lineTo(0, r * 0.13);
        ctx.lineTo(-r * 0.04, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();

        // Health bar
        if (this.hp < this.maxHp) {
            const barW = r * 1.5;
            const barH = 3;
            const frac = this.hp / this.maxHp;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, -r - 10, barW, barH);
            ctx.fillStyle = frac > 0.5 ? '#00ff66' : '#ff3366';
            ctx.fillRect(-barW / 2, -r - 10, barW * frac, barH);
        }

        ctx.restore();
    }
}

// ============================================================
// SpaceMine (Space Jellyfish) — Drifts, stings on proximity
// ============================================================
