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

        // Tuned so an un-upgraded blaster (~5.5 dps) needs ~3s of hits on the
        // first boss and ~20s on the last; a fully upgraded ship cuts that to
        // a fifth. The old table (10-65) let tier 1 die before it even arrived.
        const hpTable = [16, 22, 28, 36, 46, 56, 68, 80, 94, 110];
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

    // Bloated facehugger thorax — translucent breathing sac with dark organ
    // shadows visible through the membrane; ovipositor tube sways from the
    // mouth leaking pulsing egg sacs along the underside.
    _drawCritterBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 0.9);
        const breathScale = 1 + breath * 0.07;

        // Spindly limbs (asymmetric: left side hangs lower)
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'hsla(15, 35%, 12%, 0.95)';
        ctx.lineWidth = 4;
        for (let side = -1; side <= 1; side += 2) {
            const sideBias = side === -1 ? 1.10 : 0.94;
            for (let i = 0; i < 5; i++) {
                const phase = i * 0.7 + (side > 0 ? Math.PI * 0.4 : 0);
                const wave = Math.sin(t * (5 + i * 0.6) + phase) * 0.35;
                const baseX = (i - 2) * r * 0.30;
                const baseY = side * r * 0.18 * sideBias;
                const jX = baseX + Math.cos(wave) * r * 0.26;
                const jY = baseY + side * r * 0.40 * sideBias;
                const hX = jX + Math.cos(wave + side * 0.5) * r * 0.32;
                const hY = jY + side * (r * 0.30 + Math.abs(Math.sin(wave * 2)) * r * 0.08) * sideBias;
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(jX, jY);
                ctx.lineTo(hX, hY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(hX, hY);
                ctx.lineTo(hX - r * 0.08, hY + side * r * 0.06);
                ctx.stroke();
            }
        }

        // Translucent thorax — wet flesh base
        const thRX = r * 0.95 * breathScale;
        const thRY = r * 0.42 * (1 + breath * 0.10) * 0.96;
        ctx.fillStyle = 'rgba(80, 30, 30, 0.75)';
        ctx.beginPath();
        ctx.ellipse(r * 0.02, 0, thRX, thRY, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dark organ silhouettes visible through the skin
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#1a0608';
        const heartBeat = 1 + Math.sin(t * 2.2) * 0.18;
        ctx.beginPath();
        ctx.ellipse(-r * 0.18, -r * 0.06, r * 0.16 * heartBeat, r * 0.10 * heartBeat, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.22, r * 0.08, r * 0.20, r * 0.13, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a0a0a';
        ctx.lineWidth = r * 0.05;
        ctx.beginPath();
        ctx.moveTo(-r * 0.30, r * 0.10);
        ctx.quadraticCurveTo(0, r * 0.20, r * 0.30, r * 0.05);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Wet membrane sheen on top — radial gradient
        const memGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.18, 0, -r * 0.10, -r * 0.05, thRX * 0.9);
        memGrad.addColorStop(0, 'rgba(255, 200, 200, 0.32)');
        memGrad.addColorStop(0.5, 'rgba(140, 60, 60, 0.10)');
        memGrad.addColorStop(1, 'rgba(40, 10, 10, 0)');
        ctx.fillStyle = memGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.02, 0, thRX, thRY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Skin cracks at <50% HP — jagged tears with inner glow bleeding through
        if (decay > 0.5) {
            const tearAmt = (decay - 0.5) * 2;
            ctx.shadowColor = 'rgba(255,100,40,1)';
            ctx.shadowBlur = 9 * tearAmt;
            ctx.strokeStyle = `rgba(255, 90, 50, ${0.65 * tearAmt})`;
            ctx.lineWidth = 1.4;
            for (let c = 0; c < 4; c++) {
                const cx = (c - 1.5) * r * 0.30;
                const cy = (c % 2 === 0 ? -1 : 1) * r * 0.10;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                for (let s = 1; s <= 4; s++) {
                    const jag = Math.sin(c * 7 + s * 1.7) * r * 0.04;
                    ctx.lineTo(cx + s * r * 0.08, cy + jag);
                }
                ctx.stroke();
            }
            ctx.shadowBlur = 0;
        }

        // Tiny asymmetric eyes (right slightly off-axis)
        const blink = Math.sin(t * 3 + 0.4) > 0.92 ? 0.2 : 1;
        ctx.fillStyle = `rgba(255, 180, 30, ${blink})`;
        ctx.beginPath(); ctx.arc(-r * 0.42, -r * 0.21, r * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.40, r * 0.18, r * 0.038, 0, Math.PI * 2); ctx.fill();

        // Maw + teeth (uneven jitter per tooth)
        const mouthOpen = 0.5 + 0.5 * Math.sin(t * 4);
        const mouthW = r * 0.18;
        const mouthH = r * 0.06 + r * 0.14 * mouthOpen;
        ctx.fillStyle = '#0a0205';
        ctx.beginPath();
        ctx.ellipse(-r * 0.62, 0, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        if (mouthOpen > 0.25) {
            ctx.fillStyle = 'rgba(220, 210, 200, 0.9)';
            for (let i = 0; i < 6; i++) {
                const tx = -r * 0.62 - mouthW + (i + 0.5) * (mouthW * 2 / 6);
                const jit = Math.sin(i * 1.3 + t) * 0.6;
                ctx.beginPath();
                ctx.moveTo(tx, -mouthH);
                ctx.lineTo(tx + r * 0.012 + jit, -mouthH + r * 0.05);
                ctx.lineTo(tx - r * 0.012, -mouthH + r * 0.05);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(tx, mouthH);
                ctx.lineTo(tx + r * 0.012, mouthH - r * 0.05);
                ctx.lineTo(tx - r * 0.012 - jit, mouthH - r * 0.05);
                ctx.closePath(); ctx.fill();
            }
        }

        // Ovipositor tube — long quadratic curve from mouth, sways at own freq
        const sway = Math.sin(t * 1.6) * r * 0.20;
        const tubeStartX = -r * 0.58;
        const tubeStartY = mouthH * 0.6;
        const tubeMidX = -r * 0.50 + sway;
        const tubeMidY = r * 0.60;
        const tubeEndX = -r * 0.50 + sway * 0.4;
        const tubeEndY = r * 1.20;
        ctx.strokeStyle = 'hsla(15, 50%, 25%, 0.95)';
        ctx.lineWidth = r * 0.13;
        ctx.beginPath();
        ctx.moveTo(tubeStartX, tubeStartY);
        ctx.quadraticCurveTo(tubeMidX, tubeMidY, tubeEndX, tubeEndY);
        ctx.stroke();
        // Wet sheen on tube
        ctx.strokeStyle = 'rgba(220, 130, 110, 0.30)';
        ctx.lineWidth = r * 0.05;
        ctx.beginPath();
        ctx.moveTo(tubeStartX, tubeStartY - 1);
        ctx.quadraticCurveTo(tubeMidX - 1, tubeMidY - 1, tubeEndX - 1, tubeEndY - 1);
        ctx.stroke();

        // Three egg sacs on underside — independent pulsing phases
        const sacXs = [-r * 0.30, r * 0.05, r * 0.42];
        const sacPhases = [0, 1.7, 3.2];
        for (let i = 0; i < 3; i++) {
            const sacPulse = 1 + Math.sin(t * (2 + i * 0.6) + sacPhases[i]) * 0.20;
            const sx = sacXs[i] + Math.sin(t * 0.6 + i) * r * 0.02;
            const sy = r * 0.40 + Math.sin(t * 0.9 + i * 1.3) * r * 0.03;
            const sg = ctx.createRadialGradient(sx - r * 0.03, sy - r * 0.03, 0, sx, sy, r * 0.14 * sacPulse);
            sg.addColorStop(0, 'rgba(255, 200, 160, 0.85)');
            sg.addColorStop(0.6, 'rgba(160, 60, 50, 0.85)');
            sg.addColorStop(1, 'rgba(40, 10, 10, 0.95)');
            ctx.fillStyle = sg;
            ctx.beginPath();
            ctx.ellipse(sx, sy, r * 0.10 * sacPulse, r * 0.13 * sacPulse, 0, 0, Math.PI * 2);
            ctx.fill();
            // Embryo speck (asymmetric inside sac)
            ctx.fillStyle = 'rgba(20, 5, 5, 0.75)';
            ctx.beginPath();
            ctx.arc(sx + r * 0.012, sy + r * 0.022, r * 0.022 * sacPulse, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Pulsating meat colony — irregular fleshy bulb with seven eyes embedded
    // at varying depths (some half-buried, some on stalks), connected by dark
    // optic-nerve threads. At low HP, two eyes go cloudy and a glowing fissure
    // splits the bulb open.
    _drawFireflyBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 1.2);
        const bodyScale = 1 + breath * 0.08;

        ctx.save();
        ctx.rotate(t * 0.3);

        // Meat bulb — irregular blobby polygon (NOT a clean circle). Asymmetric.
        const N = 22;
        ctx.fillStyle = 'hsl(350, 35%, 18%)';
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2;
            const wob = 0.85 + 0.15 * Math.sin(a * 3 + t * 0.8) + Math.sin(a * 7 + t * 1.4) * 0.05;
            const rad = r * 0.65 * bodyScale * wob * (a > Math.PI ? 1.04 : 0.98);
            const x = Math.cos(a) * rad;
            const y = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        // Wet sheen — radial gradient overlay
        const sheen = ctx.createRadialGradient(-r * 0.18, -r * 0.22, 0, 0, 0, r * 0.65 * bodyScale);
        sheen.addColorStop(0, 'rgba(220, 100, 100, 0.55)');
        sheen.addColorStop(0.4, 'rgba(120, 30, 40, 0.30)');
        sheen.addColorStop(1, 'rgba(20, 0, 5, 0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.65 * bodyScale, r * 0.62 * bodyScale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Crawling subdermal veins
        ctx.strokeStyle = 'rgba(50, 0, 10, 0.6)';
        ctx.lineWidth = 1.2;
        for (let v = 0; v < 6; v++) {
            const a = (v / 6) * Math.PI * 2 + t * 0.15;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.10, Math.sin(a) * r * 0.10);
            ctx.quadraticCurveTo(
                Math.cos(a + 0.3) * r * 0.45, Math.sin(a + 0.3) * r * 0.45,
                Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55
            );
            ctx.stroke();
        }

        // Fissure split at low HP — bright inner glow bleeding out
        if (decay > 0.5) {
            const fa = (decay - 0.5) * 2;
            const fLen = r * 0.55 * fa;
            ctx.shadowColor = 'rgba(255, 200, 100, 1)';
            ctx.shadowBlur = 12 * fa;
            ctx.fillStyle = `rgba(255, 220, 120, ${0.85 * fa})`;
            ctx.beginPath();
            ctx.moveTo(-fLen, -r * 0.04);
            ctx.lineTo(-fLen * 0.5, -r * 0.10);
            ctx.lineTo(fLen * 0.4, -r * 0.05);
            ctx.lineTo(fLen, 0);
            ctx.lineTo(fLen * 0.4, r * 0.06);
            ctx.lineTo(-fLen * 0.5, r * 0.09);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // 7 eyes — depth varies (buried / surface / on stalks). Two go dead at low HP.
        const eyes = [
            { ang: 0.4, depth: 0.32, radial: 0.40, dead: false },
            { ang: 1.6, depth: 0.42, radial: 0.30, dead: false },
            { ang: 3.0, depth: 0.50, radial: 0.45, dead: true  },
            { ang: 4.2, depth: 0.65, radial: 0.55, dead: false },
            { ang: 5.5, depth: 0.65, radial: 0.50, dead: false },
            { ang: 0.9, depth: 0.95, radial: 0.78, dead: false },
            { ang: 2.5, depth: 0.92, radial: 0.72, dead: true  },
        ];

        // Optic nerves drawn first (behind eyes)
        ctx.strokeStyle = 'rgba(80, 0, 20, 0.55)';
        ctx.lineWidth = 1.4;
        const pairs = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,4]];
        for (const [a, b] of pairs) {
            const ea = eyes[a], eb = eyes[b];
            const ax = Math.cos(ea.ang) * r * ea.radial;
            const ay = Math.sin(ea.ang) * r * ea.radial;
            const bx = Math.cos(eb.ang) * r * eb.radial;
            const by = Math.sin(eb.ang) * r * eb.radial;
            const wob = Math.sin(t * 0.7 + a) * r * 0.04;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.quadraticCurveTo((ax + bx) / 2 + wob, (ay + by) / 2 + wob, bx, by);
            ctx.stroke();
        }

        for (let i = 0; i < eyes.length; i++) {
            const e = eyes[i];
            const ex = Math.cos(e.ang) * r * e.radial;
            const ey = Math.sin(e.ang) * r * e.radial;
            const isCloudy = decay > 0.5 && e.dead;
            const eR = r * 0.13 * (0.85 + 0.15 * e.depth);
            // Stalk for protruding eyes
            if (e.depth > 0.85) {
                ctx.strokeStyle = 'hsla(350, 40%, 14%, 0.95)';
                ctx.lineWidth = r * 0.06;
                const sx0 = Math.cos(e.ang) * r * 0.40;
                const sy0 = Math.sin(e.ang) * r * 0.40;
                const stalkWob = Math.sin(t * 1.5 + i) * r * 0.04;
                ctx.beginPath();
                ctx.moveTo(sx0, sy0);
                ctx.quadraticCurveTo(
                    (sx0 + ex) * 0.5 + stalkWob, (sy0 + ey) * 0.5,
                    ex, ey
                );
                ctx.stroke();
            }
            // Independent blink — mostly open with sharp blink spikes
            const blinkP = Math.sin(t * (1.5 + i * 0.7) + i * 1.3);
            const lid = Math.max(0, blinkP * blinkP * blinkP);
            const eyeOpen = 1 - lid * 0.85;
            // Sclera (wet)
            const sclera = ctx.createRadialGradient(ex - eR * 0.2, ey - eR * 0.2, 0, ex, ey, eR);
            sclera.addColorStop(0, isCloudy ? 'rgba(180, 180, 175, 0.95)' : 'rgba(240, 230, 210, 0.95)');
            sclera.addColorStop(1, isCloudy ? 'rgba(80, 80, 90, 0.95)' : 'rgba(120, 90, 80, 0.95)');
            ctx.fillStyle = sclera;
            ctx.beginPath();
            ctx.ellipse(ex, ey, eR, eR * eyeOpen, 0, 0, Math.PI * 2);
            ctx.fill();
            if (!isCloudy) {
                const irisHue = (i * 47 + t * 18) % 360;
                const irisG = ctx.createRadialGradient(ex, ey, 0, ex, ey, eR * 0.7);
                irisG.addColorStop(0, `hsl(${irisHue}, 70%, 45%)`);
                irisG.addColorStop(1, `hsl(${irisHue}, 80%, 18%)`);
                ctx.fillStyle = irisG;
                ctx.beginPath();
                ctx.ellipse(ex, ey, eR * 0.62, eR * 0.62 * eyeOpen, 0, 0, Math.PI * 2);
                ctx.fill();
                const pupR = eR * (0.25 + 0.10 * Math.sin(t * 3 + i));
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.ellipse(ex, ey, pupR, pupR * eyeOpen, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.beginPath();
                ctx.arc(ex - eR * 0.18, ey - eR * 0.20, eR * 0.10, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Dead milky eye with dark cataract cross
                ctx.strokeStyle = 'rgba(60, 60, 70, 0.6)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(ex - eR * 0.5, ey); ctx.lineTo(ex + eR * 0.5, ey);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(ex, ey - eR * 0.5); ctx.lineTo(ex, ey + eR * 0.5);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // Severed hand — ragged wrist stump trails exposed tendons across the
    // palm to the bases of seven unevenly curling fingers; the palm sigil eye
    // weeps a tear that falls under gravity. Two fingers go limp at low HP.
    _drawJellyfishBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 1.2);
        const palmScale = 1 + breath * 0.05;
        const fingerCount = 7;
        const limpFingers = decay > 0.5 ? new Set([1, 4]) : new Set();

        const stumpX = r * 0.55;

        // Trailing tendons retracting from severed wrist (drawn behind everything)
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(180, 80, 70, 0.65)';
        ctx.lineWidth = r * 0.035;
        for (let n = 0; n < 5; n++) {
            const ty = (n - 2) * r * 0.10;
            const sw = Math.sin(t * (2 + n * 0.4) + n) * r * 0.06;
            ctx.beginPath();
            ctx.moveTo(stumpX, ty * 0.4);
            ctx.quadraticCurveTo(
                stumpX + r * 0.20 + sw, ty * 1.2 + sw,
                stumpX + r * 0.50 + sw * 0.5, ty * (1.5 + decay * 0.5)
            );
            ctx.stroke();
        }

        // Wrist stump — torn, irregular polygon (not a clean cut)
        ctx.fillStyle = 'hsl(0, 35%, 12%)';
        ctx.beginPath();
        const tearN = 14;
        for (let i = 0; i < tearN; i++) {
            const ang = -Math.PI / 2 + (i / (tearN - 1)) * Math.PI;
            const tear = 1 + Math.sin(i * 1.7 + t * 0.3) * 0.18 + (i % 2 === 0 ? 0.05 : -0.05);
            const sx = stumpX + Math.cos(ang) * r * 0.22 * tear;
            const sy = Math.sin(ang) * r * 0.32 * tear;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.lineTo(stumpX - r * 0.05, r * 0.40);
        ctx.lineTo(stumpX - r * 0.05, -r * 0.40);
        ctx.closePath();
        ctx.fill();
        // Bone showing through stump
        ctx.fillStyle = 'rgba(220, 215, 200, 0.85)';
        ctx.beginPath();
        ctx.ellipse(stumpX + r * 0.05, 0, r * 0.06, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Exposed tendons across palm — visible from stump toward each finger.
        // More visible at low HP (more skin missing).
        const tendonAlpha = decay > 0.5 ? 0.85 : 0.55;
        ctx.strokeStyle = `rgba(220, 100, 90, ${tendonAlpha})`;
        ctx.lineWidth = r * (decay > 0.5 ? 0.022 : 0.016);
        const tendonAngs = [-1.05, -0.30, 0.05, 0.40, 1.10];
        for (let n = 0; n < tendonAngs.length; n++) {
            const a = Math.PI + tendonAngs[n];
            const fx = Math.cos(a) * r * 0.50;
            const fy = Math.sin(a) * r * 0.50;
            const wob = Math.sin(t * (2 + n * 0.5) + n * 1.4) * r * 0.03;
            ctx.beginPath();
            ctx.moveTo(stumpX, (n - 2) * r * 0.05);
            ctx.quadraticCurveTo(0 + wob, fy * 0.5 + wob, fx, fy);
            ctx.stroke();
        }

        // Fingers — splay at uneven angles, each with own curl frequency
        const fingerAngs = [-1.05, -0.65, -0.30, 0.05, 0.40, 0.75, 1.10];
        for (let i = 0; i < fingerCount; i++) {
            const baseAngle = Math.PI + fingerAngs[i];
            const limp = limpFingers.has(i);
            const curlFreq = 0.8 + i * 0.27;
            const curl = limp ? 1.4 : Math.sin(t * curlFreq + i * 0.9) * 0.25;
            const seg1L = r * (0.55 + (i === 3 ? 0.05 : 0));
            const seg2L = r * 0.40;
            const seg3L = r * 0.30;
            const ang1 = baseAngle + curl * 0.3;
            const ang2 = ang1 + 0.25 + curl * 0.4;
            const ang3 = ang2 + 0.30 + curl * 0.5;
            const k1x = Math.cos(ang1) * seg1L;
            const k1y = Math.sin(ang1) * seg1L;
            const k2x = k1x + Math.cos(ang2) * seg2L;
            const k2y = k1y + Math.sin(ang2) * seg2L;
            const tipX = k2x + Math.cos(ang3) * seg3L;
            const tipY = k2y + Math.sin(ang3) * seg3L;
            // Finger flesh — limp fingers desaturated
            ctx.strokeStyle = limp ? 'hsla(280, 12%, 22%, 0.95)' : 'hsl(15, 30%, 26%)';
            ctx.lineWidth = r * 0.13;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(k1x, k1y);
            ctx.lineTo(k2x, k2y);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();
            // Wet sheen highlight
            ctx.strokeStyle = limp ? 'rgba(180, 170, 180, 0.15)' : 'rgba(220, 160, 150, 0.30)';
            ctx.lineWidth = r * 0.05;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.02);
            ctx.lineTo(k1x, k1y - r * 0.02);
            ctx.lineTo(k2x, k2y - r * 0.02);
            ctx.lineTo(tipX, tipY - r * 0.02);
            ctx.stroke();
            // Knuckle nodules
            ctx.fillStyle = 'hsl(15, 30%, 14%)';
            ctx.beginPath(); ctx.arc(k1x, k1y, r * 0.05, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(k2x, k2y, r * 0.04, 0, Math.PI * 2); ctx.fill();
            // Yellowed fingernail
            const tipAng = Math.atan2(tipY - k2y, tipX - k2x);
            ctx.save();
            ctx.translate(tipX, tipY);
            ctx.rotate(tipAng);
            ctx.fillStyle = limp ? 'rgba(150, 140, 120, 0.7)' : 'rgba(200, 180, 140, 0.95)';
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.05);
            ctx.lineTo(r * 0.08, -r * 0.03);
            ctx.lineTo(r * 0.10, 0);
            ctx.lineTo(r * 0.07, r * 0.03);
            ctx.lineTo(0, r * 0.05);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Palm — wet membrane (radial gradient)
        const palmGrad = ctx.createRadialGradient(-r * 0.10, -r * 0.10, 0, 0, 0, r * 0.65 * palmScale);
        palmGrad.addColorStop(0, 'rgba(200, 130, 110, 0.95)');
        palmGrad.addColorStop(0.5, 'rgba(120, 60, 50, 0.95)');
        palmGrad.addColorStop(1, 'rgba(40, 15, 15, 0.95)');
        ctx.fillStyle = palmGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.62 * palmScale, r * 0.55 * palmScale * 0.97, 0, 0, Math.PI * 2);
        ctx.fill();
        // Crease lines
        ctx.strokeStyle = 'rgba(40, 10, 10, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.30, -r * 0.10);
        ctx.quadraticCurveTo(0, r * 0.05, r * 0.30, -r * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.25, r * 0.20);
        ctx.quadraticCurveTo(0, r * 0.30, r * 0.25, r * 0.25);
        ctx.stroke();

        // Palm sigil eye — blinks
        const blinkP = Math.sin(t * 1.3);
        const isBlinking = blinkP > 0.93;
        const eyeOpen = isBlinking ? 0.15 : 1;
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 10;
        ctx.fillStyle = `rgba(180, 255, 130, ${0.6 + 0.3 * Math.sin(t * 2)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.18, r * 0.10 * eyeOpen, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (eyeOpen > 0.3) {
            ctx.fillStyle = '#0a1a04';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(-r * 0.02, -r * 0.02, r * 0.015, 0, Math.PI * 2);
            ctx.fill();
        }

        // Tear drop — gravity-fed, recurring
        const tearPeriod = 3.0;
        const tearProg = (t % tearPeriod) / tearPeriod;
        if (tearProg < 0.7) {
            const tp = tearProg / 0.7;
            const tearY = r * 0.10 + tp * tp * r * 0.80;
            const tearX = Math.sin(tp * 6) * r * 0.02;
            ctx.fillStyle = 'rgba(160, 240, 120, 0.85)';
            ctx.beginPath();
            ctx.ellipse(tearX, tearY, r * 0.025, r * 0.040, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(240, 255, 220, 0.85)';
            ctx.beginPath();
            ctx.arc(tearX - r * 0.005, tearY - r * 0.012, r * 0.008, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Skull specter — torn tissue flaps cling unevenly to a cracked skull
    // leaking blue fire from its fissures; the lower jaw fully dislocates and
    // dangles. At low HP, tissue rips away to expose more bone and cracks.
    _drawGhostBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 1.2);
        const skullScale = 1 + breath * 0.04;

        // Tissue flaps clinging to skull — alpha decreases as HP drops
        const tissueAlpha = Math.max(0, hpFrac - 0.15) * 0.85;
        ctx.fillStyle = `rgba(80, 60, 70, ${tissueAlpha})`;
        const flaps = [
            { sx: -r * 0.85, sy: -r * 0.30, cx: -r * 1.10, cy:  r * 0.10, ex: -r * 0.40, ey:  r * 0.50, freq: 1.3 },
            { sx:  r * 0.70, sy: -r * 0.50, cx:  r * 1.20, cy: -r * 0.10, ex:  r * 0.50, ey:  r * 0.40, freq: 1.7 },
            { sx: -r * 0.20, sy: -r * 0.85, cx:  r * 0.20, cy: -r * 1.10, ex:  r * 0.40, ey: -r * 0.40, freq: 2.1 },
        ];
        for (const f of flaps) {
            const flick = Math.sin(t * f.freq) * r * 0.08;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(f.sx, f.sy, f.cx + flick, f.cy + flick * 0.5, f.ex, f.ey);
            ctx.lineTo(f.ex * 0.7, f.ey * 0.6);
            ctx.bezierCurveTo(f.cx * 0.6, f.cy * 0.6, f.sx * 0.4, f.sy * 0.5, 0, 0);
            ctx.closePath();
            ctx.fill();
        }
        // Stringy tissue strands fluttering off the flap edges
        ctx.strokeStyle = `rgba(140, 100, 110, ${tissueAlpha * 0.7})`;
        ctx.lineWidth = 1;
        for (const f of flaps) {
            const flick = Math.sin(t * f.freq + 0.5) * r * 0.05;
            ctx.beginPath();
            ctx.moveTo(f.ex, f.ey);
            ctx.quadraticCurveTo(f.ex * 1.2 + flick, f.ey * 1.2, f.ex * 1.4, f.ey * 1.5);
            ctx.stroke();
        }

        // Cranium — irregular asymmetric polygon (NOT a clean dome)
        ctx.shadowColor = 'rgba(80, 180, 255, 0.6)';
        ctx.shadowBlur = 10;
        const skullGrad = ctx.createRadialGradient(-r * 0.20, -r * 0.25, 0, 0, -r * 0.10, r * 0.85);
        skullGrad.addColorStop(0, 'rgba(245, 240, 230, 0.96)');
        skullGrad.addColorStop(0.7, 'rgba(200, 195, 180, 0.95)');
        skullGrad.addColorStop(1, 'rgba(120, 110, 100, 0.95)');
        ctx.fillStyle = skullGrad;
        ctx.beginPath();
        const N = 16;
        for (let i = 0; i < N; i++) {
            const a = -Math.PI + (i / (N - 1)) * Math.PI;
            const wob = 0.92 + 0.08 * Math.sin(a * 5 + t * 0.5) + (a > 0 ? 0.04 : -0.02);
            const px = Math.cos(a) * r * 0.85 * wob * skullScale;
            const py = Math.sin(a) * r * 0.65 * wob * skullScale - r * 0.15;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Asymmetric cheekbones (left fuller)
        ctx.fillStyle = 'rgba(245, 240, 230, 0.95)';
        ctx.beginPath();
        ctx.moveTo(-r * 0.65, r * 0.05); ctx.lineTo(-r * 0.42, r * 0.32); ctx.lineTo(-r * 0.28, r * 0.05);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r * 0.62, r * 0.02); ctx.lineTo(r * 0.48, r * 0.28); ctx.lineTo(r * 0.30, r * 0.04);
        ctx.closePath(); ctx.fill();

        // Cracks on cranium — count multiplies with damage
        const baseCracks = 4;
        const crackCount = baseCracks + Math.floor(decay * 8);
        ctx.strokeStyle = `rgba(60, 180, 255, ${0.5 + 0.4 * decay})`;
        ctx.lineWidth = 1.2;
        const crackOrigins = [];
        for (let c = 0; c < crackCount; c++) {
            const seed = c * 1.371;
            const a1 = (seed * 1.7) % (Math.PI * 2);
            const r1 = 0.20 + ((seed * 0.5) % 0.5);
            const x1 = Math.cos(a1) * r * r1;
            const y1 = Math.sin(a1) * r * r1 - r * 0.15;
            crackOrigins.push({ x: x1, y: y1, ang: a1, idx: c });
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            for (let s = 1; s <= 4; s++) {
                const aa = a1 + s * 0.3 + Math.sin(s + c) * 0.2;
                const rr = r1 + s * 0.05;
                const jag = (s % 2 === 0 ? -1 : 1) * r * 0.02;
                ctx.lineTo(Math.cos(aa) * r * rr + jag, Math.sin(aa) * r * rr - r * 0.15);
            }
            ctx.stroke();
        }
        // Blue fire leaks from a few cracks (single shadow pass for the lot)
        ctx.shadowColor = 'rgba(80, 180, 255, 1)';
        ctx.shadowBlur = 12;
        ctx.strokeStyle = `rgba(120, 220, 255, ${0.7 + 0.3 * Math.sin(t * 8)})`;
        ctx.lineWidth = 1.2;
        const leakCount = Math.min(3 + Math.floor(decay * 3), 6);
        for (let c = 0; c < leakCount && c < crackOrigins.length; c++) {
            const co = crackOrigins[c];
            const len = r * 0.20 * (0.7 + 0.3 * Math.sin(t * 4 + co.idx));
            ctx.beginPath();
            ctx.moveTo(co.x, co.y);
            ctx.quadraticCurveTo(
                co.x + Math.cos(co.ang) * len * 0.6 + Math.sin(t * 5 + co.idx) * r * 0.04,
                co.y + Math.sin(co.ang) * len * 0.6,
                co.x + Math.cos(co.ang) * len, co.y + Math.sin(co.ang) * len
            );
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Eye sockets — black void with cold blue flame
        const eyeI = 0.85 + 0.15 * Math.sin(t * 6);
        ctx.fillStyle = '#020812';
        ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.20, r * 0.18, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( r * 0.28, -r * 0.20, r * 0.16, r * 0.20, 0, 0, Math.PI * 2); ctx.fill();
        for (const [ex, ey, eRX, eRY] of [[-r * 0.32, -r * 0.20, r * 0.14, r * 0.17], [r * 0.28, -r * 0.20, r * 0.13, r * 0.15]]) {
            const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, eRY);
            g.addColorStop(0, `rgba(120, 220, 255, ${eyeI})`);
            g.addColorStop(0.6, `rgba(0, 100, 200, ${eyeI * 0.5})`);
            g.addColorStop(1, 'rgba(0, 100, 200, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(ex, ey, eRX, eRY, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nasal cavity (irregular triangle)
        ctx.fillStyle = '#0a0410';
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.05);
        ctx.lineTo(-r * 0.07 + Math.sin(t) * 0.5, r * 0.10);
        ctx.lineTo(r * 0.06, r * 0.10);
        ctx.closePath(); ctx.fill();

        // Upper teeth (still attached to skull)
        ctx.fillStyle = '#cccfc4';
        const upperJawY = r * 0.25;
        for (let i = 0; i < 8; i++) {
            const tx = -r * 0.28 + (i + 0.5) * (r * 0.56 / 8);
            const ht = r * 0.05 + Math.sin(i * 2.1) * r * 0.012;
            ctx.beginPath();
            ctx.moveTo(tx, upperJawY);
            ctx.lineTo(tx + r * 0.022, upperJawY + ht);
            ctx.lineTo(tx - r * 0.022, upperJawY + ht);
            ctx.closePath(); ctx.fill();
        }

        // Lower jaw — fully dislocated, drops well below normal at sin peak
        const jawSwing = (Math.sin(t * 1.5) + 1) * 0.5;
        const jawDrop = r * 0.22 + jawSwing * r * 0.65;
        const jawTilt = Math.sin(t * 0.7) * 0.15;
        ctx.save();
        ctx.translate(0, jawDrop);
        ctx.rotate(jawTilt);
        ctx.fillStyle = 'rgba(245, 240, 230, 0.95)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.45, r * 0.20 * 1.04, 0, 0, Math.PI * 2);
        ctx.fill();
        const mouthW = r * 0.28;
        const mouthH = r * 0.13 + jawSwing * r * 0.10;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cccfc4';
        for (let i = 0; i < 8; i++) {
            const tx = -mouthW + (i + 0.5) * (mouthW * 2 / 8);
            const ht = r * 0.05 + Math.sin(i * 1.7) * r * 0.012;
            ctx.beginPath();
            ctx.moveTo(tx, mouthH);
            ctx.lineTo(tx + r * 0.022, mouthH - ht);
            ctx.lineTo(tx - r * 0.022, mouthH - ht);
            ctx.closePath(); ctx.fill();
        }
        // Tendons stretching back to skull (visible because dislocated)
        ctx.strokeStyle = `rgba(200, 80, 90, ${tissueAlpha + 0.3})`;
        ctx.lineWidth = 1.5;
        for (const sx of [-r * 0.30, r * 0.30]) {
            const wob = Math.sin(t * 2 + sx) * r * 0.02;
            ctx.beginPath();
            ctx.moveTo(sx, -r * 0.10);
            ctx.lineTo(sx + wob, -r * 0.30);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Skeletal horror — paper-thin lizard body that periodically cloaks,
    // leaving two independent eye stalks tracking from empty space; the skull
    // is faintly visible beneath the skin and dominates as HP drops.
    _drawChameleonBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 1.2);
        const bodyScale = 1 + breath * 0.04;

        // Cloak cycle — periodic semi-invisibility (slow sin gate)
        const cloakRaw = Math.sin(t * 0.45 + 1.7);
        const cloakOn = Math.max(0, cloakRaw - 0.55) * (1 / 0.45);
        const fleshBase = Math.max(0, (hpFrac - 0.20) / 0.80);
        const fleshAlpha = fleshBase * (1 - cloakOn * 0.92);
        const skeletonAlpha = (0.4 + (1 - fleshBase) * 0.6) * (1 - cloakOn * 0.85);

        // Tail (curls on its own freq)
        const tailCurl = Math.sin(t * 2.7) * 0.3;
        ctx.lineCap = 'round';
        if (fleshAlpha > 0.05) {
            ctx.strokeStyle = `hsla(170, 55%, 28%, ${fleshAlpha})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(r * 0.5, 0);
            ctx.quadraticCurveTo(r * 1.05, r * 0.15 + tailCurl * r * 0.3, r * 1.30, -r * 0.05 + tailCurl * r);
            ctx.quadraticCurveTo(r * 1.45, -r * 0.40 + tailCurl * r, r * 1.30, -r * 0.62 + tailCurl * r);
            ctx.stroke();
        }

        // Body — extremely thin (0.65, 0.18 per spec), almost skeletal
        if (fleshAlpha > 0.05) {
            const bodyGrad = ctx.createRadialGradient(-r * 0.10, 0, 0, 0, 0, r * 0.65);
            bodyGrad.addColorStop(0, `hsla(170, 45%, 35%, ${fleshAlpha})`);
            bodyGrad.addColorStop(1, `hsla(170, 55%, 14%, ${fleshAlpha})`);
            ctx.fillStyle = bodyGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.65 * bodyScale, r * 0.18 * bodyScale, 0, 0, Math.PI * 2);
            ctx.fill();
            // Wet sheen on dorsal line
            ctx.fillStyle = `hsla(170, 30%, 60%, ${fleshAlpha * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(-r * 0.10, -r * 0.06, r * 0.50, r * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
            // Head + snout
            ctx.fillStyle = `hsla(170, 50%, 32%, ${fleshAlpha})`;
            ctx.beginPath();
            ctx.ellipse(-r * 0.65, 0, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-r * 0.92, 0, r * 0.16, r * 0.10, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Skeleton — visible always at low HP, fades during cloak
        if (skeletonAlpha > 0.05) {
            ctx.strokeStyle = `rgba(220, 220, 200, ${skeletonAlpha})`;
            ctx.lineWidth = 1.6;
            // Spine
            ctx.beginPath();
            ctx.moveTo(-r * 0.92, 0);
            ctx.lineTo(r * 0.55, 0);
            ctx.stroke();
            // Ribs — irregular spacing
            for (let i = 0; i < 10; i++) {
                const rx = -r * 0.55 + i * r * 0.11 + Math.sin(i * 2.1) * r * 0.01;
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.quadraticCurveTo(rx + r * 0.04, r * 0.10, rx + r * 0.02, r * 0.16);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(rx, 0);
                ctx.quadraticCurveTo(rx + r * 0.04, -r * 0.10, rx + r * 0.02, -r * 0.16);
                ctx.stroke();
            }
            // Skull — bone-shaped lines visible inside the head ellipse
            ctx.fillStyle = `rgba(230, 230, 215, ${skeletonAlpha})`;
            ctx.beginPath();
            ctx.ellipse(-r * 0.65, 0, r * 0.20, r * 0.13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(-r * 0.92, 0, r * 0.10, r * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = `rgba(180, 180, 160, ${skeletonAlpha * 0.6})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-r * 0.78, -r * 0.05); ctx.lineTo(-r * 0.55, -r * 0.05);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-r * 0.78, r * 0.05); ctx.lineTo(-r * 0.55, r * 0.05);
            ctx.stroke();
            // Leg bones — irregular sway
            for (const side of [-1, 1]) {
                const legWave = Math.sin(t * (5 + side * 2)) * 0.18;
                ctx.strokeStyle = `rgba(220, 220, 200, ${skeletonAlpha})`;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(-r * 0.30, side * r * 0.10);
                ctx.lineTo(-r * 0.45, side * (r * 0.32 + legWave * r));
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(r * 0.18, side * r * 0.10);
                ctx.lineTo(r * 0.32, side * (r * 0.32 - legWave * r));
                ctx.stroke();
            }
        }

        // Two independent eye STALKS — each at its own sin frequency.
        // Eyes always remain bright (visible even when cloaked).
        const stalkBaseX = -r * 0.62;
        const ang1 = Math.sin(t * 3.1) * 0.5;
        const ang2 = Math.sin(t * 2.3 + 1.7) * 0.5;
        const eye1X = stalkBaseX - r * 0.04 + Math.cos(ang1) * r * 0.18 * 0.3;
        const eye1Y = -r * 0.18 + ang1 * r * 0.20;
        const eye2X = stalkBaseX - r * 0.04 + Math.cos(ang2) * r * 0.16 * 0.3;
        const eye2Y =  r * 0.18 + ang2 * r * 0.20;

        if (cloakOn < 0.85) {
            const stalkA = (0.85 - cloakOn) * 1.0;
            ctx.strokeStyle = `rgba(60, 80, 60, ${stalkA})`;
            ctx.lineWidth = r * 0.04;
            ctx.beginPath();
            ctx.moveTo(stalkBaseX, -r * 0.06);
            ctx.lineTo(stalkBaseX - r * 0.02, -r * 0.10 + ang1 * r * 0.10);
            ctx.lineTo(eye1X, eye1Y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(stalkBaseX, r * 0.06);
            ctx.lineTo(stalkBaseX - r * 0.02, r * 0.10 + ang2 * r * 0.10);
            ctx.lineTo(eye2X, eye2Y);
            ctx.stroke();
        }

        // Eyes always visible
        ctx.fillStyle = '#0a0a02';
        ctx.beginPath(); ctx.arc(eye1X, eye1Y, r * 0.06, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eye2X, eye2Y, r * 0.05, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255, 240, 80, 1)';
        ctx.shadowColor = '#ffee00';
        ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(eye1X, eye1Y, r * 0.030, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(eye2X, eye2Y, r * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Tail spine bio-lure tip — also stays visible (one shadow pass)
        ctx.fillStyle = 'rgba(140, 200, 255, 0.95)';
        ctx.shadowColor = '#88aaff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(r * 1.30, -r * 0.62 + tailCurl * r, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Face-spider — pale stretched human face fills the abdomen with one
    // socket noticeably larger than the other; cheeks twitch, the mouth
    // tears wider as HP drops, and skin splits at the sides to expose the
    // skull beneath. Each leg dances on its own 6–14 Hz frequency.
    _drawSpiderBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const breath = Math.sin(t * 1.2);
        const bodyScale = 1 + breath * 0.05;

        // Legs — each leg has unique frequency between 6 and 14 Hz
        ctx.strokeStyle = '#0e1108';
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 5; i++) {
                const legIndex = (side > 0 ? 5 : 0) + i;
                const freq = 6 + legIndex * 0.83; // 6.0..13.5 Hz spread
                const phase = legIndex * 1.41;
                const legWave = Math.sin(t * freq + phase) * 0.30;
                const baseAngle = (side * 0.55) + (i - 2) * 0.30;
                const j1Angle = baseAngle + legWave * 0.6;
                const j1x = Math.cos(j1Angle) * r * 0.78;
                const j1y = Math.sin(j1Angle) * r * 0.65 * side;
                const j2Angle = baseAngle + legWave * 1.4 + side * 0.3;
                const j2x = Math.cos(j2Angle) * r * 1.20;
                const j2y = Math.sin(j2Angle) * r * 1.00 * side;
                const tipAngle = baseAngle + legWave * 1.7 + side * 0.45;
                const tipX = Math.cos(tipAngle) * r * 1.55;
                const tipY = Math.sin(tipAngle) * r * 1.25 * side;
                ctx.beginPath();
                ctx.moveTo(0, side * r * 0.18);
                ctx.lineTo(j1x, j1y);
                ctx.lineTo(j2x, j2y);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
                // Tarsal claw
                ctx.beginPath();
                ctx.moveTo(tipX, tipY);
                ctx.lineTo(tipX + Math.cos(tipAngle + side * 0.8) * r * 0.06,
                           tipY + Math.sin(tipAngle + side * 0.8) * r * 0.06 * side);
                ctx.stroke();
            }
        }

        // Pale abdomen — slightly asymmetric ellipse, breathing
        const abdRX = r * 0.78 * bodyScale;
        const abdRY = r * 0.55 * bodyScale * 1.02;
        const abdGrad = ctx.createRadialGradient(r * 0.10, -r * 0.08, 0, r * 0.15, 0, abdRX);
        abdGrad.addColorStop(0, 'hsl(40, 22%, 78%)');
        abdGrad.addColorStop(0.5, 'hsl(38, 20%, 56%)');
        abdGrad.addColorStop(1, 'hsl(35, 18%, 30%)');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, abdRX, abdRY, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wet sheen on top
        const sheen = ctx.createRadialGradient(0, -r * 0.30, 0, 0, -r * 0.30, abdRX);
        sheen.addColorStop(0, 'rgba(255, 240, 220, 0.30)');
        sheen.addColorStop(1, 'rgba(255, 240, 220, 0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, abdRX, abdRY, 0, 0, Math.PI * 2);
        ctx.fill();

        const faceX = r * 0.15;
        // Cheek twitch (sin displacement at unequal freqs)
        const cheekL = Math.sin(t * 11) * r * 0.015;
        const cheekR = Math.sin(t * 9 + 1.2) * r * 0.012;

        // Skin split at cheeks at <50% HP — exposed skull patches
        if (decay > 0.5) {
            const splitAmt = (decay - 0.5) * 2;
            ctx.fillStyle = `rgba(220, 215, 195, ${0.85 * splitAmt})`;
            ctx.beginPath();
            ctx.ellipse(faceX - r * 0.50, r * 0.10, r * 0.10 * splitAmt, r * 0.18 * splitAmt, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(faceX + r * 0.52, r * 0.05, r * 0.08 * splitAmt, r * 0.16 * splitAmt, 0.2, 0, Math.PI * 2);
            ctx.fill();
            // Jagged tear lines along the splits
            ctx.strokeStyle = `rgba(60, 20, 20, ${splitAmt})`;
            ctx.lineWidth = 1.2;
            for (const xs of [-1, 1]) {
                ctx.beginPath();
                const sx = faceX + xs * r * 0.45;
                ctx.moveTo(sx, -r * 0.30);
                for (let s = 1; s <= 6; s++) {
                    const jag = (s % 2 === 0 ? -1 : 1) * r * 0.025 * splitAmt;
                    ctx.lineTo(sx + jag, -r * 0.30 + s * r * 0.10);
                }
                ctx.stroke();
            }
        }

        // Eye sockets — LEFT larger than RIGHT (asymmetry)
        const leftSockX = faceX - r * 0.30 + cheekL;
        const leftSockY = -r * 0.18;
        const rightSockX = faceX + r * 0.28 + cheekR;
        const rightSockY = -r * 0.16;
        ctx.fillStyle = '#080306';
        ctx.beginPath();
        ctx.ellipse(leftSockX, leftSockY, r * 0.16, r * 0.21, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rightSockX, rightSockY, r * 0.11, r * 0.15, 0.03, 0, Math.PI * 2);
        ctx.fill();
        // Tiny pupils blinking on different freqs
        const blinkL = Math.sin(t * 1.7) > 0.92 ? 0.1 : 1;
        const blinkR = Math.sin(t * 2.1 + 0.8) > 0.92 ? 0.1 : 1;
        ctx.fillStyle = `rgba(255, 230, 220, ${0.55 * blinkL})`;
        ctx.beginPath(); ctx.arc(leftSockX - r * 0.04, leftSockY - r * 0.05, r * 0.025, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255, 230, 220, ${0.55 * blinkR})`;
        ctx.beginPath(); ctx.arc(rightSockX - r * 0.03, rightSockY - r * 0.04, r * 0.020, 0, Math.PI * 2); ctx.fill();
        // Tear streaks
        ctx.strokeStyle = 'rgba(60, 20, 25, 0.6)';
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(leftSockX, leftSockY + r * 0.18); ctx.lineTo(leftSockX - r * 0.02, leftSockY + r * 0.30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(rightSockX, rightSockY + r * 0.13); ctx.lineTo(rightSockX + r * 0.01, rightSockY + r * 0.28); ctx.stroke();

        // Mouth — tears WIDER as HP drops
        const mouthOpen = 0.5 + 0.5 * Math.sin(t * 4);
        const mouthW = r * (0.30 + decay * 0.10);
        const mouthH = r * (0.18 + decay * 0.18) * (0.7 + 0.4 * mouthOpen);
        ctx.fillStyle = '#080306';
        ctx.beginPath();
        ctx.ellipse(faceX, r * 0.20, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner blood-red glow inside the maw
        const mouthGlow = ctx.createRadialGradient(faceX, r * 0.20, 0, faceX, r * 0.20, mouthW);
        mouthGlow.addColorStop(0, `rgba(150, 20, 20, ${0.4 + 0.4 * decay})`);
        mouthGlow.addColorStop(1, 'rgba(150, 20, 20, 0)');
        ctx.fillStyle = mouthGlow;
        ctx.beginPath();
        ctx.ellipse(faceX, r * 0.20, mouthW * 0.7, mouthH * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Irregular jagged teeth
        ctx.fillStyle = '#dac8b8';
        for (let i = 0; i < 9; i++) {
            const tx = faceX - mouthW + (i + 0.5) * (mouthW * 2 / 9);
            const ht = r * (0.04 + Math.sin(i * 2.1) * 0.012);
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.20 - mouthH);
            ctx.lineTo(tx + r * 0.018, r * 0.20 - mouthH + ht);
            ctx.lineTo(tx - r * 0.018, r * 0.20 - mouthH + ht);
            ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(tx, r * 0.20 + mouthH);
            ctx.lineTo(tx + r * 0.018, r * 0.20 + mouthH - ht);
            ctx.lineTo(tx - r * 0.018, r * 0.20 + mouthH - ht);
            ctx.closePath(); ctx.fill();
        }
        // Mouth corner stretch lines (deeper at low HP)
        ctx.strokeStyle = `rgba(80, 50, 50, ${0.5 + decay * 0.3})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(faceX - mouthW, r * 0.20);
        ctx.lineTo(faceX - mouthW * (1.6 + decay * 0.5), r * 0.20 + r * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(faceX + mouthW, r * 0.20);
        ctx.lineTo(faceX + mouthW * (1.6 + decay * 0.5), r * 0.20 + r * 0.06);
        ctx.stroke();

        // Cephalothorax (head end) with the 8 red spider-eye cluster
        const thorGrad = ctx.createRadialGradient(-r * 0.50, 0, 0, -r * 0.45, 0, r * 0.40);
        thorGrad.addColorStop(0, 'hsl(35, 16%, 48%)');
        thorGrad.addColorStop(1, 'hsl(32, 14%, 26%)');
        ctx.fillStyle = thorGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.45, 0, r * 0.40, r * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 5);
        ctx.fillStyle = `rgba(255, 30, 30, ${eyeGlow})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 6 * eyeGlow;
        const cluster = [
            [-r * 0.62, -r * 0.08], [-r * 0.62,  r * 0.08],
            [-r * 0.55, -r * 0.16], [-r * 0.55,  r * 0.16],
            [-r * 0.70, -r * 0.13], [-r * 0.70,  r * 0.13],
            [-r * 0.50, -r * 0.04], [-r * 0.50,  r * 0.04],
        ];
        for (const [ex, ey] of cluster) {
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.045, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    // Gore octopus — torn ragged mantle leaking ink stains, one eye already
    // dead from the start. Tentacle tips bristle with hooked micro-suckers.
    // Beak gnashes constantly (6Hz, 10Hz at low HP); second eye bleeds red.
    _drawOctopusBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const lowHP = decay > 0.5;
        const breath = Math.sin(t * 1.2);
        const mantleScale = 1 + breath * 0.06;

        // 8 tentacles — each at independent freq, hooked suckers along tip
        ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 1.5 + Math.PI * 0.25 + Math.sin(t * 0.3 + i) * 0.08;
            const wave1 = Math.sin(t * (2.5 + i * 0.3) + i * 1.2) * 0.32;
            const wave2 = Math.sin(t * (1.8 + i * 0.2) + i * 0.8) * 0.22;
            const startX = Math.cos(angle) * r * 0.55;
            const startY = Math.sin(angle) * r * 0.55;
            const midX = Math.cos(angle + wave1) * r * 1.20;
            const midY = Math.sin(angle + wave1) * r * 1.20;
            const endX = Math.cos(angle + wave1 + wave2) * r * 1.70;
            const endY = Math.sin(angle + wave1 + wave2) * r * 1.55;
            ctx.strokeStyle = `hsla(275, 50%, ${28 + (i % 4) * 3}%, 0.92)`;
            ctx.lineWidth = (5 - i * 0.2) * (1 + breath * 0.05);
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
            // Wet sheen along tentacle
            ctx.strokeStyle = 'rgba(220, 180, 240, 0.18)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, startY - 1);
            ctx.quadraticCurveTo(midX, midY - 1, endX, endY - 1);
            ctx.stroke();
            // Hooked micro-suckers along tip
            const hookAngle = Math.atan2(endY - midY, endX - midX);
            for (let s = 0; s < 3; s++) {
                const along = 0.55 + s * 0.18;
                const sx = midX + (endX - midX) * along;
                const sy = midY + (endY - midY) * along;
                const sideOff = (s % 2 === 0 ? 1 : -1) * r * 0.04;
                const px = sx + Math.cos(hookAngle + Math.PI / 2) * sideOff;
                const py = sy + Math.sin(hookAngle + Math.PI / 2) * sideOff;
                ctx.fillStyle = '#220033';
                ctx.beginPath();
                ctx.arc(px, py, r * 0.035, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#aa88aa';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(px, py, r * 0.025, hookAngle - 0.5, hookAngle + Math.PI * 0.7);
                ctx.stroke();
            }
            // Final hook claw at tip
            ctx.strokeStyle = '#aa88aa';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(endX, endY, r * 0.05, hookAngle - 0.5, hookAngle + Math.PI * 0.6);
            ctx.stroke();
        }

        // Mantle — torn-edge irregular polygon (NOT a clean ellipse), asymmetric
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 8;
        const mantleGrad = ctx.createRadialGradient(-r * 0.10, -r * 0.20, 0, 0, 0, r * 0.75);
        mantleGrad.addColorStop(0, 'rgba(170, 80, 200, 0.95)');
        mantleGrad.addColorStop(0.5, 'rgba(94, 26, 136, 0.95)');
        mantleGrad.addColorStop(1, 'rgba(42, 10, 68, 0.95)');
        ctx.fillStyle = mantleGrad;
        const mN = 18;
        ctx.beginPath();
        for (let i = 0; i < mN; i++) {
            const a = (i / mN) * Math.PI * 2 - Math.PI * 0.5;
            // Multiple sin layers for organic raggedness, asymmetric
            const tear = 0.78
                + 0.18 * Math.sin(a * 5 + t * 0.7)
                + 0.10 * Math.sin(a * 11 + i * 1.3)
                - Math.abs(Math.sin(a * 4 + i)) * 0.08
                + (a > 0 ? 0.04 : 0);
            const rx = Math.cos(a) * r * 0.78 * mantleScale * tear;
            const ry = Math.sin(a) * r * 0.65 * mantleScale * tear * 1.02 - r * 0.10;
            if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // Wet sheen on mantle
        const sheen = ctx.createRadialGradient(-r * 0.20, -r * 0.30, 0, -r * 0.20, -r * 0.30, r * 0.50);
        sheen.addColorStop(0, 'rgba(255, 220, 255, 0.30)');
        sheen.addColorStop(1, 'rgba(255, 220, 255, 0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.ellipse(-r * 0.10, -r * 0.20, r * 0.45, r * 0.30, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Five irregular ink stains
        ctx.fillStyle = 'rgba(15, 0, 25, 0.7)';
        const stains = [
            { x: -r * 0.32, y: -r * 0.12, rx: r * 0.16, ry: r * 0.10, rot:  0.3 },
            { x:  r * 0.12, y: -r * 0.32, rx: r * 0.13, ry: r * 0.09, rot: -0.4 },
            { x:  r * 0.30, y:  r * 0.10, rx: r * 0.10, ry: r * 0.08, rot:  0.6 },
            { x: -r * 0.05, y:  r * 0.18, rx: r * 0.13, ry: r * 0.07, rot: -0.2 },
            { x: -r * 0.40, y:  r * 0.08, rx: r * 0.09, ry: r * 0.06, rot:  0.5 },
        ];
        for (const s of stains) {
            const wob = Math.sin(t * 0.5 + s.x) * 0.3;
            const segs = 10;
            ctx.beginPath();
            for (let k = 0; k < segs; k++) {
                const a = (k / segs) * Math.PI * 2;
                const irr = 1 + Math.sin(a * 3 + s.x) * 0.18;
                const px = s.x + Math.cos(a + s.rot + wob) * s.rx * irr;
                const py = s.y + Math.sin(a + s.rot + wob) * s.ry * irr;
                if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Left eye — ALWAYS dead/cloudy from the start
        ctx.fillStyle = '#1a0822';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.06, r * 0.21, r * 0.16, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(200, 200, 220, 0.9)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.06, r * 0.16, r * 0.12, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(80, 80, 100, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-r * 0.40, -r * 0.06); ctx.lineTo(-r * 0.10, -r * 0.06);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.25, -r * 0.18); ctx.lineTo(-r * 0.25, r * 0.06);
        ctx.stroke();

        // Right eye — alive at full HP, bleeding red at low HP
        ctx.fillStyle = '#1a0822';
        ctx.beginPath();
        ctx.ellipse(r * 0.20, -r * 0.06, r * 0.20, r * 0.15, 0.1, 0, Math.PI * 2);
        ctx.fill();
        if (lowHP) {
            const bloodPulse = 0.7 + 0.3 * Math.sin(t * 4);
            ctx.fillStyle = `rgba(180, 20, 20, ${bloodPulse})`;
            ctx.beginPath();
            ctx.ellipse(r * 0.20, -r * 0.06, r * 0.16, r * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(r * 0.20, -r * 0.04, r * 0.05, 0, Math.PI * 2);
            ctx.fill();
            // Blood tear running down
            const bloodFall = (t * 0.7) % 1.5;
            if (bloodFall < 1) {
                ctx.fillStyle = `rgba(150, 10, 10, ${0.85 - bloodFall * 0.4})`;
                ctx.beginPath();
                ctx.ellipse(r * 0.18, r * 0.08 + bloodFall * r * 0.5, r * 0.025, r * 0.05, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#eed6ff';
            ctx.beginPath();
            ctx.ellipse(r * 0.20, -r * 0.06, r * 0.16, r * 0.12, 0.1, 0, Math.PI * 2);
            ctx.fill();
            const pupilDilate = 0.85 + 0.15 * Math.sin(t * 3);
            ctx.fillStyle = '#110022';
            ctx.beginPath();
            ctx.ellipse(r * 0.20 + Math.sin(t * 0.8) * r * 0.02, -r * 0.04, r * 0.05, r * 0.10 * pupilDilate, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath();
            ctx.arc(r * 0.18, -r * 0.10, r * 0.025, 0, Math.PI * 2);
            ctx.fill();
        }

        // Beak — always visible, gnashing 6Hz / 10Hz at low HP
        const clackSpeed = lowHP ? 10 : 6;
        const clack = Math.sin(t * clackSpeed) * 0.22;
        const beakBaseY = r * 0.22;
        ctx.fillStyle = '#0a0010';
        ctx.strokeStyle = '#332244';
        ctx.lineWidth = 1.5;
        ctx.save(); ctx.translate(0, beakBaseY); ctx.rotate(clack);
        ctx.beginPath();
        ctx.moveTo(-r * 0.16, 0);
        ctx.quadraticCurveTo(-r * 0.06, r * 0.12, r * 0.02, r * 0.20);
        ctx.lineTo(r * 0.07, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        ctx.save(); ctx.translate(0, beakBaseY); ctx.rotate(-clack);
        ctx.beginPath();
        ctx.moveTo(r * 0.16, 0);
        ctx.quadraticCurveTo(r * 0.06, r * 0.12, -r * 0.02, r * 0.20);
        ctx.lineTo(-r * 0.07, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Saliva drool when beak gapes wide
        if (Math.abs(clack) > 0.18) {
            ctx.fillStyle = 'rgba(220, 200, 240, 0.55)';
            ctx.beginPath();
            ctx.ellipse(0, beakBaseY + r * 0.22, r * 0.015, r * 0.04, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Body horror devil — asymmetric horns crown an irregular fleshy head;
    // five spine ridges of varying heights, lava cracks pulsing across the
    // body. Drifting embers escape upward. At low HP, one horn snaps at the
    // midpoint and dangles, cracks engulf the body, lava glow intensifies.
    _drawDevilBoss(ctx, r, t, color, pulse) {
        const hpFrac = this.hp / this.maxHp;
        const decay = 1 - hpFrac;
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);
        const breath = Math.sin(t * 1.2);
        const bodyScale = 1 + breath * 0.05;
        const hornCracked = decay > 0.5;

        // Drifting embers — local modulo cycle, no canvasHeight reference
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(255, 180, 80, ${0.7 * fireFlicker})`;
        for (let i = 0; i < 4; i++) {
            const phaseOffset = i * 1.7;
            const phase = (t * (0.45 + i * 0.06) + phaseOffset) % 1.0;
            const ex = Math.sin(phaseOffset + t * 0.3) * r * 0.40;
            const ey = -r * 1.10 - phase * r * 1.2;
            ctx.beginPath();
            ctx.arc(ex, ey, r * (0.025 + 0.02 * Math.sin(phase * Math.PI)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Aura — radial gradient (no shadow)
        const auraGrad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.6);
        auraGrad.addColorStop(0, `rgba(255, 80, 0, ${0.30 * fireFlicker})`);
        auraGrad.addColorStop(0.6, `rgba(180, 30, 0, ${0.10 * fireFlicker})`);
        auraGrad.addColorStop(1, 'rgba(80, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Dorsal spine ridge — 5 triangular spines, varying heights
        ctx.fillStyle = '#440400';
        ctx.strokeStyle = '#220200';
        ctx.lineWidth = 1.2;
        const spineHeights = [0.18, 0.32, 0.42, 0.30, 0.20];
        for (let i = 0; i < 5; i++) {
            const sx = -r * 0.45 + i * r * 0.22;
            const sh = r * spineHeights[i] * (1 + Math.sin(t * 1.5 + i) * 0.05);
            const lean = Math.sin(t * 0.8 + i) * 0.04;
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.07, -r * 0.62);
            ctx.lineTo(sx + lean * r, -r * 0.62 - sh);
            ctx.lineTo(sx + r * 0.07, -r * 0.62);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }

        // Asymmetric horns — left longer + more curved than right
        ctx.fillStyle = '#aa1100';
        ctx.strokeStyle = '#cc2200';
        ctx.lineWidth = 2;
        if (!hornCracked) {
            // Intact left horn — long curve
            ctx.beginPath();
            ctx.moveTo(-r * 0.32, -r * 0.55);
            ctx.quadraticCurveTo(-r * 0.85, -r * 1.55, -r * 0.18, -r * 1.30);
            ctx.lineTo(-r * 0.22, -r * 0.55);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
            // Cracked horn — base half intact, top half bent and dangling
            ctx.beginPath();
            ctx.moveTo(-r * 0.32, -r * 0.55);
            ctx.quadraticCurveTo(-r * 0.50, -r * 0.95, -r * 0.36, -r * 1.05);
            ctx.lineTo(-r * 0.26, -r * 1.05);
            ctx.lineTo(-r * 0.22, -r * 0.55);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.save();
            ctx.translate(-r * 0.31, -r * 1.05);
            ctx.rotate(1.3 + Math.sin(t * 0.6) * 0.08);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-r * 0.18, -r * 0.20, -r * 0.04, -r * 0.45);
            ctx.lineTo(r * 0.06, -r * 0.42);
            ctx.lineTo(r * 0.06, 0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
            // Glowing magma at break point — radial gradient (no shadow)
            const breakG = ctx.createRadialGradient(-r * 0.31, -r * 1.05, 0, -r * 0.31, -r * 1.05, r * 0.10);
            breakG.addColorStop(0, `rgba(255, 220, 100, ${fireFlicker})`);
            breakG.addColorStop(0.5, `rgba(255, 100, 30, ${fireFlicker * 0.6})`);
            breakG.addColorStop(1, 'rgba(255, 50, 0, 0)');
            ctx.fillStyle = breakG;
            ctx.beginPath();
            ctx.arc(-r * 0.31, -r * 1.05, r * 0.10, 0, Math.PI * 2);
            ctx.fill();
        }
        // Right horn — shorter, less curved (asymmetric)
        ctx.fillStyle = '#aa1100';
        ctx.strokeStyle = '#cc2200';
        ctx.beginPath();
        ctx.moveTo(r * 0.30, -r * 0.55);
        ctx.quadraticCurveTo(r * 0.55, -r * 1.20, r * 0.18, -r * 1.05);
        ctx.lineTo(r * 0.22, -r * 0.55);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Bone groove lines on horns
        ctx.strokeStyle = 'rgba(60, 0, 0, 0.7)';
        ctx.lineWidth = 0.7;
        for (let g = 0; g < 3; g++) {
            ctx.beginPath();
            ctx.moveTo(-r * 0.27, -r * (0.70 + g * 0.18));
            ctx.lineTo(-r * 0.20, -r * (0.90 + g * 0.10));
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(r * 0.27, -r * (0.70 + g * 0.15));
            ctx.lineTo(r * 0.20, -r * (0.85 + g * 0.10));
            ctx.stroke();
        }

        // Head body — irregular polygon (NOT a clean circle), breathing
        const headR = r * 0.80 * bodyScale;
        const headGrad = ctx.createRadialGradient(-r * 0.10, -r * 0.10, 0, 0, 0, headR);
        headGrad.addColorStop(0, '#9a1300');
        headGrad.addColorStop(0.6, '#550808');
        headGrad.addColorStop(1, '#1a0000');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        const hN = 18;
        for (let i = 0; i < hN; i++) {
            const a = (i / hN) * Math.PI * 2;
            const wob = 0.94 + 0.06 * Math.sin(a * 5 + t * 0.6) + (a > Math.PI ? 0.03 : -0.02);
            const px = Math.cos(a) * headR * wob;
            const py = Math.sin(a) * headR * wob * 1.02;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Wet membrane sheen (gradient, no shadow)
        const sheen = ctx.createRadialGradient(-r * 0.25, -r * 0.30, 0, -r * 0.25, -r * 0.30, r * 0.50);
        sheen.addColorStop(0, 'rgba(255, 180, 100, 0.30)');
        sheen.addColorStop(1, 'rgba(255, 180, 100, 0)');
        ctx.fillStyle = sheen;
        ctx.beginPath();
        ctx.ellipse(-r * 0.20, -r * 0.25, r * 0.45, r * 0.30, 0, 0, Math.PI * 2);
        ctx.fill();

        // Lava cracks — 6 base, multiplying with HP loss; engulf body at low HP
        const crackCount = 6 + Math.floor(decay * 10);
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = (decay > 0.5 ? 12 : 6) * fireFlicker;
        ctx.lineWidth = 1.5;
        for (let c = 0; c < crackCount; c++) {
            const seed = c * 1.371;
            const a1 = seed % (Math.PI * 2);
            const baseR = 0.15 + ((seed * 0.3) % 0.55);
            const a2 = a1 + 0.4 + (seed * 0.7) % 1.4;
            const a3 = a2 + 0.35 + (seed * 0.4) % 1.0;
            const a4 = a3 + 0.30 + (seed * 0.2) % 0.8;
            const intensity = 0.5 + 0.4 * decay + 0.2 * Math.sin(t * 6 + c);
            ctx.strokeStyle = `rgba(255, 100, 0, ${intensity * fireFlicker})`;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * r * baseR, Math.sin(a1) * r * baseR);
            ctx.lineTo(Math.cos(a2) * r * (baseR + 0.16), Math.sin(a2) * r * (baseR + 0.16));
            ctx.lineTo(Math.cos(a3) * r * (baseR + 0.30), Math.sin(a3) * r * (baseR + 0.30));
            ctx.lineTo(Math.cos(a4) * r * (baseR + 0.42), Math.sin(a4) * r * (baseR + 0.42));
            ctx.stroke();
        }
        ctx.shadowBlur = 0;

        // Eyes — asymmetric (left larger), vertical-slit pupils
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.save(); ctx.translate(-r * 0.30, -r * 0.18); ctx.rotate(-0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.20, r * 0.11, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(r * 0.20, -r * 0.18); ctx.rotate(0.2);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.16, r * 0.09, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(-r * 0.30, -r * 0.18, r * 0.025, r * 0.08, -0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse( r * 0.20, -r * 0.18, r * 0.022, r * 0.07,  0.2, 0, Math.PI * 2); ctx.fill();

        // Jagged asymmetric grin
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 + 0.4 * fireFlicker})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.40, r * 0.22);
        for (let i = 0; i < 8; i++) {
            const mx = -r * 0.40 + (i + 0.5) * (r * 0.80 / 8);
            const my = r * 0.22 + (i % 2 === 0 ? r * (0.16 + Math.sin(i) * 0.02) : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.40, r * 0.22);
        ctx.stroke();
        // Drool from grin (intermittent)
        if (Math.sin(t * 0.8) > 0.4) {
            ctx.strokeStyle = 'rgba(120, 30, 30, 0.85)';
            ctx.lineWidth = r * 0.04;
            ctx.beginPath();
            ctx.moveTo(r * 0.05, r * 0.30);
            ctx.quadraticCurveTo(r * 0.10, r * 0.50, r * 0.02, r * 0.65);
            ctx.stroke();
        }
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
