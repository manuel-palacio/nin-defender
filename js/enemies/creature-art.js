// ============================================================
// creature-art.js — Shared drawing kit for enemies and bosses
// ============================================================
// Every creature is built from the same few parts so the bestiary reads as
// one family: bodies are volumes lit from the upper left with a dark outline
// and a pale rim on the lit edge; eyes, lanterns and wounds are emissive and
// stamped with glow sprites; limbs and tentacles taper.

import { drawGlow } from '../glow.js';

export const TAU = Math.PI * 2;
export const OUTLINE = 'rgba(6, 2, 10, 0.9)';

export const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

// Radial gradient that turns a flat shape into a lit volume.
export function volume(ctx, cx, cy, r, hue, sat = 60, light = 36) {
    const grad = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.08, cx, cy, r * 1.2);
    grad.addColorStop(0, hsl(hue, Math.max(0, sat - 15), Math.min(92, light + 28)));
    grad.addColorStop(0.42, hsl(hue, sat, light));
    grad.addColorStop(1, hsl(hue, Math.min(100, sat + 8), light * 0.28));
    return grad;
}

// Fill and outline the current path.
export function paint(ctx, fill, lineWidth = 1.5, stroke = OUTLINE) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (lineWidth > 0) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

// Ellipse as a lit volume.
export function orb(ctx, x, y, rx, ry, hue, sat, light, { rotation = 0, lineWidth = 1.5 } = {}) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
    paint(ctx, volume(ctx, x, y, Math.max(rx, ry), hue, sat, light), lineWidth);
}

// Pale highlight along the upper-left edge of an ellipse.
export function rim(ctx, x, y, rx, ry, color = 'rgba(255, 255, 255, 0.55)', lineWidth = 1.2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx - lineWidth), Math.max(0.1, ry - lineWidth), 0, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    ctx.restore();
}

// Additive light. Leaves the blend mode as it found it.
export function light(ctx, color, x, y, radius, alpha = 1) {
    const previous = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(ctx, color, x, y, radius, alpha);
    ctx.globalCompositeOperation = previous;
}

// Glowing eye. `look` shifts the pupil (−1..1 on each axis); `slit` makes a
// vertical reptile pupil; `lid` (0..1) closes a dark upper lid over it.
export function eye(ctx, x, y, r, {
    iris = '#ffc531', glow = iris, pupil = '#050208', sclera = null,
    lookX = 0, lookY = 0, slit = false, lid = 0, glowAlpha = 0.7,
} = {}) {
    light(ctx, glow, x, y, r * 3, glowAlpha);
    if (sclera) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        paint(ctx, sclera, Math.max(0.75, r * 0.12));
    }
    const irisR = sclera ? r * 0.62 : r;
    const px = x + lookX * (r - irisR * 0.75) * (sclera ? 1 : 0.4);
    const py = y + lookY * (r - irisR * 0.75) * (sclera ? 1 : 0.4);
    const grad = ctx.createRadialGradient(px, py, irisR * 0.15, px, py, irisR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, iris);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.beginPath();
    ctx.arc(px, py, irisR, 0, TAU);
    ctx.fillStyle = iris;
    ctx.fill();
    ctx.fillStyle = grad;
    ctx.globalAlpha *= 0.8;
    ctx.fill();
    ctx.globalAlpha /= 0.8;
    ctx.fillStyle = pupil;
    ctx.beginPath();
    if (slit) ctx.ellipse(px, py, irisR * 0.2, irisR * 0.82, 0, 0, TAU);
    else ctx.arc(px, py, irisR * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(px - irisR * 0.32, py - irisR * 0.36, Math.max(0.5, irisR * 0.17), 0, TAU);
    ctx.fill();
    if (lid > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r * 1.04, 0, TAU);
        ctx.clip();
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2 * lid);
        ctx.restore();
    }
}

// Spine of a waving limb: `segments + 1` points from (x, y) heading along
// `angle`, bending by `curl` overall and rippling with time.
export function spine(x, y, angle, length, { segments = 8, curl = 0, wave = 0.3, speed = 3, phase = 0, t = 0 } = {}) {
    const points = [{ x, y }];
    const step = length / segments;
    let heading = angle;
    let px = x;
    let py = y;
    for (let i = 1; i <= segments; i++) {
        const along = i / segments;
        heading += curl / segments + Math.sin(t * speed + phase - along * 3.2) * wave * along * 0.5;
        px += Math.cos(heading) * step;
        py += Math.sin(heading) * step;
        points.push({ x: px, y: py });
    }
    return points;
}

// Tapered ribbon along a list of points — the body of every tentacle, tail
// and feeler. Returns the tip.
export function ribbon(ctx, points, width, fill, { tipWidth = 0.4, lineWidth = 1.2, stroke = OUTLINE, highlight = null } = {}) {
    const last = points.length - 1;
    const left = [];
    const right = [];
    for (let i = 0; i <= last; i++) {
        const a = points[Math.max(0, i - 1)];
        const b = points[Math.min(last, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        const half = (width + (tipWidth - width) * (i / last)) / 2;
        left.push({ x: points[i].x + nx * half, y: points[i].y + ny * half });
        right.push({ x: points[i].x - nx * half, y: points[i].y - ny * half });
    }
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i <= last; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = last; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    paint(ctx, fill, lineWidth, stroke);
    if (highlight) {
        ctx.strokeStyle = highlight;
        ctx.lineWidth = Math.max(0.6, width * 0.22);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(left[0].x * 0.7 + right[0].x * 0.3, left[0].y * 0.7 + right[0].y * 0.3);
        for (let i = 1; i < last; i++) {
            ctx.lineTo(left[i].x * 0.7 + right[i].x * 0.3, left[i].y * 0.7 + right[i].y * 0.3);
        }
        ctx.stroke();
    }
    return points[last];
}

// Waving tentacle = spine + ribbon.
export function tentacle(ctx, x, y, angle, length, width, fill, options = {}) {
    return ribbon(ctx, spine(x, y, angle, length, options), width, fill, options);
}

// Two-segment jointed leg from hip through knee to foot, thick to thin.
export function leg(ctx, hipX, hipY, kneeX, kneeY, footX, footY, width, fill, highlight = null) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const stroke = (color, w1, w2) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w1;
        ctx.beginPath();
        ctx.moveTo(hipX, hipY);
        ctx.lineTo(kneeX, kneeY);
        ctx.stroke();
        ctx.lineWidth = w2;
        ctx.beginPath();
        ctx.moveTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.stroke();
    };
    stroke(OUTLINE, width + 2, width * 0.6 + 2);
    stroke(fill, width, width * 0.6);
    if (highlight) {
        ctx.strokeStyle = highlight;
        ctx.lineWidth = Math.max(0.5, width * 0.3);
        ctx.beginPath();
        ctx.moveTo(hipX, hipY - width * 0.2);
        ctx.lineTo(kneeX, kneeY - width * 0.2);
        ctx.stroke();
    }
}

// Row of fangs between two points, pointing along (dirX, dirY).
export function fangs(ctx, x1, y1, x2, y2, count, length, dirX, dirY, color = '#f4ecd8') {
    ctx.fillStyle = color;
    const half = Math.hypot(x2 - x1, y2 - y1) / count / 2;
    const ux = (x2 - x1) / (count * 2 * half || 1);
    const uy = (y2 - y1) / (count * 2 * half || 1);
    for (let i = 0; i < count; i++) {
        const cx = x1 + (x2 - x1) * ((i + 0.5) / count);
        const cy = y1 + (y2 - y1) * ((i + 0.5) / count);
        ctx.beginPath();
        ctx.moveTo(cx - ux * half, cy - uy * half);
        ctx.lineTo(cx + ux * half, cy + uy * half);
        ctx.lineTo(cx + dirX * length, cy + dirY * length);
        ctx.closePath();
        ctx.fill();
    }
}

// Curved horn or claw: a crescent from base to tip, bulging to one side.
export function horn(ctx, baseX, baseY, tipX, tipY, width, bend, fill) {
    const mx = (baseX + tipX) / 2;
    const my = (baseY + tipY) / 2;
    const len = Math.hypot(tipX - baseX, tipY - baseY) || 1;
    const nx = -(tipY - baseY) / len;
    const ny = (tipX - baseX) / len;
    ctx.beginPath();
    ctx.moveTo(baseX - nx * width / 2, baseY - ny * width / 2);
    ctx.quadraticCurveTo(mx + nx * (bend - width * 0.3), my + ny * (bend - width * 0.3), tipX, tipY);
    ctx.quadraticCurveTo(mx + nx * (bend + width * 0.6), my + ny * (bend + width * 0.6), baseX + nx * width / 2, baseY + ny * width / 2);
    ctx.closePath();
    paint(ctx, fill, 1.2);
}

// Glowing fissure: a jagged bright line with a light source along it.
export function crack(ctx, points, color, width = 1.5, glowRadius = 6) {
    for (let i = 0; i < points.length; i += 2) {
        light(ctx, color, points[i][0], points[i][1], glowRadius, 0.5);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = width * 0.4;
    ctx.stroke();
}

// Small health bar above a damaged regular enemy.
export function healthBar(ctx, r, hp, maxHp) {
    if (hp >= maxHp) return;
    const barW = Math.max(18, r * 1.6);
    const frac = Math.max(0, hp / maxHp);
    const y = -r - 9;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-barW / 2 - 1, y - 1, barW + 2, 5);
    ctx.fillStyle = frac > 0.5 ? '#35e07a' : '#ff3366';
    ctx.fillRect(-barW / 2, y, barW * frac, 3);
}
