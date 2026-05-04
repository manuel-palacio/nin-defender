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
        // Giant facehugger — exposed ribcage, ovipositor tube + dropping eggs.
        const flesh = 'hsl(15, 70%, 18%)';
        const fleshDim = 'hsl(15, 60%, 10%)';
        const fleshHi = 'hsl(15, 50%, 30%)';

        ctx.strokeStyle = fleshDim;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 5; i++) {
                const phase = i * 0.7 + (side > 0 ? Math.PI * 0.4 : 0);
                const wave = Math.sin(t * 8 + phase) * 0.4;
                const baseX = (i - 2) * r * 0.30;
                const baseY = side * r * 0.20;
                const jX = baseX + Math.cos(wave) * r * 0.25;
                const jY = baseY + side * r * 0.40;
                const hX = jX + Math.cos(wave + side * 0.5) * r * 0.30;
                const hY = jY + side * (r * 0.28 + Math.abs(Math.sin(wave * 2)) * r * 0.06);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(jX, jY);
                ctx.lineTo(hX, hY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(hX, hY);
                ctx.lineTo(hX - r * 0.07, hY + side * r * 0.05);
                ctx.stroke();
            }
        }
        ctx.shadowBlur = 0;
        const bodyGrad = ctx.createLinearGradient(-r * 0.85, 0, r * 0.85, 0);
        bodyGrad.addColorStop(0, fleshDim);
        bodyGrad.addColorStop(0.5, flesh);
        bodyGrad.addColorStop(1, fleshDim);
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.95, r * 0.40, 0, 0, Math.PI * 2);
        ctx.fill();
        // Exposed ribcage (clearly visible bone)
        ctx.strokeStyle = 'rgba(220, 215, 200, 0.55)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 7; i++) {
            const rx = -r * 0.55 + i * r * 0.18;
            ctx.beginPath();
            ctx.moveTo(rx, -r * 0.18);
            ctx.lineTo(rx, r * 0.18);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200, 195, 180, 0.4)';
        ctx.beginPath(); ctx.moveTo(-r * 0.55, 0); ctx.lineTo(r * 0.55, 0); ctx.stroke();
        // Wound glow
        const woundPulse = 0.5 + 0.5 * Math.sin(t * 3);
        ctx.fillStyle = `hsla(200, 90%, 55%, ${0.35 + 0.45 * woundPulse})`;
        ctx.shadowColor = 'hsla(200, 90%, 55%, 1)';
        ctx.shadowBlur = 12 * woundPulse;
        ctx.beginPath();
        ctx.ellipse(r * 0.05, r * 0.25, r * 0.40, r * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Proboscises
        const probVib = Math.sin(t * 28) * r * 0.04;
        ctx.strokeStyle = fleshHi;
        ctx.lineWidth = 2;
        for (const offY of [-r * 0.10, r * 0.10]) {
            ctx.beginPath();
            ctx.moveTo(-r * 0.55, offY);
            ctx.quadraticCurveTo(-r * 0.85, offY * 1.6, -r * 1.10 + probVib, offY * 0.4);
            ctx.stroke();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(-r * 1.10 + probVib, offY * 0.4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        // Maw + teeth
        const mouthOpen = 0.5 + 0.5 * Math.sin(t * 8);
        const mouthW = r * 0.18;
        const mouthH = r * 0.06 + r * 0.12 * mouthOpen;
        ctx.fillStyle = '#100';
        ctx.beginPath();
        ctx.ellipse(-r * 0.62, 0, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        if (mouthOpen > 0.2) {
            ctx.fillStyle = '#ddd';
            for (let i = 0; i < 6; i++) {
                const tx = -r * 0.62 - mouthW + (i + 0.5) * (mouthW * 2 / 6);
                ctx.beginPath();
                ctx.moveTo(tx, -mouthH);
                ctx.lineTo(tx + mouthW * 0.10, -mouthH + r * 0.05);
                ctx.lineTo(tx - mouthW * 0.10, -mouthH + r * 0.05);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(tx, mouthH);
                ctx.lineTo(tx + mouthW * 0.10, mouthH - r * 0.05);
                ctx.lineTo(tx - mouthW * 0.10, mouthH - r * 0.05);
                ctx.closePath(); ctx.fill();
            }
        }
        // Ovipositor tube + dropping eggs
        const tubeWobble = Math.sin(t * 2.5) * r * 0.10;
        ctx.strokeStyle = fleshHi;
        ctx.lineWidth = r * 0.10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, r * 0.20);
        ctx.quadraticCurveTo(-r * 0.40, r * 0.65 + tubeWobble, -r * 0.30, r * 1.05);
        ctx.stroke();
        ctx.fillStyle = '#ddd6c0';
        ctx.shadowColor = '#88aabb';
        ctx.shadowBlur = 4;
        for (let e = 0; e < 4; e++) {
            const prog = ((t * 0.7 + e * 0.27) % 1.4);
            const along = Math.min(prog, 1.0);
            const ex = -r * 0.55 + (-r * 0.30 + r * 0.55) * along + tubeWobble * along * 0.6;
            const ey = r * 0.20 + (r * 1.05 - r * 0.20) * along + (prog > 1 ? (prog - 1) * r * 1.0 : 0);
            ctx.globalAlpha = prog > 1 ? Math.max(0, 1.4 - prog) : 1;
            ctx.beginPath();
            ctx.ellipse(ex, ey, r * 0.05, r * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        // Tiny eyes
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath(); ctx.arc(-r * 0.42, -r * 0.20, r * 0.04, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.42, r * 0.20, r * 0.04, 0, Math.PI * 2); ctx.fill();
    }

    _drawFireflyBoss(ctx, r, t, color, pulse) {
        // Giant eyeball cluster — 7 eyeballs orbiting a central pulsing mass.
        const corePulse = 0.7 + 0.3 * Math.sin(t * 3);
        // Central mass — fleshy pulsating sphere with veins
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.55);
        coreGrad.addColorStop(0, '#cc5566');
        coreGrad.addColorStop(0.6, '#882233');
        coreGrad.addColorStop(1, '#330011');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ff3344';
        ctx.shadowBlur = 18 * corePulse;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55 * (0.95 + 0.05 * corePulse), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Pulsing veins on the core
        ctx.strokeStyle = `rgba(180, 0, 0, ${0.5 + 0.3 * corePulse})`;
        ctx.lineWidth = 1.2;
        for (let v = 0; v < 8; v++) {
            const a = (v / 8) * Math.PI * 2 + t * 0.2;
            const sR = r * 0.20;
            const eR = r * 0.50;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * sR, Math.sin(a) * sR);
            ctx.quadraticCurveTo(
                Math.cos(a + 0.3) * eR * 0.9, Math.sin(a + 0.3) * eR * 0.9,
                Math.cos(a) * eR, Math.sin(a) * eR
            );
            ctx.stroke();
        }
        // 7 orbiting eyeballs around the core
        const eyeOrbitR = r * 0.85;
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + t * 0.6;
            const ex = Math.cos(a) * eyeOrbitR;
            const ey = Math.sin(a) * eyeOrbitR;
            const eR = r * 0.20;
            // Iris hue shifts per-eye for unsettling iridescence
            const eyeHue = (i * 51 + t * 30) % 360;
            // Sclera (off-white)
            ctx.fillStyle = '#e8e0d8';
            ctx.shadowColor = `hsl(${eyeHue}, 80%, 50%)`;
            ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(ex, ey, eR, 0, Math.PI * 2); ctx.fill();
            // Iris
            const irisGrad = ctx.createRadialGradient(ex, ey, 0, ex, ey, eR * 0.7);
            irisGrad.addColorStop(0, `hsl(${eyeHue}, 80%, 45%)`);
            irisGrad.addColorStop(1, `hsl(${eyeHue}, 90%, 25%)`);
            ctx.fillStyle = irisGrad;
            ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(ex, ey, eR * 0.65, 0, Math.PI * 2); ctx.fill();
            // Pupil — dilates/contracts on its own
            const pupilR = eR * (0.30 + 0.12 * Math.sin(t * 4 + i));
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(ex, ey, pupilR, 0, Math.PI * 2); ctx.fill();
            // Catch-light
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(ex - eR * 0.20, ey - eR * 0.20, eR * 0.10, 0, Math.PI * 2); ctx.fill();
            // Optic nerve trailing back to core
            ctx.strokeStyle = `rgba(120, 0, 30, 0.55)`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(ex - Math.cos(a) * eR, ey - Math.sin(a) * eR);
            const wob = Math.sin(t * 4 + i * 1.3) * r * 0.08;
            ctx.quadraticCurveTo(
                Math.cos(a) * (eyeOrbitR * 0.4) + wob,
                Math.sin(a) * (eyeOrbitR * 0.4) + wob,
                Math.cos(a) * (r * 0.55), Math.sin(a) * (r * 0.55)
            );
            ctx.stroke();
        }
    }

    _drawJellyfishBoss(ctx, r, t, color, pulse) {
        // Giant severed hand — fingers form a cage that closes when boss is at low HP.
        const hpFrac = this.hp / this.maxHp;
        // Cage progress: 0 = fingers splayed open, 1 = fingers fully clenched
        const cage = hpFrac < 0.4 ? Math.min(1, (0.4 - hpFrac) / 0.4) : 0;
        const fleshDark = 'hsl(130, 25%, 18%)';
        const fleshMid = 'hsl(130, 22%, 28%)';

        // 8 thick fingers, each with knuckle joints. Cage curls them inward.
        const fingerCount = 8;
        ctx.lineCap = 'round';
        for (let i = 0; i < fingerCount; i++) {
            const splay = ((i / (fingerCount - 1)) - 0.5) * Math.PI * 1.0;
            const baseAngle = Math.PI + splay;
            const phase = i * 1.4 + t * 1.5;
            const twitch = Math.sin(phase) * 0.15;
            // When cage closes, all fingers curl strongly inward
            const curl = cage * 0.9 + Math.sin(t * 6) * cage * 0.05;
            const ang = baseAngle + twitch + curl;

            const seg1 = r * 0.65;
            const k1x = Math.cos(ang) * seg1;
            const k1y = Math.sin(ang) * seg1;
            const seg2 = r * 0.50;
            const k2x = k1x + Math.cos(ang + 0.2 + curl * 0.6) * seg2;
            const k2y = k1y + Math.sin(ang + 0.2 + curl * 0.6) * seg2;
            const seg3 = r * 0.35;
            const tipX = k2x + Math.cos(ang + curl * 0.9) * seg3;
            const tipY = k2y + Math.sin(ang + curl * 0.9) * seg3;

            ctx.strokeStyle = fleshDark;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(k1x, k1y);
            ctx.lineTo(k2x, k2y);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            // Knuckle nodes
            ctx.fillStyle = fleshMid;
            ctx.beginPath(); ctx.arc(k1x, k1y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(k2x, k2y, 3.2, 0, Math.PI * 2); ctx.fill();
            // Bone-spike tip
            ctx.fillStyle = '#bfbfa8';
            const tipAngle = Math.atan2(tipY - k2y, tipX - k2x);
            const spikeLen = r * 0.13;
            ctx.beginPath();
            ctx.moveTo(tipX + Math.cos(tipAngle) * spikeLen, tipY + Math.sin(tipAngle) * spikeLen);
            ctx.lineTo(tipX + Math.cos(tipAngle + 1.6) * 2.5, tipY + Math.sin(tipAngle + 1.6) * 2.5);
            ctx.lineTo(tipX + Math.cos(tipAngle - 1.6) * 2.5, tipY + Math.sin(tipAngle - 1.6) * 2.5);
            ctx.closePath();
            ctx.fill();
        }
        // Palm
        const palmGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
        palmGrad.addColorStop(0, fleshMid);
        palmGrad.addColorStop(0.7, fleshDark);
        palmGrad.addColorStop(1, '#0e1812');
        ctx.fillStyle = palmGrad;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.65, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Sigil eye in palm — brighter when cage is closing
        const sigilColor = `rgba(180, 255, 120, ${0.4 + 0.4 * pulse + cage * 0.3})`;
        ctx.fillStyle = sigilColor;
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 10 * pulse + cage * 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.20, r * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a1a04';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.06, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(180, 255, 120, ${0.5 + 0.3 * pulse})`;
        ctx.lineWidth = 1.5;
        for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2 + t * 0.4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.15);
            ctx.lineTo(Math.cos(a) * r * 0.40, Math.sin(a) * r * 0.25);
            ctx.stroke();
        }
    }

    _drawGhostBoss(ctx, r, t, color, pulse) {
        // Giant skull — at <50% HP the jaw unhinges completely revealing void.
        const hpFrac = this.hp / this.maxHp;
        const phaseTwo = hpFrac < 0.5;
        const baseJawDrop = (Math.sin(t * 2) + 1) * 0.5; // 0..1
        const unhinge = phaseTwo ? Math.min(1, (0.5 - hpFrac) / 0.5) : 0;
        const jawDrop = baseJawDrop * (1 - unhinge) + unhinge;

        // Cranium — bumpy 14-point polygon
        ctx.fillStyle = 'rgba(220, 220, 215, 0.95)';
        ctx.shadowColor = '#88ccff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        const N = 14;
        for (let i = 0; i < N; i++) {
            const a = -Math.PI + (i / (N - 1)) * Math.PI;
            const wob = 0.94 + 0.06 * Math.sin(a * 5 + t);
            const px = Math.cos(a) * r * 0.85 * wob;
            const py = Math.sin(a) * r * 0.65 * wob - r * 0.15;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Cheekbones
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, r * 0.05); ctx.lineTo(-r * 0.45, r * 0.30); ctx.lineTo(-r * 0.30, r * 0.05); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.65, r * 0.05); ctx.lineTo(r * 0.45, r * 0.30); ctx.lineTo(r * 0.30, r * 0.05); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
        // Hollow eye sockets with intense blue-fire glow
        const eyeIntensity = 0.85 + 0.15 * Math.sin(t * 6);
        ctx.fillStyle = '#020812';
        ctx.beginPath(); ctx.ellipse(-r * 0.30, -r * 0.20, r * 0.18, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.30, -r * 0.20, r * 0.18, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        for (const ex of [-r * 0.30, r * 0.30]) {
            const g = ctx.createRadialGradient(ex, -r * 0.20, 0, ex, -r * 0.20, r * 0.18);
            g.addColorStop(0, `rgba(0, 180, 255, ${eyeIntensity})`);
            g.addColorStop(1, 'rgba(0, 180, 255, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(ex, -r * 0.20, r * 0.14, r * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Lower jaw with phase-2 unhinge — drops far below the skull
        const jawY = r * 0.22 + jawDrop * r * 0.50;
        ctx.fillStyle = 'rgba(220, 220, 215, 0.95)';
        ctx.beginPath();
        ctx.ellipse(0, jawY, r * 0.42, r * 0.20, 0, 0, Math.PI * 2);
        ctx.fill();
        // Mouth — voids open wide in phase 2
        const mouthW = r * 0.25;
        const mouthH = r * 0.13 + jawDrop * r * 0.18;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, jawY, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        // In phase 2: render the void inside the mouth as a dark blue swirl
        if (phaseTwo) {
            const voidGrad = ctx.createRadialGradient(0, jawY, 0, 0, jawY, mouthW);
            voidGrad.addColorStop(0, `rgba(0, 80, 160, ${0.6 * unhinge})`);
            voidGrad.addColorStop(0.6, `rgba(0, 30, 80, ${0.4 * unhinge})`);
            voidGrad.addColorStop(1, '#000');
            ctx.fillStyle = voidGrad;
            ctx.beginPath();
            ctx.ellipse(0, jawY, mouthW, mouthH, 0, 0, Math.PI * 2);
            ctx.fill();
            // Swirl lines
            ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 * unhinge})`;
            ctx.lineWidth = 1;
            for (let s = 0; s < 3; s++) {
                ctx.beginPath();
                ctx.arc(0, jawY, mouthW * (0.4 + s * 0.2), t * 2 + s, t * 2 + s + 1.5);
                ctx.stroke();
            }
        }
        // Teeth — 7 top + 7 bottom
        ctx.fillStyle = '#cccfc4';
        for (let i = 0; i < 7; i++) {
            const tx = -mouthW + (i + 0.5) * (mouthW * 2 / 7);
            ctx.beginPath();
            ctx.moveTo(tx, jawY - mouthH);
            ctx.lineTo(tx + r * 0.025, jawY - mouthH + r * 0.05);
            ctx.lineTo(tx - r * 0.025, jawY - mouthH + r * 0.05);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tx, jawY + mouthH);
            ctx.lineTo(tx + r * 0.025, jawY + mouthH - r * 0.05);
            ctx.lineTo(tx - r * 0.025, jawY + mouthH - r * 0.05);
            ctx.closePath(); ctx.fill();
        }
        // Nasal cavity
        ctx.fillStyle = '#0a0410';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.05);
        ctx.lineTo(-r * 0.07, r * 0.10);
        ctx.lineTo(r * 0.07, r * 0.10);
        ctx.closePath(); ctx.fill();
    }

    _drawChameleonBoss(ctx, r, t, color, pulse) {
        // Skeletal chameleon — at low HP skin fully disappears, only skeleton visible.
        const hpFrac = this.hp / this.maxHp;
        const fleshAlpha = Math.max(0, (hpFrac - 0.25) / 0.75); // fully fades by 25% HP
        const skeletonAlpha = 0.4 + (1 - fleshAlpha) * 0.6;
        // Tail
        ctx.lineCap = 'round';
        if (fleshAlpha > 0.05) {
            ctx.strokeStyle = `hsla(170, 55%, 28%, ${fleshAlpha})`;
            ctx.lineWidth = 4;
            const tailCurl = Math.sin(t * 3) * 0.3;
            ctx.beginPath();
            ctx.moveTo(r * 0.5, 0);
            ctx.quadraticCurveTo(r * 1.05, r * 0.15, r * 1.30, -r * 0.05 + tailCurl * r);
            ctx.quadraticCurveTo(r * 1.45, -r * 0.40 + tailCurl * r, r * 1.30, -r * 0.62 + tailCurl * r);
            ctx.stroke();
            // Tail spine glow
            ctx.fillStyle = `hsla(220, 100%, 70%, ${fleshAlpha})`;
            ctx.shadowColor = '#88aaff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(r * 1.30, -r * 0.62 + tailCurl * r, r * 0.07, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        // Body skin (fades out as HP drops)
        if (fleshAlpha > 0.05) {
            const bodyGrad = ctx.createRadialGradient(-r * 0.1, 0, 0, 0, 0, r * 0.7);
            bodyGrad.addColorStop(0, `hsla(170, 45%, 35%, ${fleshAlpha})`);
            bodyGrad.addColorStop(1, `hsla(170, 55%, 14%, ${fleshAlpha})`);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = `hsla(170, 50%, 32%, ${fleshAlpha})`;
            ctx.beginPath();
            ctx.ellipse(-r * 0.65, 0, r * 0.38, r * 0.20, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-r * 0.95, 0, r * 0.18, r * 0.12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Skeleton — always visible, alpha grows as flesh fades
        ctx.strokeStyle = `rgba(220, 220, 200, ${skeletonAlpha})`;
        ctx.lineWidth = 1.8;
        // Spine
        ctx.beginPath();
        ctx.moveTo(-r * 0.95, 0);
        ctx.lineTo(r * 0.5, 0);
        ctx.stroke();
        // Ribs (8 pairs)
        for (let i = 0; i < 8; i++) {
            const rx = -r * 0.50 + i * r * 0.13;
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.quadraticCurveTo(rx + r * 0.04, r * 0.10, rx + r * 0.02, r * 0.18);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(rx, 0);
            ctx.quadraticCurveTo(rx + r * 0.04, -r * 0.10, rx + r * 0.02, -r * 0.18);
            ctx.stroke();
        }
        // Skull on the head end
        ctx.fillStyle = `rgba(230, 230, 215, ${skeletonAlpha})`;
        ctx.beginPath();
        ctx.ellipse(-r * 0.70, 0, r * 0.20, r * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // Snout
        ctx.beginPath();
        ctx.ellipse(-r * 0.95, 0, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye sockets — hollow black with bright yellow inside
        ctx.fillStyle = `rgba(15, 5, 5, ${skeletonAlpha})`;
        ctx.beginPath(); ctx.arc(-r * 0.72, -r * 0.05, r * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.72, r * 0.05, r * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255, 240, 80, ${skeletonAlpha})`;
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(-r * 0.72, -r * 0.05, r * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.72, r * 0.05, r * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        // Leg bones (4 thin lines as femurs)
        for (const side of [-1, 1]) {
            const legWave = Math.sin(t * 8) * 0.15;
            ctx.beginPath();
            ctx.moveTo(-r * 0.30, side * r * 0.12);
            ctx.lineTo(-r * 0.45, side * (r * 0.40 + legWave * r));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(r * 0.20, side * r * 0.12);
            ctx.lineTo(r * 0.35, side * (r * 0.40 - legWave * r));
            ctx.stroke();
        }
    }

    _drawSpiderBoss(ctx, r, t, color, pulse) {
        // Giant face-spider — the screaming face fills the entire abdomen.
        // Dark legs, pale fleshy abdomen, the face is huge and detailed.
        ctx.strokeStyle = '#1a2010';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        // 5 legs per side, more menacing than the base
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 5; i++) {
                const freq = 8 * (1 + (i - 2) * 0.04);
                const phase = i * 0.7 + (side > 0 ? Math.PI : 0);
                const legWave = Math.sin(t * freq + phase) * 0.3;
                const baseAngle = (side * 0.6) + (i - 2) * 0.32;
                const j1x = Math.cos(baseAngle + legWave) * r * 0.75;
                const j1y = Math.sin(baseAngle + legWave) * r * 0.65 * side;
                const tipAngle = baseAngle + legWave * 1.5 + side * 0.4;
                const tipX = Math.cos(tipAngle) * r * 1.55;
                const tipY = Math.sin(tipAngle) * r * 1.20 * side;
                ctx.beginPath();
                ctx.moveTo(0, side * r * 0.18);
                ctx.lineTo(j1x, j1y);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }
        // Pale skin-toned abdomen — large
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.7);
        abdGrad.addColorStop(0, 'hsl(40, 18%, 80%)');
        abdGrad.addColorStop(0.6, 'hsl(38, 16%, 60%)');
        abdGrad.addColorStop(1, 'hsl(35, 14%, 36%)');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, r * 0.75, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        // ----- Huge stretched human face filling the abdomen -----
        const faceWobble = Math.sin(t * 0.8);
        const eyeSpacing = r * 0.30 * (1 + faceWobble * 0.06);
        const faceX = r * 0.15;
        // Eye sockets
        ctx.fillStyle = '#0a0506';
        ctx.beginPath();
        ctx.ellipse(faceX - eyeSpacing, -r * 0.18, r * 0.13, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(faceX + eyeSpacing, -r * 0.18, r * 0.13, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // Eye highlights (tiny white dot in each socket)
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        ctx.beginPath(); ctx.arc(faceX - eyeSpacing - r * 0.04, -r * 0.22, r * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(faceX + eyeSpacing - r * 0.04, -r * 0.22, r * 0.025, 0, Math.PI * 2); ctx.fill();
        // Screaming mouth — large, distorted by sin
        const mouthOpen = 1 + faceWobble * 0.20;
        const mouthW = r * 0.32;
        const mouthH = r * 0.22 * mouthOpen;
        ctx.fillStyle = '#0a0506';
        ctx.beginPath();
        ctx.ellipse(faceX, r * 0.18, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth (10 top + 10 bottom)
        ctx.fillStyle = '#ddd6c8';
        for (let i = 0; i < 10; i++) {
            const tx = faceX - mouthW + (i + 0.5) * (mouthW * 2 / 10);
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.18 - mouthH);
            ctx.lineTo(tx + r * 0.020, r * 0.18 - mouthH + r * 0.04);
            ctx.lineTo(tx - r * 0.020, r * 0.18 - mouthH + r * 0.04);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.18 + mouthH);
            ctx.lineTo(tx + r * 0.020, r * 0.18 + mouthH - r * 0.04);
            ctx.lineTo(tx - r * 0.020, r * 0.18 + mouthH - r * 0.04);
            ctx.closePath(); ctx.fill();
        }
        // Stretch lines from mouth corners
        ctx.strokeStyle = 'rgba(80, 60, 60, 0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(faceX - mouthW, r * 0.18);
        ctx.lineTo(faceX - mouthW * 1.6, r * 0.18 + r * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(faceX + mouthW, r * 0.18);
        ctx.lineTo(faceX + mouthW * 1.6, r * 0.18 + r * 0.06);
        ctx.stroke();
        // Tear-track lines from eye sockets (the face is crying)
        ctx.strokeStyle = 'rgba(60, 30, 30, 0.5)';
        ctx.lineWidth = 0.6;
        for (const ex of [faceX - eyeSpacing, faceX + eyeSpacing]) {
            ctx.beginPath();
            ctx.moveTo(ex, -r * 0.05);
            ctx.lineTo(ex - r * 0.03, r * 0.05);
            ctx.stroke();
        }
        // Thorax — slightly darker pale
        const thorGrad = ctx.createRadialGradient(-r * 0.45, 0, 0, -r * 0.45, 0, r * 0.40);
        thorGrad.addColorStop(0, 'hsl(35, 14%, 50%)');
        thorGrad.addColorStop(1, 'hsl(32, 12%, 28%)');
        ctx.fillStyle = thorGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.45, 0, r * 0.40, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        // 8 red eyes on the thorax (head end)
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255, 20, 20, ${eyeGlow})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 7 * eyeGlow;
        const cluster = [
            [-r * 0.60, -r * 0.08], [-r * 0.60,  r * 0.08],
            [-r * 0.55, -r * 0.16], [-r * 0.55,  r * 0.16],
            [-r * 0.68, -r * 0.13], [-r * 0.68,  r * 0.13],
            [-r * 0.50, -r * 0.04], [-r * 0.50,  r * 0.04],
        ];
        for (const [ex, ey] of cluster) {
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.045, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    _drawOctopusBoss(ctx, r, t, color, pulse) {
        // Gore octopus — beak ALWAYS visible and gnashing, ink stains all over,
        // both eyes dead/cloudy at low HP.
        const hpFrac = this.hp / this.maxHp;
        const lowHP = hpFrac < 0.4;
        // Tentacles
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 1.5 + Math.PI * 0.25;
            const wave1 = Math.sin(t * 3 + i * 1.2) * 0.3;
            const wave2 = Math.sin(t * 2.5 + i * 0.8) * 0.2;
            const startX = Math.cos(angle) * r * 0.55;
            const startY = Math.sin(angle) * r * 0.55;
            const midX = Math.cos(angle + wave1) * r * 1.20;
            const midY = Math.sin(angle + wave1) * r * 1.20;
            const endX = Math.cos(angle + wave1 + wave2) * r * 1.70;
            const endY = Math.sin(angle + wave1 + wave2) * r * 1.55;
            ctx.strokeStyle = `hsla(275, 50%, ${28 + i * 2}%, 0.9)`;
            ctx.lineWidth = 5 - i * 0.2;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
            // Hooked sucker tip
            ctx.strokeStyle = '#220033';
            ctx.lineWidth = 2;
            const hookAngle = Math.atan2(endY - midY, endX - midX);
            ctx.beginPath();
            ctx.arc(endX, endY, r * 0.07, hookAngle - 0.5, hookAngle + Math.PI * 0.6);
            ctx.stroke();
        }
        // Mantle — torn-edge polygon
        const mantleGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r * 0.7);
        mantleGrad.addColorStop(0, '#9944cc');
        mantleGrad.addColorStop(0.5, '#5e1a88');
        mantleGrad.addColorStop(1, '#2a0a44');
        ctx.fillStyle = mantleGrad;
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        const N = 16;
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 - Math.PI * 0.5;
            const tear = 0.85 + 0.15 * Math.sin(a * 5 + t * 0.7) - Math.abs(Math.sin(a * 4 + i)) * 0.10;
            const rx = Math.cos(a) * r * 0.75 * tear;
            const ry = Math.sin(a) * r * 0.65 * tear - r * 0.10;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Many ink stains across the body
        ctx.fillStyle = 'rgba(15, 0, 25, 0.6)';
        const stains = [
            [-r * 0.32, -r * 0.12, r * 0.16, r * 0.10],
            [ r * 0.12, -r * 0.32, r * 0.13, r * 0.09],
            [ r * 0.30,  r * 0.10, r * 0.10, r * 0.08],
            [-r * 0.05,  r * 0.18, r * 0.13, r * 0.07],
            [-r * 0.45,  r * 0.05, r * 0.08, r * 0.06],
            [ r * 0.40, -r * 0.05, r * 0.07, r * 0.05],
        ];
        for (const [sx, sy, sw, sh] of stains) {
            ctx.beginPath();
            ctx.ellipse(sx, sy, sw, sh, Math.sin(t + sx) * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        // Eyes — both dead/cloudy at low HP, otherwise one is dead one alive
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.ellipse(-r * 0.25, -r * 0.06, r * 0.20, r * 0.15, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(r * 0.20, -r * 0.06, r * 0.20, r * 0.15, 0.1, 0, Math.PI * 2); ctx.fill();
        // Always-cloudy left eye
        ctx.fillStyle = 'rgba(200, 200, 220, 0.92)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.06, r * 0.16, r * 0.12, -0.1, 0, Math.PI * 2);
        ctx.fill();
        if (lowHP) {
            // Both eyes cloudy at low HP
            ctx.beginPath();
            ctx.ellipse(r * 0.20, -r * 0.06, r * 0.16, r * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Right eye alive
            ctx.fillStyle = '#eeddff';
            ctx.beginPath();
            ctx.ellipse(r * 0.20, -r * 0.06, r * 0.16, r * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#110022';
            ctx.beginPath();
            ctx.ellipse(r * 0.20, -r * 0.04, r * 0.06, r * 0.10, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Beak — ALWAYS visible and gnashing (faster on low HP)
        const clackSpeed = lowHP ? 12 : 7;
        const clack = Math.sin(t * clackSpeed) * 0.20;
        ctx.fillStyle = '#0a0010';
        ctx.strokeStyle = '#332244';
        ctx.lineWidth = 1.5;
        const beakBaseY = r * 0.22;
        ctx.save(); ctx.translate(0, beakBaseY); ctx.rotate(clack);
        ctx.beginPath();
        ctx.moveTo(-r * 0.14, 0); ctx.lineTo(0, r * 0.18); ctx.lineTo(r * 0.05, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.translate(0, beakBaseY); ctx.rotate(-clack);
        ctx.beginPath();
        ctx.moveTo(r * 0.14, 0); ctx.lineTo(0, r * 0.18); ctx.lineTo(-r * 0.05, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    _drawDevilBoss(ctx, r, t, color, pulse) {
        // Body horror devil — at low HP cracks cover entire body glowing brightly.
        const hpFrac = this.hp / this.maxHp;
        const cracksIntensity = Math.max(0, 1 - hpFrac); // 0 at full HP, 1 at zero
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);
        // Embers from head
        ctx.fillStyle = `rgba(255, 180, 80, ${0.6 * fireFlicker})`;
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = 5;
        for (let i = 0; i < 6; i++) {
            const phase = i * 1.7 + t * 1.4;
            const ex = Math.sin(phase) * r * 0.40;
            const ey = -r * 1.10 - ((phase * 0.6) % 1) * r * 0.7;
            ctx.beginPath();
            ctx.arc(ex, ey, r * (0.025 + 0.02 * Math.sin(phase * 2)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        // Aura
        ctx.fillStyle = `rgba(255, 60, 0, ${0.18 * fireFlicker})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 18 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Spine ridge
        ctx.fillStyle = '#660800';
        ctx.strokeStyle = '#330400';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {
            const sx = -r * 0.50 + i * r * 0.17;
            const sh = r * (0.22 - Math.abs(i - 3) * 0.04);
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.07, -r * 0.62);
            ctx.lineTo(sx, -r * 0.62 - sh);
            ctx.lineTo(sx + r * 0.07, -r * 0.62);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        // Horns
        ctx.fillStyle = '#aa1100';
        ctx.strokeStyle = '#cc2200';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.30, -r * 0.55);
        ctx.quadraticCurveTo(-r * 0.65, -r * 1.40, -r * 0.18, -r * 1.20);
        ctx.lineTo(-r * 0.22, -r * 0.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.30, -r * 0.55);
        ctx.quadraticCurveTo(r * 0.65, -r * 1.40, r * 0.18, -r * 1.20);
        ctx.lineTo(r * 0.22, -r * 0.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Bone groove lines on horns
        ctx.strokeStyle = 'rgba(60, 0, 0, 0.7)';
        ctx.lineWidth = 0.7;
        for (const sign of [-1, 1]) {
            for (let g = 0; g < 3; g++) {
                ctx.beginPath();
                ctx.moveTo(sign * r * 0.27, -r * (0.70 + g * 0.18));
                ctx.lineTo(sign * r * 0.20, -r * (0.90 + g * 0.10));
                ctx.stroke();
            }
        }
        // Head body
        const headGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.85);
        headGrad.addColorStop(0, '#881100');
        headGrad.addColorStop(0.7, '#550808');
        headGrad.addColorStop(1, '#220000');
        ctx.fillStyle = headGrad;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 8 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.80, 0, Math.PI * 2);
        ctx.fill();
        // Many cracks — count grows with damage
        const crackCount = 4 + Math.floor(cracksIntensity * 12);
        ctx.strokeStyle = `rgba(255, 100, 0, ${(0.5 + 0.4 * cracksIntensity) * fireFlicker})`;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = (4 + 8 * cracksIntensity) * fireFlicker;
        ctx.lineWidth = 1.5;
        for (let c = 0; c < crackCount; c++) {
            // Pseudo-random but stable per-crack positions
            const seed = c * 1.371;
            const a1 = seed % (Math.PI * 2);
            const a2 = a1 + 0.5 + (seed * 0.7) % 1.5;
            const a3 = a2 + 0.4 + (seed * 0.4) % 1.0;
            const baseR = 0.15 + ((seed * 0.3) % 0.6);
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * r * baseR, Math.sin(a1) * r * baseR);
            ctx.lineTo(Math.cos(a2) * r * (baseR + 0.18), Math.sin(a2) * r * (baseR + 0.18));
            ctx.lineTo(Math.cos(a3) * r * (baseR + 0.30), Math.sin(a3) * r * (baseR + 0.30));
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        // Eyes
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 12 * eyeGlow;
        ctx.save(); ctx.translate(-r * 0.28, -r * 0.18); ctx.rotate(-0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.18, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(r * 0.22, -r * 0.18); ctx.rotate(0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.18, r * 0.10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Jagged grin
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 + 0.4 * fireFlicker})`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(-r * 0.40, r * 0.22);
        for (let i = 0; i < 7; i++) {
            const mx = -r * 0.40 + (i + 0.5) * (r * 0.80 / 7);
            const my = r * 0.22 + (i % 2 === 0 ? r * 0.16 : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.40, r * 0.22);
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
