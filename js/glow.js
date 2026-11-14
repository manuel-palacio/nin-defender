// ============================================================
// glow.js — Cached soft-light sprites
// ============================================================
// Canvas shadowBlur is too slow to use per bullet or per particle (and is
// switched off while PostFX runs). These sprites are painted once per colour
// and stamped with drawImage, which costs next to nothing, so every bolt,
// spark and creature can carry its own light.

const SPRITE_SIZE = 64;
const glowCache = new Map();
const boltCache = new Map();

function tinted(paint, width, height, color) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    paint(ctx);
    // Keep the painted alpha, replace the colour.
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';
    return { canvas, ctx };
}

function glowSprite(color) {
    let sprite = glowCache.get(color);
    if (!sprite) {
        const half = SPRITE_SIZE / 2;
        sprite = tinted(ctx => {
            const falloff = ctx.createRadialGradient(half, half, 0, half, half, half);
            falloff.addColorStop(0, 'rgba(0, 0, 0, 1)');
            falloff.addColorStop(0.2, 'rgba(0, 0, 0, 0.6)');
            falloff.addColorStop(0.5, 'rgba(0, 0, 0, 0.17)');
            falloff.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = falloff;
            ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
        }, SPRITE_SIZE, SPRITE_SIZE, color).canvas;
        glowCache.set(color, sprite);
    }
    return sprite;
}

// Radial falloff of `color` centred on (x, y). The caller chooses the blend
// mode — 'lighter' for light sources, the default for a tinted haze.
export function drawGlow(ctx, color, x, y, radius, alpha = 1) {
    if (radius <= 0 || alpha <= 0) return;
    const previous = ctx.globalAlpha;
    ctx.globalAlpha = previous * alpha;
    ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = previous;
}

const BOLT_WIDTH = 96;
const BOLT_HEIGHT = 24;
const BOLT_HEAD_X = 80;

function boltSprite(color) {
    let sprite = boltCache.get(color);
    if (!sprite) {
        const mid = BOLT_HEIGHT / 2;
        const { canvas, ctx } = tinted(c => {
            // Teardrop: a round head with a tail thinning away behind it.
            const fade = c.createLinearGradient(0, 0, BOLT_HEAD_X, 0);
            fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
            fade.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
            fade.addColorStop(1, 'rgba(0, 0, 0, 1)');
            c.fillStyle = fade;
            c.beginPath();
            c.moveTo(2, mid);
            c.quadraticCurveTo(BOLT_HEAD_X * 0.7, mid - 7.5, BOLT_HEAD_X, mid - 7.5);
            c.arc(BOLT_HEAD_X, mid, 7.5, -Math.PI / 2, Math.PI / 2);
            c.quadraticCurveTo(BOLT_HEAD_X * 0.7, mid + 7.5, 2, mid);
            c.fill();
        }, BOLT_WIDTH, BOLT_HEIGHT, color);
        // White-hot core through the head.
        const core = ctx.createLinearGradient(BOLT_HEAD_X - 44, 0, BOLT_HEAD_X + 6, 0);
        core.addColorStop(0, 'rgba(255, 255, 255, 0)');
        core.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.ellipse(BOLT_HEAD_X - 18, mid, 24, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        sprite = canvas;
        boltCache.set(color, sprite);
    }
    return sprite;
}

// Energy bolt with its head at the origin, flying along +x. `radius` is the
// head radius; the caller translates and rotates into place.
export function drawBolt(ctx, color, radius) {
    const scale = radius / 7.5;
    ctx.drawImage(boltSprite(color),
        -BOLT_HEAD_X * scale, -BOLT_HEIGHT / 2 * scale,
        BOLT_WIDTH * scale, BOLT_HEIGHT * scale);
}
