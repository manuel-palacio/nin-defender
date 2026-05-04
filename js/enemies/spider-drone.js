import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

export class SpiderDrone extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'spider';
        this.radius = 16 * GAME_SCALE;
        this.hp = 3;
        this.maxHp = 3;
        this.points = 45;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-100, -55);
        this.vy = 0;
        this.canvas_w = canvasW;

        // Erratic crawl movement
        this.crawlTimer = 0;
        this.crawlInterval = Utils.random(0.4, 0.8);
        this.crawlDir = Math.random() > 0.5 ? 1 : -1;
        this.crawlSpeed = Utils.random(80, 160);
        this.canvasH = canvasH;

        // Web shooting
        this.shootTimer = Utils.random(1, 2.5);
        this.shootInterval = Utils.random(2, 3.5);

        // Leg animation
        this.time = 0;
        this.legCount = 4; // per side
        this.legPhaseOffset = Utils.random(0, Math.PI * 2);

        // Eye glow
        this.eyePulse = 0;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.time += dt;
        this.eyePulse += dt;
        this.x += this.vx * dt;

        // Erratic vertical crawl
        this.crawlTimer += dt;
        if (this.crawlTimer >= this.crawlInterval) {
            this.crawlTimer = 0;
            this.crawlDir = Math.random() > 0.5 ? 1 : -1;
            this.crawlInterval = Utils.random(0.3, 0.7);
        }
        this.y += this.crawlDir * this.crawlSpeed * dt;
        this.y = Utils.clamp(this.y, this.radius + 10, this.canvasH - this.radius - 10);

        // Shoot webs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.shootWeb(projectilePool, audio);
        }
    }

    shootWeb(projectilePool, audio) {
        // Fire a spread of 2 slow-moving "web" projectiles
        const speed = 180;
        const spread = Utils.random(0.15, 0.35);
        for (let i = -1; i <= 1; i += 2) {
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    -speed, i * speed * spread,
                    '#44ff22', '#66ff44', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    // Face-spider — pale sickly skin-toned abdomen with a stretched human face
    // (eye sockets + screaming mouth) on it, dark contrasting legs, tightly
    // clustered red eyes on the head. The face distorts subtly with sin time.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Legs — dark contrast against the pale body, slightly de-synced
        // frequencies so movement looks organic/wrong.
        ctx.strokeStyle = '#2a3a18';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';

        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < this.legCount; i++) {
                // Per-leg frequency variation (1.0 / 1.07 / 0.93 / 1.04 etc.)
                const freq = 8 * (1 + (i - 1.5) * 0.04);
                const phase = this.legPhaseOffset + i * 0.8 + (side > 0 ? Math.PI : 0);
                const legWave = Math.sin(t * freq + phase) * 0.3;

                const baseAngle = (side * 0.6) + (i - 1.5) * 0.35;
                const jointX1 = Math.cos(baseAngle + legWave) * r * 0.7;
                const jointY1 = Math.sin(baseAngle + legWave) * r * 0.7 * side;
                const tipAngle = baseAngle + legWave * 1.5 + side * 0.4;
                const tipX = Math.cos(tipAngle) * r * 1.4;
                const tipY = Math.sin(tipAngle) * r * 1.1 * side;

                ctx.beginPath();
                ctx.moveTo(0, side * r * 0.15);
                ctx.lineTo(jointX1, jointY1);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }

        // Abdomen — pale sickly skin-tone (was dark green)
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.55);
        abdGrad.addColorStop(0, 'hsl(40, 18%, 78%)');
        abdGrad.addColorStop(0.6, 'hsl(38, 16%, 60%)');
        abdGrad.addColorStop(1, 'hsl(35, 14%, 40%)');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // ----- Stretched human face on the abdomen -----
        const faceWobble = Math.sin(t * 0.8); // subtle distortion
        const eyeSpacing = r * 0.16 * (1 + faceWobble * 0.08);
        const faceX = r * 0.15;

        // Eye sockets — dark filled ellipses (pupils within darkness)
        ctx.fillStyle = '#0a0506';
        ctx.beginPath();
        ctx.ellipse(faceX - eyeSpacing, -r * 0.10, r * 0.07, r * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(faceX + eyeSpacing, -r * 0.10, r * 0.07, r * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tiny inner highlight in each socket
        ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
        ctx.beginPath(); ctx.arc(faceX - eyeSpacing - r * 0.02, -r * 0.12, r * 0.015, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(faceX + eyeSpacing - r * 0.02, -r * 0.12, r * 0.015, 0, Math.PI * 2); ctx.fill();

        // Screaming mouth — open arc with teeth marks. Distorts with sin too.
        const mouthOpen = 1 + faceWobble * 0.15;
        const mouthW = r * 0.16;
        const mouthH = r * 0.12 * mouthOpen;
        ctx.fillStyle = '#0a0506';
        ctx.beginPath();
        ctx.ellipse(faceX, r * 0.10, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth — small light marks at top + bottom of the mouth
        ctx.fillStyle = '#ddd6c8';
        const teeth = 6;
        for (let i = 0; i < teeth; i++) {
            const tx = faceX - mouthW + (i + 0.5) * (mouthW * 2 / teeth);
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.10 - mouthH);
            ctx.lineTo(tx + r * 0.012, r * 0.10 - mouthH + r * 0.02);
            ctx.lineTo(tx - r * 0.012, r * 0.10 - mouthH + r * 0.02);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.10 + mouthH);
            ctx.lineTo(tx + r * 0.012, r * 0.10 + mouthH - r * 0.02);
            ctx.lineTo(tx - r * 0.012, r * 0.10 + mouthH - r * 0.02);
            ctx.closePath();
            ctx.fill();
        }
        // Faint scream-stretch lines from mouth corners
        ctx.strokeStyle = 'rgba(80, 60, 60, 0.3)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(faceX - mouthW, r * 0.10);
        ctx.lineTo(faceX - mouthW * 1.6, r * 0.10 + r * 0.04);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(faceX + mouthW, r * 0.10);
        ctx.lineTo(faceX + mouthW * 1.6, r * 0.10 + r * 0.04);
        ctx.stroke();

        // Thorax — slightly darker pale
        const thorGrad = ctx.createRadialGradient(-r * 0.35, 0, 0, -r * 0.35, 0, r * 0.35);
        thorGrad.addColorStop(0, 'hsl(35, 14%, 50%)');
        thorGrad.addColorStop(1, 'hsl(32, 12%, 28%)');
        ctx.fillStyle = thorGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, 0, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // 8 red eyes on the head, clustered tight like a real spider
        const eyeGlow = 0.6 + 0.4 * Math.sin(this.eyePulse * 5);
        ctx.fillStyle = `rgba(255, 20, 20, ${eyeGlow})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 5 * eyeGlow;
        const cluster = [
            [-r * 0.50, -r * 0.06], [-r * 0.50,  r * 0.06],
            [-r * 0.46, -r * 0.13], [-r * 0.46,  r * 0.13],
            [-r * 0.55, -r * 0.10], [-r * 0.55,  r * 0.10],
            [-r * 0.42, -r * 0.04], [-r * 0.42,  r * 0.04],
        ];
        for (const [ex, ey] of cluster) {
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.035, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mandibles
        ctx.strokeStyle = '#3a3026';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.5;
        const mandibleWave = Math.sin(t * 6) * 0.15;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.05);
        ctx.quadraticCurveTo(-r * 0.75, -r * 0.15 - mandibleWave * r, -r * 0.7, -r * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, r * 0.05);
        ctx.quadraticCurveTo(-r * 0.75, r * 0.15 + mandibleWave * r, -r * 0.7, r * 0.25);
        ctx.stroke();

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
// AlienGhost — Translucent, drifts through space, teleports
// ============================================================
