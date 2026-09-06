import { describe, it, expect } from 'vitest';
import { ScorePopups } from '../js/score-popups.js';

describe('ScorePopups', () => {
    it('labels the multiplier only when it is above 1', () => {
        const pops = new ScorePopups();
        pops.add(0, 0, 25, 1);
        pops.add(0, 0, 50, 2);
        expect(pops.pops[0].text).toBe('+25');
        expect(pops.pops[1].text).toBe('+50 x2');
    });

    it('rises and expires after its lifetime', () => {
        const pops = new ScorePopups();
        pops.add(100, 200, 10, 1);
        pops.update(0.5);
        expect(pops.pops[0].y).toBeLessThan(200);
        pops.update(0.5);
        expect(pops.pops).toHaveLength(0);
    });
});
