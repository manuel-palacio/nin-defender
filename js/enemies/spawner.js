import { Utils } from '../utils.js'
import { GAME_SCALE } from '../constants.js'
import { Asteroid } from './asteroid.js'
import { EnemyShip } from './enemy-ship.js'
import { Drone } from './drone.js'
import { Bomber } from './bomber.js'
import { SpaceMine } from './space-mine.js'
import { StealthFighter } from './stealth-fighter.js'
import { SpiderDrone } from './spider-drone.js'
import { AlienGhost } from './alien-ghost.js'
import { AlienDevil } from './alien-devil.js'
import { Boss } from './boss.js'

export const PHASES = [
    // Tuned against a live play-test (2026-06): the previous curve (3000 for
    // phase 1) left an average run stuck in ASTEROID FIELD for 3+ minutes.
    // Early thresholds are compressed so the first transition lands within
    // ~45s and the first boss within ~2 minutes; late phases stay close to
    // the old values since faster spawning already accelerates scoring.
    { name: 'ASTEROID FIELD',     threshold: 0,     featured: 'asteroid',  color: '#aa7733' },
    { name: 'CRITTER COLONY',     threshold: 1500,  featured: 'ship',      color: '#ff6644' },
    { name: 'FIREFLY SWARM',      threshold: 4000,  featured: 'drone',     color: '#44ff66' },
    { name: 'JELLYFISH DRIFT',    threshold: 7500,  featured: 'mine',      color: '#ff88cc' },
    { name: 'ARACHNID SECTOR',    threshold: 12000, featured: 'spider',    color: '#66ff22' },
    { name: 'GHOST NEBULA',       threshold: 18000, featured: 'ghost',     color: '#bb66ff' },
    { name: 'OCTOPUS DEN',        threshold: 26000, featured: 'bomber',    color: '#cc44ff' },
    { name: 'CHAMELEON VOID',     threshold: 35000, featured: 'stealth',   color: '#00cccc' },
    { name: 'DEVIL\'S DOMAIN',    threshold: 46000, featured: 'devil',     color: '#ff4400' },
    { name: 'TOTAL CHAOS',        threshold: 58000, featured: 'all',       color: '#ff3366' }
];

export class EnemySpawner {
    constructor(assets) {
        this.assets = assets || {};
        this.timer = 0;
        this.baseInterval = 1.5;
        this.enemies = [];
        this.currentPhase = 0;
        this.phaseAnnouncedAt = -1; // score when last announcement was shown
    }

    getPhase(score) {
        for (let i = PHASES.length - 1; i >= 0; i--) {
            if (score >= PHASES[i].threshold) return i;
        }
        return 0;
    }

    // Smooth exponential spawn interval — no cliff between phases.
    // baseInterval comes from the difficulty setting (EASY/NORMAL/BRUTAL).
    getSpawnInterval(phase) {
        return Math.max(0.45, this.baseInterval * Math.pow(0.82, phase));
    }

    update(dt, score, canvasW, canvasH, projectilePool, playerY, audio, playerX) {
        this.timer -= dt;
        this._t = (this._t || 0) + dt;

        // Phase check
        const phase = this.getPhase(score);
        if (phase !== this.currentPhase) {
            this.currentPhase = phase;
            this.phaseAnnouncedAt = score;
        }

        const phaseInfo = PHASES[this.currentPhase];
        const interval = this.getSpawnInterval(phase);
        const largeTier = phase >= 5 ? 0.2 : 0;

        if (this.timer <= 0) {
            this.timer = interval + Utils.random(-0.3, 0.3);
            const spawnStart = this.enemies.length;

            const roll = Math.random();
            const featured = phaseInfo.featured;

            // 15% chance for formation spawn in eligible phases
            if (phase >= 2 && Math.random() < 0.15) {
                this.spawnFormation(phase, canvasW, canvasH);
            }
            // 65% chance to spawn the featured enemy, rest is mixed
            else if (featured !== 'all' && roll < 0.65) {
                this.spawnByType(featured, canvasW, canvasH, largeTier);
            } else {
                this.spawnMixed(score, canvasW, canvasH, largeTier);
            }

            // Phase 10 (TOTAL CHAOS): double spawn
            if (phase >= 9) {
                this.spawnMixed(score, canvasW, canvasH, 0.4);
            }

            // Phase 5+: chance to spawn enemies from behind
            if (phase >= 4 && Math.random() < (phase >= 9 ? 0.4 : 0.2)) {
                const behindPool = ['drone', 'asteroid'];
                if (phase >= 7) behindPool.push('ship');
                const pick = behindPool[Utils.randomInt(0, behindPool.length - 1)];
                const e = this._spawnFromBehind(pick, canvasW, canvasH);
                if (e) this.enemies.push(e);
            }

            // Elite escalation — DEVIL'S DOMAIN onward, a quarter of spawns
            // come back tougher and worth more.
            if (phase >= 8) {
                for (let i = spawnStart; i < this.enemies.length; i++) {
                    if (Math.random() < 0.25) this.makeElite(this.enemies[i]);
                }
            }
        }

        // Update all enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            switch (e.type) {
                case 'ship':
                case 'bomber':
                case 'spider':
                case 'devil':
                case 'boss':
                    e.update(dt, playerY, projectilePool, audio);
                    break;
                case 'mine':
                    e.update(dt, playerY, projectilePool, audio, playerX);
                    break;
                default:
                    e.update(dt);
            }
            if (!e.active || e.isOffScreen(canvasW, canvasH)) {
                this.enemies.splice(i, 1);
            }
        }
    }

    makeElite(e) {
        e.elite = true;
        e.hp *= 2;
        e.maxHp *= 2;
        e.points = Math.floor(e.points * 1.5);
    }

    spawnByType(type, canvasW, canvasH, largeTier) {
        switch (type) {
            case 'asteroid': {
                const sizeMul = Math.random() < 0.4 ? Utils.random(1.5, 2.0) : 1;
                this.enemies.push(new Asteroid(canvasW, canvasH, sizeMul));
                break;
            }
            case 'drone': {
                const count = Utils.randomInt(3, 5);
                for (let i = 0; i < count; i++) {
                    this.enemies.push(new Drone(canvasW, canvasH, i * 15 - count * 7));
                }
                break;
            }
            case 'spider':
                const sp = new SpiderDrone(canvasW, canvasH);
                sp.canvas_w = canvasW;
                this.enemies.push(sp);
                break;
            case 'ghost':
                this.enemies.push(new AlienGhost(canvasW, canvasH));
                break;
            case 'bomber': {
                const b = new Bomber(canvasW, canvasH);
                b.canvas_w = canvasW;
                this.enemies.push(b);
                break;
            }
            case 'stealth':
                this.enemies.push(new StealthFighter(canvasW, canvasH));
                break;
            case 'devil': {
                const d = new AlienDevil(canvasW, canvasH);
                d.canvas_w = canvasW;
                this.enemies.push(d);
                break;
            }
            case 'ship': {
                const tier = Math.random() < largeTier ? 2 : 1;
                const ship = new EnemyShip(canvasW, canvasH, tier, this.assets);
                ship.canvas_w = canvasW;
                this.enemies.push(ship);
                break;
            }
            case 'mine':
                this.enemies.push(new SpaceMine(canvasW, canvasH));
                break;
        }
    }

    spawnMixed(score, canvasW, canvasH, largeTier) {
        // Build pool of available types — matches phase thresholds
        const pool = ['asteroid'];
        if (score >= 600)   pool.push('ship');
        if (score >= 1000)  pool.push('drone');
        if (score >= 1800)  pool.push('mine');
        if (score >= 2800)  pool.push('spider');
        if (score >= 4000)  pool.push('ghost');
        if (score >= 5500)  pool.push('bomber');
        if (score >= 7500)  pool.push('stealth');
        if (score >= 10000) pool.push('devil');

        const pick = pool[Utils.randomInt(0, pool.length - 1)];
        this.spawnByType(pick, canvasW, canvasH, largeTier);
    }

    _spawnFromBehind(type, canvasW, canvasH) {
        const y = Utils.random(30, canvasH - 30);
        switch (type) {
            case 'asteroid': {
                const a = new Asteroid(canvasW, canvasH, 1, -30, y);
                a.vx = Utils.random(80, 160); // flies rightward
                return a;
            }
            case 'drone': {
                const d = new Drone(canvasW, canvasH, 0);
                d.x = -20;
                d.y = y;
                d.vx = Utils.random(180, 260); // fast rightward
                d.baseY = y;
                return d;
            }
            case 'ship': {
                const s = new EnemyShip(canvasW, canvasH, 1, this.assets);
                s.x = -20;
                s.y = y;
                s.vx = Utils.random(60, 120);
                s.canvas_w = canvasW;
                return s;
            }
        }
        return null;
    }

    spawnFormation(phase, canvasW, canvasH) {
        const formations = ['v'];
        if (phase >= 3) formations.push('wall');
        if (phase >= 5) formations.push('pincer');
        if (phase >= 7) formations.push('spiral');
        const type = formations[Utils.randomInt(0, formations.length - 1)];
        const baseSpeed = Utils.random(-140, -90);
        const centerY = canvasH / 2;

        switch (type) {
            case 'v': {
                const count = Utils.randomInt(5, 7);
                for (let i = 0; i < count; i++) {
                    const offset = i - Math.floor(count / 2);
                    const d = new Drone(canvasW, canvasH, 0);
                    d.x = canvasW + 20 + Math.abs(offset) * 25;
                    d.y = centerY + offset * 30;
                    d.vx = baseSpeed;
                    d.baseY = d.y;
                    d.wavyAmp = 5;
                    this.enemies.push(d);
                }
                break;
            }
            case 'wall': {
                const count = Utils.randomInt(4, 6);
                const spacing = (canvasH - 80) / (count - 1);
                for (let i = 0; i < count; i++) {
                    const a = new Asteroid(canvasW, canvasH, 0.8);
                    a.x = canvasW + 30;
                    a.y = 40 + i * spacing;
                    a.vx = baseSpeed * 0.7;
                    a.wavy = false;
                    a.baseY = a.y;
                    this.enemies.push(a);
                }
                break;
            }
            case 'pincer': {
                for (let side = -1; side <= 1; side += 2) {
                    for (let i = 0; i < 3; i++) {
                        const s = new EnemyShip(canvasW, canvasH, 1, this.assets);
                        s.x = canvasW + 20 + i * 30;
                        s.y = side > 0 ? 30 + i * 20 : canvasH - 30 - i * 20;
                        s.vx = baseSpeed;
                        s.canvas_w = canvasW;
                        this.enemies.push(s);
                    }
                }
                break;
            }
            case 'spiral': {
                const count = 8;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const d = new Drone(canvasW, canvasH, 0);
                    d.x = canvasW + 40 + Math.cos(angle) * 60;
                    d.y = centerY + Math.sin(angle) * 80;
                    d.vx = baseSpeed;
                    d.baseY = d.y;
                    d.wavyAmp = 10;
                    d.wavyFreq = 2;
                    this.enemies.push(d);
                }
                break;
            }
        }
    }

    draw(ctx) {
        for (const e of this.enemies) {
            if (!e.active) continue;
            if (e.elite) this._drawEliteAura(ctx, e);
            e.draw(ctx);
        }
    }

    _drawEliteAura(ctx, e) {
        const pulse = 0.5 + 0.3 * Math.sin((this._t || 0) * 6);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 68, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0044';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.radius || 12) + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    reset() {
        this.enemies = [];
        this.timer = 3; // grace period at start
    }
}
