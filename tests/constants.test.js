import { describe, it, expect, afterEach } from 'vitest';
import { capShadowBlur, setShadowBlurEnabled, MAX_SHADOW_BLUR } from '../js/constants.js';

describe('shadowBlur cap', () => {
    afterEach(() => setShadowBlurEnabled(true));

    it('zeroes every blur while disabled (PostFX bloom supplies the glow)', () => {
        setShadowBlurEnabled(false);
        expect(capShadowBlur(30)).toBe(0);
        expect(capShadowBlur(0)).toBe(0);
    });

    it('restores the device cap when re-enabled', () => {
        setShadowBlurEnabled(false);
        setShadowBlurEnabled(true);
        expect(capShadowBlur(30)).toBe(Math.min(30, MAX_SHADOW_BLUR));
    });
});
