import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

export class EnemyShip extends Enemy {
    constructor(canvasW, canvasH, tier = 1, assets = {}) {
        super();
        this.assets = assets;
        this.type = 'ship';
        this.tier = tier; // 1 = small critter, 2 = large critter
        this.radius = (tier === 1 ? 16 : 24) * GAME_SCALE;
        this.hp = tier === 1 ? 2 : 3;
        this.maxHp = this.hp;
        this.points = tier === 1 ? 25 : 50;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 30, canvasH - this.radius - 30);
        this.vx = Utils.random(-120, -50);
        this.vy = 0;
        this.canvas_w = canvasW;

        // Tracking behaviour — drift toward player y
        this.trackSpeed = Utils.random(40, 100);
        this.shootTimer = Utils.random(0.5, 2);
        this.shootInterval = tier === 1 ? Utils.random(1.5, 3) : Utils.random(1, 2);
        this.active = true;

        // Visual
        this.time = 0;
        this.legPhase = Math.random() * Math.PI * 2;
        this.hue = tier === 1 ? Utils.randomInt(0, 30) : Utils.randomInt(260, 290);
    }

    update(dt, playerY, projectilePool, audio) {
        super.update(dt);
        this.time += dt;

        // Drift toward player's Y
        if (playerY !== null) {
            const diff = playerY - this.y;
            this.vy = Utils.clamp(diff, -1, 1) * this.trackSpeed;
            this.y += this.vy * dt;
        }

        // Shoot
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.fireAtPlayer(projectilePool, audio);
        }
    }

    fireAtPlayer(projectilePool, audio) {
        const p = projectilePool.get();
        if (p) {
            const speed = 350;
            p.init(this.x - this.radius, this.y, -speed, Utils.random(-40, 40),
                '#ff3366', '#ff3366', true);
            audio.playEnemyLaser();
        }
    }

    // Facehugger grub — long parasitic body with armor plates, two stabbing
    // proboscises, hooked claws, biting mouth. Tier 2 adds a bioluminescent
    // wound glow on the underside. Forward (toward player) is -X.
    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        const r = this.radius;
        const t = this.time;
        const tier2 = this.tier === 2;
        // Very dark alien flesh — tier 1 red-brown, tier 2 deep blue-black.
        const bodyHue = tier2 ? Math.max(200, this.hue) : Math.min(30, this.hue);
        const flesh     = `hsl(${bodyHue}, 70%, 20%)`;
        const fleshDim  = `hsl(${bodyHue}, 60%, 12%)`;
        const fleshHigh = `hsl(${bodyHue}, 50%, 32%)`;

        // 4 pairs of hooked claws gripping the air — slightly de-synced phases.
        ctx.strokeStyle = fleshDim;
        ctx.lineWidth = tier2 ? 2 : 1.5;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const phase = this.legPhase + i * 0.9 + (side > 0 ? Math.PI * 0.4 : 0);
                const wave = Math.sin(t * 12 + phase) * 0.35;
                const baseX = (i - 1.5) * r * 0.3; // distributed along body
                const baseY = side * r * 0.18;
                const jointX = baseX + Math.cos(wave) * r * 0.18;
                const jointY = baseY + side * r * 0.30;
                const hookX  = jointX + Math.cos(wave + side * 0.5) * r * 0.20;
                const hookY  = jointY + side * (r * 0.18 + Math.abs(Math.sin(wave * 2)) * r * 0.05);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(jointX, jointY);
                ctx.lineTo(hookX, hookY);
                ctx.stroke();
                // Hook spike at tip
                ctx.beginPath();
                ctx.moveTo(hookX, hookY);
                ctx.lineTo(hookX - r * 0.06, hookY + side * r * 0.04);
                ctx.stroke();
            }
        }

        // Long narrow body — chitinous oval, plated rear-to-front.
        ctx.shadowBlur = 0;
        const bodyGrad = ctx.createLinearGradient(-r * 0.7, 0, r * 0.7, 0);
        bodyGrad.addColorStop(0, fleshDim);
        bodyGrad.addColorStop(0.5, flesh);
        bodyGrad.addColorStop(1, fleshDim);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.85, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Armor plates — 4 ribbed bands across the back
        ctx.strokeStyle = `hsla(${bodyHue}, 50%, 30%, 0.7)`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const px = -r * 0.55 + i * r * 0.32;
            ctx.beginPath();
            ctx.ellipse(px, 0, r * 0.10, r * 0.30, 0, -Math.PI * 0.45, Math.PI * 0.45);
            ctx.stroke();
        }

        // Ribcage lines on the belly — exposed, faintly visible
        ctx.strokeStyle = `hsla(${bodyHue}, 30%, 55%, 0.45)`;
        ctx.lineWidth = 0.7;
        for (let i = 0; i < 5; i++) {
            const rx = -r * 0.45 + i * r * 0.22;
            ctx.beginPath();
            ctx.moveTo(rx, -r * 0.12);
            ctx.lineTo(rx, r * 0.12);
            ctx.stroke();
        }

        // Tier-2 wound glow on the underside — pulsing bioluminescence
        if (tier2) {
            const woundPulse = 0.5 + 0.5 * Math.sin(t * 3);
            const woundColor = `hsla(${bodyHue + 30}, 90%, 55%, ${0.3 + 0.4 * woundPulse})`;
            ctx.fillStyle = woundColor;
            ctx.shadowColor = woundColor;
            ctx.shadowBlur = 10 * woundPulse;
            ctx.beginPath();
            ctx.ellipse(r * 0.05, r * 0.20, r * 0.30, r * 0.06, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Two forward-stabbing proboscises — vibrating, tip points at player.
        const probVib = Math.sin(t * 28) * r * 0.04;
        ctx.strokeStyle = fleshHigh;
        ctx.lineWidth = 1.5;
        for (const offY of [-r * 0.10, r * 0.10]) {
            ctx.beginPath();
            ctx.moveTo(-r * 0.55, offY);
            ctx.quadraticCurveTo(-r * 0.85, offY * 1.6, -r * 1.05 + probVib, offY * 0.4);
            ctx.stroke();
            // Sharp tip dot
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(-r * 1.05 + probVib, offY * 0.4, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Biting mouth at the front — opens/closes, reveals teeth
        const mouthOpen = 0.5 + 0.5 * Math.sin(t * 8);
        const mouthW = r * 0.16;
        const mouthH = r * 0.05 + r * 0.10 * mouthOpen;
        // Maw
        ctx.fillStyle = '#100';
        ctx.beginPath();
        ctx.ellipse(-r * 0.55, 0, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth — small triangles top + bottom along the maw
        if (mouthOpen > 0.25) {
            ctx.fillStyle = '#ddd';
            const teethN = 5;
            for (let i = 0; i < teethN; i++) {
                const tx = -r * 0.55 - mouthW + (i + 0.5) * (mouthW * 2 / teethN);
                ctx.beginPath();
                ctx.moveTo(tx, -mouthH);
                ctx.lineTo(tx + mouthW * 0.10, -mouthH + r * 0.04);
                ctx.lineTo(tx - mouthW * 0.10, -mouthH + r * 0.04);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(tx, mouthH);
                ctx.lineTo(tx + mouthW * 0.10, mouthH - r * 0.04);
                ctx.lineTo(tx - mouthW * 0.10, mouthH - r * 0.04);
                ctx.closePath(); ctx.fill();
            }
        }

        // Tiny lateral eyes — pinprick yellow, no glow (creepy beady)
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(-r * 0.40, -r * 0.18, r * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.40,  r * 0.18, r * 0.04, 0, Math.PI * 2); ctx.fill();

        // Health bar (if damaged)
        if (this.hp < this.maxHp) {
            const barW = r * 1.5;
            const barH = 3;
            const frac = this.hp / this.maxHp;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, -r - 8, barW, barH);
            ctx.fillStyle = frac > 0.5 ? '#00ff66' : '#ff3366';
            ctx.fillRect(-barW / 2, -r - 8, barW * frac, barH);
        }

        ctx.restore();
    }
}

// ============================================================
// Drone (Space Firefly) — Tiny bioluminescent insect, swarms
// ============================================================
