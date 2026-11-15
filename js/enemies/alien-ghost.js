import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, volume, paint, rim, light, eye, tentacle, fangs, healthBar } from './creature-art.js'

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

    // Skull specter — a bone-white skull with cold fire in its sockets and
    // a jaw that drops open as it wails, dragging a shroud of ectoplasm.
    // On teleport it arrives as three skulls that snap together. Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const flash = Math.max(0, this.teleportFlash) / 0.3;
        const wail = 0.5 + 0.5 * Math.sin(t * 4.5);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Shroud: translucent ribbons streaming behind
        for (let i = 0; i < 5; i++) {
            const fan = i - 2;
            tentacle(ctx, r * 0.15, fan * r * 0.28, fan * 0.16, r * (1.9 - Math.abs(fan) * 0.25),
                r * 0.55, `rgba(170, 110, 255, ${0.3 - Math.abs(fan) * 0.04})`, {
                    t, phase: i * 1.3, wave: 0.7, speed: 4, tipWidth: 0.2, lineWidth: 0,
                });
        }
        light(ctx, '#a66bff', 0, 0, r * 2.2, 0.4);

        const skull = (ox, oy, alpha) => {
            ctx.save();
            ctx.translate(ox, oy);
            ctx.globalAlpha = alpha;
            // Jaw, hinged behind the cheek
            const drop = r * (0.12 + 0.3 * wail + 0.3 * flash);
            ctx.beginPath();
            ctx.roundRect(-r * 0.62, r * 0.18 + drop, r * 0.78, r * 0.34, r * 0.12);
            paint(ctx, volume(ctx, -r * 0.25, r * 0.3 + drop, r * 0.5, 265, 22, 52), 1.2);
            fangs(ctx, -r * 0.56, r * 0.2 + drop, r * 0.08, r * 0.2 + drop, 5, r * 0.13, 0, -1);
            // Cranium
            ctx.beginPath();
            ctx.ellipse(-r * 0.05, -r * 0.18, r * 0.78, r * 0.7, 0, 0, TAU);
            paint(ctx, volume(ctx, -r * 0.05, -r * 0.18, r * 0.78, 265, 22, 62), 1.4);
            rim(ctx, -r * 0.05, -r * 0.18, r * 0.78, r * 0.7, 'rgba(255, 255, 255, 0.8)', r * 0.06);
            fangs(ctx, -r * 0.58, r * 0.4, r * 0.1, r * 0.4, 5, r * 0.14, 0, 1);
            // Fracture across the brow
            ctx.strokeStyle = 'rgba(40, 14, 60, 0.85)';
            ctx.lineWidth = Math.max(0.8, r * 0.04);
            ctx.beginPath();
            ctx.moveTo(r * 0.12, -r * 0.86);
            ctx.lineTo(r * 0.02, -r * 0.62);
            ctx.lineTo(r * 0.2, -r * 0.5);
            ctx.lineTo(r * 0.14, -r * 0.36);
            ctx.stroke();
            // Sockets slanted into a scowl, a point of cold fire deep in each
            for (const [sx, tilt] of [[-0.42, 0.55], [0.1, -0.55]]) {
                ctx.beginPath();
                ctx.ellipse(sx * r, -r * 0.12, r * 0.24, r * 0.17, tilt, 0, TAU);
                ctx.fillStyle = '#0d0418';
                ctx.fill();
                eye(ctx, sx * r, -r * 0.1, r * (0.07 + 0.03 * wail), { iris: '#7fdcff', pupil: '#eaffff' });
            }
            ctx.fillStyle = '#12061f';
            ctx.beginPath();
            ctx.moveTo(-r * 0.2, r * 0.1);
            ctx.lineTo(-r * 0.12, r * 0.28);
            ctx.lineTo(-r * 0.28, r * 0.28);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        const presence = 0.8 + 0.15 * Math.sin(t * 2);
        if (flash > 0) {
            skull(-r * 1.4 * flash, -r * 0.5 * flash, 0.4);
            skull(r * 1.4 * flash, r * 0.5 * flash, 0.4);
        }
        skull(0, 0, presence);

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
