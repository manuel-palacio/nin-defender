import { describe, it, expect, afterEach } from 'vitest';
import { Utils, hashString } from '../js/utils.js';

afterEach(() => Utils.restoreRandom());

describe('seeded random', () => {
    it('produces the same sequence for the same seed', () => {
        Utils.seedRandom(hashString('2026-09-07'));
        const a = [Utils.random(0, 1), Utils.randomInt(0, 100), Utils.random(0, 1)];
        Utils.seedRandom(hashString('2026-09-07'));
        const b = [Utils.random(0, 1), Utils.randomInt(0, 100), Utils.random(0, 1)];
        expect(a).toEqual(b);
    });

    it('differs between days and restores the native generator', () => {
        Utils.seedRandom(hashString('2026-09-07'));
        const a = Utils.random(0, 1);
        Utils.seedRandom(hashString('2026-09-08'));
        const b = Utils.random(0, 1);
        expect(a).not.toBe(b);
        Utils.restoreRandom();
        Utils.seedRandom(hashString('2026-09-07'));
        Utils.restoreRandom();
        expect(Utils.random(0, 1)).not.toBe(a);
    });
});
