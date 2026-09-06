import { describe, it, expect } from 'vitest';
import { ScrapField } from '../js/scrap.js';

const farPlayer = { x: 2000, y: 2000, radius: 18, alive: true };

describe('ScrapField', () => {
    it('splits an amount into drops that sum to the amount', () => {
        const field = new ScrapField();
        field.spawn(100, 100, 23);
        const total = field.drops.reduce((sum, d) => sum + d.value, 0);
        expect(total).toBe(23);
        expect(field.drops.length).toBeGreaterThan(1);
    });

    it('is collected when the player touches a drop', () => {
        const field = new ScrapField();
        field.spawn(100, 100, 3);
        const collected = field.update(0.016, { x: 100, y: 100, radius: 18, alive: true });
        expect(collected).toBe(3);
        expect(field.drops).toHaveLength(0);
    });

    it('is pulled toward a nearby player', () => {
        const field = new ScrapField();
        field.spawn(100, 100, 1);
        const player = { x: 190, y: 100, radius: 18, alive: true };
        field.update(0.05, player);
        expect(field.drops[0].x).toBeGreaterThan(100);
    });

    it('drifts left and is lost off the left edge', () => {
        const field = new ScrapField();
        field.spawn(5, 100, 1);
        for (let i = 0; i < 60; i++) field.update(0.05, farPlayer);
        expect(field.drops).toHaveLength(0);
    });
});
