// ============================================================
// ui.js — UIRenderer: HUD, menu, pause, game-over, wave-clear
// ============================================================
// All non-gameplay canvas drawing lives here. The renderer holds a
// direct reference to the Game instance and reads state from it; it
// also owns its own local caches (scan-line image, quote word layout)
// since those exist purely for rendering.

import { Utils } from './utils.js';
import { PHASES, BOSS_NAMES } from './enemies.js';
import { WEAPON_DEFS } from './weapons.js';
import { Schemas } from './schemas.js';
import {
    COLOR, display, mono, track, uiScale, panel, pips, meter, keycap,
    drawVignette, glitchTitle,
} from './theme.js';

const IS_TOUCH = typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

const POWERUP_READOUTS = [
    ['rapidFire',    'rapidFireTimer',    'RAPID FIRE',    '#ffd84a'],
    ['tripleShot',   'tripleShotTimer',   'TRIPLE SHOT',   '#35e07a'],
    ['shield',       'shieldTimer',       'SHIELD',        '#9fd8ff'],
    ['activeShield', 'activeShieldTimer', 'SHIELD ACTIVE', '#3fe0ff'],
    ['ricochet',     'ricochetTimer',     'RICOCHET',      '#ff8a1f'],
    ['wingman',      'wingmanTimer',      'WINGMAN',       '#5a9bff'],
    ['timeWarp',     'timeWarpTimer',     'TIME WARP',     '#00ddff'],
    ['laserBeam',    'laserBeamTimer',    'LASER BEAM',    '#ff2a7a'],
];

const SYNERGY_LABELS = {
    CHAIN_REACTION: 'CHAIN REACTION',
    FIRE_SUPPORT:   'FIRE SUPPORT',
    PIERCE_SHOT:    'PIERCE SHOT',
    PENTA_SPREAD:   'PENTA SPREAD',
    BOUNCE_DRONE:   'BOUNCE DRONE',
};

function clock(totalSeconds) {
    const secs = Math.max(0, Math.floor(totalSeconds));
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

export class UIRenderer {
    constructor(game) {
        this.game = game;
        this._scanCanvas = null;
        this._quoteWordPositions = null;
    }

    _getScanLines(w, h) {
        if (this._scanCanvas && this._scanCanvas.width === w && this._scanCanvas.height === h) {
            return this._scanCanvas;
        }
        this._scanCanvas = document.createElement('canvas');
        this._scanCanvas.width = w;
        this._scanCanvas.height = h;
        const sCtx = this._scanCanvas.getContext('2d');
        sCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < h; y += 4) sCtx.fillRect(0, y, w, 2);
        return this._scanCanvas;
    }

    // Full-screen backdrop shared by the overlay screens: optional art,
    // a dark wash, scan lines and an edge vignette.
    _drawBackdrop(ctx, w, h, { image = null, wash = 0.6 } = {}) {
        if (image) Utils.drawCover(ctx, image, w, h);
        ctx.fillStyle = `rgba(6, 4, 7, ${wash})`;
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(this._getScanLines(w, h), 0, 0);
        drawVignette(ctx, w, h, 0.75);
    }

    // Centred display heading flanked by two rules.
    _drawRuledHeading(ctx, text, x, y, size, color) {
        ctx.save();
        ctx.font = display(size);
        ctx.textAlign = 'center';
        track(ctx, size * 0.12);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.fillText(text, x, y);
        ctx.shadowBlur = 0;
        const half = ctx.measureText(text).width / 2 + size * 0.5;
        const ruleLen = size * 1.6;
        const ruleY = y - size * 0.36;
        for (const dir of [-1, 1]) {
            const grad = ctx.createLinearGradient(x + dir * half, 0, x + dir * (half + ruleLen), 0);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + dir * half, ruleY);
            ctx.lineTo(x + dir * (half + ruleLen), ruleY);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Pulsing "press space" style prompt inside two brackets.
    _drawPrompt(ctx, text, x, y, size, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = display(size);
        ctx.textAlign = 'center';
        track(ctx, size * 0.2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fillText(text, x + size * 0.1, y);
        ctx.shadowBlur = 0;
        const half = ctx.measureText(text).width / 2 + size * 0.7;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const top = y - size * 0.98;
        const bottom = y + size * 0.26;
        const lip = size * 0.3;
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + dir * (half - lip), top);
            ctx.lineTo(x + dir * half, top);
            ctx.lineTo(x + dir * half, bottom);
            ctx.lineTo(x + dir * (half - lip), bottom);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Row of options with the current one filled in. Centred on x; returns
    // the row's total width.
    _drawChips(ctx, options, selectedIndex, x, y, { size, colors, scale = 1 }) {
        ctx.save();
        ctx.font = display(size);
        track(ctx, size * 0.1);
        const padX = size * 0.7;
        const gap = size * 0.45;
        const widths = options.map(o => ctx.measureText(o).width + padX * 2);
        const total = widths.reduce((a, b) => a + b, 0) + gap * (options.length - 1);
        let left = x - total / 2;
        const chipH = size * 1.5;
        ctx.textAlign = 'center';
        options.forEach((label, i) => {
            const cw = widths[i];
            const selected = i === selectedIndex;
            const color = colors[i] || COLOR.bone;
            ctx.save();
            if (selected) {
                ctx.translate(left + cw / 2, y - size * 0.36);
                ctx.scale(scale, scale);
                ctx.translate(-(left + cw / 2), -(y - size * 0.36));
            }
            panel(ctx, left, y - chipH * 0.74, cw, chipH, {
                fill: selected ? color : 'rgba(0, 0, 0, 0.45)',
                stroke: selected ? color : 'rgba(236, 230, 218, 0.22)',
                cut: size * 0.4,
            });
            ctx.fillStyle = selected ? '#0a0607' : COLOR.dim;
            ctx.fillText(label, left + cw / 2 + size * 0.05, y);
            ctx.restore();
            left += cw + gap;
        });
        ctx.restore();
        return total;
    }

    // ----- HUD ----- (NIN industrial palette)
    drawHUD(ctx) {
        const g = this.game;
        const w = g.canvas.width;
        const h = g.canvas.height;

        ctx.save();
        ctx.textBaseline = 'alphabetic';

        // Soft scrims so the readouts hold up over bright nebula and planets.
        const topScrim = ctx.createLinearGradient(0, 0, 0, 96);
        topScrim.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
        topScrim.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = topScrim;
        ctx.fillRect(0, 0, w, 96);
        const bottomScrim = ctx.createLinearGradient(0, h - 70, 0, h);
        bottomScrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bottomScrim.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
        ctx.fillStyle = bottomScrim;
        ctx.fillRect(0, h - 70, w, 70);

        this._drawScoreBlock(ctx);
        this._drawLives(ctx, w);
        this._drawPowerUps(ctx);

        // Skin unlock banner — centered, fades out over the last 0.5s
        if (g.skinUnlockFlash) {
            const alpha = Math.min(1, g.skinUnlockFlash.timer / 0.5);
            const pulse = 0.8 + 0.2 * Math.sin(g.time * 6);
            ctx.save();
            ctx.globalAlpha = alpha * pulse;
            this._drawRuledHeading(ctx, g.skinUnlockFlash.text, w / 2, h * 0.3, Math.min(30, w * 0.035), '#2cf5c8');
            ctx.restore();
        }

        this._drawBossPreview(ctx, w, h);
        this._drawPhaseBanner(ctx, w, h);
        this._drawPhaseStatus(ctx, w);
        this._drawQuote(ctx, w, h);
        this._drawLoadout(ctx, w, h);

        ctx.restore();
    }

    _drawScoreBlock(ctx) {
        const g = this.game;
        const p = g.player;
        const x = 18;

        ctx.textAlign = 'left';
        ctx.font = mono(11);
        track(ctx, 3);
        ctx.fillStyle = COLOR.red;
        ctx.fillText('SCORE', x, 20);

        ctx.font = display(42);
        track(ctx, 1.5);
        ctx.fillStyle = COLOR.bone;
        ctx.shadowColor = 'rgba(255, 31, 31, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(g.score.toLocaleString('en-US'), x, 58);
        ctx.shadowBlur = 0;

        ctx.font = mono(13);
        track(ctx, 1);
        ctx.fillStyle = COLOR.text;
        const hiText = `HI ${g.highScore.toLocaleString('en-US')}`;
        ctx.fillText(hiText, x, 76);

        // Scrap counter with pulse on gain
        if (g.scrapPulse > 0) g.scrapPulse -= 0.02;
        const scrapGlow = Math.max(0, g.scrapPulse);
        const scrapX = x + ctx.measureText(hiText).width + 18;
        ctx.save();
        ctx.translate(scrapX + 4, 71.5);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = COLOR.amber;
        ctx.fillRect(-3.5, -3.5, 7, 7);
        ctx.restore();
        ctx.fillStyle = scrapGlow > 0 ? '#ffe2a8' : COLOR.amber;
        if (scrapGlow > 0) { ctx.shadowColor = COLOR.amber; ctx.shadowBlur = 10 * scrapGlow; }
        ctx.fillText(`${p.scrap}`, scrapX + 13, 76);
        ctx.shadowBlur = 0;

        // Combo display
        if (p.combo >= 3) {
            const mult = p.getComboMultiplier();
            const comboPulse = 0.7 + 0.3 * Math.sin(g.time * 8);
            const color = mult >= 4 ? '#ff3b1f' : mult >= 3 ? COLOR.amber : COLOR.gold;
            ctx.font = display(26 + mult * 3);
            track(ctx, 1);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12 * comboPulse;
            const multText = `x${mult}`;
            ctx.fillText(multText, x, 114);
            ctx.shadowBlur = 0;
            const multW = ctx.measureText(multText).width;
            ctx.font = mono(11);
            track(ctx, 2);
            ctx.fillStyle = COLOR.text;
            ctx.fillText(`COMBO ${p.combo}`, x + multW + 10, 112);
        }

        // Combo milestone / hit notice — fades out over its timer
        if (g.comboMilestoneFlash) {
            const alpha = Math.min(1, g.comboMilestoneFlash.timer / 0.5);
            ctx.font = mono(13);
            track(ctx, 1);
            ctx.fillStyle = `rgba(255, 216, 74, ${alpha})`;
            ctx.shadowColor = COLOR.amber;
            ctx.shadowBlur = 10 * alpha;
            ctx.fillText(g.comboMilestoneFlash.text, x, 136);
            ctx.shadowBlur = 0;
        }
        track(ctx, 0);
    }

    // Lives — top right; on desktop they sit left of the pause/mute buttons.
    _drawLives(ctx, w) {
        const p = this.game.player;
        const right = IS_TOUCH ? w - 18 : w - 112;
        const total = Math.max(p.lives, p.maxLives || 0);
        const step = 22;
        for (let i = 0; i < total; i++) {
            const lx = right - 12 - i * step;
            const ly = 26;
            ctx.beginPath();
            ctx.moveTo(lx + 11, ly);
            ctx.lineTo(lx - 7, ly - 8);
            ctx.lineTo(lx - 2, ly);
            ctx.lineTo(lx - 7, ly + 8);
            ctx.closePath();
            if (i < p.lives) {
                ctx.fillStyle = COLOR.red;
                ctx.shadowColor = COLOR.red;
                ctx.shadowBlur = 6;
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.strokeStyle = 'rgba(255, 31, 31, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        if (p.grazes > 0) {
            ctx.font = mono(11);
            track(ctx, 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLOR.text;
            ctx.fillText(`GRAZE ${p.grazes}`, right, IS_TOUCH ? 96 : 54);
            ctx.textAlign = 'left';
            track(ctx, 0);
        }
    }

    // Active power-up indicators — below the score/combo/notice stack so
    // timers never overprint the counters above.
    _drawPowerUps(ctx) {
        const g = this.game;
        const p = g.player;
        const x = 18;
        let y = 160;

        ctx.textAlign = 'left';
        ctx.font = mono(12);
        track(ctx, 1);
        const row = (label, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x, y - 9, 3, 10);
            ctx.fillText(label, x + 9, y);
            y += 18;
        };

        for (const [flag, timer, label, color] of POWERUP_READOUTS) {
            if (p[flag]) row(`${label} ${Math.ceil(p[timer])}s`, color);
        }
        if (p.nukeOvercharge) row('NUKE READY', '#ff5a1f');

        // Power combo indicator
        const puCount = p.getActivePowerUpCount();
        if (puCount >= 2) {
            const comboMul = p.getPowerComboMultiplier();
            const comboPulse = 0.7 + 0.3 * Math.sin(g.time * 6);
            const color = puCount >= 3 ? '#ff3b1f' : COLOR.amber;
            y += 8;
            ctx.font = display(18 + puCount * 2);
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10 * comboPulse;
            ctx.fillText(`POWER COMBO x${comboMul}`, x, y);
            ctx.shadowBlur = 0;
            y += 20;
        }

        // Synergy label — distinct combo names for the active power-up pairing
        const synergy = p.getActiveSynergy();
        if (synergy) {
            const synergyPulse = 0.7 + 0.3 * Math.sin(g.time * 7);
            ctx.font = mono(12);
            ctx.fillStyle = '#ff5cf0';
            ctx.shadowColor = '#ff5cf0';
            ctx.shadowBlur = 8 * synergyPulse;
            ctx.fillText(`SYNERGY: ${SYNERGY_LABELS[synergy]}`, x, y);
            ctx.shadowBlur = 0;
        }
        track(ctx, 0);
    }

    // Boss preview panel — replaces the phase announcement during the
    // first ~2 seconds of a transition when a boss is incoming. Fades
    // out over the last 0.4s so it transitions cleanly to the phase name.
    _drawBossPreview(ctx, w, h) {
        const bp = this.game._bossPreview;
        if (!bp) return;
        const fade = Math.min(1, bp.timer / 0.4);
        const slide = Math.min(1, (bp.duration - bp.timer) / 0.25);
        const panelW = Math.min(w * 0.6, 460);
        const panelH = 112;
        const panelX = (w - panelW) / 2;
        const panelY = h * 0.13 - (1 - slide) * 16;

        ctx.save();
        ctx.globalAlpha = fade * slide;
        ctx.textAlign = 'center';

        panel(ctx, panelX, panelY, panelW, panelH, { fill: 'rgba(8, 4, 6, 0.86)', stroke: bp.color, cut: 14, lineWidth: 1.5 });

        // Hazard stripe crawling along the top edge
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX + 16, panelY + 6, panelW - 32, 5);
        ctx.clip();
        ctx.strokeStyle = bp.color;
        ctx.globalAlpha = fade * slide * 0.7;
        ctx.lineWidth = 4;
        const shift = (this.game.time * 30) % 14;
        for (let sx = panelX - 20 + shift; sx < panelX + panelW + 20; sx += 14) {
            ctx.beginPath();
            ctx.moveTo(sx, panelY + 12);
            ctx.lineTo(sx + 8, panelY + 5);
            ctx.stroke();
        }
        ctx.restore();

        ctx.font = mono(11);
        track(ctx, 4);
        ctx.fillStyle = COLOR.text;
        ctx.fillText(`INCOMING — ${bp.tier}`, w / 2, panelY + 30);

        ctx.font = display(42);
        track(ctx, 3);
        ctx.fillStyle = bp.color;
        ctx.shadowColor = bp.color;
        ctx.shadowBlur = 16;
        ctx.fillText(bp.name, w / 2, panelY + 70);
        ctx.shadowBlur = 0;

        const barW = panelW * 0.72;
        meter(ctx, (w - barW) / 2, panelY + 82, barW, 6, 1, bp.color);
        ctx.font = mono(10);
        track(ctx, 2);
        ctx.fillStyle = COLOR.dim;
        ctx.fillText(`${bp.maxHp} HP`, w / 2, panelY + 104);

        if (bp.hint) {
            ctx.font = mono(13);
            track(ctx, 1);
            ctx.fillStyle = '#ffdf96';
            ctx.fillText(bp.hint, w / 2, panelY + panelH + 22);
        }
        ctx.restore();
    }

    // Phase announcement — center screen, fading (driven by GSAP via Anim)
    _drawPhaseBanner(ctx, w, h) {
        const g = this.game;
        const pb = g.anim.phaseBanner;
        if (!pb.visible || g._bossPreview) return;
        ctx.save();
        ctx.globalAlpha = pb.alpha;
        const size = Math.min(w * 0.065, 60) * pb.scale;
        this._drawRuledHeading(ctx, pb.text, w / 2, h * 0.19, size, pb.color);
        ctx.textAlign = 'center';
        ctx.font = mono(12);
        track(ctx, 6);
        ctx.fillStyle = COLOR.text;
        ctx.fillText(`PHASE ${g.lastPhase + 1}`, w / 2, h * 0.19 + 26);
        ctx.restore();
    }

    // Current phase + speed-run timer, and the boss health bar — top center
    _drawPhaseStatus(ctx, w) {
        const g = this.game;
        if (g.lastPhase < 0 || g.anim.phaseBanner.visible) return;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = display(21);
        track(ctx, 2.5);
        ctx.fillStyle = COLOR.bone;
        ctx.fillText(PHASES[g.lastPhase].name, w / 2, 27);

        const tags = [`PHASE ${g.lastPhase + 1}`, clock(g.time - g.phaseStartTime)];
        if (g.runMode === 'DAILY') tags.push('DAILY RUN');
        if (g.victoryAchieved) tags.push('ENDLESS');
        ctx.font = mono(12);
        track(ctx, 2.5);
        ctx.fillStyle = g.victoryAchieved ? COLOR.gold : g.runMode === 'DAILY' ? '#8fdcff' : COLOR.text;
        ctx.fillText(tags.join('  ·  '), w / 2, 44);

        const boss = g.bossActive && !g._bossPreview
            ? g.spawner.enemies.find(e => e.type === 'boss' && e.active)
            : null;
        if (boss) {
            const barW = Math.min(w * 0.42, 520);
            const barX = (w - barW) / 2;
            const barY = 70;
            ctx.font = display(17);
            track(ctx, 2.5);
            ctx.textAlign = 'left';
            ctx.fillStyle = boss.color;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 8;
            ctx.fillText(BOSS_NAMES[boss.bossType] || 'BOSS', barX, barY - 5);
            ctx.shadowBlur = 0;
            if (boss.behaviorHint) {
                ctx.font = mono(10);
                track(ctx, 1);
                ctx.textAlign = 'right';
                ctx.fillStyle = COLOR.dim;
                ctx.fillText(boss.behaviorHint.split(' — ')[0], barX + barW, barY - 5);
            }
            meter(ctx, barX, barY, barW, 7, boss.hp / boss.maxHp, boss.color);
            ctx.strokeStyle = 'rgba(236, 230, 218, 0.25)';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, 8);
        }
        ctx.restore();
    }

    // NIN quote — words flash one at a time at random positions
    _drawQuote(ctx, w, h) {
        const g = this.game;
        if (!(g.quoteTimer > 0 && !g.anim.phaseBanner.visible && !g.bossActive && h > 350)) return;
        const elapsed = g.quoteDuration - g.quoteTimer;
        const words = g.quoteText.split(' ');
        // Scale word timing so long quotes still fit within ~8 seconds
        const wordDuration = Math.min(0.9, 7.0 / Math.max(words.length, 1));
        const totalDuration = words.length * wordDuration + 1.0;
        if (elapsed >= totalDuration) return;

        // Position words near center with slight scatter + cycling color
        const wordColors = ['#ffdd00', '#ff2200', '#00ff44', '#ff8800', '#00ddff', '#ff00ff', '#ff4488', '#88ff00'];
        if (!this._quoteWordPositions) {
            const centerX = w / 2;
            const centerY = h * 0.45;
            const shuffled = [...wordColors].sort(() => Math.random() - 0.5);
            this._quoteWordPositions = words.map((_, i) => ({
                x: centerX + (Math.random() - 0.5) * w * 0.15,
                y: centerY + (Math.random() - 0.5) * h * 0.08,
                color: shuffled[i % shuffled.length]
            }));
        }

        ctx.save();
        const fontSize = Math.min(w * 0.07, 58);
        ctx.textAlign = 'center';
        ctx.font = display(fontSize);
        track(ctx, 2);
        ctx.lineJoin = 'round';

        for (let i = 0; i < words.length; i++) {
            const wordTime = elapsed - i * wordDuration;
            if (wordTime < 0) continue;

            const fadeDuration = 2.5;
            let alpha;
            if (wordTime < 0.1) alpha = wordTime / 0.1;
            else if (wordTime < 0.5) alpha = 1.0;
            else if (wordTime < 0.5 + fadeDuration) alpha = 1.0 - (wordTime - 0.5) / fadeDuration;
            else alpha = 0;
            if (alpha <= 0.01) continue;

            const pos = this._quoteWordPositions[i];
            const scale = wordTime < 0.15 ? 1.3 - (wordTime / 0.15) * 0.3 : 1.0;
            const rotation = ((i * 7 + 3) % 11 - 5) * 0.06;

            ctx.globalAlpha = alpha;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.scale(scale, scale);
            ctx.rotate(rotation);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 6;
            ctx.strokeText(words[i], 0, 0);
            ctx.fillStyle = pos.color;
            ctx.shadowColor = pos.color;
            ctx.shadowBlur = wordTime < 0.2 ? 20 : 6;
            ctx.fillText(words[i], 0, 0);
            ctx.restore();
        }
        ctx.restore();
    }

    // Bombs and shield (bottom left), cosmetics and weapon (bottom right)
    _drawLoadout(ctx, w, h) {
        const p = this.game.player;

        ctx.save();
        ctx.font = mono(12);
        track(ctx, 2);

        // Touch layouts have the joystick bottom-left, so the charges move
        // up under the lives and lose their key caps.
        const charge = (key, label, x, y, total, filled, color, recharge) => {
            ctx.textAlign = 'left';
            const labelX = IS_TOUCH ? x : x + keycap(ctx, key, x, y, { size: 12 }) + 8;
            ctx.fillStyle = filled > 0 ? COLOR.text : COLOR.faint;
            ctx.fillText(label, labelX, y);
            if (recharge !== null) meter(ctx, labelX + 68, y - 8, 70, 7, recharge, '#8fb6c4');
            else pips(ctx, labelX + 68, y - 9, total, filled, { color });
        };
        const chargeX = IS_TOUCH ? w - 190 : 18;
        const bombY = IS_TOUCH ? 56 : h - 45;
        const shieldY = IS_TOUCH ? 76 : h - 20;
        charge('Q', 'BOMB', chargeX, bombY, Math.max(p.maxBombs, p.bombs), p.bombs, COLOR.red, null);
        charge('E', 'SHIELD', chargeX, shieldY, p.maxShieldCharges,
            p.shieldRecharging ? 0 : p.shieldCharges, COLOR.cyan,
            p.shieldRecharging ? 1 - p.shieldRechargeTimer / p.shieldRechargeDuration : null);

        // Right column: key cap at the edge, value to its left. Touch layouts
        // have the fire button there instead.
        if (!IS_TOUCH) {
            const lockedSkins = p.skinNames.length - 1 - p.skinsUnlocked;
            const rows = [
                ['T', `TRAIL ${p.trailColorNames[p.trailIndex]}`, p.trailColor || COLOR.red],
                ['Y', `SKIN ${p.skinNames[p.skinIndex]}${lockedSkins > 0 ? ` · ${lockedSkins} LOCKED` : ''}`, COLOR.text],
            ];
            if (p.ownedWeapons.length > 1) {
                rows.push(['X', `WEAPON ${p.weapon}`, WEAPON_DEFS[p.weapon].color]);
            }
            rows.forEach(([key, text, color], i) => {
                const y = h - 20 - i * 25;
                const capW = keycap(ctx, key, w - 18, y, { size: 12, align: 'right' });
                ctx.textAlign = 'right';
                ctx.fillStyle = color;
                ctx.fillText(text, w - 18 - capW - 8, y);
            });
        }
        ctx.restore();
    }

    // ----- Menu ----- (NIN industrial)
    drawMenu(ctx) {
        const g = this.game;
        const w = g.canvas.width;
        const h = g.canvas.height;
        const s = uiScale(w, h);
        const cx = w / 2;

        ctx.save();
        ctx.textBaseline = 'alphabetic';
        this._drawBackdrop(ctx, w, h, { image: g.assets.splashBg, wash: g.assets.splashBg ? 0.42 : 0.8 });

        // Dark band behind the title block so it reads over the nebula art.
        const band = ctx.createLinearGradient(0, h * 0.06, 0, h * 0.5);
        band.addColorStop(0, 'rgba(0, 0, 0, 0)');
        band.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
        band.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, h * 0.06, w, h * 0.44);

        // Title — GSAP-driven pulse via Anim.menuTitle, with a periodic tear.
        const mt = g.anim.menuTitle;
        const titleSize = Math.min(w * 0.145, h * 0.26, 180) * mt.scale;
        const titleY = h * 0.335;
        const cycle = g.menuTime % 4.6;
        const glitch = cycle < 0.09 ? 1 : (cycle > 0.22 && cycle < 0.27) ? -0.6 : 0;
        glitchTitle(ctx, 'NIN DEFENDER', cx, titleY, titleSize,
            { split: Math.max(1.5, titleSize * 0.022), glitch, glow: mt.glow });

        // Subtitle between two rules
        ctx.font = mono(Math.max(10, 15 * s));
        ctx.textAlign = 'center';
        track(ctx, 7 * s);
        ctx.fillStyle = COLOR.bone;
        const subY = titleY + 34 * s;
        ctx.fillText('NOTHING CAN STOP ME NOW', cx, subY);
        const subHalf = ctx.measureText('NOTHING CAN STOP ME NOW').width / 2 + 18 * s;
        ctx.strokeStyle = 'rgba(255, 31, 31, 0.7)';
        ctx.lineWidth = 1;
        for (const dir of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + dir * subHalf, subY - 5 * s);
            ctx.lineTo(cx + dir * (subHalf + 90 * s), subY - 5 * s);
            ctx.stroke();
        }
        track(ctx, 0);

        // Start prompt — GSAP-driven pulse via Anim.menuPrompt
        const promptY = h * 0.535;
        this._drawPrompt(ctx, IS_TOUCH ? 'TAP TO START' : 'PRESS SPACE', cx, promptY,
            Math.max(18, 30 * s), COLOR.red, g.anim.menuPrompt.alpha);

        // Difficulty and run mode selectors
        const chipSize = Math.max(13, 19 * s);
        const rowGap = chipSize * 2.35;
        const diffY = promptY + 68 * s;
        const labelSize = Math.max(10, 12 * s);
        const selectorRow = (label, keys, y, options, index, colors, scale) => {
            const total = this._drawChips(ctx, options, index, cx, y, { size: chipSize, colors, scale });
            ctx.font = mono(labelSize);
            track(ctx, 3);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLOR.text;
            ctx.fillText(label, cx - total / 2 - 16 * s, y - chipSize * 0.1);
            track(ctx, 0);
            if (!IS_TOUCH) {
                let kx = cx + total / 2 + 16 * s;
                for (const key of keys) {
                    kx += keycap(ctx, key, kx, y - chipSize * 0.08, { size: labelSize + 1 }) + 4;
                }
            }
        };
        selectorRow('DIFFICULTY', ['←', '→'], diffY, g.difficulties, g.difficultyIndex,
            [COLOR.green, COLOR.amber, COLOR.red], g.anim.menuDifficulty.scale);
        selectorRow('RUN MODE', ['↑', '↓'], diffY + rowGap,
            ['CLASSIC', `DAILY ${Schemas.localDateString()}`],
            g.runMode === 'DAILY' ? 1 : 0, [COLOR.bone, '#8fdcff'], 1);

        // Controls — two columns of key caps (keyboard only; skipped when short)
        const controlsTop = diffY + rowGap + 52 * s;
        const rowH = Math.max(18, 24 * s);
        if (!IS_TOUCH && h - controlsTop > rowH * 5 + 24) {
            const controls = [
                [['WASD'],     'Move ship'],
                [['SPACE'],    'Fire (hold)'],
                [['E'],        'Shield'],
                [['Q'],        'Screen bomb'],
                [['X'],        'Switch weapon'],
                [['T'],        'Cycle trail'],
                [['Y'],        'Cycle ship skin'],
                [['G'],        'Toggle post-FX'],
                [['P', 'ESC'], 'Pause'],
            ];
            const perColumn = 5;
            const textSize = Math.max(11, 14 * s);
            const columnOffset = 150 * s;
            controls.forEach(([keys, desc], i) => {
                const col = Math.floor(i / perColumn);
                const y = controlsTop + (i % perColumn) * rowH;
                const split = cx + (col === 0 ? -columnOffset * 1.25 : columnOffset * 0.75);
                let kx = split - 8 * s;
                for (const key of [...keys].reverse()) {
                    kx -= keycap(ctx, key, kx, y, { size: textSize - 1, align: 'right' }) + 4;
                }
                ctx.font = mono(textSize);
                ctx.textAlign = 'left';
                ctx.fillStyle = COLOR.text;
                ctx.fillText(desc, split + 8 * s, y);
            });
        }

        // High score
        if (g.highScore > 0) {
            ctx.font = mono(Math.max(10, 12 * s));
            ctx.textAlign = 'center';
            track(ctx, 4);
            ctx.fillStyle = COLOR.amber;
            ctx.fillText(`HIGH SCORE  ${g.highScore.toLocaleString('en-US')}`, cx, h * 0.1);
        }

        ctx.restore();
    }

    // ----- Wave Clear banner ----- (gold reward moment, GSAP-driven)
    drawWaveClear(ctx) {
        const g = this.game;
        if (!g.anim.waveBanner.visible) return;
        const w = g.canvas.width;
        const h = g.canvas.height;
        const wb = g.anim.waveBanner;

        ctx.save();
        ctx.globalAlpha = wb.alpha;
        const size = Math.min(w * 0.1, 96) * wb.scale;
        this._drawRuledHeading(ctx, 'WAVE CLEAR', w / 2, h * 0.42, size, COLOR.gold);

        ctx.textAlign = 'center';
        ctx.font = mono(13);
        track(ctx, 5);
        ctx.fillStyle = '#d9b340';
        ctx.fillText(`PHASE ${wb.phase + 1} COMPLETE`, w / 2, h * 0.42 + 34);
        if (wb.scrapBonus > 0) {
            ctx.fillStyle = COLOR.amber;
            ctx.fillText(`+${wb.scrapBonus} SCRAP BONUS`, w / 2, h * 0.42 + 58);
        }
        ctx.restore();
    }

    // ----- Death attribution ----- ring + label on whatever landed the kill
    drawKillerCallout(ctx, hit) {
        const g = this.game;
        const pulse = 0.6 + 0.4 * Math.sin(g.menuTime * 10);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(hit.x, hit.y, 34, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = display(22);
        track(ctx, 2);
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.shadowBlur = 0;
        const labelY = hit.y < 70 ? hit.y + 60 : hit.y - 44;
        const label = `KILLED BY ${hit.name}`;
        const halfW = ctx.measureText(label).width / 2 + 8;
        const labelX = Utils.clamp(hit.x, halfW, g.canvas.width - halfW);
        ctx.strokeText(label, labelX, labelY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, labelX, labelY);
        ctx.restore();
    }

    // Label/value table centred on x; returns the y after the last row.
    _drawStatRows(ctx, rows, x, y, { size = 15, rowH = 26, valueColor = COLOR.bone } = {}) {
        ctx.save();
        ctx.font = mono(size);
        for (const [label, value, color] of rows) {
            track(ctx, 3);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLOR.dim;
            ctx.fillText(label, x - 14, y);
            track(ctx, 1);
            ctx.textAlign = 'left';
            ctx.fillStyle = color || valueColor;
            ctx.fillText(value, x + 14, y);
            y += rowH;
        }
        ctx.restore();
        return y;
    }

    // ----- Victory ----- the run's ending; endless mode continues after
    drawVictory(ctx) {
        const g = this.game;
        const w = g.canvas.width;
        const h = g.canvas.height;
        const s = uiScale(w, h);
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        this._drawBackdrop(ctx, w, h, { wash: 0.74 });

        const glow = 18 + 10 * Math.sin(g.menuTime * 3);
        glitchTitle(ctx, 'NOTHING CAN STOP ME NOW', w / 2, h * 0.3, Math.min(w * 0.085, 96),
            { color: COLOR.gold, split: 2, glow });

        ctx.textAlign = 'center';
        ctx.font = mono(Math.max(11, 15 * s));
        track(ctx, 6 * s);
        ctx.fillStyle = COLOR.red;
        ctx.fillText('THE CHAOS HARBINGER IS DEAD', w / 2, h * 0.3 + 36 * s);
        track(ctx, 0);

        this._drawStatRows(ctx, [
            ['SCORE', g.score.toLocaleString('en-US'), COLOR.gold],
            ['TIME', clock(g.time)],
            ['MAX COMBO', `x${g.player.maxCombo}`],
            ['GRAZES', `${g.player.grazes}`],
            ['LIVES LEFT', `${g.player.lives}`],
        ], w / 2, h * 0.47, { size: Math.max(12, 16 * s), rowH: Math.max(20, 28 * s) });

        const pulse = 0.4 + 0.6 * Math.sin(g.menuTime * 2.5);
        this._drawPrompt(ctx, IS_TOUCH ? 'TAP — CONTINUE INTO ENDLESS MODE' : 'SPACE — CONTINUE INTO ENDLESS MODE',
            w / 2, h * 0.84, Math.max(15, 24 * s), COLOR.gold, pulse);
        ctx.restore();
    }

    // ----- Pause overlay ----- (NIN industrial)
    drawPause(ctx) {
        const g = this.game;
        const w = g.canvas.width;
        const h = g.canvas.height;
        const s = uiScale(w, h);
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        this._drawBackdrop(ctx, w, h, { wash: 0.68 });

        glitchTitle(ctx, 'PAUSED', w / 2, h * 0.34, Math.min(w * 0.13, h * 0.22, 130), { split: 2.5, glow: 22 });

        // Menu options
        const options = ['RESUME', 'RESTART', 'MAIN MENU'];
        const selected = g._pauseMenuIndex || 0;
        const size = Math.max(18, 28 * s);
        const rowH = size * 1.75;
        const optW = size * 9;
        ctx.textAlign = 'center';
        for (let i = 0; i < options.length; i++) {
            const oy = h * 0.5 + i * rowH;
            const isSelected = i === selected;
            if (isSelected) {
                panel(ctx, w / 2 - optW / 2, oy - size * 1.02, optW, size * 1.42, {
                    fill: 'rgba(255, 31, 31, 0.16)', stroke: COLOR.red, cut: size * 0.4, lineWidth: 1.5,
                });
            }
            ctx.font = display(size);
            track(ctx, size * 0.14);
            ctx.fillStyle = isSelected ? COLOR.bone : COLOR.dim;
            ctx.fillText(options[i], w / 2 + size * 0.07, oy);
        }
        track(ctx, 0);

        ctx.font = mono(Math.max(11, 13 * s));
        track(ctx, 1.5);
        ctx.fillStyle = COLOR.text;
        ctx.fillText(IS_TOUCH ? 'TAP PAUSE TO RESUME' : 'W / S  SELECT    ·    SPACE  CONFIRM    ·    P  RESUME',
            w / 2, h * 0.5 + rowH * 3 + 8 * s);
        ctx.restore();
    }

    // ----- Game Over ----- (NIN industrial)
    drawGameOver(ctx) {
        const g = this.game;
        const w = g.canvas.width;
        const h = g.canvas.height;
        const s = uiScale(w, h);
        const cx = w / 2;
        ctx.save();
        ctx.textBaseline = 'alphabetic';
        this._drawBackdrop(ctx, w, h, { image: g.assets.gameoverBg, wash: g.assets.gameoverBg ? 0.58 : 0.85 });

        // Dark column behind the results so they read over the debris art.
        const column = ctx.createLinearGradient(cx - 380 * s, 0, cx + 380 * s, 0);
        column.addColorStop(0, 'rgba(0, 0, 0, 0)');
        column.addColorStop(0.5, 'rgba(0, 0, 0, 0.55)');
        column.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = column;
        ctx.fillRect(cx - 380 * s, 0, 760 * s, h);

        // GAME OVER with a slow tear
        const cycle = g.menuTime % 3.1;
        const glitch = cycle < 0.1 ? 1 : (cycle > 0.3 && cycle < 0.36) ? -0.7 : 0;
        const titleY = h * 0.25;
        glitchTitle(ctx, 'GAME OVER', cx, titleY, Math.min(w * 0.13, h * 0.2, 140),
            { split: 3, glitch, glow: 22 });

        // Animated score reveal — scale popped in by anim.gameOverReveal()
        const go = g.anim.gameOver;
        const scoreScale = Math.max(0.001, go.scoreScale);
        const scoreSize = Math.max(26, 58 * s);
        let y = titleY + 34 * s + scoreSize;
        ctx.textAlign = 'center';
        ctx.font = mono(Math.max(10, 13 * s));
        track(ctx, 5);
        ctx.fillStyle = COLOR.red;
        ctx.fillText('FINAL SCORE', cx, y - scoreSize * 0.92);
        ctx.font = display(scoreSize * scoreScale);
        track(ctx, 2);
        ctx.fillStyle = COLOR.bone;
        ctx.shadowColor = 'rgba(255, 31, 31, 0.7)';
        ctx.shadowBlur = 14;
        ctx.fillText(g.score.toLocaleString('en-US'), cx, y);
        ctx.shadowBlur = 0;

        // NEW BEST badge — fades in with scale-pop after the score lands.
        // Near-miss runs get a needling "N SHORT OF YOUR BEST" instead.
        y += 30 * s;
        if (go.pbAlpha > 0 && (go.isNewBest || go.missDelta > 0)) {
            ctx.save();
            ctx.globalAlpha = go.pbAlpha;
            const pbScale = Math.max(0.001, go.pbScale);
            const badgeColor = go.isNewBest ? COLOR.gold : '#ff7a45';
            ctx.font = display(Math.max(15, 22 * s) * pbScale);
            track(ctx, 3);
            ctx.fillStyle = badgeColor;
            ctx.shadowColor = badgeColor;
            ctx.shadowBlur = 12;
            ctx.fillText(go.isNewBest
                ? `★ NEW BEST  +${go.pbDelta.toLocaleString('en-US')}`
                : `${go.missDelta.toLocaleString('en-US')} SHORT OF YOUR BEST`, cx, y);
            ctx.restore();
        }

        // Stats
        const stats = [
            ['HIGH SCORE', g.highScore.toLocaleString('en-US')],
            ['REACHED', `PHASE ${g.lastPhase + 1}  ·  ${clock(g.time)}`],
        ];
        if (g.dailyBest) stats.splice(1, 0, ["TODAY'S BEST", g.dailyBest.toLocaleString('en-US'), '#8fdcff']);
        if (g.player.maxCombo >= 3) stats.push(['MAX COMBO', `x${g.player.maxCombo}`, COLOR.amber]);
        stats.push(['SCRAP', g.player.scrap > 0 ? `${g.player.scrap}  ·  spend it next run` : '0', COLOR.amber]);
        const rowH = Math.max(18, 24 * s);
        y = this._drawStatRows(ctx, stats, cx, y + 36 * s, { size: Math.max(12, 15 * s), rowH });

        // Leaderboard — as many rows as fit above the prompt
        const promptY = h - 34 * s;
        const boardRowH = Math.max(15, 19 * s);
        const room = Math.floor((promptY - 44 * s - (y + 30 * s)) / boardRowH);
        const maxShow = Math.min(5, g.leaderboard.length, room);
        if (maxShow > 0) {
            y += 14 * s;
            ctx.font = mono(Math.max(10, 12 * s));
            ctx.textAlign = 'center';
            track(ctx, 5);
            ctx.fillStyle = COLOR.dim;
            ctx.fillText('TOP SCORES', cx, y);
            track(ctx, 1);
            y += boardRowH + 2;
            ctx.font = mono(Math.max(11, 14 * s));
            const col = 80 * s;
            for (let i = 0; i < maxShow; i++) {
                const entry = g.leaderboard[i];
                const rowY = y + i * boardRowH;
                ctx.fillStyle = i === 0 ? COLOR.red : COLOR.text;
                ctx.textAlign = 'right';
                ctx.fillText(`${i + 1}.`, cx - col * 1.7, rowY);
                ctx.fillText(entry.score.toLocaleString('en-US'), cx - col * 0.35, rowY);
                ctx.textAlign = 'left';
                ctx.fillStyle = i === 0 ? COLOR.bone : COLOR.dim;
                const cells = [
                    entry.phase ? `P${entry.phase}` : '',
                    entry.time ? clock(entry.time) : '',
                    entry.maxCombo ? `x${entry.maxCombo}` : '',
                    `${entry.won ? '★' : ''}${entry.daily ? 'D' : ''}`,
                ];
                cells.forEach((cell, c) => ctx.fillText(cell, cx - col * 0.05 + c * col * 0.62, rowY));
            }
        }

        const pulse = 0.4 + 0.6 * Math.sin(g.menuTime * 2.5);
        this._drawPrompt(ctx, IS_TOUCH ? 'TAP TO RETRY' : 'PRESS SPACE', cx, promptY,
            Math.max(16, 24 * s), COLOR.red, pulse);

        ctx.restore();
    }
}
