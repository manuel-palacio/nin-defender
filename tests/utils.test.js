import { describe, it, expect } from 'vitest';
import { Utils } from '../js/utils.js';

describe('Utils.circleCollision', () => {
    it('returns true for overlapping circles', () => {
        expect(Utils.circleCollision(0, 0, 10, 5, 0, 10)).toBe(true);
        expect(Utils.circleCollision(100, 100, 5, 102, 102, 5)).toBe(true);
    });

    it('returns false for non-overlapping circles', () => {
        expect(Utils.circleCollision(0, 0, 5, 100, 100, 5)).toBe(false);
        expect(Utils.circleCollision(0, 0, 1, 10, 0, 1)).toBe(false);
    });

    it('returns false for circles touching exactly (strict less-than)', () => {
        // Distance == sum of radii — boundary case; impl uses < not <=
        expect(Utils.circleCollision(0, 0, 5, 10, 0, 5)).toBe(false);
    });
});

describe('Utils.clamp', () => {
    it('clamps below min', () => {
        expect(Utils.clamp(-5, 0, 10)).toBe(0);
    });

    it('clamps above max', () => {
        expect(Utils.clamp(15, 0, 10)).toBe(10);
    });

    it('passes through values within range', () => {
        expect(Utils.clamp(5, 0, 10)).toBe(5);
        expect(Utils.clamp(0, 0, 10)).toBe(0);
        expect(Utils.clamp(10, 0, 10)).toBe(10);
    });
});

describe('Utils.random / randomInt', () => {
    it('random returns value within [min, max)', () => {
        for (let i = 0; i < 100; i++) {
            const v = Utils.random(2, 7);
            expect(v).toBeGreaterThanOrEqual(2);
            expect(v).toBeLessThan(7);
        }
    });

    it('randomInt returns integer within [min, max]', () => {
        for (let i = 0; i < 100; i++) {
            const v = Utils.randomInt(3, 8);
            expect(Number.isInteger(v)).toBe(true);
            expect(v).toBeGreaterThanOrEqual(3);
            expect(v).toBeLessThanOrEqual(8);
        }
    });
});

describe('Utils.distance', () => {
    it('computes euclidean distance', () => {
        expect(Utils.distance(0, 0, 3, 4)).toBe(5);
        expect(Utils.distance(1, 1, 1, 1)).toBe(0);
    });
});
