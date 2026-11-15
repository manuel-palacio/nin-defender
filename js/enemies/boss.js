import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { drawBossPortrait } from './boss-art.js'
import { TAU, light } from './creature-art.js'

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

// Three fight archetypes cycle through the tiers so consecutive bosses never
// play the same. Each one has a tell and a counter the player can learn.
export const BOSS_BEHAVIORS = {
    CHARGER:   { hint: 'CHARGES ACROSS THE SCREEN — STAY OFF ITS LINE' },
    SUMMONER:  { hint: 'SHIELDED BY ITS BROOD — KILL THE MINIONS FIRST' },
    WEAKPOINT: { hint: 'ARMORED — STRIKE WHEN THE CORE OPENS' },
};
const BEHAVIOR_BY_TYPE = ['CHARGER', 'SUMMONER', 'WEAKPOINT', 'CHARGER', 'SUMMONER',
                          'WEAKPOINT', 'CHARGER', 'SUMMONER', 'WEAKPOINT', 'WEAKPOINT'];
const MINION_BY_TYPE = ['asteroid', 'ship', 'drone', 'mine', 'spider', 'ghost',
                        'bomber', 'stealth', 'devil', 'devil'];

const CHARGE_INTERVAL = 6.0;
const CHARGE_WINDUP = 0.9;
const CHARGE_SPEED = 900;
const CHARGE_RETURN_SPEED = 260;
const SUMMON_INTERVAL = 7.0;
const SUMMON_SHIELD_DAMAGE_MUL = 0.3;
const CORE_CLOSED_DAMAGE_MUL = 0.2;
const CORE_OPEN_DURATION = 2.2;

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

        // Behaviour state
        this.behavior = BEHAVIOR_BY_TYPE[this.bossType];
        this.behaviorHint = BOSS_BEHAVIORS[this.behavior].hint;
        this.chargeTimer = CHARGE_INTERVAL * 0.6;
        this.chargeState = 'idle'; // idle | windup | dash | return
        this.summonTimer = SUMMON_INTERVAL * 0.4;
        this.summonRequest = null;  // minion type for Game to spawn this frame
        this.minions = [];
        this.coreOpen = false;
        this.coreTimer = 0;

        this.active = true;
    }

    // Armor: summoners are shielded while any brood lives; weak-point bosses
    // only take real damage while the core is open.
    takeDamage(amount) {
        return super.takeDamage(amount * this.damageMultiplier());
    }

    damageMultiplier() {
        if (this.behavior === 'SUMMONER' && this.hasLivingMinions()) return SUMMON_SHIELD_DAMAGE_MUL;
        if (this.behavior === 'WEAKPOINT' && !this.coreOpen) return CORE_CLOSED_DAMAGE_MUL;
        return 1;
    }

    hasLivingMinions() {
        this.minions = this.minions.filter(m => m.active);
        return this.minions.length > 0;
    }

    isCharging() {
        return this.chargeState === 'dash';
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

        if (this.arrived) this._updateBehavior(dt);

        // Cycle attack patterns once arrived (charging bosses hold fire mid-dash)
        if (this.arrived && !this.isCharging()) {
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

    _updateBehavior(dt) {
        switch (this.behavior) {
            case 'CHARGER':   this._updateCharge(dt); break;
            case 'SUMMONER':  this._updateSummon(dt); break;
            case 'WEAKPOINT': this._updateCore(dt);   break;
        }
    }

    _updateCharge(dt) {
        this.chargeTimer -= dt;
        switch (this.chargeState) {
            case 'idle':
                if (this.chargeTimer <= 0) { this.chargeState = 'windup'; this.chargeTimer = CHARGE_WINDUP; }
                break;
            case 'windup':
                this.x += Math.sin(this.time * 60) * 2; // shudder tell
                if (this.chargeTimer <= 0) this.chargeState = 'dash';
                break;
            case 'dash':
                this.x -= CHARGE_SPEED * dt;
                if (this.x <= this.radius + 20) this.chargeState = 'return';
                break;
            case 'return':
                this.x += CHARGE_RETURN_SPEED * dt;
                if (this.x >= this.stopX) { this.x = this.stopX; this.chargeState = 'idle'; this.chargeTimer = CHARGE_INTERVAL; }
                break;
        }
    }

    _updateSummon(dt) {
        this.summonTimer -= dt;
        if (this.summonTimer <= 0 && !this.hasLivingMinions()) {
            this.summonTimer = SUMMON_INTERVAL;
            this.summonRequest = MINION_BY_TYPE[this.bossType];
        }
    }

    _updateCore(dt) {
        this.coreTimer -= dt;
        if (this.coreTimer > 0) return;
        this.coreOpen = !this.coreOpen;
        // Late tiers keep the core open for less time and cycle faster.
        const speed = 1 - Math.min(0.4, this.bossType * 0.05);
        this.coreTimer = this.coreOpen ? CORE_OPEN_DURATION * speed : this.patternInterval * 1.5 * speed;
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

        ctx.save();
        ctx.translate(this.x, this.y);
        // A charger shudders while it winds up.
        if (this.behavior === 'CHARGER' && this.chargeState === 'windup') {
            ctx.translate(Math.sin(t * 70) * r * 0.05, Math.cos(t * 55) * r * 0.05);
        }
        drawBossPortrait(ctx, this);
        this._drawBehaviorOverlay(ctx, r, t);
        this._drawBossHealthBar(ctx, r);
        ctx.restore();
    }

    // The tell for each fight archetype, drawn over the portrait.
    _drawBehaviorOverlay(ctx, r, t) {
        ctx.save();
        if (this.behavior === 'CHARGER' && this.chargeState === 'windup') {
            const flash = 0.5 + 0.5 * Math.sin(t * 40);
            light(ctx, '#ff2a2a', 0, 0, r * 2.4, 0.35 * flash);
            ctx.strokeStyle = `rgba(255, 60, 60, ${0.4 + 0.6 * flash})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.25 + 6, 0, TAU);
            ctx.stroke();
        } else if (this.behavior === 'CHARGER' && this.chargeState === 'dash') {
            // Speed wake streaming behind the dash
            const wake = ctx.createLinearGradient(0, 0, r * 3.5, 0);
            wake.addColorStop(0, 'rgba(255, 110, 60, 0.4)');
            wake.addColorStop(1, 'rgba(255, 110, 60, 0)');
            ctx.fillStyle = wake;
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.8);
            ctx.lineTo(r * 3.5, 0);
            ctx.lineTo(0, r * 0.8);
            ctx.closePath();
            ctx.fill();
        } else if (this.behavior === 'SUMMONER' && this.hasLivingMinions()) {
            // Brood shield: a rotating dashed ward
            const pulse = 0.6 + 0.4 * Math.sin(t * 6);
            light(ctx, '#88ddff', 0, 0, r * 2.2, 0.18 * pulse);
            ctx.strokeStyle = `rgba(140, 225, 255, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.setLineDash([12, 9]);
            ctx.lineDashOffset = -t * 40;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.3 + 8, 0, TAU);
            ctx.stroke();
        } else if (this.behavior === 'WEAKPOINT') {
            this._drawCore(ctx, r * 0.28, t);
        }
        ctx.restore();
    }

    // Weak point: an armoured iris, shut most of the time, blazing when open.
    _drawCore(ctx, coreR, t) {
        if (this.coreOpen) {
            const pulse = 0.7 + 0.3 * Math.sin(t * 12);
            light(ctx, '#ffe9a8', 0, 0, coreR * 4.5, 0.8 * pulse);
            const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
            core.addColorStop(0, '#ffffff');
            core.addColorStop(0.55, '#fff2b0');
            core.addColorStop(1, this.color);
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(0, 0, coreR, 0, TAU);
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 225, 60, ${pulse})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([coreR * 0.5, coreR * 0.35]);
            ctx.lineDashOffset = t * 30;
            ctx.beginPath();
            ctx.arc(0, 0, coreR + 6 + 3 * Math.sin(t * 8), 0, TAU);
            ctx.stroke();
            return;
        }
        ctx.beginPath();
        ctx.arc(0, 0, coreR, 0, TAU);
        ctx.fillStyle = '#15131c';
        ctx.fill();
        ctx.strokeStyle = 'rgba(190, 190, 215, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Shutter blades
        ctx.strokeStyle = 'rgba(120, 120, 150, 0.9)';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * TAU + t * 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * coreR, Math.sin(a) * coreR);
            ctx.lineTo(Math.cos(a + 2.2) * coreR * 0.35, Math.sin(a + 2.2) * coreR * 0.35);
            ctx.stroke();
        }
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
}
