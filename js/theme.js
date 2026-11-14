// ============================================================
// theme.js — Shared type, palette and UI drawing primitives
// ============================================================
// Every canvas screen (HUD, menu, shop, overlays) draws with these so the
// game reads as one designed surface: Bebas Neue for display type, Share
// Tech Mono for readouts, chamfered industrial panels, one red.

const DISPLAY_FAMILY = "'Bebas Neue', Impact, 'Arial Narrow', sans-serif";
const MONO_FAMILY = "'Share Tech Mono', 'Courier New', monospace";

export const display = px => `${px}px ${DISPLAY_FAMILY}`;
export const mono = px => `${px}px ${MONO_FAMILY}`;

export const COLOR = {
    red: '#ff1f1f',
    redDeep: '#b00a0a',
    bone: '#ece6da',
    text: '#c6c0b6',
    dim: '#948e87',
    faint: '#4a4744',
    amber: '#ffa62b',
    gold: '#ffd84a',
    cyan: '#3fe0ff',
    green: '#35e07a',
    panel: 'rgba(8, 6, 8, 0.72)',
};

// Canvas text is laid out with whatever font is ready at draw time, so the
// first frame waits for both faces (bounded — a slow network must not block
// the game; the fallback stack takes over until the faces arrive).
export function loadFonts(timeoutMs = 2500) {
    if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
    const faces = Promise.all([
        document.fonts.load(display(32), 'NIN DEFENDER 0123'),
        document.fonts.load(mono(16), 'SCORE 0123'),
    ]).catch(() => {});
    const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
    return Promise.race([faces, timeout]);
}

// Layout scale for full-screen UI: 1 at 1280x720, shrinking on phones.
export function uiScale(w, h) {
    return Math.max(0.5, Math.min(1.3, Math.min(w / 1280, h / 720)));
}

// Letter-spacing where the browser supports it (silently skipped elsewhere).
export function track(ctx, px) {
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

// Rectangle with the top-left and bottom-right corners cut off.
export function chamferPath(ctx, x, y, w, h, cut = 8) {
    const c = Math.min(cut, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + c, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + c);
    ctx.closePath();
}

export function panel(ctx, x, y, w, h, { fill = COLOR.panel, stroke = 'rgba(255, 31, 31, 0.45)', cut = 10, lineWidth = 1 } = {}) {
    chamferPath(ctx, x, y, w, h, cut);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

// Segmented bar: `filled` of `total` slanted cells.
export function pips(ctx, x, y, total, filled, { color = COLOR.red, cellW = 9, cellH = 10, gap = 3, off = 'rgba(255, 255, 255, 0.13)' } = {}) {
    const skew = cellH * 0.35;
    for (let i = 0; i < total; i++) {
        const px = x + i * (cellW + gap);
        ctx.beginPath();
        ctx.moveTo(px + skew, y);
        ctx.lineTo(px + cellW + skew, y);
        ctx.lineTo(px + cellW, y + cellH);
        ctx.lineTo(px, y + cellH);
        ctx.closePath();
        ctx.fillStyle = i < filled ? color : off;
        ctx.fill();
    }
    return total * (cellW + gap) - gap + skew;
}

// Progress bar with a dark trough and a bright leading edge.
export function meter(ctx, x, y, w, h, frac, color) {
    const f = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(x, y, w, h);
    if (f > 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w * f, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(x + w * f - 2, y, 2, h);
    }
}

// A keyboard key: outlined box with the label centred. Returns its width.
// `x` is the left edge unless align is 'right', then it is the right edge.
export function keycap(ctx, label, x, y, { size = 12, align = 'left', color = COLOR.bone } = {}) {
    ctx.save();
    ctx.font = mono(size);
    track(ctx, 0);
    const padX = size * 0.55;
    const w = Math.max(size * 1.7, ctx.measureText(label).width + padX * 2);
    const h = size * 1.65;
    const left = align === 'right' ? x - w : x;
    const top = y - h * 0.72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.strokeStyle = 'rgba(236, 230, 218, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(left, top, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, left + w / 2, y);
    ctx.restore();
    return w;
}

// Darkens toward the edges so centred type sits on a quiet field.
export function drawVignette(ctx, w, h, strength = 0.7) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.72);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
}

// Display type with a red/cyan channel split behind it; `glitch` (-1..1)
// ghosts two horizontal bands sideways for a frame or two.
export function glitchTitle(ctx, text, x, y, size, { color = COLOR.red, split = 3, glitch = 0, glow = 18 } = {}) {
    ctx.save();
    ctx.font = display(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    track(ctx, size * 0.04);

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(0, 220, 255, 0.45)';
    ctx.fillText(text, x - split, y);
    ctx.fillStyle = 'rgba(255, 0, 70, 0.55)';
    ctx.fillText(text, x + split, y + 1);
    ctx.globalCompositeOperation = 'source-over';

    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;

    // Hot top edge: a lighter gradient over the upper half of the letters.
    const sheen = ctx.createLinearGradient(0, y - size * 0.75, 0, y);
    sheen.addColorStop(0, 'rgba(255, 190, 170, 0.28)');
    sheen.addColorStop(0.55, 'rgba(255, 200, 190, 0)');
    ctx.fillStyle = sheen;
    ctx.fillText(text, x, y);

    if (glitch > 0) {
        const half = ctx.measureText(text).width / 2 + 20;
        const bands = [[0.62, 0.14, 1], [0.3, 0.1, -1]];
        for (const [from, height, dir] of bands) {
            const top = y - size * from;
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - half - 40, top, half * 2 + 80, size * height);
            ctx.clip();
            ctx.fillStyle = COLOR.bone;
            ctx.fillText(text, x + dir * glitch * size * 0.12, y);
            ctx.restore();
        }
    }
    ctx.restore();
}
