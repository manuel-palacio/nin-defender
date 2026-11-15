// ============================================================
// boss-art.js — One portrait per boss tier
// ============================================================
// Each boss is the monarch of the phase it ends, drawn with the same kit as
// the regular enemies (creature-art.js) at boss scale. Every painter takes
// (ctx, boss, r, t, decay): r is the hit radius — the solid body fills it and
// limbs reach beyond — and decay runs 0 → 1 as health drains, so each boss
// visibly comes apart. Painters draw around the origin; Boss.draw translates.
// Weak-point bosses keep the origin clear: the core is drawn over it.

import {
    TAU, hsl, volume, paint, orb, rim, light, eye, spine, ribbon, tentacle,
    leg, fangs, horn, crack,
} from './creature-art.js';

function polygon(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
}

// Repeatable pseudo-random in [0, 1) for fixed surface detail.
const jitter = n => {
    const x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
};

// 0 — BRONZE COLOSSUS: a living asteroid. Slabs of bronze rock around a
// molten heart, one furnace eye, two boulder fists. Seams split wider and
// burn brighter as it takes damage.
function colossus(ctx, b, r, t, decay) {
    const seam = '#ffab3d';
    const heat = 0.55 + 0.45 * Math.sin(t * 3) + decay * 0.5;

    // Orbiting rubble
    for (let i = 0; i < 6; i++) {
        const a = t * 0.7 + i * (TAU / 6);
        const d = r * (1.35 + 0.12 * Math.sin(t * 2 + i));
        orb(ctx, Math.cos(a) * d, Math.sin(a) * d * 0.55, r * 0.09, r * 0.08, 28, 30, 36, { lineWidth: 1 });
    }

    light(ctx, seam, 0, 0, r * 1.7, 0.25 + 0.3 * decay);
    const body = [];
    for (let i = 0; i < 11; i++) {
        const a = (i / 11) * TAU;
        const d = r * (0.88 + 0.22 * jitter(i + 3));
        body.push([Math.cos(a) * d, Math.sin(a) * d]);
    }
    polygon(ctx, body);
    paint(ctx, volume(ctx, 0, 0, r * 1.05, 30, 38, 36), 2);

    // Facets: flat planes catching or losing the light
    for (const [i, j, k, shade] of [[0, 1, 2, 0.16], [3, 4, 5, -0.2], [6, 7, 8, 0.1], [8, 9, 10, -0.25]]) {
        polygon(ctx, [body[i], body[j], body[k]]);
        ctx.fillStyle = shade > 0 ? `rgba(255, 220, 170, ${shade})` : `rgba(10, 4, 0, ${-shade})`;
        ctx.fill();
    }

    const width = r * (0.04 + 0.05 * decay);
    crack(ctx, [[-r * 0.1, -r * 0.8], [r * 0.08, -r * 0.45], [-r * 0.05, -r * 0.1], [r * 0.3, r * 0.2], [r * 0.2, r * 0.7]], seam, width, r * 0.3 * heat);
    crack(ctx, [[r * 0.75, -r * 0.3], [r * 0.4, -r * 0.2], [r * 0.08, -r * 0.45]], seam, width * 0.8, r * 0.25 * heat);
    if (decay > 0.4) {
        crack(ctx, [[-r * 0.75, r * 0.45], [-r * 0.4, r * 0.3], [-r * 0.05, -r * 0.1]], seam, width, r * 0.3 * heat);
    }

    // Furnace eye under a rock brow
    eye(ctx, -r * 0.42, -r * 0.08, r * 0.24, { iris: '#ffb52e', slit: true, lid: 0.25 + 0.2 * Math.sin(t * 1.3) ** 2 });

    // Boulder fists hover ahead, drawn back before a charge
    const cocked = b.chargeState === 'windup' ? r * 0.35 : 0;
    for (const side of [-1, 1]) {
        const fx = -r * 1.1 + cocked + Math.sin(t * 2.4 + side) * r * 0.08;
        const fy = side * r * (0.72 + 0.05 * Math.sin(t * 3 + side * 2));
        const fist = [];
        for (let i = 0; i < 7; i++) {
            const a = (i / 7) * TAU + side;
            const d = r * (0.26 + 0.08 * jitter(i + side * 5 + 20));
            fist.push([fx + Math.cos(a) * d, fy + Math.sin(a) * d]);
        }
        polygon(ctx, fist);
        paint(ctx, volume(ctx, fx, fy, r * 0.32, 30, 38, 40), 1.6);
    }
}

// 1 — CRIMSON SCOUT: the critter queen. A crowned, armoured head with great
// mandibles, a train of carapace plates, and a swollen egg sac she guards.
function critterQueen(ctx, b, r, t, decay) {
    const hue = 12;
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const stride = Math.sin(t * 9 + i * 1.4 + (side > 0 ? Math.PI : 0));
            const hipX = -r * 0.45 + i * r * 0.36;
            leg(ctx, hipX, side * r * 0.35,
                hipX - r * 0.1 + stride * r * 0.06, side * r * 0.95,
                hipX - r * 0.38 + stride * r * 0.18, side * r * (1.4 - 0.08 * Math.abs(stride)),
                r * 0.11, hsl(hue, 70, 14), hsl(hue, 80, 58, 0.7));
        }
    }

    // Egg sac: a lit membrane with the brood inside
    const throb = 0.6 + 0.4 * Math.sin(t * 3);
    light(ctx, '#ffb347', r * 0.95, 0, r * 0.9, 0.5 * throb);
    ctx.beginPath();
    ctx.ellipse(r * 0.95, 0, r * 0.5, r * 0.44, 0, 0, TAU);
    paint(ctx, 'rgba(255, 190, 110, 0.55)', 1.4, hsl(hue, 70, 20));
    for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + t * 0.4;
        const d = r * 0.26 * jitter(i + 1);
        light(ctx, '#fff0b0', r * 0.95 + Math.cos(a) * d, Math.sin(a) * d, r * 0.1, 0.9);
    }

    const plates = [[0.55, 0.36, 0.5], [0.24, 0.42, 0.62], [-0.1, 0.46, 0.7]];
    plates.forEach(([px, rx, ry], i) => {
        orb(ctx, px * r, 0, rx * r, ry * r, hue, 80, 36);
        rim(ctx, px * r, 0, rx * r, ry * r, 'rgba(255, 220, 190, 0.6)', r * 0.03);
        if (decay > 0.3 + i * 0.2) {
            crack(ctx, [[px * r, -ry * r * 0.7], [px * r + r * 0.08, -ry * r * 0.2], [px * r - r * 0.05, ry * r * 0.3]],
                '#ffd27a', r * 0.03, r * 0.16);
        }
    });

    const bite = 0.22 + 0.2 * Math.sin(t * 6);
    for (const side of [-1, 1]) {
        horn(ctx, -r * 0.82, side * r * 0.28, -r * 1.55, side * r * bite, r * 0.22, side * r * 0.2, '#f0e0c0');
        // Crown spikes
        horn(ctx, -r * 0.5, side * r * 0.42, -r * 0.3, side * r * 0.95, r * 0.16, side * r * 0.04, hsl(hue, 30, 76));
    }
    orb(ctx, -r * 0.58, 0, r * 0.46, r * 0.5, hue, 80, 30);
    rim(ctx, -r * 0.58, 0, r * 0.46, r * 0.5, 'rgba(255, 220, 190, 0.6)', r * 0.03);
    for (const [ex, ey, er] of [[-0.74, -0.2, 0.1], [-0.74, 0.2, 0.1], [-0.55, -0.34, 0.06], [-0.55, 0.34, 0.06]]) {
        eye(ctx, ex * r, ey * r, er * r, { iris: '#ffc531' });
    }
}

// 2 — VIRAL SWARM: the firefly monarch. Four blurred wings, a head that is
// all eye, and a vast lantern abdomen whose heart is the weak point. Its
// swarm circles it; the lantern gutters as it dies.
function fireflyMonarch(ctx, b, r, t, decay) {
    const flicker = decay > 0.5 ? 0.6 + 0.4 * Math.sin(t * 23) * Math.sin(t * 7) : 1;
    const pulse = (0.6 + 0.4 * Math.sin(t * 3)) * flicker;
    const lantern = '#7dff5a';

    light(ctx, lantern, r * 0.1, 0, r * 2.6, 0.4 * pulse);

    const flap = Math.sin(t * 38);
    for (const side of [-1, 1]) {
        for (const [reach, spread] of [[1.5, 0.95], [1.15, 0.5]]) {
            ctx.save();
            ctx.translate(-r * 0.35, side * r * 0.3);
            ctx.rotate(side * (spread + 0.3 * flap));
            ctx.beginPath();
            ctx.ellipse(r * reach * 0.5, 0, r * reach * 0.56, r * 0.26, 0, 0, TAU);
            ctx.fillStyle = 'rgba(190, 255, 220, 0.22)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(230, 255, 240, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    // Lantern abdomen, ribbed
    const glow = ctx.createRadialGradient(-r * 0.1, -r * 0.2, r * 0.05, r * 0.1, 0, r * 0.95);
    glow.addColorStop(0, '#f4ffe0');
    glow.addColorStop(0.35 + 0.2 * pulse, lantern);
    glow.addColorStop(1, '#0d3a12');
    ctx.beginPath();
    ctx.ellipse(r * 0.1, 0, r * 0.9, r * 0.74, 0, 0, TAU);
    paint(ctx, glow, 2);
    ctx.strokeStyle = 'rgba(10, 50, 16, 0.55)';
    ctx.lineWidth = r * 0.03;
    for (const rx of [0.52, 0.72]) {
        ctx.beginPath();
        ctx.ellipse(r * 0.1, 0, r * rx, r * 0.74 * (rx / 0.9) * 1.05, 0, -1.1, 1.1);
        ctx.stroke();
    }

    orb(ctx, -r * 0.72, 0, r * 0.36, r * 0.4, 150, 40, 20);
    for (const side of [-1, 1]) {
        tentacle(ctx, -r * 0.8, side * r * 0.34, Math.PI + side * 1.0, r * 0.8, r * 0.06, '#10301a', {
            t, phase: side, wave: 0.5, speed: 4, segments: 6, lineWidth: 0.6,
        });
    }
    eye(ctx, -r * 1.02, 0, r * 0.34, {
        iris: '#ff3b3b', sclera: '#efe6d2', lookX: -0.5 + 0.3 * Math.sin(t * 1.4), lookY: 0.4 * Math.sin(t * 0.9),
    });

    // The swarm
    for (let i = 0; i < 7; i++) {
        const a = t * (1.1 + 0.15 * (i % 3)) + i * 0.9;
        const d = r * (1.35 + 0.2 * Math.sin(t * 2 + i * 1.7));
        light(ctx, '#d8ff6a', Math.cos(a) * d, Math.sin(a * 1.3) * d * 0.7, r * 0.16, 0.6 + 0.4 * Math.sin(t * 9 + i));
    }
}

// 3 — CRIMSON MAW: the jellyfish titan. A blood-red bell with three eyes
// adrift inside it, and under the hem a ring of fangs. Its tentacles go
// slack and the bell tears as it weakens.
function jellyTitan(ctx, b, r, t, decay) {
    const hue = 352;
    const squeeze = Math.sin(t * 2.2);
    const bellW = r * (1.05 - 0.06 * squeeze);
    const bellH = r * (0.98 + 0.08 * squeeze);
    const hemY = r * 0.1;
    const vigor = 1 - decay * 0.7;

    for (let i = 0; i < 9; i++) {
        const across = i / 8 - 0.5;
        const tip = tentacle(ctx, across * bellW * 1.6, hemY + r * 0.1, Math.PI / 2 + across * 0.7,
            r * (1.2 + 0.4 * (i % 2)), r * 0.13, hsl(hue, 80, 56, 0.8), {
                t, phase: i * 1.3, wave: 0.65 * vigor, speed: 2.6, segments: 9,
                lineWidth: 1, stroke: hsl(hue, 80, 14, 0.8),
            });
        light(ctx, '#ff9aa8', tip.x, tip.y, r * 0.14, 0.9);
    }
    // Two heavy oral arms
    for (const side of [-1, 1]) {
        tentacle(ctx, side * r * 0.25, hemY + r * 0.2, Math.PI / 2 + side * 0.15, r * 1.15, r * 0.34,
            hsl(hue, 70, 34), { t, phase: side * 2, wave: 0.4 * vigor, speed: 2, highlight: hsl(hue, 90, 70, 0.6) });
    }

    // The maw under the hem
    ctx.beginPath();
    ctx.ellipse(0, hemY + r * 0.12, bellW * 0.62, r * 0.26, 0, 0, TAU);
    paint(ctx, '#1a0206', 1.5);
    light(ctx, '#ff3b4d', 0, hemY + r * 0.16, r * 0.5, 0.6);
    fangs(ctx, -bellW * 0.55, hemY + r * 0.0, bellW * 0.55, hemY + r * 0.0, 9, r * 0.2, 0, 1);

    light(ctx, hsl(hue, 100, 60), 0, -r * 0.3, r * 2.1, 0.4);
    ctx.beginPath();
    ctx.ellipse(0, hemY, bellW, bellH, 0, Math.PI, 0);
    for (let i = 0; i < 7; i++) {
        const from = bellW - (i / 7) * bellW * 2;
        const to = bellW - ((i + 1) / 7) * bellW * 2;
        ctx.quadraticCurveTo((from + to) / 2, hemY + r * 0.2, to, hemY);
    }
    ctx.closePath();
    const membrane = ctx.createRadialGradient(-bellW * 0.35, -bellH * 0.6, r * 0.05, 0, -r * 0.1, r * 1.3);
    membrane.addColorStop(0, hsl(hue, 95, 84, 0.92));
    membrane.addColorStop(0.45, hsl(hue, 85, 50, 0.78));
    membrane.addColorStop(1, hsl(hue, 90, 20, 0.85));
    paint(ctx, membrane, 2, hsl(hue, 80, 12));
    rim(ctx, 0, hemY, bellW, bellH, 'rgba(255, 235, 235, 0.7)', r * 0.04);

    // Tears open in the bell
    ctx.fillStyle = 'rgba(20, 0, 6, 0.75)';
    [[0.55, -0.35, 0.3], [-0.6, -0.2, 0.55], [0.2, -0.75, 0.8]].forEach(([hx, hy, at]) => {
        if (decay < at) return;
        ctx.beginPath();
        ctx.ellipse(hx * r, hy * r, r * 0.13, r * 0.07, hx, 0, TAU);
        ctx.fill();
    });

    eye(ctx, -r * 0.05, -r * 0.42, r * 0.24, { iris: '#fff06b', slit: true, lookX: -0.5 });
    eye(ctx, -r * 0.5, -r * 0.22, r * 0.13, { iris: '#fff06b', slit: true, lookX: -0.5 });
    eye(ctx, r * 0.4, -r * 0.24, r * 0.13, { iris: '#fff06b', slit: true, lookX: -0.5 });
}

// 4 — SPIDER QUEEN: eight long legs each stepping to its own rhythm, a
// pale abdomen wearing a skull, venom beading on her fangs. The skull's
// sockets burn red as she is hurt.
function spiderQueen(ctx, b, r, t, decay) {
    for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
            const fan = i - 1.5;
            const step = Math.sin(t * (6 + i * 1.7) + i * 1.6 + (side > 0 ? 1.1 : 0));
            const hipX = -r * 0.3 + fan * r * 0.16;
            const kneeX = hipX + fan * r * 0.55;
            leg(ctx, hipX, side * r * 0.3,
                kneeX, side * r * (1.15 + 0.1 * step),
                kneeX + fan * r * 0.4 + step * r * 0.12, side * r * (1.85 - 0.12 * Math.abs(step)),
                r * 0.11, '#0e180a', 'rgba(150, 255, 70, 0.75)');
        }
    }

    const ax = r * 0.45;
    orb(ctx, ax, 0, r * 0.72, r * 0.66, 50, 24, 62);
    rim(ctx, ax, 0, r * 0.72, r * 0.66, 'rgba(255, 255, 255, 0.7)', r * 0.035);
    const socket = decay > 0.5 ? '#ff2a2a' : '#8cff3c';
    const gape = 0.5 + 0.5 * Math.sin(t * 2) + decay;
    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(ax - r * 0.1, side * r * 0.25, r * 0.17, r * 0.13, side * 0.45, 0, TAU);
        ctx.fillStyle = '#14060a';
        ctx.fill();
        light(ctx, socket, ax - r * 0.1, side * r * 0.25, r * 0.2, 0.5 + 0.5 * decay);
    }
    ctx.fillStyle = '#14060a';
    ctx.beginPath();
    ctx.ellipse(ax + r * 0.32, 0, r * (0.07 + 0.03 * gape), r * (0.18 + 0.08 * gape), 0, 0, TAU);
    ctx.fill();
    fangs(ctx, ax + r * 0.26, -r * 0.16, ax + r * 0.26, r * 0.16, 4, r * 0.07, 1, 0, '#e9e0cc');

    const hx = -r * 0.42;
    for (const side of [-1, 1]) {
        horn(ctx, hx - r * 0.3, side * r * 0.16, hx - r * 0.85, side * r * 0.06, r * 0.17, side * r * 0.14, '#eadfc8');
        light(ctx, '#8cff3c', hx - r * 0.85, side * r * 0.06, r * 0.14, 0.6 + 0.4 * Math.sin(t * 4 + side));
    }
    orb(ctx, hx, 0, r * 0.46, r * 0.44, 100, 38, 20);
    rim(ctx, hx, 0, r * 0.46, r * 0.44, 'rgba(160, 255, 90, 0.6)', r * 0.03);
    const eyes = [[-0.24, -0.12, 0.09], [-0.24, 0.12, 0.09], [-0.1, -0.27, 0.07], [-0.1, 0.27, 0.07],
        [0.06, -0.33, 0.05], [0.06, 0.33, 0.05], [-0.34, -0.03, 0.045], [-0.34, 0.03, 0.045]];
    for (const [ex, ey, er] of eyes) {
        eye(ctx, hx + ex * r, ey * r, er * r, { iris: '#ff2a2a' });
    }
}

// 5 — PHANTOM WAILER: a great skull crowned with bone spikes, trailing a
// storm of ectoplasm. The weak point sits in its wailing mouth. The skull
// fractures and the jaw hangs lower as it fades.
function phantomWailer(ctx, b, r, t, decay) {
    for (let i = 0; i < 9; i++) {
        const a = -0.9 + (i / 8) * 1.8;
        tentacle(ctx, r * 0.1, Math.sin(a) * r * 0.6, a * 0.8, r * (2.0 - Math.abs(a) * 0.5), r * 0.6,
            `rgba(175, 110, 255, ${0.24 - Math.abs(a) * 0.08})`, {
                t, phase: i * 1.1, wave: 0.8, speed: 3.4, tipWidth: 0.2, lineWidth: 0, segments: 9,
            });
    }
    light(ctx, '#a66bff', 0, 0, r * 2.4, 0.35);

    // Crown of bone spikes
    for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.42;
        const bx = Math.cos(a) * r * 0.72;
        const by = -r * 0.32 + Math.sin(a) * r * 0.66;
        horn(ctx, bx, by, bx + Math.cos(a) * r * 0.55, by + Math.sin(a) * r * 0.55, r * 0.2, r * 0.03, '#d8cfe8');
    }

    // Jaw, hanging open around the core
    const drop = r * (0.5 + 0.08 * Math.sin(t * 3) + 0.2 * decay);
    ctx.beginPath();
    ctx.roundRect(-r * 0.5, drop - r * 0.02, r * 1.0, r * 0.36, r * 0.14);
    paint(ctx, volume(ctx, 0, drop + r * 0.1, r * 0.6, 265, 20, 54), 1.8);
    fangs(ctx, -r * 0.42, drop, r * 0.42, drop, 7, r * 0.15, 0, -1);

    // Cranium and cheeks
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.4);
    ctx.bezierCurveTo(-r * 0.86, -r * 1.2, r * 0.86, -r * 1.2, r * 0.86, -r * 0.4);
    ctx.bezierCurveTo(r * 0.86, r * 0.05, r * 0.6, r * 0.1, r * 0.52, r * 0.42);
    ctx.lineTo(-r * 0.52, r * 0.42);
    ctx.bezierCurveTo(-r * 0.6, r * 0.1, -r * 0.86, r * 0.05, -r * 0.86, -r * 0.4);
    ctx.closePath();
    paint(ctx, volume(ctx, 0, -r * 0.4, r * 0.95, 265, 22, 62), 2);
    rim(ctx, 0, -r * 0.45, r * 0.86, r * 0.72, 'rgba(255, 255, 255, 0.8)', r * 0.04);

    // Wailing mouth cavity (the core is drawn over this)
    ctx.beginPath();
    ctx.ellipse(0, r * 0.05, r * 0.38, r * 0.4, 0, 0, TAU);
    ctx.fillStyle = '#0d0418';
    ctx.fill();
    fangs(ctx, -r * 0.34, r * 0.4, r * 0.34, r * 0.4, 6, r * 0.14, 0, 1);

    for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * r * 0.4, -r * 0.5, r * 0.26, r * 0.19, side * -0.5, 0, TAU);
        ctx.fillStyle = '#0d0418';
        ctx.fill();
        eye(ctx, side * r * 0.4, -r * 0.48, r * (0.08 + 0.04 * decay), { iris: '#7fdcff', pupil: '#eaffff' });
    }

    const fracture = 'rgba(40, 14, 60, 0.9)';
    ctx.strokeStyle = fracture;
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.lineJoin = 'round';
    const lines = [
        [[0.1, -1.0], [0.0, -0.8], [0.14, -0.7], [0.06, -0.58]],
        [[-0.7, -0.75], [-0.5, -0.72], [-0.45, -0.82]],
        [[0.8, -0.3], [0.62, -0.24], [0.6, -0.1]],
    ];
    lines.forEach((line, i) => {
        if (i > 0 && decay < i * 0.3) return;
        ctx.beginPath();
        ctx.moveTo(line[0][0] * r, line[0][1] * r);
        for (const [lx, ly] of line.slice(1)) ctx.lineTo(lx * r, ly * r);
        ctx.stroke();
    });
}

// 6 — VOID BOMBER: the kraken. A towering mottled mantle over eight
// sucker-lined arms and two long clubbed feelers; one eye barred and alive,
// one long dead. Ink bleeds from it as it is wounded.
function kraken(ctx, b, r, t, decay) {
    const hue = 268;
    const lunge = b.chargeState === 'windup' ? 1.4 : 1;

    for (const side of [-1, 1]) {
        const points = spine(side * r * 0.3, r * 0.3, Math.PI / 2 + side * 0.9, r * 2.0, {
            t, phase: side * 3, wave: 0.5, speed: 2, curl: side * -1.4, segments: 12,
        });
        const tip = ribbon(ctx, points, r * 0.14, hsl(hue, 55, 30), { tipWidth: r * 0.08 });
        orb(ctx, tip.x, tip.y, r * 0.16, r * 0.11, hue, 60, 46, { lineWidth: 1.2 });
    }
    for (let i = 0; i < 8; i++) {
        const fan = i / 7 - 0.5;
        const points = spine(fan * r * 1.1, r * 0.3, Math.PI / 2 + fan * 1.5, r * 1.3 * lunge, {
            t, phase: i * 1.1, wave: 0.7, speed: 2.4 + decay * 3, curl: fan * 1.8, segments: 9,
        });
        ribbon(ctx, points, r * 0.26, hsl(hue, 58, 28 + (i % 2) * 7), { highlight: hsl(hue, 75, 64, 0.7) });
        ctx.fillStyle = hsl(hue + 40, 65, 80, 0.85);
        for (let s = 2; s < points.length - 1; s += 2) {
            ctx.beginPath();
            ctx.arc(points[s].x, points[s].y, r * 0.035, 0, TAU);
            ctx.fill();
        }
    }

    const breathe = 1 + 0.04 * Math.sin(t * 2);
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, r * 0.2);
    ctx.bezierCurveTo(-r * 1.0 * breathe, -r * 0.6, -r * 0.5, -r * 1.25, r * 0.1, -r * 1.25);
    ctx.bezierCurveTo(r * 0.7, -r * 1.25, r * 1.0 * breathe, -r * 0.5, r * 0.85, r * 0.2);
    ctx.bezierCurveTo(r * 0.5, r * 0.5, -r * 0.5, r * 0.5, -r * 0.85, r * 0.2);
    ctx.closePath();
    paint(ctx, volume(ctx, 0, -r * 0.4, r * 1.1, hue, 60, 40), 2);
    ctx.fillStyle = hsl(hue, 65, 18, 0.5);
    for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc((jitter(i + 40) - 0.35) * r * 1.2, -r * (0.45 + jitter(i + 50) * 0.7), r * (0.05 + 0.07 * jitter(i + 60)), 0, TAU);
        ctx.fill();
    }
    rim(ctx, 0, -r * 0.45, r * 0.9, r * 0.8, 'rgba(240, 220, 255, 0.65)', r * 0.035);

    eye(ctx, -r * 0.42, -r * 0.05, r * 0.2, { iris: decay > 0.6 ? '#ff4d3b' : '#ffd23b', sclera: '#f5e9c8', lookX: -0.5, lid: 0.32 });
    ctx.fillStyle = '#050208';
    ctx.fillRect(-r * 0.53, -r * 0.075, r * 0.18, r * 0.05);
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.03, r * 0.19, 0, TAU);
    paint(ctx, volume(ctx, r * 0.25, -r * 0.03, r * 0.19, 260, 12, 68), 1.4);
    ctx.strokeStyle = 'rgba(110, 16, 36, 0.9)';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.lineCap = 'round';
    for (const off of [-0.07, 0.05]) {
        ctx.beginPath();
        ctx.moveTo(r * (0.1 + off), -r * 0.26);
        ctx.lineTo(r * (0.38 + off), r * 0.2);
        ctx.stroke();
    }

    const clack = r * 0.06 * (0.5 + 0.5 * Math.sin(t * (6 + decay * 8)));
    ctx.fillStyle = '#1a0d12';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.28);
    ctx.lineTo(r * 0.06, r * 0.28);
    ctx.lineTo(-r * 0.07, r * 0.5 + clack);
    ctx.closePath();
    ctx.fill();

    // Ink bleeding out
    for (let i = 0; i < 4; i++) {
        if (decay < 0.25 * i + 0.2) continue;
        const fall = (t * 0.5 + i * 0.27) % 1;
        ctx.fillStyle = `rgba(14, 4, 30, ${0.8 * (1 - fall)})`;
        ctx.beginPath();
        ctx.arc(r * (0.5 - i * 0.3), r * (0.3 + fall * 1.2), r * (0.1 + 0.1 * fall), 0, TAU);
        ctx.fill();
    }
}

// 7 — STEALTH WRAITH: the chameleon lord. A crested lizard in shifting
// cyan bands, tail coiled tight, tongue lashing out; its body shimmers in
// and out while the two turret eyes never look away.
function chameleonLord(ctx, b, r, t, decay) {
    const hue = 180 + 35 * Math.sin(t * 0.8);
    const shimmer = 0.55 + 0.45 * Math.abs(Math.sin(t * (0.9 + decay * 2.5)));

    ctx.save();
    ctx.globalAlpha *= shimmer;
    tentacle(ctx, r * 0.7, r * 0.05, 0.3, r * 2.6, r * 0.4, hsl(hue, 65, 36), {
        t, curl: 6.2, wave: 0.12, speed: 1.6, segments: 16, tipWidth: 1, highlight: hsl(hue, 85, 72, 0.6),
    });
    for (const lx of [-0.35, 0.3]) {
        const grip = Math.sin(t * 5 + lx * 8) * r * 0.06;
        leg(ctx, lx * r, r * 0.35, lx * r - r * 0.14, r * 0.85, lx * r - r * 0.36 + grip, r * 1.15,
            r * 0.15, hsl(hue, 60, 24), hsl(hue, 85, 68, 0.6));
    }
    ctx.fillStyle = hsl(hue + 50, 85, 62);
    for (let i = 0; i < 7; i++) {
        const cx = -r * 0.6 + i * r * 0.21;
        const tall = r * (0.3 + 0.12 * Math.sin(i * 1.3));
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.1, -r * 0.42);
        ctx.lineTo(cx + r * 0.04, -r * 0.42 - tall);
        ctx.lineTo(cx + r * 0.13, -r * 0.42);
        ctx.closePath();
        ctx.fill();
    }
    orb(ctx, 0, 0, r * 0.95, r * 0.58, hue, 70, 42);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.92, r * 0.55, 0, 0, TAU);
    ctx.clip();
    ctx.strokeStyle = hsl(hue + 60, 95, 70, 0.7);
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 6; i++) {
        const sx = -r * 0.6 + i * r * 0.27 + Math.sin(t * 1.5 + i) * r * 0.03;
        ctx.beginPath();
        ctx.moveTo(sx, -r * 0.6);
        ctx.quadraticCurveTo(sx + r * 0.18, 0, sx, r * 0.6);
        ctx.stroke();
    }
    ctx.restore();
    rim(ctx, 0, 0, r * 0.95, r * 0.58, 'rgba(255, 255, 255, 0.6)', r * 0.035);

    // Tongue lashes out on a cycle
    const lash = Math.max(0, Math.sin(t * 2.2)) ** 6;
    if (lash > 0.02) {
        const tongue = spine(-r * 1.25, r * 0.12, Math.PI, r * 1.4 * lash, { t, wave: 0.3, speed: 9, segments: 6 });
        const tip = ribbon(ctx, tongue, r * 0.09, '#ff5c8a', { tipWidth: r * 0.06, lineWidth: 1 });
        orb(ctx, tip.x, tip.y, r * 0.1, r * 0.1, 340, 80, 60, { lineWidth: 1 });
    }
    horn(ctx, -r * 0.72, -r * 0.34, -r * 0.3, -r * 1.05, r * 0.32, -r * 0.08, hsl(hue, 60, 32));
    orb(ctx, -r * 0.92, 0, r * 0.5, r * 0.42, hue, 70, 44);
    ctx.restore();

    const sclera = hsl(hue, 55, 56);
    eye(ctx, -r * 1.08, -r * 0.16, r * 0.24, {
        iris: '#fff06b', sclera, lookX: Math.cos(t * 1.7), lookY: Math.sin(t * 1.7),
    });
    eye(ctx, -r * 0.7, r * 0.12, r * 0.19, {
        iris: '#fff06b', sclera, lookX: Math.cos(-t * 1.1 + 2), lookY: Math.sin(-t * 1.1 + 2),
    });
}

// 8 — INFERNO LORD: the devil. A crown of four horns over a head of
// cracked rock, a mane of fire, and a furnace maw that holds the weak
// point. A horn snaps and the cracks spread as it burns down.
function infernoLord(ctx, b, r, t, decay) {
    const heat = 0.6 + 0.4 * Math.sin(t * 6);
    const ember = '#ff9a1f';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.33;
        tentacle(ctx, Math.cos(a) * r * 0.5, -r * 0.2 + Math.sin(a) * r * 0.5, a, r * (1.3 + 0.5 * decay) * (1 - Math.abs(i - 4) * 0.07),
            r * 0.55, i % 2 ? 'rgba(255, 190, 40, 0.38)' : 'rgba(255, 70, 20, 0.42)', {
                t, phase: i * 2.1, wave: 0.8, speed: 11, tipWidth: 0.1, lineWidth: 0, segments: 7,
            });
    }
    ctx.restore();
    light(ctx, '#ff5a1f', 0, 0, r * 2.6, 0.4 + 0.2 * heat);

    for (const side of [-1, 1]) {
        const snapped = side > 0 && decay > 0.55;
        horn(ctx, side * r * 0.5, -r * 0.7, side * r * (snapped ? 0.85 : 1.25), -r * (snapped ? 1.15 : 1.75),
            r * 0.4, side * r * 0.3, '#2a1418');
        horn(ctx, side * r * 0.78, -r * 0.3, side * r * 1.45, -r * 0.75, r * 0.26, side * r * 0.16, '#2a1418');
    }

    ctx.beginPath();
    ctx.moveTo(-r * 0.92, -r * 0.45);
    ctx.quadraticCurveTo(0, -r * 1.2, r * 0.92, -r * 0.45);
    ctx.quadraticCurveTo(r * 0.9, r * 0.5, 0, r * 1.1);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.5, -r * 0.92, -r * 0.45);
    ctx.closePath();
    paint(ctx, volume(ctx, 0, -r * 0.2, r * 1.05, 4, 84, 28), 2);

    const width = r * (0.035 + 0.03 * decay);
    crack(ctx, [[-r * 0.1, -r * 0.95], [r * 0.06, -r * 0.75], [-r * 0.05, -r * 0.6]], ember, width, r * 0.22);
    crack(ctx, [[r * 0.78, -r * 0.1], [r * 0.6, r * 0.12], [r * 0.64, r * 0.36]], ember, width, r * 0.2);
    if (decay > 0.3) crack(ctx, [[-r * 0.8, -r * 0.2], [-r * 0.62, 0], [-r * 0.66, r * 0.3], [-r * 0.45, r * 0.5]], ember, width, r * 0.2);
    if (decay > 0.6) crack(ctx, [[r * 0.2, r * 0.95], [r * 0.3, r * 0.7], [r * 0.5, r * 0.6]], ember, width, r * 0.2);

    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.4, -r * 0.5);
        ctx.rotate(side * 0.5);
        eye(ctx, 0, 0, r * 0.19, { iris: '#ffe14a', slit: true, lid: 0.5 });
        ctx.restore();
    }

    // Furnace maw around the core
    ctx.beginPath();
    ctx.ellipse(0, r * 0.06, r * 0.5, r * 0.42, 0, 0, TAU);
    paint(ctx, '#160406', 1.6);
    light(ctx, '#ff8a1f', 0, r * 0.1, r * 0.7, 0.7);
    fangs(ctx, -r * 0.42, -r * 0.2, r * 0.42, -r * 0.2, 7, r * 0.17, 0, 1, '#f1e2c4');
    fangs(ctx, -r * 0.36, r * 0.36, r * 0.36, r * 0.36, 6, r * 0.16, 0, -1, '#f1e2c4');
}

// 9 — CHAOS HARBINGER: the end of the run. A black, horned idol stitched
// from everything before it — a ring of watching eyes, a wheel of bone
// blades, tentacles, wings of magenta fire — around a heart that is the
// weak point. The wheel breaks and the idol cracks open as it falls.
function chaosHarbinger(ctx, b, r, t, decay) {
    const hot = '#ff3d8b';
    const heat = 0.6 + 0.4 * Math.sin(t * 5);

    // Wings of fire
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
            const a = side > 0 ? -0.9 + i * 0.36 : Math.PI + 0.9 - i * 0.36;
            tentacle(ctx, side * r * 0.5, -r * 0.1, a,
                r * (2.0 - i * 0.2), r * 0.5, i % 2 ? 'rgba(255, 60, 160, 0.3)' : 'rgba(170, 60, 255, 0.3)', {
                    t, phase: i * 1.7 + side, wave: 0.6, speed: 7, tipWidth: 0.1, lineWidth: 0, segments: 8,
                });
        }
    }
    ctx.restore();
    light(ctx, hot, 0, 0, r * 2.8, 0.35 + 0.2 * heat);

    for (let i = 0; i < 6; i++) {
        const fan = i / 5 - 0.5;
        tentacle(ctx, fan * r * 0.9, r * 0.5, Math.PI / 2 + fan * 1.6, r * 1.35, r * 0.24, '#1a0a1e', {
            t, phase: i * 1.2, wave: 0.7, speed: 3 + decay * 3, curl: fan * 1.5, segments: 9,
            highlight: 'rgba(255, 61, 139, 0.8)',
        });
    }

    // Wheel of bone blades; some shear off with damage
    const blades = 8;
    for (let i = 0; i < blades; i++) {
        if (decay > 0.35 && i % 4 === 1) continue;
        if (decay > 0.7 && i % 4 === 3) continue;
        const a = t * 0.9 + (i / blades) * TAU;
        const bx = Math.cos(a) * r * 1.02;
        const by = Math.sin(a) * r * 1.02;
        horn(ctx, bx, by, bx + Math.cos(a + 0.9) * r * 0.6, by + Math.sin(a + 0.9) * r * 0.6, r * 0.24, r * 0.08, '#e6dcec');
    }

    for (const side of [-1, 1]) {
        horn(ctx, side * r * 0.45, -r * 0.75, side * r * 1.05, -r * 1.85, r * 0.42, side * r * 0.34, '#120814');
    }

    // The idol: a faceted black mask
    const mask = [[0, -1.08], [0.62, -0.82], [0.98, -0.2], [0.8, 0.5], [0.3, 1.0], [-0.3, 1.0], [-0.8, 0.5], [-0.98, -0.2], [-0.62, -0.82]]
        .map(([x, y]) => [x * r, y * r]);
    polygon(ctx, mask);
    paint(ctx, volume(ctx, 0, -r * 0.2, r * 1.1, 320, 45, 16), 2.2);
    polygon(ctx, [mask[0], mask[1], [0, -r * 0.4], mask[8]]);
    ctx.fillStyle = 'rgba(255, 150, 210, 0.12)';
    ctx.fill();
    polygon(ctx, [mask[3], mask[4], mask[5], mask[6], [0, r * 0.45]]);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    const width = r * (0.03 + 0.035 * decay);
    crack(ctx, [[0, -r * 1.0], [-r * 0.08, -r * 0.7], [r * 0.05, -r * 0.45]], hot, width, r * 0.2);
    crack(ctx, [[-r * 0.9, -r * 0.1], [-r * 0.6, 0], [-r * 0.45, r * 0.3]], hot, width, r * 0.2);
    crack(ctx, [[r * 0.9, -r * 0.1], [r * 0.6, 0], [r * 0.45, r * 0.3]], hot, width, r * 0.2);
    if (decay > 0.4) crack(ctx, [[-r * 0.25, r * 0.95], [-r * 0.15, r * 0.65], [-r * 0.3, r * 0.45]], hot, width, r * 0.2);
    if (decay > 0.65) crack(ctx, [[r * 0.6, -r * 0.8], [r * 0.4, -r * 0.55], [r * 0.5, -r * 0.35]], hot, width, r * 0.2);

    // Scowling eyes above, a ring of lesser eyes around the heart
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * r * 0.42, -r * 0.55);
        ctx.rotate(side * 0.5);
        eye(ctx, 0, 0, r * 0.17, { iris: '#ff5ce0', slit: true, lid: 0.45 });
        ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, TAU);
    paint(ctx, '#0a030c', 1.6);
    for (let i = 0; i < 6; i++) {
        const a = -t * 0.6 + (i / 6) * TAU;
        eye(ctx, Math.cos(a) * r * 0.56, Math.sin(a) * r * 0.56, r * 0.075, {
            iris: i % 2 ? '#ffc531' : '#7fdcff', lookX: -Math.cos(a), lookY: -Math.sin(a),
        });
    }
    fangs(ctx, -r * 0.3, r * 0.72, r * 0.3, r * 0.72, 5, r * 0.16, 0, 1, '#e6dcec');
}

const PORTRAITS = [
    colossus, critterQueen, fireflyMonarch, jellyTitan, spiderQueen,
    phantomWailer, kraken, chameleonLord, infernoLord, chaosHarbinger,
];

export function drawBossPortrait(ctx, boss) {
    const paintBoss = PORTRAITS[boss.bossType] || colossus;
    const decay = 1 - Math.max(0, boss.hp) / boss.maxHp;
    paintBoss(ctx, boss, boss.radius, boss.time, decay);
}
