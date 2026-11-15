import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, hsl, orb, rim, light, eye, leg, horn, healthBar } from './creature-art.js'

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

    // Armoured critter — three overlapping carapace plates, a head with
    // snapping mandibles and lantern eyes, six scuttling legs, a tail spike.
    // Tier 2 is the violet brood-carrier with glowing egg sacs. Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.time;
        const big = this.tier === 2;
        const hue = this.hue;
        const sat = big ? 55 : 78;
        const shell = big ? 32 : 38;

        ctx.save();
        ctx.translate(this.x, this.y);

        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const stride = Math.sin(t * 14 + this.legPhase + i * 1.3 + (side > 0 ? Math.PI : 0));
                const hipX = -r * 0.4 + i * r * 0.42;
                leg(ctx, hipX, side * r * 0.3,
                    hipX - r * 0.08 + stride * r * 0.08, side * r * 0.82,
                    hipX - r * 0.3 + stride * r * 0.2, side * r * (1.12 - Math.abs(stride) * 0.08),
                    r * 0.13, hsl(hue, sat, 15), hsl(hue, sat, 52, 0.7));
            }
        }

        horn(ctx, r * 0.85, 0, r * 1.4, Math.sin(t * 5) * r * 0.12, r * 0.22, r * 0.05, hsl(hue, 30, 72));

        // Carapace, tail to shoulders, each plate overlapping the last
        const plates = [[0.62, 0.3, 0.36], [0.3, 0.38, 0.5], [-0.06, 0.42, 0.58]];
        for (const [px, rx, ry] of plates) {
            orb(ctx, px * r, 0, rx * r, ry * r, hue, sat, shell);
            rim(ctx, px * r, 0, rx * r, ry * r, hsl(hue, 60, 82, 0.6), r * 0.05);
        }
        if (big) {
            const throb = 0.6 + 0.4 * Math.sin(t * 4);
            for (const [sx, sy] of [[0.55, 0], [0.22, -0.2], [0.22, 0.2]]) {
                light(ctx, '#ff5ce0', sx * r, sy * r, r * 0.42, throb);
                ctx.fillStyle = '#ffd0f5';
                ctx.beginPath();
                ctx.arc(sx * r, sy * r, r * 0.07, 0, TAU);
                ctx.fill();
            }
        }

        // Mandibles snap open and shut ahead of the head
        const bite = 0.2 + 0.2 * Math.sin(t * 9);
        for (const side of [-1, 1]) {
            horn(ctx, -r * 0.78, side * r * 0.2, -r * 1.32, side * r * bite,
                r * 0.17, side * r * 0.14, hsl(hue, 30, 74));
        }
        orb(ctx, -r * 0.55, 0, r * 0.4, r * 0.42, hue, sat, shell - 8);
        rim(ctx, -r * 0.55, 0, r * 0.4, r * 0.42, hsl(hue, 60, 82, 0.6), r * 0.05);
        const iris = big ? '#ff5ce0' : '#ffc531';
        eye(ctx, -r * 0.66, -r * 0.2, r * 0.12, { iris });
        eye(ctx, -r * 0.66, r * 0.2, r * 0.12, { iris });

        healthBar(ctx, r, this.hp, this.maxHp);
        ctx.restore();
    }
}
