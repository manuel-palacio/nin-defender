import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

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

    // Body-horror devil — keeps the original silhouette but adds a dorsal
    // spine ridge, glowing lava cracks seeping through the skin, bone-grooved
    // horns, drifting embers, and a face contortion (squashed eyes + jaw
    // forward) during charging.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Drifting ash/ember particles rising from the head — drawn first
        // (behind everything else)
        ctx.fillStyle = `rgba(255, 180, 80, ${0.6 * fireFlicker})`;
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = 4;
        for (let i = 0; i < 4; i++) {
            const phase = i * 1.7 + t * 1.4;
            const ex = Math.sin(phase) * r * 0.35;
            const ey = -r * 1.0 - ((phase * 0.6) % 1) * r * 0.6;
            const er = r * (0.025 + 0.015 * Math.sin(phase * 2));
            ctx.beginPath();
            ctx.arc(ex, ey, er, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Fiery aura
        ctx.fillStyle = `rgba(255, 60, 0, ${0.15 * fireFlicker})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Dorsal spine ridge — 5 small triangular spines along the top of the head
        ctx.fillStyle = '#660800';
        ctx.strokeStyle = '#330400';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        for (let i = 0; i < 5; i++) {
            const sx = -r * 0.40 + i * r * 0.20;
            const sh = r * (0.18 - Math.abs(i - 2) * 0.04); // taller in the middle
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.06, -r * 0.55);
            ctx.lineTo(sx, -r * 0.55 - sh);
            ctx.lineTo(sx + r * 0.06, -r * 0.55);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }

        // Apply a charge contortion transform to the head + face.
        ctx.save();
        if (this.charging) {
            ctx.scale(1.15, 0.9);
        }

        // Horns
        ctx.strokeStyle = '#cc2200';
        ctx.fillStyle = '#aa1100';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.6, -r * 1.3, -r * 0.15, -r * 1.1);
        ctx.lineTo(-r * 0.2, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(r * 0.3, -r * 0.5);
        ctx.quadraticCurveTo(r * 0.6, -r * 1.3, r * 0.15, -r * 1.1);
        ctx.lineTo(r * 0.2, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Bone groove lines on each horn (texture)
        ctx.strokeStyle = 'rgba(60, 0, 0, 0.7)';
        ctx.lineWidth = 0.6;
        ctx.shadowBlur = 0;
        for (const sign of [-1, 1]) {
            for (let g = 0; g < 2; g++) {
                const baseX = sign * r * 0.25;
                const baseY = -r * (0.65 + g * 0.20);
                const tipX = sign * r * 0.18;
                const tipY = -r * (0.85 + g * 0.10);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }

        // Head body — dark red
        const headGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.8);
        headGrad.addColorStop(0, '#881100');
        headGrad.addColorStop(0.7, '#550808');
        headGrad.addColorStop(1, '#220000');
        ctx.fillStyle = headGrad;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 6 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Cracked-skin lava glow seeping through — 4 jagged crack lines drawn
        // with a bright glowing stroke. The cracks pulse with fireFlicker.
        ctx.strokeStyle = `rgba(255, 100, 0, ${fireFlicker * 0.55})`;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 6 * fireFlicker;
        ctx.lineWidth = 1.5;
        const cracks = [
            [[-r * 0.45, -r * 0.20], [-r * 0.20, -r * 0.05], [-r * 0.30, r * 0.18]],
            [[ r * 0.40, -r * 0.18], [ r * 0.20, -r * 0.05], [ r * 0.35, r * 0.08]],
            [[-r * 0.10,  r * 0.30], [ r * 0.05,  r * 0.20], [ r * 0.15,  r * 0.45]],
            [[-r * 0.20,  r * 0.10], [ r * 0.00,  r * 0.05], [ r * 0.10,  r * 0.20]],
        ];
        for (const c of cracks) {
            ctx.beginPath();
            ctx.moveTo(c[0][0], c[0][1]);
            ctx.lineTo(c[1][0], c[1][1]);
            ctx.lineTo(c[2][0], c[2][1]);
            ctx.stroke();
        }

        // Glowing eyes — menacing yellow-red. Squashed (more horizontal) when charging.
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        const eyeYScale = this.charging ? 0.5 : 1.0;
        ctx.shadowBlur = 10 * eyeGlow;
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ffaa00';
        ctx.save();
        ctx.translate(-r * 0.25, -r * 0.15);
        ctx.rotate(-0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08 * eyeYScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(r * 0.2, -r * 0.15);
        ctx.rotate(0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08 * eyeYScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mouth — jagged evil grin. Pushed forward when charging.
        const jawForward = this.charging ? r * 0.08 : 0;
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 + 0.4 * fireFlicker})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.2 + jawForward);
        for (let i = 0; i < 5; i++) {
            const mx = -r * 0.35 + (i + 0.5) * (r * 0.7 / 5);
            const my = r * 0.2 + jawForward + (i % 2 === 0 ? r * 0.15 : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.35, r * 0.2 + jawForward);
        ctx.stroke();

        ctx.restore(); // end charge-contortion transform

        // Flame trail when charging (drawn outside the contortion so it
        // doesn't get squashed)
        if (this.charging) {
            ctx.fillStyle = `rgba(255, 80, 0, ${0.5 * fireFlicker})`;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(r * 0.6, -r * 0.2);
            ctx.lineTo(r * 1.5 + Math.random() * r * 0.5, 0);
            ctx.lineTo(r * 0.6, r * 0.2);
            ctx.closePath();
            ctx.fill();
        }

        // Health bar
        if (this.hp < this.maxHp) {
            const barW = r * 1.5;
            const barH = 3;
            const frac = this.hp / this.maxHp;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, -r * 1.2 - 10, barW, barH);
            ctx.fillStyle = frac > 0.5 ? '#00ff66' : '#ff3366';
            ctx.fillRect(-barW / 2, -r * 1.2 - 10, barW * frac, barH);
        }

        ctx.restore();
    }
}

// ============================================================
// Boss — Large, multi-phase boss with cycling attack patterns
// ============================================================
// Themed names per bossType (0-9), used by HUD preview at phase transition.
