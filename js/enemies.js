// ============================================================
// enemies.js — Asteroids and enemy ships
// ============================================================

import { Utils } from './utils.js';
import { GAME_SCALE } from './constants.js';

// --- Base enemy ---
export class Enemy {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 15 * GAME_SCALE;
        this.hp = 1;
        this.maxHp = 1;
        this.active = false;
        this.points = 10;
        this.type = 'asteroid';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    isOffScreen(canvasW, canvasH) {
        return (this.x < -this.radius * 2 - 50 ||
                this.x > canvasW + this.radius * 2 + 50 ||
                this.y < -this.radius * 2 - 50 ||
                this.y > canvasH + this.radius * 2 + 50);
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }
}

// ============================================================
// Asteroid — Rotating irregular polygon, 1 HP
// ============================================================
export class Asteroid extends Enemy {
    constructor(canvasW, canvasH, sizeMultiplier = 1, spawnX, spawnY) {
        super();
        this.type = 'asteroid';
        const baseRadius = Utils.random(12, 28) * sizeMultiplier * GAME_SCALE;
        this.radius = baseRadius;
        this.sizeMultiplier = sizeMultiplier;
        this.hp = sizeMultiplier >= 1.4 ? 2 : 1; // big asteroids take 2 hits
        this.maxHp = this.hp;
        this.points = sizeMultiplier >= 1.4 ? 15 : 10;

        // Allow spawning at a specific position (for splits)
        this.x = spawnX !== undefined ? spawnX : canvasW + this.radius + Utils.random(10, 100);
        this.y = spawnY !== undefined ? spawnY : Utils.random(this.radius, canvasH - this.radius);
        this.vx = Utils.random(-180, -60);

        // Wavy or straight path
        this.wavy = Math.random() > 0.5;
        this.wavyAmp = Utils.random(20, 60);
        this.wavyFreq = Utils.random(1.5, 3);
        this.baseY = this.y;
        this.time = 0;

        this.rotation = 0;
        this.rotSpeed = Utils.random(-3, 3);

        // Generate shape
        this.vertices = Utils.generateAsteroidShape(this.radius, Utils.randomInt(7, 12));

        // Rich color palette
        const hue = Utils.randomInt(15, 50);
        const sat = Utils.randomInt(15, 40);
        const lit = Utils.randomInt(30, 50);
        this.baseColor = `hsl(${hue}, ${sat}%, ${lit}%)`;
        this.darkColor = `hsl(${hue}, ${sat + 5}%, ${lit - 15}%)`;
        this.lightColor = `hsl(${hue}, ${sat - 5}%, ${lit + 15}%)`;

        // Craters for texture
        this.craters = [];
        const craterCount = Utils.randomInt(2, 5);
        for (let i = 0; i < craterCount; i++) {
            const angle = Utils.random(0, Math.PI * 2);
            const dist = Utils.random(0.1, 0.6) * this.radius;
            this.craters.push({
                ox: Math.cos(angle) * dist,
                oy: Math.sin(angle) * dist,
                r: Utils.random(this.radius * 0.08, this.radius * 0.25)
            });
        }

        // Surface ridges
        this.ridges = [];
        const ridgeCount = Utils.randomInt(1, 3);
        for (let i = 0; i < ridgeCount; i++) {
            this.ridges.push({
                angle: Utils.random(0, Math.PI * 2),
                len: Utils.random(0.3, 0.7) * this.radius,
                offset: Utils.random(-0.3, 0.3) * this.radius
            });
        }

        this.active = true;
    }

    update(dt) {
        this.time += dt;
        super.update(dt);
        if (this.wavy) {
            this.y = this.baseY + Math.sin(this.time * this.wavyFreq) * this.wavyAmp;
        }
        this.rotation += this.rotSpeed * dt;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Main body with gradient
        const grad = ctx.createRadialGradient(
            -this.radius * 0.2, -this.radius * 0.2, this.radius * 0.1,
            0, 0, this.radius
        );
        grad.addColorStop(0, this.lightColor);
        grad.addColorStop(0.6, this.baseColor);
        grad.addColorStop(1, this.darkColor);

        ctx.fillStyle = grad;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;

        // Clip to asteroid shape for craters
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Save and clip for internal detail
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.clip();

        // Craters
        for (const c of this.craters) {
            ctx.fillStyle = this.darkColor;
            ctx.beginPath();
            ctx.arc(c.ox, c.oy, c.r, 0, Math.PI * 2);
            ctx.fill();
            // Highlight rim
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(c.ox - c.r * 0.15, c.oy - c.r * 0.15, c.r, -0.8, 1.0);
            ctx.stroke();
        }

        // Surface ridges
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        for (const r of this.ridges) {
            const sx = Math.cos(r.angle) * r.len + r.offset;
            const sy = Math.sin(r.angle) * r.len;
            ctx.beginPath();
            ctx.moveTo(-sx, -sy);
            ctx.quadraticCurveTo(r.offset * 0.5, r.offset * 0.5, sx, sy);
            ctx.stroke();
        }

        ctx.restore(); // unclip

        // Subtle edge highlight (top-left light source)
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.85, -Math.PI * 0.8, -Math.PI * 0.2);
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================================
// EnemyShip (Alien Critter) — Bug-like creature, scurries & spits
// ============================================================
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
export class Bomber extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'bomber';
        this.radius = 22 * GAME_SCALE;
        this.hp = 4;
        this.maxHp = 4;
        this.points = 60;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-70, -35);
        this.vy = 0;

        // Ink bomb drop
        this.shootTimer = Utils.random(1, 2.5);
        this.shootInterval = Utils.random(2, 3.5);
        this.canvas_w = canvasW;

        // Visual
        this.time = 0;
        this.tentacleCount = 6;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.x += this.vx * dt;
        this.time += dt;

        // Undulating vertical drift
        this.vy = Math.sin(this.time * 1.5) * 25;
        this.y += this.vy * dt;

        // Drop ink bombs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.dropBombs(projectilePool, audio);
        }
    }

    dropBombs(projectilePool, audio) {
        // 3-shot spread: ink blobs
        const angles = [-Math.PI * 0.85, -Math.PI, Math.PI * 0.85];
        const speed = 200;
        for (const angle of angles) {
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y + this.radius * 0.5,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#8833cc', '#6622aa', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    // Gore octopus — torn-edged mantle, exposed clacking beak, one cloudy
    // dead eye, ink stains across the body, hooked sucker tips.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Tentacles with hooked sucker tips
        ctx.lineCap = 'round';
        for (let i = 0; i < this.tentacleCount; i++) {
            const angle = (i / this.tentacleCount) * Math.PI * 1.4 + Math.PI * 0.3;
            const wave1 = Math.sin(t * 3 + i * 1.2) * 0.3;
            const wave2 = Math.sin(t * 2.5 + i * 0.8) * 0.2;
            const startX = Math.cos(angle) * r * 0.5;
            const startY = Math.sin(angle) * r * 0.5;
            const midX = Math.cos(angle + wave1) * r * 1.1;
            const midY = Math.sin(angle + wave1) * r * 1.1;
            const endX = Math.cos(angle + wave1 + wave2) * r * 1.6;
            const endY = Math.sin(angle + wave1 + wave2) * r * 1.4;

            ctx.strokeStyle = `hsla(275, 50%, ${30 + i * 3}%, 0.85)`;
            ctx.lineWidth = 3.5 - i * 0.3;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();

            // Hooked sucker at tip — small inward arc
            ctx.strokeStyle = '#220033';
            ctx.lineWidth = 1.5;
            const hookAngle = Math.atan2(endY - midY, endX - midX);
            ctx.beginPath();
            ctx.arc(endX, endY, r * 0.06, hookAngle - 0.5, hookAngle + Math.PI * 0.6);
            ctx.stroke();
        }

        // Mantle — irregular torn-edge polygon (8-point with sin perturbation)
        const mantleGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.15, 0, 0, 0, r * 0.7);
        mantleGrad.addColorStop(0, '#9944cc');
        mantleGrad.addColorStop(0.5, '#5e1a88');
        mantleGrad.addColorStop(1, '#2a0a44');
        ctx.fillStyle = mantleGrad;
        ctx.shadowColor = '#aa44ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        const N = 14;
        for (let i = 0; i < N; i++) {
            const a = (i / N) * Math.PI * 2 - Math.PI * 0.5;
            const tear = 0.85 + 0.15 * Math.sin(a * 5 + t * 0.7) - Math.abs(Math.sin(a * 4 + i)) * 0.1;
            const rx = Math.cos(a) * r * 0.65 * tear;
            const ry = Math.sin(a) * r * 0.55 * tear - r * 0.1;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.fill();

        // Ink stains — irregular dark splotches on the body surface
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15, 0, 25, 0.55)';
        const stains = [
            { x: -r * 0.30, y: -r * 0.10, w: r * 0.13, h: r * 0.09 },
            { x:  r * 0.10, y: -r * 0.30, w: r * 0.10, h: r * 0.07 },
            { x:  r * 0.25, y:  r * 0.08, w: r * 0.08, h: r * 0.06 },
            { x: -r * 0.05, y:  r * 0.15, w: r * 0.11, h: r * 0.05 },
        ];
        for (const s of stains) {
            ctx.beginPath();
            ctx.ellipse(s.x, s.y, s.w, s.h, Math.sin(t + s.x) * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Eyes — one normal, one cloudy/dead. The dead one is on the left.
        ctx.fillStyle = '#222';
        ctx.beginPath(); // socket shadow
        ctx.ellipse(-r * 0.22, -r * 0.05, r * 0.18, r * 0.13, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.05, r * 0.18, r * 0.13, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // LEFT eye — cloudy/dead (light grey-blue, no clear pupil)
        ctx.fillStyle = 'rgba(200, 200, 220, 0.92)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.22, -r * 0.05, r * 0.14, r * 0.10, -0.1, 0, Math.PI * 2);
        ctx.fill();
        // Faint cataract streak
        ctx.fillStyle = 'rgba(230, 230, 240, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.22, -r * 0.06, r * 0.10, r * 0.04, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // RIGHT eye — alive, dilated pupil
        ctx.fillStyle = '#eeddff';
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.05, r * 0.14, r * 0.10, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#110022';
        ctx.beginPath();
        ctx.ellipse(r * 0.18, -r * 0.03, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();

        // Beak — two chitinous triangular pieces clacking together at the mouth
        const clack = Math.sin(t * 6) * 0.18;
        ctx.fillStyle = '#0a0010';
        ctx.strokeStyle = '#332244';
        ctx.lineWidth = 1;
        const beakBaseX = 0;
        const beakBaseY = r * 0.18;
        // Upper beak
        ctx.save();
        ctx.translate(beakBaseX, beakBaseY);
        ctx.rotate(clack);
        ctx.beginPath();
        ctx.moveTo(-r * 0.10, 0);
        ctx.lineTo(0, r * 0.13);
        ctx.lineTo(r * 0.04, 0.0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Lower beak
        ctx.save();
        ctx.translate(beakBaseX, beakBaseY);
        ctx.rotate(-clack);
        ctx.beginPath();
        ctx.moveTo(r * 0.10, 0);
        ctx.lineTo(0, r * 0.13);
        ctx.lineTo(-r * 0.04, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();

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
// SpaceMine (Space Jellyfish) — Drifts, stings on proximity
// ============================================================
export class SpaceMine extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'mine';
        this.radius = 12 * GAME_SCALE;
        this.hp = 1;
        this.maxHp = 1;
        this.points = 20;

        this.x = canvasW + this.radius + Utils.random(10, 80);
        this.y = Utils.random(this.radius + 20, canvasH - this.radius - 20);
        this.vx = Utils.random(-80, -30);
        this.vy = Utils.random(-15, 15);

        // Proximity sting
        this.detonateRadius = 80;
        this.detonated = false;

        // Visual
        this.time = Math.random() * Math.PI * 2;
        this.tentacleCount = Utils.randomInt(5, 8);
        this.hue = Utils.randomInt(300, 340); // pink-magenta
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio, playerX) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.time += dt;

        // Proximity detonation check
        if (playerX !== undefined && playerY !== undefined && !this.detonated) {
            const dist = Utils.distance(this.x, this.y, playerX, playerY);
            if (dist < this.detonateRadius) {
                this.detonate(projectilePool, audio);
            }
        }
    }

    detonate(projectilePool, audio) {
        this.detonated = true;
        // Fire stinger projectiles in a ring
        const count = 8;
        const speed = 220;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#ff66cc', '#ff44aa', true);
            }
        }
        if (audio) audio.playExplosion();
        this.active = false;
    }

    // Severed alien hand — fleshy palm, 6-8 fingers with knuckled joints,
    // bone-spike fingertips, glowing sigil eye in the palm. Drifts palm-first
    // toward the player; on detonate the fingers snap inward.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);

        ctx.save();
        ctx.translate(this.x, this.y);

        // 6-8 fingers, each with 2 knuckle joints and a bone-spike tip.
        // Independent sin phases so they twitch out of sync. Fingers point
        // mostly forward (-X), splayed across an arc.
        const fingerCount = this.tentacleCount;
        const fleshDark  = 'hsl(130, 25%, 18%)';
        const fleshMid   = 'hsl(130, 22%, 28%)';
        ctx.lineCap = 'round';
        for (let i = 0; i < fingerCount; i++) {
            const splay = ((i / (fingerCount - 1)) - 0.5) * Math.PI * 1.0;
            const baseAngle = Math.PI + splay; // forward = -X
            const phase = i * 1.4 + t * 1.5;
            const twitch = Math.sin(phase) * 0.15;
            const lengthMul = 1.0 + 0.3 * Math.sin(t * 0.7 + i);

            // Bone segment 1 (palm → knuckle)
            const seg1 = r * 0.7 * lengthMul;
            const k1x = Math.cos(baseAngle + twitch) * seg1;
            const k1y = Math.sin(baseAngle + twitch) * seg1;

            // Bone segment 2 (knuckle → next knuckle)
            const seg2 = r * 0.5 * lengthMul;
            const k2x = k1x + Math.cos(baseAngle + twitch * 1.5 + 0.2) * seg2;
            const k2y = k1y + Math.sin(baseAngle + twitch * 1.5 + 0.2) * seg2;

            // Tip
            const seg3 = r * 0.35 * lengthMul;
            const tipX = k2x + Math.cos(baseAngle + twitch * 2.0) * seg3;
            const tipY = k2y + Math.sin(baseAngle + twitch * 2.0) * seg3;

            // Finger shaft
            ctx.strokeStyle = fleshDark;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(k1x, k1y);
            ctx.lineTo(k2x, k2y);
            ctx.lineTo(tipX, tipY);
            ctx.stroke();

            // Knuckle nodes
            ctx.fillStyle = fleshMid;
            ctx.beginPath(); ctx.arc(k1x, k1y, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(k2x, k2y, 2.0, 0, Math.PI * 2); ctx.fill();

            // Bone-spike tip — small triangle pointing outward
            ctx.fillStyle = '#bfbfa8';
            const tipAngle = Math.atan2(tipY - k2y, tipX - k2x);
            const spikeLen = r * 0.10;
            ctx.beginPath();
            ctx.moveTo(tipX + Math.cos(tipAngle) * spikeLen, tipY + Math.sin(tipAngle) * spikeLen);
            ctx.lineTo(tipX + Math.cos(tipAngle + 1.6) * 1.5, tipY + Math.sin(tipAngle + 1.6) * 1.5);
            ctx.lineTo(tipX + Math.cos(tipAngle - 1.6) * 1.5, tipY + Math.sin(tipAngle - 1.6) * 1.5);
            ctx.closePath();
            ctx.fill();
        }

        // Palm — irregular fleshy oval with subtle shadow
        const palmGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7);
        palmGrad.addColorStop(0, fleshMid);
        palmGrad.addColorStop(0.7, fleshDark);
        palmGrad.addColorStop(1, '#0e1812');
        ctx.fillStyle = palmGrad;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.65, r * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sigil eye in the palm — glowing detonation warning
        ctx.shadowBlur = 0;
        const sigilColor = `rgba(180, 255, 120, ${0.35 + 0.4 * pulse})`;
        ctx.fillStyle = sigilColor;
        ctx.shadowColor = '#88ff44';
        ctx.shadowBlur = 8 * pulse;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.18, r * 0.10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner pupil
        ctx.fillStyle = '#0a1a04';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.05, 0, Math.PI * 2);
        ctx.fill();
        // Sigil radial ticks (4 short lines around the eye)
        ctx.strokeStyle = `rgba(180, 255, 120, ${0.4 + 0.3 * pulse})`;
        ctx.lineWidth = 1;
        for (let s = 0; s < 4; s++) {
            const a = (s / 4) * Math.PI * 2;
            const ix = Math.cos(a) * r * 0.22;
            const iy = Math.sin(a) * r * 0.13;
            const ox = Math.cos(a) * r * 0.32;
            const oy = Math.sin(a) * r * 0.20;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ox, oy);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ============================================================
// StealthFighter (Space Chameleon) — Color-shifting lizard alien
// ============================================================
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
export class AlienDevil extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'devil';
        this.radius = 18 * GAME_SCALE;
        this.hp = 4;
        this.maxHp = 4;
        this.points = 55;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-80, -40);
        this.vy = 0;
        this.canvasH = canvasH;
        this.canvas_w = canvasW;

        // Charge attack
        this.chargeTimer = Utils.random(1.5, 3);
        this.chargeInterval = Utils.random(2.5, 4);
        this.charging = false;
        this.chargeSpeed = 0;
        this.normalVx = this.vx;

        // Shoot fireballs
        this.shootTimer = Utils.random(1, 2);
        this.shootInterval = Utils.random(1.5, 2.5);

        // Visual
        this.time = 0;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.time += dt;

        if (this.charging) {
            this.x += this.chargeSpeed * dt;
            // Charging lasts briefly then returns to normal
            this.chargeSpeed *= 0.98;
            if (Math.abs(this.chargeSpeed) < 50) {
                this.charging = false;
                this.vx = this.normalVx;
            }
        } else {
            this.x += this.vx * dt;

            // Drift toward player Y aggressively
            if (playerY !== undefined) {
                const diff = playerY - this.y;
                this.vy = Utils.clamp(diff, -1, 1) * 120;
                this.y += this.vy * dt;
                this.y = Utils.clamp(this.y, this.radius + 10, this.canvasH - this.radius - 10);
            }

            // Charge attack
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0 && this.x < this.canvas_w - 100) {
                this.chargeTimer = this.chargeInterval;
                this.charging = true;
                this.chargeSpeed = -400; // fast burst toward player
            }
        }

        // Shoot fireballs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    -280, Utils.random(-60, 60),
                    '#ff4400', '#ff6600', true);
            }
            if (audio) audio.playEnemyLaser();
        }
    }

    // Body-horror devil — keeps the original silhouette but adds a dorsal
    // spine ridge, glowing lava cracks seeping through the skin, bone-grooved
    // horns, drifting embers, and a face contortion (squashed eyes + jaw
    // forward) during charging.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Drifting ash/ember particles rising from the head — drawn first
        // (behind everything else)
        ctx.fillStyle = `rgba(255, 180, 80, ${0.6 * fireFlicker})`;
        ctx.shadowColor = '#ffaa44';
        ctx.shadowBlur = 4;
        for (let i = 0; i < 4; i++) {
            const phase = i * 1.7 + t * 1.4;
            const ex = Math.sin(phase) * r * 0.35;
            const ey = -r * 1.0 - ((phase * 0.6) % 1) * r * 0.6;
            const er = r * (0.025 + 0.015 * Math.sin(phase * 2));
            ctx.beginPath();
            ctx.arc(ex, ey, er, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Fiery aura
        ctx.fillStyle = `rgba(255, 60, 0, ${0.15 * fireFlicker})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Dorsal spine ridge — 5 small triangular spines along the top of the head
        ctx.fillStyle = '#660800';
        ctx.strokeStyle = '#330400';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        for (let i = 0; i < 5; i++) {
            const sx = -r * 0.40 + i * r * 0.20;
            const sh = r * (0.18 - Math.abs(i - 2) * 0.04); // taller in the middle
            ctx.beginPath();
            ctx.moveTo(sx - r * 0.06, -r * 0.55);
            ctx.lineTo(sx, -r * 0.55 - sh);
            ctx.lineTo(sx + r * 0.06, -r * 0.55);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }

        // Apply a charge contortion transform to the head + face.
        ctx.save();
        if (this.charging) {
            ctx.scale(1.15, 0.9);
        }

        // Horns
        ctx.strokeStyle = '#cc2200';
        ctx.fillStyle = '#aa1100';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 2;
        // Left horn
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, -r * 0.5);
        ctx.quadraticCurveTo(-r * 0.6, -r * 1.3, -r * 0.15, -r * 1.1);
        ctx.lineTo(-r * 0.2, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Right horn
        ctx.beginPath();
        ctx.moveTo(r * 0.3, -r * 0.5);
        ctx.quadraticCurveTo(r * 0.6, -r * 1.3, r * 0.15, -r * 1.1);
        ctx.lineTo(r * 0.2, -r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Bone groove lines on each horn (texture)
        ctx.strokeStyle = 'rgba(60, 0, 0, 0.7)';
        ctx.lineWidth = 0.6;
        ctx.shadowBlur = 0;
        for (const sign of [-1, 1]) {
            for (let g = 0; g < 2; g++) {
                const baseX = sign * r * 0.25;
                const baseY = -r * (0.65 + g * 0.20);
                const tipX = sign * r * 0.18;
                const tipY = -r * (0.85 + g * 0.10);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(tipX, tipY);
                ctx.stroke();
            }
        }

        // Head body — dark red
        const headGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.8);
        headGrad.addColorStop(0, '#881100');
        headGrad.addColorStop(0.7, '#550808');
        headGrad.addColorStop(1, '#220000');
        ctx.fillStyle = headGrad;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 6 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Cracked-skin lava glow seeping through — 4 jagged crack lines drawn
        // with a bright glowing stroke. The cracks pulse with fireFlicker.
        ctx.strokeStyle = `rgba(255, 100, 0, ${fireFlicker * 0.55})`;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 6 * fireFlicker;
        ctx.lineWidth = 1.5;
        const cracks = [
            [[-r * 0.45, -r * 0.20], [-r * 0.20, -r * 0.05], [-r * 0.30, r * 0.18]],
            [[ r * 0.40, -r * 0.18], [ r * 0.20, -r * 0.05], [ r * 0.35, r * 0.08]],
            [[-r * 0.10,  r * 0.30], [ r * 0.05,  r * 0.20], [ r * 0.15,  r * 0.45]],
            [[-r * 0.20,  r * 0.10], [ r * 0.00,  r * 0.05], [ r * 0.10,  r * 0.20]],
        ];
        for (const c of cracks) {
            ctx.beginPath();
            ctx.moveTo(c[0][0], c[0][1]);
            ctx.lineTo(c[1][0], c[1][1]);
            ctx.lineTo(c[2][0], c[2][1]);
            ctx.stroke();
        }

        // Glowing eyes — menacing yellow-red. Squashed (more horizontal) when charging.
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        const eyeYScale = this.charging ? 0.5 : 1.0;
        ctx.shadowBlur = 10 * eyeGlow;
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ffaa00';
        ctx.save();
        ctx.translate(-r * 0.25, -r * 0.15);
        ctx.rotate(-0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08 * eyeYScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(r * 0.2, -r * 0.15);
        ctx.rotate(0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08 * eyeYScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mouth — jagged evil grin. Pushed forward when charging.
        const jawForward = this.charging ? r * 0.08 : 0;
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 + 0.4 * fireFlicker})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.2 + jawForward);
        for (let i = 0; i < 5; i++) {
            const mx = -r * 0.35 + (i + 0.5) * (r * 0.7 / 5);
            const my = r * 0.2 + jawForward + (i % 2 === 0 ? r * 0.15 : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.35, r * 0.2 + jawForward);
        ctx.stroke();

        ctx.restore(); // end charge-contortion transform

        // Flame trail when charging (drawn outside the contortion so it
        // doesn't get squashed)
        if (this.charging) {
            ctx.fillStyle = `rgba(255, 80, 0, ${0.5 * fireFlicker})`;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(r * 0.6, -r * 0.2);
            ctx.lineTo(r * 1.5 + Math.random() * r * 0.5, 0);
            ctx.lineTo(r * 0.6, r * 0.2);
            ctx.closePath();
            ctx.fill();
        }

        // Health bar
        if (this.hp < this.maxHp) {
            const barW = r * 1.5;
            const barH = 3;
            const frac = this.hp / this.maxHp;
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, -r * 1.2 - 10, barW, barH);
            ctx.fillStyle = frac > 0.5 ? '#00ff66' : '#ff3366';
            ctx.fillRect(-barW / 2, -r * 1.2 - 10, barW * frac, barH);
        }

        ctx.restore();
    }
}

// ============================================================
// Boss — Large, multi-phase boss with cycling attack patterns
// ============================================================
// Themed names per bossType (0-9), used by HUD preview at phase transition.
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
export const PHASES = [
    // Re-pushed ~5x for early phases — combo + power-combo + pierce-bug fix
    // changed the kill rate enough that the previous numbers blew through 5
    // phases in ~30s. New curve targets ~2 minutes for phases 1-5.
    { name: 'ASTEROID FIELD',     threshold: 0,     featured: 'asteroid',  color: '#aa7733' },
    { name: 'CRITTER COLONY',     threshold: 3000,  featured: 'ship',      color: '#ff6644' },
    { name: 'FIREFLY SWARM',      threshold: 6500,  featured: 'drone',     color: '#44ff66' },
    { name: 'JELLYFISH DRIFT',    threshold: 11000, featured: 'mine',      color: '#ff88cc' },
    { name: 'ARACHNID SECTOR',    threshold: 17000, featured: 'spider',    color: '#66ff22' },
    { name: 'GHOST NEBULA',       threshold: 24000, featured: 'ghost',     color: '#bb66ff' },
    { name: 'OCTOPUS DEN',        threshold: 32000, featured: 'bomber',    color: '#cc44ff' },
    { name: 'CHAMELEON VOID',     threshold: 41000, featured: 'stealth',   color: '#00cccc' },
    { name: 'DEVIL\'S DOMAIN',    threshold: 52000, featured: 'devil',     color: '#ff4400' },
    { name: 'TOTAL CHAOS',        threshold: 65000, featured: 'all',       color: '#ff3366' }
];

export class EnemySpawner {
    constructor(assets) {
        this.assets = assets || {};
        this.timer = 0;
        this.baseInterval = 2.2;
        this.enemies = [];
        this.currentPhase = 0;
        this.phaseAnnouncedAt = -1; // score when last announcement was shown
    }

    getPhase(score) {
        for (let i = PHASES.length - 1; i >= 0; i--) {
            if (score >= PHASES[i].threshold) return i;
        }
        return 0;
    }

    update(dt, score, canvasW, canvasH, projectilePool, playerY, audio, playerX) {
        this.timer -= dt;

        // Phase check
        const phase = this.getPhase(score);
        if (phase !== this.currentPhase) {
            this.currentPhase = phase;
            this.phaseAnnouncedAt = score;
        }

        const phaseInfo = PHASES[this.currentPhase];
        // Smooth exponential spawn interval — no cliff between phases
        const interval = Math.max(0.45, 2.2 * Math.pow(0.82, phase));
        const largeTier = phase >= 5 ? 0.2 : 0;

        if (this.timer <= 0) {
            this.timer = interval + Utils.random(-0.3, 0.3);

            const roll = Math.random();
            const featured = phaseInfo.featured;

            // 15% chance for formation spawn in eligible phases
            if (phase >= 2 && Math.random() < 0.15) {
                this.spawnFormation(phase, canvasW, canvasH);
            }
            // 65% chance to spawn the featured enemy, rest is mixed
            else if (featured !== 'all' && roll < 0.65) {
                this.spawnByType(featured, canvasW, canvasH, largeTier);
            } else {
                this.spawnMixed(score, canvasW, canvasH, largeTier);
            }

            // Phase 10 (TOTAL CHAOS): double spawn
            if (phase >= 9) {
                this.spawnMixed(score, canvasW, canvasH, 0.4);
            }

            // Phase 5+: chance to spawn enemies from behind
            if (phase >= 4 && Math.random() < (phase >= 9 ? 0.4 : 0.2)) {
                const behindPool = ['drone', 'asteroid'];
                if (phase >= 7) behindPool.push('ship');
                const pick = behindPool[Utils.randomInt(0, behindPool.length - 1)];
                const e = this._spawnFromBehind(pick, canvasW, canvasH);
                if (e) this.enemies.push(e);
            }
        }

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            switch (e.type) {
                case 'ship':
                case 'bomber':
                case 'spider':
                case 'devil':
                case 'boss':
                    e.update(dt, playerY, projectilePool, audio);
                    break;
                case 'mine':
                    e.update(dt, playerY, projectilePool, audio, playerX);
                    break;
                default:
                    e.update(dt);
            }
            if (!e.active || e.isOffScreen(canvasW, canvasH)) {
                this.enemies.splice(i, 1);
            }
        }
    }

    spawnByType(type, canvasW, canvasH, largeTier) {
        switch (type) {
            case 'asteroid': {
                const sizeMul = Math.random() < 0.4 ? Utils.random(1.5, 2.0) : 1;
                this.enemies.push(new Asteroid(canvasW, canvasH, sizeMul));
                break;
            }
            case 'drone': {
                const count = Utils.randomInt(3, 5);
                for (let i = 0; i < count; i++) {
                    this.enemies.push(new Drone(canvasW, canvasH, i * 15 - count * 7));
                }
                break;
            }
            case 'spider':
                const sp = new SpiderDrone(canvasW, canvasH);
                sp.canvas_w = canvasW;
                this.enemies.push(sp);
                break;
            case 'ghost':
                this.enemies.push(new AlienGhost(canvasW, canvasH));
                break;
            case 'bomber': {
                const b = new Bomber(canvasW, canvasH);
                b.canvas_w = canvasW;
                this.enemies.push(b);
                break;
            }
            case 'stealth':
                this.enemies.push(new StealthFighter(canvasW, canvasH));
                break;
            case 'devil': {
                const d = new AlienDevil(canvasW, canvasH);
                d.canvas_w = canvasW;
                this.enemies.push(d);
                break;
            }
            case 'ship': {
                const tier = Math.random() < largeTier ? 2 : 1;
                const ship = new EnemyShip(canvasW, canvasH, tier, this.assets);
                ship.canvas_w = canvasW;
                this.enemies.push(ship);
                break;
            }
            case 'mine':
                this.enemies.push(new SpaceMine(canvasW, canvasH));
                break;
        }
    }

    spawnMixed(score, canvasW, canvasH, largeTier) {
        // Build pool of available types — matches phase thresholds
        const pool = ['asteroid'];
        if (score >= 600)   pool.push('ship');
        if (score >= 1000)  pool.push('drone');
        if (score >= 1800)  pool.push('mine');
        if (score >= 2800)  pool.push('spider');
        if (score >= 4000)  pool.push('ghost');
        if (score >= 5500)  pool.push('bomber');
        if (score >= 7500)  pool.push('stealth');
        if (score >= 10000) pool.push('devil');

        const pick = pool[Utils.randomInt(0, pool.length - 1)];
        this.spawnByType(pick, canvasW, canvasH, largeTier);
    }

    _spawnFromBehind(type, canvasW, canvasH) {
        const y = Utils.random(30, canvasH - 30);
        switch (type) {
            case 'asteroid': {
                const a = new Asteroid(canvasW, canvasH, 1, -30, y);
                a.vx = Utils.random(80, 160); // flies rightward
                return a;
            }
            case 'drone': {
                const d = new Drone(canvasW, canvasH, 0);
                d.x = -20;
                d.y = y;
                d.vx = Utils.random(180, 260); // fast rightward
                d.baseY = y;
                return d;
            }
            case 'ship': {
                const s = new EnemyShip(canvasW, canvasH, 1, this.assets);
                s.x = -20;
                s.y = y;
                s.vx = Utils.random(60, 120);
                s.canvas_w = canvasW;
                return s;
            }
        }
        return null;
    }

    spawnFormation(phase, canvasW, canvasH) {
        const formations = ['v'];
        if (phase >= 3) formations.push('wall');
        if (phase >= 5) formations.push('pincer');
        if (phase >= 7) formations.push('spiral');
        const type = formations[Utils.randomInt(0, formations.length - 1)];
        const baseSpeed = Utils.random(-140, -90);
        const centerY = canvasH / 2;

        switch (type) {
            case 'v': {
                const count = Utils.randomInt(5, 7);
                for (let i = 0; i < count; i++) {
                    const offset = i - Math.floor(count / 2);
                    const d = new Drone(canvasW, canvasH, 0);
                    d.x = canvasW + 20 + Math.abs(offset) * 25;
                    d.y = centerY + offset * 30;
                    d.vx = baseSpeed;
                    d.baseY = d.y;
                    d.wavyAmp = 5;
                    this.enemies.push(d);
                }
                break;
            }
            case 'wall': {
                const count = Utils.randomInt(4, 6);
                const spacing = (canvasH - 80) / (count - 1);
                for (let i = 0; i < count; i++) {
                    const a = new Asteroid(canvasW, canvasH, 0.8);
                    a.x = canvasW + 30;
                    a.y = 40 + i * spacing;
                    a.vx = baseSpeed * 0.7;
                    a.wavy = false;
                    a.baseY = a.y;
                    this.enemies.push(a);
                }
                break;
            }
            case 'pincer': {
                for (let side = -1; side <= 1; side += 2) {
                    for (let i = 0; i < 3; i++) {
                        const s = new EnemyShip(canvasW, canvasH, 1, this.assets);
                        s.x = canvasW + 20 + i * 30;
                        s.y = side > 0 ? 30 + i * 20 : canvasH - 30 - i * 20;
                        s.vx = baseSpeed;
                        s.canvas_w = canvasW;
                        this.enemies.push(s);
                    }
                }
                break;
            }
            case 'spiral': {
                const count = 8;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const d = new Drone(canvasW, canvasH, 0);
                    d.x = canvasW + 40 + Math.cos(angle) * 60;
                    d.y = centerY + Math.sin(angle) * 80;
                    d.vx = baseSpeed;
                    d.baseY = d.y;
                    d.wavyAmp = 10;
                    d.wavyFreq = 2;
                    this.enemies.push(d);
                }
                break;
            }
        }
    }

    draw(ctx) {
        for (const e of this.enemies) {
            if (e.active) e.draw(ctx);
        }
    }

    reset() {
        this.enemies = [];
        this.timer = 3; // grace period at start
    }
}
