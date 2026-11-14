import { describe, it, expect } from 'vitest';
import { uiScale, display, mono } from '../js/theme.js';

describe('uiScale', () => {
    it('is 1 at the 1280x720 reference size', () => {
        expect(uiScale(1280, 720)).toBe(1);
    });

    it('follows the tighter dimension on a landscape phone', () => {
        expect(uiScale(844, 390)).toBeCloseTo(390 / 720);
    });

    it('stays within bounds on tiny and huge screens', () => {
        expect(uiScale(200, 100)).toBe(0.5);
        expect(uiScale(5120, 2880)).toBe(1.3);
    });
});

describe('font helpers', () => {
    it('build canvas font strings with a fallback stack', () => {
        expect(display(40)).toMatch(/^40px 'Bebas Neue', .*sans-serif$/);
        expect(mono(12)).toMatch(/^12px 'Share Tech Mono', .*monospace$/);
    });
});
