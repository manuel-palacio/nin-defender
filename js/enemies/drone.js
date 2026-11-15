import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Enemy } from './enemy.js'
import { TAU, hsl, paint, orb, light, eye } from './creature-art.js'

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

    // Firefly — a bloodshot eye for a head, blurred wings, and a lantern
    // abdomen that pulses on its own rhythm. Swarms in strings. Faces −X.
    draw(ctx) {
        if (!this.active) return;
        const r = this.radius;
        const t = this.pulseTime;
        const pulse = 0.5 + 0.5 * Math.sin(t * 6 + this.wingPhase);
        const lantern = hsl(this.hue, 100, 60);

        ctx.save();
        ctx.translate(this.x, this.y);

        light(ctx, lantern, r * 0.6, 0, r * 3.4, 0.45 + 0.4 * pulse);

        // Wings beat too fast to see: two smeared, translucent blades
        const flap = Math.sin(t * 46 + this.wingPhase);
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.translate(-r * 0.1, side * r * 0.25);
            ctx.rotate(side * (0.75 + 0.45 * flap));
            ctx.beginPath();
            ctx.ellipse(r * 0.7, 0, r * 0.95, r * 0.3, 0, 0, TAU);
            ctx.fillStyle = 'rgba(200, 235, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 0.7;
            ctx.stroke();
            ctx.restore();
        }

        // Lantern abdomen
        const glow = ctx.createRadialGradient(r * 0.5, -r * 0.1, r * 0.05, r * 0.6, 0, r * 0.8);
        glow.addColorStop(0, '#ffffff');
        glow.addColorStop(0.4 + 0.2 * pulse, lantern);
        glow.addColorStop(1, hsl(this.hue, 90, 24));
        ctx.beginPath();
        ctx.ellipse(r * 0.6, 0, r * 0.78, r * 0.52, 0, 0, TAU);
        paint(ctx, glow, 1);

        orb(ctx, -r * 0.2, 0, r * 0.48, r * 0.46, this.hue + 60, 35, 22, { lineWidth: 1 });
        eye(ctx, -r * 0.72, 0, r * 0.44, { iris: '#ff3b3b', sclera: '#f3ead8', lookX: -0.7, glowAlpha: 0.35 });

        ctx.restore();
    }
}
