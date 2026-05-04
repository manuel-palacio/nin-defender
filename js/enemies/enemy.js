import { GAME_SCALE } from '../constants.js';

export class Enemy {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 15 * GAME_SCALE;
        this.hp = 1;
        this.maxHp = 1;
        this.active = false;
        this.points = 10;
        this.type = 'asteroid';
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    isOffScreen(canvasW, canvasH) {
        return (this.x < -this.radius * 2 - 50 ||
                this.x > canvasW + this.radius * 2 + 50 ||
                this.y < -this.radius * 2 - 50 ||
                this.y > canvasH + this.radius * 2 + 50);
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }
}

// ============================================================
// Asteroid — Rotating irregular polygon, 1 HP
// ============================================================
