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
// capped to MAX_SHADOW_BLUR. Original setter is preserved in a closure.
const isTouchDevice = typeof window !== 'undefined' &&
    (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
const isLowCore = typeof navigator !== 'undefined' &&
    (navigator.hardwareConcurrency || 8) < 4;

export const MAX_SHADOW_BLUR = (isTouchDevice || isLowCore) ? 0 : Infinity;

if (typeof CanvasRenderingContext2D !== 'undefined' && MAX_SHADOW_BLUR < Infinity) {
    const desc = Object.getOwnPropertyDescriptor(
        CanvasRenderingContext2D.prototype, 'shadowBlur');
    if (desc && desc.set && desc.get) {
        Object.defineProperty(CanvasRenderingContext2D.prototype, 'shadowBlur', {
            configurable: true,
            get() { return desc.get.call(this); },
            set(value) {
                desc.set.call(this, value > MAX_SHADOW_BLUR ? MAX_SHADOW_BLUR : value);
            },
        });
    }
}
