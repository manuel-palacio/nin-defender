import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

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

    // Skeletal chameleon horror — gaunt elongated body, visible skull beneath
    // translucent skin, two stalk eyes tracking independently, scaled stripes,
    // glowing tail-spine. When fully cloaked (alpha < 0.2) only the eyes
    // remain visible — empty space staring at you.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const alpha = this.getAlpha();
        const fullyCloaked = alpha < 0.2;
        const hue = this.hueShift % 360;
        const bodyColor = `hsla(${hue}, 55%, 28%, ${alpha})`;

        ctx.save();
        ctx.translate(this.x, this.y);

        // When fully cloaked, only the eyes show — skip body, skull, legs, tail.
        if (!fullyCloaked) {
            ctx.globalAlpha = alpha;

            // Tail — thinner, with a glowing spine at the tip
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            const tailCurl = Math.sin(t * 3) * 0.3;
            ctx.beginPath();
            ctx.moveTo(r * 0.4, 0);
            ctx.quadraticCurveTo(r * 0.9, r * 0.15, r * 1.15, -r * 0.05 + tailCurl * r);
            ctx.quadraticCurveTo(r * 1.3, -r * 0.35 + tailCurl * r, r * 1.15, -r * 0.55 + tailCurl * r);
            ctx.stroke();
            // Glowing tail spine
            const tailEndX = r * 1.15;
            const tailEndY = -r * 0.55 + tailCurl * r;
            ctx.fillStyle = `hsla(${(hue + 60) % 360}, 100%, 70%, ${alpha})`;
            ctx.shadowColor = `hsl(${(hue + 60) % 360}, 100%, 60%)`;
            ctx.shadowBlur = 6 * alpha;
            ctx.beginPath();
            ctx.arc(tailEndX, tailEndY, r * 0.06, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Body — much thinner ratio (was 0.6 × 0.35 → 0.65 × 0.20 = skeletal)
            const bodyGrad = ctx.createRadialGradient(-r * 0.1, 0, 0, 0, 0, r * 0.6);
            bodyGrad.addColorStop(0, `hsla(${hue}, 45%, 35%, ${alpha})`);
            bodyGrad.addColorStop(1, `hsla(${hue}, 55%, 14%, ${alpha})`);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.65, r * 0.20, 0, 0, Math.PI * 2);
            ctx.fill();

            // Scale stripes — alternating dark/light horizontal stripes
            ctx.strokeStyle = `hsla(${hue}, 30%, 45%, ${alpha * 0.4})`;
            ctx.lineWidth = 0.6;
            for (let s = -3; s <= 3; s++) {
                const y = s * r * 0.05;
                ctx.beginPath();
                ctx.moveTo(-r * 0.55, y);
                ctx.lineTo(r * 0.50, y);
                ctx.stroke();
            }

            // Head — skeletal narrow
            ctx.fillStyle = `hsla(${hue}, 50%, 32%, ${alpha})`;
            ctx.beginPath();
            ctx.ellipse(-r * 0.55, 0, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            // Snout
            ctx.beginPath();
            ctx.ellipse(-r * 0.85, 0, r * 0.15, r * 0.10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Visible skull beneath the skin — light bone-line through the head
            ctx.strokeStyle = `rgba(220, 220, 200, ${0.30 * alpha})`;
            ctx.lineWidth = 0.8;
            // Cranial line
            ctx.beginPath();
            ctx.moveTo(-r * 0.35, -r * 0.05);
            ctx.lineTo(-r * 0.55, -r * 0.07);
            ctx.lineTo(-r * 0.78, -r * 0.04);
            ctx.stroke();
            // Jawline
            ctx.beginPath();
            ctx.moveTo(-r * 0.35, r * 0.05);
            ctx.lineTo(-r * 0.55, r * 0.06);
            ctx.lineTo(-r * 0.85, r * 0.02);
            ctx.stroke();
            // Eye socket hint (just inside the skull, behind the actual eyes)
            ctx.fillStyle = `rgba(180, 180, 160, ${0.25 * alpha})`;
            ctx.beginPath();
            ctx.arc(-r * 0.60, -r * 0.04, r * 0.05, 0, Math.PI * 2);
            ctx.fill();

            // Stubby legs
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 1.5;
            const legWave = Math.sin(t * 8) * 0.2;
            ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.18); ctx.lineTo(-r * 0.45, -r * 0.45 - legWave * r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-r * 0.3,  r * 0.18); ctx.lineTo(-r * 0.45,  r * 0.45 + legWave * r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( r * 0.20, -r * 0.18); ctx.lineTo( r * 0.35, -r * 0.45 + legWave * r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo( r * 0.20,  r * 0.18); ctx.lineTo( r * 0.35,  r * 0.45 - legWave * r); ctx.stroke();

            ctx.globalAlpha = 1;
        }

        // Two stalk eyes — tracked independently with different sin frequencies.
        // Drawn LAST so they remain visible even when body is fully cloaked.
        const stalkEyeAlpha = fullyCloaked ? 1.0 : alpha;
        const eye1Angle = Math.sin(t * 1.2) * 0.6;
        const eye2Angle = Math.sin(t * 2.7 + 2) * 0.6;
        const stalk1X = -r * 0.55 + Math.cos(eye1Angle) * r * 0.18;
        const stalk1Y = -r * 0.20 + Math.sin(eye1Angle) * r * 0.18;
        const stalk2X = -r * 0.55 + Math.cos(eye2Angle) * r * 0.18;
        const stalk2Y =  r * 0.20 + Math.sin(eye2Angle) * r * 0.18;

        // Stalks (faint when cloaked)
        if (!fullyCloaked) {
            ctx.strokeStyle = bodyColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-r * 0.55, -r * 0.05); ctx.lineTo(stalk1X, stalk1Y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.55, r * 0.05); ctx.lineTo(stalk2X, stalk2Y);
            ctx.stroke();
        }
        // Eyes themselves — bright, always visible (the horror is the eyes
        // floating in empty space when cloaked)
        ctx.fillStyle = `rgba(255, 240, 80, ${stalkEyeAlpha})`;
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 6 * stalkEyeAlpha;
        ctx.beginPath(); ctx.arc(stalk1X, stalk1Y, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(stalk2X, stalk2Y, r * 0.08, 0, Math.PI * 2); ctx.fill();
        // Pupils — vertical slits
        ctx.fillStyle = `rgba(0, 0, 0, ${stalkEyeAlpha})`;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(stalk1X, stalk1Y, r * 0.018, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(stalk2X, stalk2Y, r * 0.018, r * 0.06, 0, 0, Math.PI * 2); ctx.fill();

        // Health bar (always fully visible)
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
// SpiderDrone — Creepy multi-legged alien, crawls across screen
// ============================================================
