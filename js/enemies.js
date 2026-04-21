// ============================================================
// enemies.js — Asteroids and enemy ships
// ============================================================

// --- Base enemy ---
class Enemy {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 15;
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
class Asteroid extends Enemy {
    constructor(canvasW, canvasH, sizeMultiplier = 1, spawnX, spawnY) {
        super();
        this.type = 'asteroid';
        const baseRadius = Utils.random(12, 28) * sizeMultiplier;
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
// EnemyShip — Triangular ship that shoots back, 2-3 HP
// ============================================================
class EnemyShip extends Enemy {
    constructor(canvasW, canvasH, tier = 1, assets = {}) {
        super();
        this.assets = assets;
        this.type = 'ship';
        this.tier = tier; // 1 = small, 2 = large
        this.radius = tier === 1 ? 16 : 24;
        this.hp = tier === 1 ? 2 : 3;
        this.maxHp = this.hp;
        this.points = tier === 1 ? 25 : 50;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 30, canvasH - this.radius - 30);
        this.vx = Utils.random(-120, -50);
        this.vy = 0;

        // Tracking behaviour — drift toward player y
        this.trackSpeed = Utils.random(40, 100);
        this.shootTimer = Utils.random(0.5, 2);
        this.shootInterval = tier === 1 ? Utils.random(1.5, 3) : Utils.random(1, 2);
        this.active = true;

        // Visual
        this.engineFlicker = 0;
        this.hue = tier === 1 ? Utils.randomInt(320, 360) : Utils.randomInt(260, 290);
    }

    update(dt, playerY, projectilePool, audio) {
        super.update(dt);
        this.engineFlicker += dt * 20;

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

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x, this.y);

        const r = this.radius;
        const flicker = 0.7 + 0.3 * Math.sin(this.engineFlicker);

        // Engine glow (always drawn)
        ctx.fillStyle = `rgba(255, 50, 50, ${0.3 * flicker})`;
        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 8 * flicker;
        ctx.beginPath();
        ctx.moveTo(r * 0.3, -3);
        ctx.lineTo(r * 0.3 + 10 * flicker, 0);
        ctx.lineTo(r * 0.3, 3);
        ctx.closePath();
        ctx.fill();

        // Ship body — sprite or Canvas fallback
        const spriteKey = this.tier === 2 ? 'enemyLarge' : 'enemySmall';
        if (this.assets[spriteKey]) {
            const img = this.assets[spriteKey];
            const drawH = r * 2.2;
            const drawW = drawH * (img.width / img.height);
            ctx.save();
            ctx.rotate(-Math.PI / 2); // sprite faces up → rotate to face left
            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();
        } else {
            const hsl = `hsl(${this.hue}, 100%, 50%)`;
            const hslDim = `hsl(${this.hue}, 80%, 30%)`;

            ctx.fillStyle = hslDim;
            ctx.strokeStyle = hsl;
            ctx.shadowColor = hsl;
            ctx.shadowBlur = 6;
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.moveTo(-r, 0);
            ctx.lineTo(r * 0.4, -r * 0.7);
            ctx.lineTo(r * 0.3, 0);
            ctx.lineTo(r * 0.4, r * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = hsl;
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(-r * 0.3, 0, r * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }

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
// Drone — Tiny, fast, sine-wave flight, appears in groups
// ============================================================
class Drone extends Enemy {
    constructor(canvasW, canvasH, offsetY = 0) {
        super();
        this.type = 'drone';
        this.radius = 8;
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
        this.hue = Utils.randomInt(90, 140); // green family
        this.active = true;
    }

    update(dt) {
        this.time += dt;
        this.pulseTime += dt;
        this.x += this.vx * dt;
        this.y = this.baseY + Math.sin(this.time * this.wavyFreq) * this.wavyAmp;
    }

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const pulse = 0.7 + 0.3 * Math.sin(this.pulseTime * 8);
        const hsl = `hsl(${this.hue}, 100%, 55%)`;
        const hslDim = `hsl(${this.hue}, 80%, 30%)`;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Diamond body
        ctx.fillStyle = hslDim;
        ctx.strokeStyle = hsl;
        ctx.shadowColor = hsl;
        ctx.shadowBlur = 6 * pulse;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(0, -r * 0.6);
        ctx.lineTo(r, 0);
        ctx.lineTo(0, r * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Core glow
        ctx.fillStyle = hsl;
        ctx.shadowBlur = 4 * pulse;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
// Bomber — Slow, heavy, drops spread projectiles
// ============================================================
class Bomber extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'bomber';
        this.radius = 22;
        this.hp = 4;
        this.maxHp = 4;
        this.points = 60;

        this.x = canvasW + this.radius + Utils.random(10, 60);
        this.y = Utils.random(this.radius + 50, canvasH - this.radius - 50);
        this.vx = Utils.random(-70, -35);
        this.vy = 0;

        // Bomb drop
        this.shootTimer = Utils.random(1, 2.5);
        this.shootInterval = Utils.random(2, 3.5);
        this.canvas_w = canvasW;

        // Visual
        this.engineTime = 0;
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio) {
        this.x += this.vx * dt;
        this.engineTime += dt * 10;

        // Slow vertical drift
        this.vy = Math.sin(this.engineTime * 0.3) * 20;
        this.y += this.vy * dt;

        // Drop bombs
        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && this.x < this.canvas_w - 50) {
            this.shootTimer = this.shootInterval;
            this.dropBombs(projectilePool, audio);
        }
    }

    dropBombs(projectilePool, audio) {
        // 3-shot spread: left, down-left, down
        const angles = [-Math.PI * 0.85, -Math.PI, Math.PI * 0.85];
        const speed = 200;
        for (const angle of angles) {
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y + this.radius * 0.5,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#ff8800', '#ff6600', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const flicker = 0.7 + 0.3 * Math.sin(this.engineTime);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Engine glow
        ctx.fillStyle = `rgba(255, 120, 0, ${0.4 * flicker})`;
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 8 * flicker;
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -5);
        ctx.lineTo(r * 0.5 + 12 * flicker, 0);
        ctx.lineTo(r * 0.5, 5);
        ctx.closePath();
        ctx.fill();

        // Bulky hull — wide hexagonal shape
        ctx.fillStyle = '#3a2050';
        ctx.strokeStyle = '#aa55ff';
        ctx.shadowColor = '#aa55ff';
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(-r, 0);
        ctx.lineTo(-r * 0.6, -r * 0.8);
        ctx.lineTo(r * 0.3, -r * 0.7);
        ctx.lineTo(r * 0.5, 0);
        ctx.lineTo(r * 0.3, r * 0.7);
        ctx.lineTo(-r * 0.6, r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bomb bay indicator
        ctx.fillStyle = '#ff8800';
        ctx.shadowColor = '#ff8800';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(-r * 0.2, 0, r * 0.15, 0, Math.PI * 2);
        ctx.fill();

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
// SpaceMine — Drifts slowly, detonates near player
// ============================================================
class SpaceMine extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'mine';
        this.radius = 12;
        this.hp = 1;
        this.maxHp = 1;
        this.points = 20;

        this.x = canvasW + this.radius + Utils.random(10, 80);
        this.y = Utils.random(this.radius + 20, canvasH - this.radius - 20);
        this.vx = Utils.random(-80, -30);
        this.vy = Utils.random(-15, 15);

        // Proximity detonation
        this.detonateRadius = 80;
        this.detonated = false;

        // Visual
        this.pulseTime = Math.random() * Math.PI * 2;
        this.spikes = Utils.randomInt(6, 10);
        this.rotation = 0;
        this.rotSpeed = Utils.random(-2, 2);
        this.active = true;
    }

    update(dt, playerY, projectilePool, audio, playerX) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.pulseTime += dt;
        this.rotation += this.rotSpeed * dt;

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
        // Fire projectiles in a ring
        const count = 8;
        const speed = 220;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const p = projectilePool.get();
            if (p) {
                p.init(this.x, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    '#ff2222', '#ff4444', true);
            }
        }
        if (audio) audio.playExplosion();
        this.active = false;
    }

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 4);
        const dangerPulse = 0.6 + 0.4 * Math.sin(this.pulseTime * 6);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Outer warning ring
        ctx.strokeStyle = `rgba(255, 40, 40, ${pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        // Spiky body
        ctx.fillStyle = `hsl(0, 70%, ${25 + 10 * dangerPulse}%)`;
        ctx.strokeStyle = `rgba(255, 80, 80, ${0.6 + 0.4 * dangerPulse})`;
        ctx.shadowColor = '#ff3333';
        ctx.shadowBlur = 6 * dangerPulse;
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 0; i < this.spikes * 2; i++) {
            const angle = (i / (this.spikes * 2)) * Math.PI * 2;
            const spikeR = i % 2 === 0 ? r : r * 0.55;
            const sx = Math.cos(angle) * spikeR;
            const sy = Math.sin(angle) * spikeR;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Blinking center light
        ctx.fillStyle = dangerPulse > 0.8 ? '#ff4444' : '#881111';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = dangerPulse > 0.8 ? 10 : 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
// StealthFighter — Fast, fades in/out, zigzag movement
// ============================================================
class StealthFighter extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'stealth';
        this.radius = 14;
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

        // Stealth cloak
        this.time = 0;
        this.cloakCycle = Utils.random(2, 4); // seconds per cloak cycle
        this.active = true;
    }

    update(dt) {
        this.time += dt;
        this.x += this.vx * dt;

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
        // Oscillate between nearly invisible and semi-visible
        const t = (this.time % this.cloakCycle) / this.cloakCycle;
        // Visible for a brief window, invisible most of the time
        const wave = Math.sin(t * Math.PI * 2);
        return wave > 0.3 ? 0.15 + 0.85 * ((wave - 0.3) / 0.7) : 0.15;
    }

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const alpha = this.getAlpha();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = alpha;

        // Sleek angular ship
        ctx.fillStyle = '#1a3a4a';
        ctx.strokeStyle = '#00cccc';
        ctx.shadowColor = '#00cccc';
        ctx.shadowBlur = 8 * alpha;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(-r * 1.1, 0);
        ctx.lineTo(-r * 0.2, -r * 0.5);
        ctx.lineTo(r * 0.5, -r * 0.3);
        ctx.lineTo(r * 0.5, r * 0.3);
        ctx.lineTo(-r * 0.2, r * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing eye
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(-r * 0.3, 0, r * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;

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
class SpiderDrone extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'spider';
        this.radius = 16;
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

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Legs — 4 per side, animated with alternating gait
        ctx.strokeStyle = '#66aa33';
        ctx.shadowColor = '#44ff22';
        ctx.shadowBlur = 3;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';

        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < this.legCount; i++) {
                const phase = this.legPhaseOffset + i * 0.8 + (side > 0 ? Math.PI : 0);
                const legWave = Math.sin(t * 8 + phase) * 0.3;

                // Leg joint positions
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

        // Body — bulbous abdomen + thorax
        ctx.shadowBlur = 0;

        // Abdomen (rear, larger)
        const abdGrad = ctx.createRadialGradient(r * 0.15, 0, 0, r * 0.15, 0, r * 0.55);
        abdGrad.addColorStop(0, '#445522');
        abdGrad.addColorStop(0.6, '#2a3311');
        abdGrad.addColorStop(1, '#111800');
        ctx.fillStyle = abdGrad;
        ctx.beginPath();
        ctx.ellipse(r * 0.15, 0, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Abdomen markings — toxic pattern
        ctx.fillStyle = 'rgba(120, 200, 50, 0.3)';
        ctx.beginPath();
        ctx.ellipse(r * 0.25, 0, r * 0.15, r * 0.2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.05, -r * 0.1, r * 0.08, r * 0.1, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Thorax (front, smaller)
        const thorGrad = ctx.createRadialGradient(-r * 0.35, 0, 0, -r * 0.35, 0, r * 0.35);
        thorGrad.addColorStop(0, '#3a4a1a');
        thorGrad.addColorStop(1, '#1a2208');
        ctx.fillStyle = thorGrad;
        ctx.beginPath();
        ctx.ellipse(-r * 0.35, 0, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes — multiple, glowing red
        const eyeGlow = 0.6 + 0.4 * Math.sin(this.eyePulse * 5);
        ctx.fillStyle = `rgba(255, 20, 20, ${eyeGlow})`;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 6 * eyeGlow;

        // Main eyes (2 large)
        ctx.beginPath();
        ctx.arc(-r * 0.55, -r * 0.1, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-r * 0.55, r * 0.1, r * 0.08, 0, Math.PI * 2);
        ctx.fill();

        // Secondary eyes (4 smaller)
        ctx.fillStyle = `rgba(255, 80, 20, ${eyeGlow * 0.7})`;
        ctx.shadowBlur = 3 * eyeGlow;
        const smallEyes = [
            [-r * 0.6, -r * 0.2], [-r * 0.6, r * 0.2],
            [-r * 0.48, -r * 0.18], [-r * 0.48, r * 0.18]
        ];
        for (const [ex, ey] of smallEyes) {
            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.04, 0, Math.PI * 2);
            ctx.fill();
        }

        // Mandibles — small pincers
        ctx.strokeStyle = '#88aa44';
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
class AlienGhost extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'ghost';
        this.radius = 14;
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

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;

        // Teleport flash
        if (this.teleportFlash > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = `rgba(180, 100, 255, ${this.teleportFlash})`;
            ctx.shadowColor = '#bb66ff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Ghostly transparency oscillation
        const alphaBase = 0.3 + 0.3 * Math.sin(t * 2);

        // Wispy tail
        ctx.globalAlpha = alphaBase * 0.5;
        ctx.fillStyle = '#8844cc';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const tailX = r * 0.3 + i * r * 0.25;
            const tailY = Math.sin(t * 3 + i) * r * 0.3;
            const tailLen = r * (0.5 + 0.2 * Math.sin(t * 2 + i));
            ctx.moveTo(tailX, tailY - r * 0.1);
            ctx.quadraticCurveTo(tailX + tailLen * 0.5, tailY + r * 0.1, tailX + tailLen, tailY + r * 0.3);
            ctx.quadraticCurveTo(tailX + tailLen * 0.5, tailY - r * 0.1, tailX, tailY + r * 0.1);
        }
        ctx.fill();

        // Main body — rounded blob shape
        ctx.globalAlpha = alphaBase;
        const bodyGrad = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r);
        bodyGrad.addColorStop(0, 'rgba(200, 150, 255, 0.8)');
        bodyGrad.addColorStop(0.5, 'rgba(130, 80, 200, 0.5)');
        bodyGrad.addColorStop(1, 'rgba(80, 40, 150, 0.1)');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r * 0.8, Math.PI, 0);
        ctx.quadraticCurveTo(r * 0.8, r * 0.5, r * 0.3, r * 0.6);
        ctx.quadraticCurveTo(0, r * 0.8, -r * 0.3, r * 0.6);
        ctx.quadraticCurveTo(-r * 0.8, r * 0.5, -r * 0.8, 0);
        ctx.fill();

        // Eyes — hollow, menacing
        ctx.globalAlpha = alphaBase + 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#cc88ff';
        ctx.shadowBlur = 8;
        // Left eye
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.15, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.ellipse(r * 0.15, -r * 0.15, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Dark pupils
        ctx.fillStyle = '#220044';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, -r * 0.1, r * 0.07, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.15, -r * 0.1, r * 0.07, r * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mouth — eerie grin
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, r * 0.1, r * 0.25, 0.2, Math.PI - 0.2);
        ctx.stroke();

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
class AlienDevil extends Enemy {
    constructor(canvasW, canvasH) {
        super();
        this.type = 'devil';
        this.radius = 18;
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

    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const fireFlicker = 0.7 + 0.3 * Math.sin(t * 12);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Fiery aura
        ctx.fillStyle = `rgba(255, 60, 0, ${0.15 * fireFlicker})`;
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 15 * fireFlicker;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
        ctx.fill();

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

        // Glowing eyes — menacing yellow-red
        const eyeGlow = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.fillStyle = `rgba(255, 200, 0, ${eyeGlow})`;
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 10 * eyeGlow;
        // Slanted evil eyes
        ctx.save();
        ctx.translate(-r * 0.25, -r * 0.15);
        ctx.rotate(-0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(r * 0.2, -r * 0.15);
        ctx.rotate(0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.15, r * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mouth — jagged evil grin
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 + 0.4 * fireFlicker})`;
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, r * 0.2);
        for (let i = 0; i < 5; i++) {
            const mx = -r * 0.35 + (i + 0.5) * (r * 0.7 / 5);
            const my = r * 0.2 + (i % 2 === 0 ? r * 0.15 : 0);
            ctx.lineTo(mx, my);
        }
        ctx.lineTo(r * 0.35, r * 0.2);
        ctx.stroke();

        // Flame trail when charging
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
class Boss extends Enemy {
    constructor(canvasW, canvasH, bossType = 0) {
        super();
        this.type = 'boss';
        this.bossType = Utils.clamp(bossType, 0, 7);
        this.radius = 45;
        this.hp = 20 + this.bossType * 10;
        this.maxHp = this.hp;
        this.points = 500 + this.bossType * 200;

        // Spawn from right, move to x = canvasW * 0.75 then stop
        this.x = canvasW + this.radius + 60;
        this.y = canvasH / 2;
        this.vx = -120;
        this.vy = 0;
        this.canvas_w = canvasW;
        this.canvasH = canvasH;
        this.stopX = canvasW * 0.75;
        this.arrived = false;

        // Attack pattern cycling
        this.patternIndex = 0;       // 0 = aimed, 1 = spiral, 2 = barrage
        this.patternTimer = 0;
        this.patternInterval = 2.5;  // seconds between pattern switches
        this.spiralAngle = 0;        // running angle for spiral pattern

        // Visual timers
        this.time = 0;
        this.corePhase = 0;
        this.shieldRotation = 0;

        // Boss theme colors indexed by bossType 0-7
        this.themeColors = [
            '#ff2222', // red
            '#aa22ff', // purple
            '#22ff44', // green
            '#ff8800', // orange
            '#00dddd', // cyan
            '#ff22ff', // magenta
            '#ffdd00', // yellow
            '#ffffff'  // white
        ];
        this.color = this.themeColors[this.bossType];

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
            // Gentle vertical drift while fighting
            this.y += Math.sin(this.time * 0.8) * 40 * dt;
            this.y = Utils.clamp(this.y, this.radius + 20, this.canvasH - this.radius - 20);
        }

        // Cycle attack patterns once arrived
        if (this.arrived) {
            this.patternTimer += dt;
            if (this.patternTimer >= this.patternInterval) {
                this.patternTimer = 0;
                this.patternIndex = (this.patternIndex + 1) % 3;
            }

            // Fire based on current pattern
            // Fire once per pattern switch (at start of each pattern window)
            if (this.patternTimer < dt * 1.5) {
                switch (this.patternIndex) {
                    case 0:
                        this.fireAimed(playerY, projectilePool, audio);
                        break;
                    case 1:
                        this.fireSpiral(projectilePool, audio);
                        break;
                    case 2:
                        this.fireBarrage(projectilePool, audio);
                        break;
                }
            }
        }

        // Advance spiral angle over time for rotation effect
        this.spiralAngle += dt * 2;
    }

    fireAimed(playerY, projectilePool, audio) {
        // Pattern 1: 3 fast projectiles aimed at player Y
        const speed = 400;
        for (let i = -1; i <= 1; i++) {
            const p = projectilePool.get();
            if (p) {
                const dy = (playerY !== undefined && playerY !== null)
                    ? (playerY - this.y) + i * 30
                    : i * 40;
                const angle = Math.atan2(dy, -(this.x));
                p.init(this.x - this.radius, this.y + i * 12,
                    -speed, dy * 0.8,
                    this.color, '#ff4444', true);
            }
        }
        if (audio) audio.playEnemyLaser();
    }

    fireSpiral(projectilePool, audio) {
        // Pattern 2: 8 projectiles in a rotating ring
        const count = 8;
        const speed = 250;
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
        // Pattern 3: Dense spread of 5 bullets forward
        const speed = 320;
        const spreadAngle = 0.5; // total spread in radians
        for (let i = 0; i < 5; i++) {
            const angle = Math.PI + (i - 2) * (spreadAngle / 4);
            const p = projectilePool.get();
            if (p) {
                p.init(this.x - this.radius, this.y,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    this.color, '#ff6666', true);
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

        // --- Health bar (wide, across top) ---
        const barW = r * 2.2;
        const barH = 5;
        const frac = this.hp / this.maxHp;
        ctx.shadowBlur = 0;
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, -r - 18, barW, barH);
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barW / 2, -r - 18, barW, barH);
        // Fill
        let barColor;
        if (frac > 0.6) barColor = '#00ff66';
        else if (frac > 0.3) barColor = '#ffaa00';
        else barColor = '#ff3366';
        ctx.fillStyle = barColor;
        ctx.fillRect(-barW / 2, -r - 18, barW * frac, barH);

        ctx.restore();
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
const PHASES = [
    { name: 'ASTEROID FIELD',     threshold: 0,    featured: 'asteroid',  color: '#aa7733' },
    { name: 'DRONE SWARM',        threshold: 300,  featured: 'drone',     color: '#44ff66' },
    { name: 'ARACHNID SECTOR',    threshold: 700,  featured: 'spider',    color: '#66ff22' },
    { name: 'GHOST NEBULA',       threshold: 1200, featured: 'ghost',     color: '#bb66ff' },
    { name: 'BOMBER WING',        threshold: 1800, featured: 'bomber',    color: '#aa55ff' },
    { name: 'STEALTH ZONE',       threshold: 2500, featured: 'stealth',   color: '#00cccc' },
    { name: 'DEVIL\'S DOMAIN',    threshold: 3500, featured: 'devil',     color: '#ff4400' },
    { name: 'TOTAL CHAOS',        threshold: 5000, featured: 'all',       color: '#ff3366' }
];

class EnemySpawner {
    constructor(assets) {
        this.assets = assets || {};
        this.timer = 0;
        this.baseInterval = 1.5;
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
        const difficulty = Math.floor(score / 200);
        const interval = Math.max(0.25, this.baseInterval - difficulty * 0.07);
        const largeTier = difficulty >= 3 ? 0.2 : 0;

        if (this.timer <= 0) {
            this.timer = interval + Utils.random(-0.3, 0.3);

            const roll = Math.random();
            const featured = phaseInfo.featured;

            // 50% chance to spawn the featured enemy, rest is mixed
            if (featured !== 'all' && roll < 0.50) {
                this.spawnByType(featured, canvasW, canvasH, largeTier);
            } else {
                // Mixed spawns — weighted by what's unlocked
                this.spawnMixed(score, canvasW, canvasH, largeTier);
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
                const sizeMul = Math.random() < 0.25 ? Utils.random(1.5, 2.0) : 1;
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
        // Build pool of available types based on score thresholds
        const pool = ['asteroid'];
        if (score >= 100)  pool.push('ship');
        if (score >= 300)  pool.push('drone');
        if (score >= 500)  pool.push('mine');
        if (score >= 700)  pool.push('spider');
        if (score >= 1200) pool.push('ghost');
        if (score >= 1800) pool.push('bomber');
        if (score >= 2500) pool.push('stealth');
        if (score >= 3500) pool.push('devil');

        const pick = pool[Utils.randomInt(0, pool.length - 1)];
        this.spawnByType(pick, canvasW, canvasH, largeTier);
    }

    draw(ctx) {
        for (const e of this.enemies) {
            if (e.active) e.draw(ctx);
        }
    }

    reset() {
        this.enemies = [];
        this.timer = 2; // grace period at start
    }
}
