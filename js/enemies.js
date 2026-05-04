// ============================================================
// enemies.js — re-export aggregator
// ============================================================
// Each enemy lives in its own file under js/enemies/. This file
// is kept so existing callers (game.js, ui.js) don't need to
// change their import paths.

export { Enemy } from './enemies/enemy.js';
export { Asteroid } from './enemies/asteroid.js';
export { EnemyShip } from './enemies/enemy-ship.js';
export { Drone } from './enemies/drone.js';
export { Bomber } from './enemies/bomber.js';
export { SpaceMine } from './enemies/space-mine.js';
export { StealthFighter } from './enemies/stealth-fighter.js';
export { SpiderDrone } from './enemies/spider-drone.js';
export { AlienGhost } from './enemies/alien-ghost.js';
export { AlienDevil } from './enemies/alien-devil.js';
export { Boss, BOSS_NAMES } from './enemies/boss.js';
export { EnemySpawner, PHASES } from './enemies/spawner.js';
