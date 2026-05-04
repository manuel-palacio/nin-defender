import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

export class AlienGhost extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'ghost';
        this.radius = 14 * GAME_SCALE;
        this.hp = 2;
        this.maxHp = 2;
        this.points = 35;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 40, canvasH - this.radius - 40);
        this.vx = Utils.random(-90, -40);
        this.vy = 0;
        this.canvasH = canvasH;

        // Float movement
        this.time = 0;
        this.floatFreq = Utils.random(1, 2.5);
        this.floatAmp = Utils.random(40, 80);
        this.baseY = this.y;

        // Teleport
        this.teleportTimer = Utils.random(2, 4);
        this.teleportInterval = Utils.random(2.5, 4.5);
        this.teleportFlash = 0;

        this.active = true;
    }

    update(dt) {
        this.time += dt;
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.time * this.floatFreq) * this.floatAmp;

        // Teleport cooldown
        if (this.teleportFlash > 0) this.teleportFlash -= dt;
        this.teleportTimer -= dt;
        if (this.teleportTimer <= 0) {
            this.teleportTimer = this.teleportInterval;
            this.teleportFlash = 0.3;
            // Teleport to a random Y
            this.baseY = Utils.random(this.radius + 40, this.canvasH - this.radius - 40);
        }
    }

    // Screaming skull specter — angular skull with hollow blue-fire eye
    // sockets, an unhinging jaw, and a multi-ribbon ectoplasm shroud
    // billowing behind. Teleport flash multiplies the skull into 3
    // overlapping copies that converge.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const alphaBase = 0.45 + 0.25 * Math.sin(t * 2);
        const drawSkull = (offsetX, offsetY, alpha) => {
            ctx.save();
            ctx.translate(offsetX, offsetY);
            ctx.globalAlpha = alpha;

            // Cranium — irregular 8-point polygon with sin perturbation for the bumpy bone look
            ctx.fillStyle = 'rgba(220, 220, 215, 0.92)';
            ctx.shadowColor = '#88ccff';
            ctx.shadowBlur = 6;
            ctx.beginPath();
            const pts = 10;
            for (let i = 0; i < pts; i++) {
                const a = -Math.PI + (i / (pts - 1)) * Math.PI;
                const wob = 0.94 + 0.06 * Math.sin(a * 5 + t);
                const px = Math.cos(a) * r * 0.7 * wob;
                const py = Math.sin(a) * r * 0.55 * wob - r * 0.15;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            // Cheekbones — two protruding triangles below the cranium edges
            ctx.beginPath();
            ctx.moveTo(-r * 0.55, r * 0.05);
            ctx.lineTo(-r * 0.40, r * 0.20);
            ctx.lineTo(-r * 0.30, r * 0.05);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(r * 0.55, r * 0.05);
            ctx.lineTo(r * 0.40, r * 0.20);
            ctx.lineTo(r * 0.30, r * 0.05);
            ctx.closePath(); ctx.fill();

            // Lower jaw — drops open with sin(time * 2). Drawn as a separate piece.
            ctx.shadowBlur = 0;
            const jawDrop = (Math.sin(t * 2) + 1) * 0.5; // 0..1
            const jawY = r * 0.20 + jawDrop * r * 0.18;
            ctx.fillStyle = 'rgba(220, 220, 215, 0.92)';
            ctx.beginPath();
            ctx.ellipse(0, jawY, r * 0.34, r * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();

            // Hollow eye sockets — dark holes with cold-blue inner glow
            ctx.fillStyle = '#020812';
            ctx.beginPath();
            ctx.ellipse(-r * 0.22, -r * 0.18, r * 0.14, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(r * 0.22, -r * 0.18, r * 0.14, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Cold-blue inner glow
            const glow = ctx.createRadialGradient(-r * 0.22, -r * 0.18, 0, -r * 0.22, -r * 0.18, r * 0.14);
            glow.addColorStop(0, 'rgba(0, 150, 255, 0.85)');
            glow.addColorStop(1, 'rgba(0, 150, 255, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.ellipse(-r * 0.22, -r * 0.18, r * 0.10, r * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();
            const glow2 = ctx.createRadialGradient(r * 0.22, -r * 0.18, 0, r * 0.22, -r * 0.18, r * 0.14);
            glow2.addColorStop(0, 'rgba(0, 150, 255, 0.85)');
            glow2.addColorStop(1, 'rgba(0, 150, 255, 0)');
            ctx.fillStyle = glow2;
            ctx.beginPath();
            ctx.ellipse(r * 0.22, -r * 0.18, r * 0.10, r * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();

            // Open mouth — O-shape with teeth visible. Width tracks the jaw drop.
            const mouthW = r * 0.20;
            const mouthH = r * 0.10 + jawDrop * r * 0.12;
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, jawY, mouthW, mouthH, 0, 0, Math.PI * 2);
            ctx.fill();
            // Teeth (5 top + 5 bottom) — bone color
            ctx.fillStyle = '#cccfc4';
            for (let i = 0; i < 5; i++) {
                const tx = -mouthW + (i + 0.5) * (mouthW * 2 / 5);
                ctx.beginPath();
                ctx.moveTo(tx, jawY - mouthH);
                ctx.lineTo(tx + r * 0.020, jawY - mouthH + r * 0.04);
                ctx.lineTo(tx - r * 0.020, jawY - mouthH + r * 0.04);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(tx, jawY + mouthH);
                ctx.lineTo(tx + r * 0.020, jawY + mouthH - r * 0.04);
                ctx.lineTo(tx - r * 0.020, jawY + mouthH - r * 0.04);
                ctx.closePath(); ctx.fill();
            }

            // Nasal cavity — small inverted triangle above the mouth
            ctx.fillStyle = '#0a0410';
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.02);
            ctx.lineTo(-r * 0.05, r * 0.10);
            ctx.lineTo(r * 0.05, r * 0.10);
            ctx.closePath(); ctx.fill();

            ctx.restore();
        };

        // Teleport flash → 3 overlapping skulls converging on the center
        if (this.teleportFlash > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = `rgba(80, 150, 255, ${this.teleportFlash * 0.6})`;
            ctx.shadowColor = '#66aaff';
            ctx.shadowBlur = 18;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            // 3 echoes converging
            const conv = 1 - this.teleportFlash / 0.3;
            const echoR = r * (1 - conv) * 0.5;
            drawSkull(this.x - echoR, this.y, alphaBase * 0.45);
            drawSkull(this.x + echoR, this.y - echoR * 0.5, alphaBase * 0.45);
        }

        // Ectoplasm shroud — 5 ribbons trailing behind, each with own phase
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alphaBase * 0.55;
        ctx.fillStyle = '#7a9bff';
        ctx.shadowColor = '#88aaff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const phase = i * 0.7 + t * 2.3;
            const tailY = (i - 2) * r * 0.18;
            const billow = Math.sin(phase) * r * 0.18;
            const tailLen = r * (0.6 + 0.3 * Math.sin(t * 1.7 + i));
            ctx.moveTo(r * 0.30, tailY - r * 0.05);
            ctx.quadraticCurveTo(r * 0.55 + billow, tailY + r * 0.10, r * 0.30 + tailLen, tailY + billow);
            ctx.quadraticCurveTo(r * 0.55 + billow, tailY - r * 0.10, r * 0.30, tailY + r * 0.05);
        }
        ctx.fill();
        ctx.restore();

        // Main skull
        drawSkull(this.x, this.y, alphaBase + 0.25);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = 1;

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
// AlienDevil — Fiery, aggressive, charges at player
// ============================================================
