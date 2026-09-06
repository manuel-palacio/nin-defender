// ============================================================
// score-popups.js — Floating "+N" text spawned at kill positions
// ============================================================

const POP_LIFE = 0.8;
const POP_RISE_SPEED = 45;

export class ScorePopups {
    constructor() {
        this.pops = [];
    }

    add(x, y, points, multiplier, label = '') {
        const base = multiplier > 1 ? `+${points} x${multiplier}` : `+${points}`;
        this.pops.push({
            x, y,
            text: label ? `${label} ${base}` : base,
            color: multiplier >= 4 ? '#ff2200' : multiplier >= 2 ? '#ffaa00' : '#ffffff',
            size: multiplier >= 4 ? 18 : 14,
            life: POP_LIFE,
        });
    }

    update(dt) {
        for (const pop of this.pops) {
            pop.y -= POP_RISE_SPEED * dt;
            pop.life -= dt;
        }
        this.pops = this.pops.filter(pop => pop.life > 0);
    }

    draw(ctx) {
        if (this.pops.length === 0) return;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.lineJoin = 'round';
        for (const pop of this.pops) {
            const alpha = Math.min(1, pop.life / (POP_LIFE * 0.5));
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${pop.size}px Courier New`;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeText(pop.text, pop.x, pop.y);
            ctx.fillStyle = pop.color;
            ctx.fillText(pop.text, pop.x, pop.y);
        }
        ctx.restore();
    }
}
