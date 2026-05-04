// ============================================================
// constants.js — Shared globals (no class deps, importable everywhere)
// ============================================================
// `let` so updateGameScale() can reassign; ES module live-binding means
// every importer sees the current value automatically.

export let GAME_SCALE = 1.0;

export function updateGameScale(canvasWidth) {
    GAME_SCALE = Math.max(0.5, Math.min(1.0, canvasWidth / 1200));
}
