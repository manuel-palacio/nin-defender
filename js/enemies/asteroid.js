import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'

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
