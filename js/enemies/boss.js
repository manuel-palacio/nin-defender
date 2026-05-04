import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

export const BOSS_NAMES = [
    'BRONZE COLOSSUS',
    'CRIMSON SCOUT',
    'VIRAL SWARM',
    'CRIMSON MAW',
    'SPIDER QUEEN',
    'PHANTOM WAILER',
    'VOID BOMBER',
    'STEALTH WRAITH',
    'INFERNO LORD',
    'CHAOS HARBINGER',
];

export class Boss extends Enemy {
    constructor(canvasW, canvasH, bossType = 0, assets = {}) {
        super();
        this.type = 'boss';
        this.assets = assets;
        this.bossType = Utils.clamp(bossType, 0, 9);
        this.radius = (30 + this.bossType * 2) * GAME_SCALE;

        // HP scales gently: easy bosses (8-18), medium (24-36), hard (44-60)
        // Base HP scales with boss type; effective HP stays reasonable
        // because it's measured in "seconds to kill" not raw HP
        const hpTable = [10, 14, 18, 22, 28, 34, 40, 48, 56, 65];
        this.hp = hpTable[this.bossType] || 10;
        this.maxHp = this.hp;
        this.points = 200 + this.bossType * 150;

        // Spawn from right, move to x = canvasW * 0.75 then stop
        this.x = canvasW + this.radius + 60;
        this.y = canvasH / 2;
        this.vx = -120;
        this.vy = 0;
        this.canvas_w = canvasW;
        this.canvasH = canvasH;
        this.stopX = canvasW * 0.75;
        this.arrived = false;

        // Attack patterns scale with boss type
        // Easy bosses: only 1-2 patterns, slow cycle
        // Hard bosses: all 3 patterns, fast cycle
        this.patternIndex = 0;
        this.patternTimer = 0;
        if (this.bossType <= 2) {
            this.patternInterval = 3.5; // slow attacks
            this.maxPatterns = 1;       // aimed only
        } else if (this.bossType <= 5) {
            this.patternInterval = 3.0;
            this.maxPatterns = 2;       // aimed + barrage
        } else {
            this.patternInterval = 2.2;
            this.maxPatterns = 3;       // all patterns
        }
        this.spiralAngle = 0;

        // Bullet speed scales with boss type
        this.bulletSpeedMul = 0.6 + this.bossType * 0.05; // 0.6x to 1.05x

        // Visual timers
        this.time = 0;
        this.corePhase = 0;
        this.shieldRotation = 0;

        // Boss theme colors indexed by bossType 0-9
        this.themeColors = [
            '#aa7733', // bronze (asteroid boss)
            '#ff6644', // orange-red (scout boss)
            '#44ff66', // green (drone boss)
            '#ff4444', // red (mine boss)
            '#66ff22', // lime (spider boss)
            '#bb66ff', // purple (ghost boss)
            '#aa55ff', // violet (bomber boss)
            '#00cccc', // cyan (stealth boss)
            '#ff4400', // fire (devil boss)
            '#ff3366'  // magenta (chaos boss)
        ];
        this.color = this.themeColors[this.bossType] || '#ffffff';

        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.time += dt;
        this.corePhase += dt * 4;
        this.shieldRotation += dt * 1.2;

        // Move toward stop position, then hover in place
        if (!this.arrived) {
            this.x += this.vx * dt;
            if (this.x <= this.stopX) {
                this.x = this.stopX;
                this.arrived = true;
            }
        } else {
            const margin = this.radius + 30;
            const topEdge = margin;
            const botEdge = this.canvasH - margin;
            const centerY = this.canvasH / 2;
            const driftSpeed = 60 + this.bossType * 8;

            // Near edge? Push back toward center instead of evading further
            const nearTop = this.y < topEdge + 40;
            const nearBot = this.y > botEdge - 40;

            if (nearTop || nearBot) {
                // Escape corner — move toward center
                const toCenter = centerY - this.y;
                this.y += Math.sign(toCenter) * driftSpeed * 1.2 * dt;
            } else {
                // Normal evasion — dodge away from player Y
                const diff = playerY - this.y;
                const evadeDir = diff > 0 ? -1 : 1;

                // Sinusoidal drift + evasion
                const drift = Math.sin(this.time * 1.2) * 40;
                const evade = evadeDir * driftSpeed * 0.5;
                this.y += (drift + evade) * dt;

                // Periodic direction change to stay unpredictable
                if (Math.sin(this.time * 2.0 + this.bossType) > 0.8) {
                    this.y -= evadeDir * driftSpeed * 0.8 * dt;
                }
            }

            this.y = Utils.clamp(this.y, topEdge, botEdge);
        }

        // Cycle attack patterns once arrived
        if (this.arrived) {
            this.patternTimer += dt;
            if (this.patternTimer >= this.patternInterval) {
                this.patternTimer = 0;
                this.patternIndex = (this.patternIndex + 1) % this.maxPatterns;
            }

            // Fire based on current pattern
            if (this.patternTimer < dt * 1.5) {
                switch (this.patternIndex) {
                    case 0:
                        this.fireAimed(playerY, projectilePool, audio);
                        break;
                    case 1:
                        this.fireBarrage(projectilePool, audio);
                        break;
                    case 2:
                        this.fireSpiral(projectilePool, audio);
                        break;
                }
                // Late bosses: fire a bonus wall pattern
                if (this.bossType >= 7) {
                    this.fireWall(projectilePool, audio);
                }
            }
        }

        // Advance spiral angle over time for rotation effect
        this.spiralAngle += dt * 2;
    }

    fireAimed(playerY, projectilePool, audio) {
        const speed = 400 * this.bulletSpeedMul;
        // Easy bosses fire 1-2 projectiles, hard bosses fire 3
        const count = this.bossType <= 2 ? 1 : this.bossType <= 5 ? 2 : 3;
        const spread = count === 1 ? [0] : count === 2 ? [-1, 1] : [-1, 0, 1];
        for (const i of spread) {
            const p = projectilePool.get();
            if (p) {
                const dy = (playerY !== undefined && playerY !== null)
                    ? (playerY - this.y) + i * 30
                    : i * 40;
                p.init(this.x - this.radius, this.y + i * 12,
                    -speed, dy * 0.8,
                    this.color, '#ff4444', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    fireSpiral(projectilePool, audio) {
        // Only used by hard bosses (type 6+) — rotating ring
        const count = 4 + this.bossType; // 10-13 for hard bosses
        const speed = 250 * this.bulletSpeedMul;
        for (let i = 0; i < count; i++) {
            const angle = this.spiralAngle + (i / count) * Math.PI * 2;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    this.color, '#ffaa00', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    fireBarrage(projectilePool, audio) {
        const speed = 320 * this.bulletSpeedMul;
        // Easy/medium bosses fire 2-3, hard bosses fire 5
        const count = this.bossType <= 3 ? 2 : this.bossType <= 6 ? 3 : 5;
        const spreadAngle = 0.5;
        for (let i = 0; i < count; i++) {
            const center = (count - 1) / 2;
            const angle = Math.PI + (i - center) * (spreadAngle / Math.max(count - 1, 1));
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    this.color, '#ff6666', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    fireWall(projectilePool, audio) {
        // Wall of bullets with a gap for the player to dodge through
        const speed = 200 * this.bulletSpeedMul;
        const gap = Utils.random(0.2, 0.8);
        const rows = 12;
        for (let i = 0; i < rows; i++) {
            const frac = i / (rows - 1);
            if (Math.abs(frac - gap) < 0.15) continue;
            const p = projectilePool.get();
            if (p) {
                const yPos = this.canvasH * frac;
                p.init(this.x - this.radius, yPos,
                    -speed, 0, this.color, '#ff4444', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const color = this.color;
        const pulse = 0.6 + 0.4 * Math.sin(this.corePhase);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Dispatch to themed boss drawing (all canvas-animated)
        const drawMethods = {
            0: '_drawCritterBoss',
            1: '_drawFireflyBoss',
            2: '_drawJellyfishBoss',
            3: '_drawSpiderBoss',
            4: '_drawGhostBoss',
            5: '_drawOctopusBoss',
            6: '_drawChameleonBoss',
        };
        const method = drawMethods[this.bossType] || (this.bossType >= 7 ? '_drawDevilBoss' : '_drawDefaultBoss');
        this[method](ctx, r, t, color, pulse);

        this._drawBossHealthBar(ctx, r);
        ctx.restore();
    }

    _drawBossHealthBar(ctx, r) {
        const barW = r * 2.2;
        const barH = 5;
        const frac = this.hp / this.maxHp;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, -r - 18, barW, barH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -r - 18, barW, barH);
        let barColor;
        if (frac > 0.6) barColor = '#00ff66';
        else if (frac > 0.3) barColor = '#ffaa00';
        else barColor = '#ff3366';
        ctx.fillStyle = barColor;
        ctx.fillRect(-barW / 2, -r - 18, barW * frac, barH);
    }

    _drawCritterBoss(ctx, r, t, color, pulse) {
        // Giant armored bug — antennae, mandibles, segmented shell, legs

        // Legs — 4 per side, scuttling
        ctx.strokeStyle = '#884422';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 4; i++) {
                const phase = i * 1.0 + (side > 0 ? Math.PI * 0.4 : 0);
                const wave = Math.sin(t * 6 + phase) * 0.2;
                const baseAngle = side * 0.45 + (i - 1.5) * 0.35;
                const jx = Math.cos(baseAngle + wave) * r * 0.7;
                const jy = Math.sin(baseAngle + wave) * r * 0.65 * side;
                const tx = Math.cos(baseAngle + wave + side * 0.3) * r * 1.2;
                const ty = Math.sin(baseAngle + wave + side * 0.3) * r * 1.0 * side;
                ctx.beginPath();
                ctx.moveTo(0, side * r * 0.12);
                ctx.lineTo(jx, jy);
                ctx.lineTo(tx, ty);
                ctx.stroke();
            }
        }

        // Antennae
        ctx.strokeStyle = '#cc6633';
        ctx.lineWidth = 2;
        const antWave = Math.sin(t * 3) * 0.25;
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, -r * 0.15);
        ctx.quadraticCurveTo(-r * 0.9, -r * 0.7 - antWave * r, -r, -r * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.45, r * 0.15);
        ctx.quadraticCurveTo(-r * 0.9, r * 0.7 + antWave * r, -r, r * 0.55);
        ctx.stroke();
        // Tips
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(-r, -r * 0.55, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r, r * 0.55, 3, 0, Math.PI * 2); ctx.fill();

        // Abdomen — segmented shell
        ctx.shadowBlur = 0;
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.55);
        abdGrad.addColorStop(0, '#cc6633');
        abdGrad.addColorStop(0.6, '#884420');
        abdGrad.addColorStop(1, '#442210');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Shell segments
        ctx.strokeStyle = 'rgba(50, 20, 10, 0.6)';
        ctx.lineWidth = 1.5;
        for (let s = -2; s <= 2; s++) {
            const sx = r * 0.15 + s * r * 0.12;
            ctx.beginPath();
            ctx.moveTo(sx, -r * 0.38);
            ctx.lineTo(sx, r * 0.38);
            ctx.stroke();
        }
        // Shell pattern spots
        ctx.fillStyle = `rgba(255, 180, 60, ${0.3 + 0.15 * pulse})`;
        ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.1, r * 0.08, r * 0.06, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.12, r * 0.07, r * 0.05, -0.3, 0, Math.PI * 2); ctx.fill();

        // Head
        const headGrad = ctx.createRadialGradient(-r * 0.35, 0, 0, -r * 0.35, 0, r * 0.38);
        headGrad.addColorStop(0, '#dd7744');
        headGrad.addColorStop(1, '#663318');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, 0, r * 0.38, r * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Compound insect eyes — angular, wide coverage
        const eyePulse = 0.7 + 0.3 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255, 180, 0, ${eyePulse})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 6 * eyePulse;
        ctx.beginPath(); ctx.ellipse(-r * 0.52, -r * 0.15, r * 0.14, r * 0.09, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-r * 0.52, r * 0.15, r * 0.14, r * 0.09, 0.4, 0, Math.PI * 2); ctx.fill();
        // Facet grid lines
        ctx.strokeStyle = 'rgba(80, 40, 0, 0.5)';
        ctx.lineWidth = 0.5;
        ctx.shadowBlur = 0;
        for (let f = -2; f <= 2; f++) {
            ctx.beginPath();
            ctx.moveTo(-r * 0.52 + f * r * 0.025, -r * 0.22);
            ctx.lineTo(-r * 0.52 + f * r * 0.025, -r * 0.08);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.52 + f * r * 0.025, r * 0.08);
            ctx.lineTo(-r * 0.52 + f * r * 0.025, r * 0.22);
            ctx.stroke();
        }

        // Mandibles — pinching
        ctx.strokeStyle = '#aa5522';
        ctx.lineWidth = 3;
        const mWave = Math.sin(t * 4) * 0.12;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.08);
        ctx.quadraticCurveTo(-r * 0.85, -r * 0.2 - mWave * r, -r * 0.8, -r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, r * 0.08);
        ctx.quadraticCurveTo(-r * 0.85, r * 0.2 + mWave * r, -r * 0.8, r * 0.3);
        ctx.stroke();
    }

    _drawFireflyBoss(ctx, r, t, color, pulse) {
        // Giant queen firefly — pulsing bioluminescence, wings, swarm aura
        const glow = 0.5 + 0.5 * Math.sin(t * 4);

        // Aura of light
        ctx.fillStyle = `rgba(220, 255, 0, ${0.08 * glow})`;
        ctx.shadowColor = '#ddff00';
        ctx.shadowBlur = 30 * glow;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Wings — large, translucent, fluttering
        const wingAngle = Math.sin(t * 12) * 0.4;
        ctx.fillStyle = `rgba(200, 255, 50, ${0.15 + 0.1 * glow})`;
        ctx.shadowBlur = 8;
        ctx.save(); ctx.rotate(-wingAngle);
        ctx.beginPath(); ctx.ellipse(0, -r * 0.3, r * 0.9, r * 0.35, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.rotate(wingAngle);
        ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.9, r * 0.35, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Body
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#3a3a10';
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();

        // Glowing abdomen
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.3);
        abdGrad.addColorStop(0, `rgba(255, 255, 50, ${0.8 * glow})`);
        abdGrad.addColorStop(1, `rgba(150, 200, 0, ${0.3 * glow})`);
        ctx.fillStyle = abdGrad;
        ctx.shadowColor = '#ddff00';
        ctx.shadowBlur = 15 * glow;
        ctx.beginPath(); ctx.ellipse(r * 0.15, 0, r * 0.3, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();

        // Compound eye band — insect, no face
        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(180, 220, 0, ${0.3 * glow})`;
        ctx.beginPath();
        ctx.ellipse(-r * 0.28, 0, r * 0.05, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawJellyfishBoss(ctx, r, t, color, pulse) {
        // Giant jellyfish — dome bell, long tentacles, ethereal glow

        // Tentacles — long, flowing
        ctx.lineCap = 'round';
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 0.9 + Math.PI * 0.55;
            const w1 = Math.sin(t * 2 + i * 0.8) * 0.3;
            const w2 = Math.sin(t * 1.5 + i * 1.2) * 0.25;
            const len1 = r * 1.3;
            const len2 = r * (2.0 + 0.3 * Math.sin(t + i));
            const mx = Math.cos(angle + w1) * len1;
            const my = Math.sin(angle + w1) * len1;
            const ex = Math.cos(angle + w1 + w2) * len2;
            const ey = Math.sin(angle + w1 + w2) * len2;
            ctx.strokeStyle = `hsla(320, 70%, 60%, ${0.4 + 0.2 * pulse})`;
            ctx.lineWidth = 3 - i * 0.2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * r * 0.4, Math.sin(angle) * r * 0.4);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();
        }

        // Bell dome
        const bellGrad = ctx.createRadialGradient(0, -r * 0.1, 0, 0, 0, r * 0.6);
        bellGrad.addColorStop(0, `hsla(320, 80%, 75%, ${0.6 + 0.2 * pulse})`);
        bellGrad.addColorStop(0.5, `hsla(320, 60%, 45%, 0.4)`);
        bellGrad.addColorStop(1, `hsla(320, 50%, 25%, 0.15)`);
        ctx.fillStyle = bellGrad;
        ctx.shadowColor = '#ff66cc';
        ctx.shadowBlur = 12 * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, Math.PI, 0);
        ctx.quadraticCurveTo(r * 0.55, r * 0.25, r * 0.3, r * 0.3);
        ctx.lineTo(-r * 0.3, r * 0.3);
        ctx.quadraticCurveTo(-r * 0.55, r * 0.25, -r * 0.55, 0);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = `hsla(330, 100%, 70%, ${0.3 * pulse})`;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
    }

    _drawGhostBoss(ctx, r, t, color, pulse) {
        // Giant wraith — translucent, wispy, hollow eyes

        // Wispy trails
        const alphaBase = 0.3 + 0.3 * Math.sin(t * 1.5);
        ctx.globalAlpha = alphaBase * 0.4;
        ctx.fillStyle = '#8844cc';
        for (let i = 0; i < 5; i++) {
            const tx = r * 0.3 + i * r * 0.2;
            const ty = Math.sin(t * 2 + i) * r * 0.25;
            const tLen = r * (0.5 + 0.3 * Math.sin(t * 1.5 + i));
            ctx.beginPath();
            ctx.moveTo(tx, ty - r * 0.1);
            ctx.quadraticCurveTo(tx + tLen * 0.5, ty + r * 0.15, tx + tLen, ty + r * 0.3);
            ctx.quadraticCurveTo(tx + tLen * 0.5, ty - r * 0.1, tx, ty + r * 0.1);
            ctx.fill();
        }

        // Main body — ghostly blob
        ctx.globalAlpha = alphaBase;
        const bodyGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.7);
        bodyGrad.addColorStop(0, 'rgba(200, 150, 255, 0.7)');
        bodyGrad.addColorStop(0.5, 'rgba(120, 70, 200, 0.4)');
        bodyGrad.addColorStop(1, 'rgba(60, 30, 120, 0.1)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.65, Math.PI, 0);
        ctx.quadraticCurveTo(r * 0.65, r * 0.4, r * 0.25, r * 0.5);
        ctx.quadraticCurveTo(0, r * 0.7, -r * 0.25, r * 0.5);
        ctx.quadraticCurveTo(-r * 0.65, r * 0.4, -r * 0.65, 0);
        ctx.fill();

        // Void eyes — absorb light, no whites
        ctx.globalAlpha = alphaBase + 0.4;
        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#6600cc';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.12, r * 0.14, r * 0.19, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.12, -r * 0.12, r * 0.14, r * 0.19, 0.15, 0, Math.PI * 2); ctx.fill();
        // Purple glow around void edges
        ctx.strokeStyle = `rgba(160, 60, 255, ${alphaBase + 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.12, r * 0.14, r * 0.19, -0.15, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(r * 0.12, -r * 0.12, r * 0.14, r * 0.19, 0.15, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    _drawChameleonBoss(ctx, r, t, color, pulse) {
        // Giant chameleon — color-shifting, curled tail, rotating eyes
        const hue = (t * 40) % 360;
        const bodyColor = `hsl(${hue}, 50%, 30%)`;
        const spotColor = `hsl(${(hue + 120) % 360}, 70%, 45%)`;

        // Curled tail
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        const tailCurl = Math.sin(t * 2) * 0.2;
        ctx.beginPath();
        ctx.moveTo(r * 0.4, 0);
        ctx.quadraticCurveTo(r * 0.9, r * 0.2, r * 1.2, -r * 0.1 + tailCurl * r);
        ctx.quadraticCurveTo(r * 1.4, -r * 0.5, r * 1.1, -r * 0.6 + tailCurl * r);
        ctx.quadraticCurveTo(r * 0.8, -r * 0.5, r * 0.9, -r * 0.3);
        ctx.stroke();

        // Legs — stubby
        ctx.lineWidth = 4;
        const legWave = Math.sin(t * 5) * 0.15;
        ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.3); ctx.lineTo(-r * 0.4, -r * 0.65 - legWave * r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.4, r * 0.65 + legWave * r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.15, -r * 0.3); ctx.lineTo(r * 0.3, -r * 0.6 + legWave * r); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(r * 0.15, r * 0.3); ctx.lineTo(r * 0.3, r * 0.6 - legWave * r); ctx.stroke();

        // Body
        const bGrad = ctx.createRadialGradient(-r * 0.1, 0, 0, 0, 0, r * 0.55);
        bGrad.addColorStop(0, `hsl(${hue}, 40%, 40%)`);
        bGrad.addColorStop(1, `hsl(${hue}, 50%, 18%)`);
        ctx.fillStyle = bGrad;
        ctx.shadowColor = `hsl(${hue}, 60%, 40%)`;
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();

        // Head
        ctx.fillStyle = `hsl(${hue}, 45%, 35%)`;
        ctx.beginPath(); ctx.ellipse(-r * 0.45, 0, r * 0.3, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-r * 0.7, 0, r * 0.15, r * 0.13, 0, 0, Math.PI * 2); ctx.fill();

        // Color spots
        ctx.fillStyle = spotColor;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.1, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.13, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.25, r * 0.05, r * 0.05, 0, Math.PI * 2); ctx.fill();

        // Eyes — large, independent rotation
        const eye1Angle = Math.sin(t * 1.5) * 0.6;
        const eye2Angle = Math.sin(t * 2.1 + 1) * 0.6;
        ctx.fillStyle = `hsl(55, 100%, 55%)`;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.5, r * 0.15, r * 0.1, 0, Math.PI * 2); ctx.fill();
        // Slit pupils
        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.save(); ctx.translate(-r * 0.5, -r * 0.15); ctx.rotate(eye1Angle);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.02, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(-r * 0.5, r * 0.15); ctx.rotate(eye2Angle);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.02, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    _drawSpiderBoss(ctx, r, t, color, pulse) {
        // Giant spider boss — 6 legs per side, bulbous body, many eyes
        const legCount = 6;

        // Legs — long, animated
        ctx.strokeStyle = '#44aa11';
        ctx.shadowColor = '#66ff22';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < legCount; i++) {
                const phase = i * 0.7 + (side > 0 ? Math.PI * 0.3 : 0);
                const wave = Math.sin(t * 5 + phase) * 0.25;
                const baseAngle = side * 0.5 + (i - legCount / 2 + 0.5) * 0.3;
                const jx = Math.cos(baseAngle + wave) * r * 0.8;
                const jy = Math.sin(baseAngle + wave) * r * 0.7 * side;
                const tx = Math.cos(baseAngle + wave + side * 0.35) * r * 1.5;
                const ty = Math.sin(baseAngle + wave + side * 0.35) * r * 1.2 * side;
                ctx.beginPath();
                ctx.moveTo(0, side * r * 0.1);
                ctx.lineTo(jx, jy);
                ctx.lineTo(tx, ty);
                ctx.stroke();
            }
        }

        // Abdomen (rear, large)
        ctx.shadowBlur = 0;
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.6);
        abdGrad.addColorStop(0, '#3a5510');
        abdGrad.addColorStop(0.6, '#1a2a08');
        abdGrad.addColorStop(1, '#0a1000');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.2, 0, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Toxic markings
        ctx.fillStyle = `rgba(100, 200, 30, ${0.3 + 0.2 * pulse})`;
        ctx.beginPath(); ctx.ellipse(r * 0.3, -r * 0.1, r * 0.15, r * 0.1, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.15, r * 0.1, r * 0.08, -0.3, 0, Math.PI * 2); ctx.fill();

        // Head/thorax (front)
        const headGrad = ctx.createRadialGradient(-r * 0.35, 0, 0, -r * 0.35, 0, r * 0.4);
        headGrad.addColorStop(0, '#2a3a0a');
        headGrad.addColorStop(1, '#0a1200');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, 0, r * 0.4, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Multiple eyes — 8 glowing red
        const eyeGlow = 0.6 + 0.4 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(255, 0, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 8 * eyeGlow;
        const eyes = [
            [-r * 0.55, -r * 0.12, r * 0.06], [-r * 0.55, r * 0.12, r * 0.06],
            [-r * 0.5, -r * 0.22, r * 0.04], [-r * 0.5, r * 0.22, r * 0.04],
            [-r * 0.6, -r * 0.05, r * 0.04], [-r * 0.6, r * 0.05, r * 0.04],
            [-r * 0.45, -r * 0.18, r * 0.03], [-r * 0.45, r * 0.18, r * 0.03],
        ];
        for (const [ex, ey, er] of eyes) {
            ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
        }

        // Mandibles
        ctx.strokeStyle = '#88aa22';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 3;
        const mWave = Math.sin(t * 3) * 0.15;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.08);
        ctx.quadraticCurveTo(-r * 0.85, -r * 0.25 - mWave * r, -r * 0.75, -r * 0.35);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, r * 0.08);
        ctx.quadraticCurveTo(-r * 0.85, r * 0.25 + mWave * r, -r * 0.75, r * 0.35);
        ctx.stroke();
    }

    _drawOctopusBoss(ctx, r, t, color, pulse) {
        // Giant octopus boss — tentacles and bulbous head
        const tentCount = 8;
        ctx.lineCap = 'round';

        // Tentacles
        for (let i = 0; i < tentCount; i++) {
            const angle = (i / tentCount) * Math.PI * 1.6 + Math.PI * 0.2;
            const w1 = Math.sin(t * 2 + i * 1.0) * 0.35;
            const w2 = Math.sin(t * 1.8 + i * 0.6) * 0.25;
            const sx = Math.cos(angle) * r * 0.5;
            const sy = Math.sin(angle) * r * 0.5;
            const mx = Math.cos(angle + w1) * r * 1.2;
            const my = Math.sin(angle + w1) * r * 1.1;
            const ex = Math.cos(angle + w1 + w2) * r * 1.8;
            const ey = Math.sin(angle + w1 + w2) * r * 1.5;
            ctx.strokeStyle = `hsla(275, 50%, ${30 + i * 3}%, 0.7)`;
            ctx.lineWidth = 5 - i * 0.3;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();
        }

        // Head dome
        const hGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.65);
        hGrad.addColorStop(0, '#cc66ff');
        hGrad.addColorStop(0.5, '#7722bb');
        hGrad.addColorStop(1, '#330066');
        ctx.fillStyle = hGrad;
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.1, r * 0.6, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bioluminescent spots
        ctx.fillStyle = `rgba(200, 150, 255, ${0.4 * pulse})`;
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(r * 0.15, -r * 0.15, r * 0.06, 0, Math.PI * 2); ctx.fill();

        // Alien cephalopod eyes — dark iris, no whites
        ctx.fillStyle = 'hsla(275, 80%, 15%, 0.95)';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.ellipse(-r * 0.2, -r * 0.05, r * 0.14, r * 0.1, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.05, r * 0.14, r * 0.1, 0.1, 0, Math.PI * 2); ctx.fill();
        // W-shaped pupils (real octopus anatomy)
        ctx.strokeStyle = `rgba(200, 150, 255, ${0.4 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r * 0.27, -r * 0.05); ctx.lineTo(-r * 0.22, r * 0.02);
        ctx.lineTo(-r * 0.18, -r * 0.05); ctx.lineTo(-r * 0.14, r * 0.02);
        ctx.lineTo(-r * 0.09, -r * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.08, -r * 0.05); ctx.lineTo(r * 0.12, r * 0.02);
        ctx.lineTo(r * 0.16, -r * 0.05); ctx.lineTo(r * 0.2, r * 0.02);
        ctx.lineTo(r * 0.24, -r * 0.05);
        ctx.stroke();
    }

    _drawDevilBoss(ctx, r, t, color, pulse) {
        // Devil/demon boss — horns, fire, menacing
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);

        // Fire aura
        ctx.fillStyle = `rgba(255, 40, 0, ${0.15 * fireFlicker})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 20 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // Horns — large
        ctx.strokeStyle = '#aa1100';
        ctx.fillStyle = '#661100';
        ctx.shadowBlur = 6;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.2, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.5, -r * 1.4, -r * 0.05, -r * 1.2);
        ctx.lineTo(-r * 0.1, -r * 0.5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.2, -r * 0.5);
        ctx.quadraticCurveTo(r * 0.5, -r * 1.4, r * 0.05, -r * 1.2);
        ctx.lineTo(r * 0.1, -r * 0.5);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        // Head — dark red sphere
        const headGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.7);
        headGrad.addColorStop(0, '#881100');
        headGrad.addColorStop(0.6, '#440808');
        headGrad.addColorStop(1, '#220000');
        ctx.fillStyle = headGrad;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 10 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Menacing eyes — large, asymmetric, tilted
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 15 * eyeGlow;
        ctx.save();
        ctx.translate(-r * 0.25, -r * 0.18);
        ctx.rotate(-0.35);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(r * 0.18, -r * 0.12);
        ctx.rotate(0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.18, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Vertical slit pupils
        ctx.fillStyle = '#200000';
        ctx.shadowBlur = 0;
        ctx.save(); ctx.translate(-r * 0.25, -r * 0.18); ctx.rotate(-0.35);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.03, r * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(r * 0.18, -r * 0.12); ctx.rotate(0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.025, r * 0.07, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        // Jagged mouth
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.7 + 0.3 * fireFlicker})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, r * 0.15);
        for (let i = 0; i < 6; i++) {
            const mx = -r * 0.3 + (i + 0.5) * (r * 0.6 / 6);
            const my = r * 0.15 + (i % 2 === 0 ? r * 0.12 : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.3, r * 0.15);
        ctx.stroke();
    }

    _drawDefaultBoss(ctx, r, t, color, pulse) {
        // --- Engine glow (rear) ---
        const engineFlicker = 0.7 + 0.3 * Math.sin(t * 15);
        ctx.fillStyle = `rgba(100, 150, 255, ${0.4 * engineFlicker})`;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 14 * engineFlicker;
        ctx.beginPath();
        ctx.moveTo(r * 0.6, -r * 0.25);
        ctx.lineTo(r * 0.6 + 20 * engineFlicker, 0);
        ctx.lineTo(r * 0.6, r * 0.25);
        ctx.closePath();
        ctx.fill();
        // Second engine
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.5);
        ctx.lineTo(r * 0.5 + 14 * engineFlicker, -r * 0.35);
        ctx.lineTo(r * 0.5, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.5, r * 0.2);
        ctx.lineTo(r * 0.5 + 14 * engineFlicker, r * 0.35);
        ctx.lineTo(r * 0.5, r * 0.5);
        ctx.closePath();
        ctx.fill();

        // --- Rotating shield segments (decorative) ---
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 3);
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2;
        const shieldSegments = 6;
        for (let i = 0; i < shieldSegments; i++) {
            const segAngle = this.shieldRotation + (i / shieldSegments) * Math.PI * 2;
            const arcStart = segAngle;
            const arcEnd = segAngle + 0.4;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.15, arcStart, arcEnd);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // --- Ship body — large imposing hull ---
        // Outer hull gradient
        const hullGrad = ctx.createRadialGradient(-r * 0.1, 0, r * 0.1, 0, 0, r);
        hullGrad.addColorStop(0, this.lightenColor(color, 40));
        hullGrad.addColorStop(0.5, this.darkenColor(color, 30));
        hullGrad.addColorStop(1, this.darkenColor(color, 70));
        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        // Main body shape — aggressive angular ship
        ctx.beginPath();
        ctx.moveTo(-r * 0.9, 0);             // nose
        ctx.lineTo(-r * 0.5, -r * 0.35);     // upper nose edge
        ctx.lineTo(-r * 0.1, -r * 0.55);     // upper wing root
        ctx.lineTo(r * 0.4, -r * 0.7);       // upper wing tip
        ctx.lineTo(r * 0.5, -r * 0.45);      // upper wing trailing
        ctx.lineTo(r * 0.25, -r * 0.3);      // hull recess upper
        ctx.lineTo(r * 0.45, 0);             // rear center
        ctx.lineTo(r * 0.25, r * 0.3);       // hull recess lower
        ctx.lineTo(r * 0.5, r * 0.45);       // lower wing trailing
        ctx.lineTo(r * 0.4, r * 0.7);        // lower wing tip
        ctx.lineTo(-r * 0.1, r * 0.55);      // lower wing root
        ctx.lineTo(-r * 0.5, r * 0.35);      // lower nose edge
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner hull detail lines
        ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, 0);
        ctx.lineTo(r * 0.2, -r * 0.25);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, 0);
        ctx.lineTo(r * 0.2, r * 0.25);
        ctx.stroke();

        // --- Pulsing energy core (center) ---
        const coreR = r * (0.15 + 0.05 * pulse);
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR * 2);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, color);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15 * pulse;
        ctx.beginPath();
        ctx.arc(-r * 0.15, 0, coreR * 2, 0, Math.PI * 2);
        ctx.fill();
        // Bright inner core
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8 * pulse;
        ctx.beginPath();
        ctx.arc(-r * 0.15, 0, coreR * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // --- Weapon ports (front) ---
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(-r * 0.75, -r * 0.08, r * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-r * 0.75, r * 0.08, r * 0.04, 0, Math.PI * 2);
        ctx.fill();

    }

    // Helper: darken a hex/named color by mixing toward black
    darkenColor(hexColor, amount) {
        // Parse common hex colors; fallback for named colors
        const rgb = this.parseColor(hexColor);
        const factor = (100 - amount) / 100;
        const r = Math.floor(rgb.r * factor);
        const g = Math.floor(rgb.g * factor);
        const b = Math.floor(rgb.b * factor);
        return `rgb(${r},${g},${b})`;
    }

    // Helper: lighten a hex color by mixing toward white
    lightenColor(hexColor, amount) {
        const rgb = this.parseColor(hexColor);
        const factor = amount / 100;
        const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
        const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
        const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));
        return `rgb(${r},${g},${b})`;
    }

    // Parse hex color string to {r, g, b}
    parseColor(hex) {
        if (hex.charAt(0) === '#') {
            const bigint = parseInt(hex.slice(1), 16);
            return {
                r: (bigint >> 16) & 255,
                g: (bigint >> 8) & 255,
                b: bigint & 255
            };
        }
        // Fallback for non-hex
        return { r: 180, g: 50, b: 50 };
    }
}

// ============================================================
// EnemySpawner — Manages waves with difficulty scaling
// ============================================================
// Phase definitions — each phase has a featured enemy and a score threshold
