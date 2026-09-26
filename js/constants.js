// ============================================================
// constants.js — Shared globals (no class deps, importable everywhere)
// ============================================================
// `let` so updateGameScale() can reassign; ES module live-binding means
// every importer sees the current value automatically.

export let GAME_SCALE = 1.0;

export function updateGameScale(canvasWidth) {
    GAME_SCALE = Math.max(0.5, Math.min(1.0, canvasWidth / 1200));
}

// ---- Render quality cap ----
// shadowBlur is one of the most expensive Canvas 2D ops on mobile GPUs.
// On low-end devices we clamp it globally by intercepting the prototype
// setter — every `ctx.shadowBlur = N` write goes through this and gets
// capped to the current cap. Original setter is preserved in a closure.
const isTouchDevice = typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
const isLowCore = typeof navigator !== 'undefined' &&
    (navigator.hardwareConcurrency || 8) < 4;

export const MAX_SHADOW_BLUR = (isTouchDevice || isLowCore) ? 0 : Infinity;

// Also zeroed while PostFX is on: its bloom pass supplies the glow, and large
// shadowBlur radii on boss-sized shapes cost the GPU rasterizer enough to halve
// the frame rate during boss fights (measured ~30fps → 90-120fps without).
let shadowBlurCap = MAX_SHADOW_BLUR;

export function setShadowBlurEnabled(enabled) {
    shadowBlurCap = enabled ? MAX_SHADOW_BLUR : 0;
}

export function capShadowBlur(value) {
    return value > shadowBlurCap ? shadowBlurCap : value;
}

if (typeof CanvasRenderingContext2D !== 'undefined') {
    const desc = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype, 'shadowBlur');
    if (desc && desc.set && desc.get) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', {
            configurable: true,
            get() { return desc.get.call(this); },
            set(value) {
                desc.set.call(this, capShadowBlur(value));
            },
        });
    }
}
