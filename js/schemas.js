// ============================================================
// schemas.js — Zod schemas for localStorage values
// ============================================================
// safeParse() returns { success, data } / { success, error } — never throws.
// Each loadX() helper handles missing keys, parse errors, and schema
// failures by returning the sensible default and logging a warning.

import { z } from 'zod';

const UpgradesSchema = z.object({
    damage:   z.number().int().min(0).max(5).default(0),
    fireRate: z.number().int().min(0).max(5).default(0),
    speed:    z.number().int().min(0).max(5).default(0),
    bombs:    z.number().int().min(0).max(5).default(0),
    shields:  z.number().int().min(0).max(4).default(0),
    lives:    z.number().int().min(0).max(4).default(0),
});

const LeaderboardEntrySchema = z.object({
    score:    z.number().int().min(0),
    phase:    z.number().int().min(0),
    time:     z.number().min(0),
    maxCombo: z.number().int().min(0),
    date:     z.string(),
});
const LeaderboardSchema = z.array(LeaderboardEntrySchema).max(10);

const ScrapSchema      = z.coerce.number().int().min(0).default(0);
const HighScoreSchema  = z.coerce.number().int().min(0).default(0);
const DifficultySchema = z.coerce.number().int().min(0).max(2).default(1);
const TrailSchema      = z.coerce.number().int().min(0).default(0);
const SkinSchema       = z.coerce.number().int().min(0).default(0);
const SkinsUnlockedSchema = z.coerce.number().int().min(0).max(3).default(0);
const DailyBestSchema  = z.object({ date: z.string(), score: z.number().int().min(0) });
const WeaponIdSchema   = z.enum(['BLASTER', 'SPREAD', 'RAILGUN']);
const WeaponsSchema    = z.array(z.enum(['SPREAD', 'RAILGUN'])).default([]);

// safeLoad — JSON-parses the raw value when `json` is true, then runs it
// through schema.safeParse(). On any failure (missing key, bad JSON, schema
// mismatch) returns the literal fallback and logs a warning naming the key.
function safeLoad(key, schema, fallback, json) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    let value = raw;
    if (json) {
        try { value = JSON.parse(raw); }
        catch (e) {
            console.warn(`[schemas] resetting ${key} (JSON parse failed)`, e.message);
            return fallback;
        }
    }
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    console.warn(`[schemas] resetting ${key} (validation failed)`, result.error.issues);
    return fallback;
}

// Convenience loaders — single source of truth for every key. Each carries
// an explicit default so we never rely on Zod's `.parse(undefined)` paths.
export const Schemas = {
    loadUpgrades:    () => safeLoad('ninDefenderUpgrades', UpgradesSchema,
                          { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 }, true),
    loadLeaderboard: () => safeLoad('ninDefenderLeaderboard', LeaderboardSchema, [], true),
    loadScrap:       () => safeLoad('ninDefenderScrap', ScrapSchema, 0, false),
    loadHighScore:   () => safeLoad('ninDefenderHigh', HighScoreSchema, 0, false),
    loadDifficulty:  () => safeLoad('ninDefenderDifficulty', DifficultySchema, 1, false),
    loadTrail:       () => safeLoad('ninDefenderTrail', TrailSchema, 0, false),
    loadSkin:        () => safeLoad('ninDefenderSkin', SkinSchema, 0, false),
    loadSkinsUnlocked: () => safeLoad('ninDefenderSkinsUnlocked', SkinsUnlockedSchema, 0, false),
    loadDailyBest:   () => safeLoad('ninDefenderDaily', DailyBestSchema, null, true),
    loadWeapons:     () => safeLoad('ninDefenderWeapons', WeaponsSchema, [], true),
    loadSelectedWeapon: () => safeLoad('ninDefenderWeapon', WeaponIdSchema, 'BLASTER', false),
    // Local-timezone YYYY-MM-DD — toISOString() would roll the day over at UTC
    // midnight, not the player's.
    localDateString: () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    // Rolls the date-keyed daily best: same-day keeps the max, a new day resets.
    updateDailyBest: (score, today = Schemas.localDateString()) => {
        const stored = Schemas.loadDailyBest();
        const best = (stored && stored.date === today) ? Math.max(stored.score, score) : score;
        const record = { date: today, score: best };
        localStorage.setItem('ninDefenderDaily', JSON.stringify(record));
        return record;
    },
    UpgradesSchema, LeaderboardSchema, ScrapSchema,
    HighScoreSchema, DifficultySchema, TrailSchema, SkinSchema,
    SkinsUnlockedSchema, DailyBestSchema, WeaponsSchema, WeaponIdSchema,
};
