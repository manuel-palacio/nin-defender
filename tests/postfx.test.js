import { describe, it, expect, beforeEach } from 'vitest';
import { aberrationFromShake, loadEnabledPreference, saveEnabledPreference } from '../js/postfx.js';

describe('aberrationFromShake', () => {
    it('is zero when the screen is still', () => {
        expect(aberrationFromShake(0)).toBe(0);
    });

    it('scales with shake and saturates at 1', () => {
        expect(aberrationFromShake(10)).toBeCloseTo(0.5);
        expect(aberrationFromShake(200)).toBe(1);
    });
});

describe('post-processing preference', () => {
    beforeEach(() => clearGameStorage());

    it('defaults to enabled', () => {
        expect(loadEnabledPreference(localStorage)).toBe(true);
    });

    it('round-trips the toggle through storage', () => {
        saveEnabledPreference(localStorage, false);
        expect(loadEnabledPreference(localStorage)).toBe(false);
        saveEnabledPreference(localStorage, true);
        expect(loadEnabledPreference(localStorage)).toBe(true);
    });

    it('falls back to enabled when storage throws', () => {
        const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
        expect(() => saveEnabledPreference(blocked, false)).not.toThrow();
        expect(loadEnabledPreference(blocked)).toBe(true);
    });
});
