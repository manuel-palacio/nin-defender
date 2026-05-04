import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

export class Drone extends Enemy {
    constructor(canvasW, canvasH, offsetY = 0) {
        super();
        this.type = 'drone';
        this.radius = 8 * GAME_SCALE;
        this.hp = 1;
        this.maxHp = 1;
        this.points = 15;

        this.x = canvasW + this.radius + Utils.random(10, 40);
        this.y = Utils.random(this.radius + 40, canvasH - this.radius - 40) + offsetY;
        this.vx = Utils.random(-260, -180);

        // Sine-wave movement
        this.baseY = this.y;
        this.wavyAmp = Utils.random(30, 70);
        this.wavyFreq = Utils.random(3, 5);
        this.time = Math.random() * Math.PI * 2;

        // Visual
        this.pulseTime = 0;
        this.hue = Utils.randomInt(50, 80); // warm yellow-green bioluminescence
        this.wingPhase = Math.random() * Math.PI * 2;
        this.active = true;
    }

    update(dt) {
        this.time += dt;
        this.pulseTime += dt;
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.time * this.wavyFreq) * this.wavyAmp;
    }

    // Disembodied drifting eyeball — sclera/iris/pupil with rotating iridescent
    // hue, dilating pupil, ruptured blood vessels, and squirming optic-nerve
    // tendrils. wingPhase repurposed as a per-instance hue offset.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.pulseTime;
        // Iris hue rotates over time for the unnerving iridescent look.
        const irisHue = (this.wingPhase * 60 + t * 30) % 360;
        const irisColor = `hsl(${irisHue}, 80%, 45%)`;
        const irisRim   = `hsl(${irisHue}, 90%, 30%)`;
        const veinAlpha = 0.3 + 0.4 * (0.5 + 0.5 * Math.sin(t * 4));

        ctx.save();
        ctx.translate(this.x, this.y);

        // Faint outer aura — barely visible, just enough to hint motion.
        ctx.fillStyle = `hsla(${irisHue}, 70%, 45%, 0.10)`;
        ctx.shadowColor = irisColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Optic nerve — 4 short squirming tendrils trailing behind (right side).
        ctx.strokeStyle = `hsla(0, 50%, 30%, 0.7)`;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
            const offset = (i - 1.5) * r * 0.18;
            const wiggle = Math.sin(t * 5 + i * 1.3) * r * 0.20;
            ctx.beginPath();
            ctx.moveTo(r * 0.6, offset);
            ctx.quadraticCurveTo(
                r * 0.95, offset + wiggle,
                r * 1.25, offset + wiggle * 0.4
            );
            ctx.stroke();
        }

        // Sclera (white of the eye) — slightly off-white for unhealthy look.
        ctx.fillStyle = '#e8e0d8';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Blood vessels — thin red lines radiating outward, pulsing alpha.
        ctx.strokeStyle = `rgba(180, 0, 0, ${veinAlpha})`;
        ctx.lineWidth = 0.8;
        const veinSeed = this.wingPhase;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + veinSeed;
            const startR = r * 0.20;
            const endR = r * 0.62;
            const mid = (startR + endR) * 0.5;
            const branch = Math.sin(angle * 3 + veinSeed) * r * 0.06;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR);
            ctx.quadraticCurveTo(
                Math.cos(angle) * mid + branch, Math.sin(angle) * mid + branch,
                Math.cos(angle) * endR, Math.sin(angle) * endR
            );
            ctx.stroke();
        }

        // Iris — radial gradient sclera-edge → colored iris → darker rim
        const irisGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.42);
        irisGrad.addColorStop(0, irisColor);
        irisGrad.addColorStop(0.7, irisRim);
        irisGrad.addColorStop(1, '#101010');
        ctx.fillStyle = irisGrad;
        ctx.shadowColor = irisColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.40, 0, Math.PI * 2);
        ctx.fill();

        // Pupil — black, dilates and contracts on its own breathing rhythm.
        ctx.shadowBlur = 0;
        const pupilR = r * (0.18 + 0.08 * Math.sin(t * 3));
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, pupilR, 0, Math.PI * 2);
        ctx.fill();

        // Catch-light specular — a tiny offset white dot that makes the eye look wet
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(-r * 0.12, -r * 0.12, r * 0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
// Bomber (Space Octopus) — Tentacled alien, drops ink bombs
// ============================================================
