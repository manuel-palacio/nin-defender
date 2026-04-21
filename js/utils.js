// ============================================================
// utils.js — Utility functions, audio manager, screen shake
// ============================================================

const Utils = {
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    circleCollision(x1, y1, r1, x2, y2, r2) {
        return Utils.distance(x1, y1, x2, y2) < r1 + r2;
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    generateAsteroidShape(radius, vertices) {
        const points = [];
        for (let i = 0; i < vertices; i++) {
            const angle = (i / vertices) * Math.PI * 2;
            const r = radius * Utils.random(0.7, 1.3);
            points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        return points;
    },

    // Draw image with CSS "cover" behaviour — fills canvas, center-crops overflow
    drawCover(ctx, img, w, h) {
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let dw, dh, dx, dy;
        if (imgRatio > canvasRatio) {
            dh = h;
            dw = h * imgRatio;
        } else {
            dw = w;
            dh = w / imgRatio;
        }
        dx = (w - dw) / 2;
        dy = (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
    }
};

// ============================================================
// ScreenShake
// ============================================================
class ScreenShake {
    constructor() {
        this.intensity = 0;
        this.duration = 0;
        this.timer = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    shake(intensity, duration) {
        if (intensity > this.intensity) {
            this.intensity = intensity;
            this.duration = duration;
            this.timer = duration;
        }
    }

    update(dt) {
        if (this.timer > 0) {
            this.timer -= dt;
            const progress = this.timer / this.duration;
            const cur = this.intensity * progress;
            this.offsetX = (Math.random() - 0.5) * 2 * cur;
            this.offsetY = (Math.random() - 0.5) * 2 * cur;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
            this.intensity = 0;
        }
    }
}

// ============================================================
// AudioManager — Web Audio API synthesised sound effects
// ============================================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
        this.masterGain = null;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not available');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : 0.5;
        }
        return this.muted;
    }

    playLaser() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    playExplosion() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const len = 0.35;
        const bufferSize = Math.floor(this.ctx.sampleRate * len);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + len);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + len);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }

    playSmallExplosion() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPowerUp() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.06;
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.15);
        });
    }

    playGameOver() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 1.5);
        osc2.frequency.setValueAtTime(438, now);
        osc2.frequency.exponentialRampToValueAtTime(54, now + 1.5);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 1.5);
        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 1.5);
        osc2.stop(now + 1.5);
    }

    playHit() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playEnemyLaser() {
        if (!this.ctx || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }
}

// ============================================================
// Asset manifest — drop PNGs into assets/ to upgrade visuals
// ============================================================
const ASSET_MANIFEST = {
    splashBg:    'assets/splash-bg.png',
    gameoverBg:  'assets/gameover-bg.png',
    playerShip:  'assets/player-ship.png',
    enemySmall:  'assets/enemy-small.png',
    enemyLarge:  'assets/enemy-large.png',
    moon:        'assets/moon.png',
    puRapidFire: 'assets/powerups/rapid-fire.png',
    puTripleShot:'assets/powerups/triple-shot.png',
    puShield:    'assets/powerups/shield.png',
    puExtraLife: 'assets/powerups/extra-life.png'
};

// Maps power-up type keys to asset keys
const POWERUP_ASSET_MAP = {
    RAPID_FIRE:  'puRapidFire',
    TRIPLE_SHOT: 'puTripleShot',
    SHIELD:      'puShield',
    EXTRA_LIFE:  'puExtraLife'
};

// ============================================================
// AssetLoader — Preloads images, silently skips missing ones
// ============================================================
class AssetLoader {
    constructor() {
        this.assets = {};
        this.loaded = 0;
        this.total = 0;
    }

    load(manifest) {
        const entries = Object.entries(manifest);
        this.total = entries.length;
        this.loaded = 0;

        const promises = entries.map(([key, path]) => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    this.assets[key] = img;
                    this.loaded++;
                    resolve();
                };
                img.onerror = () => {
                    this.assets[key] = null; // graceful fallback
                    this.loaded++;
                    resolve();
                };
                img.src = path;
            });
        });

        return Promise.all(promises).then(() => this.assets);
    }

    getProgress() {
        return this.total === 0 ? 1 : this.loaded / this.total;
    }

    // Draw a loading bar on canvas while assets load
    static drawLoadingScreen(ctx, canvas, progress) {
        const w = canvas.width;
        const h = canvas.height;

        // Background
        ctx.fillStyle = '#0a0a1f';
        ctx.fillRect(0, 0, w, h);

        // Title
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.min(w * 0.05, 36)}px Courier New`;
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillText('GALACTIC DEFENDER', w / 2, h * 0.4);

        // Loading text
        ctx.shadowBlur = 0;
        ctx.font = '14px Courier New';
        ctx.fillStyle = '#888';
        ctx.fillText('LOADING ASSETS...', w / 2, h * 0.52);

        // Progress bar
        const barW = Math.min(300, w * 0.6);
        const barH = 6;
        const bx = (w - barW) / 2;
        const by = h * 0.57;
        ctx.fillStyle = '#222';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(bx, by, barW * progress, barH);
        ctx.shadowBlur = 0;
    }
}
