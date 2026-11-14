// ============================================================
// shop.js — Inter-wave upgrade shop (NIN industrial style)
// ============================================================

import { SKIN_PASSIVES } from './player.js';
import { WEAPON_DEFS } from './weapons.js';
import { COLOR, display, mono, track, uiScale, panel, pips, drawVignette, glitchTitle } from './theme.js';

// ShopItem is polymorphic on `kind`: 'upgrade' | 'consumable' | 'cosmetic' | 'weapon'.
// Each kind owns its own getCost/getDescription/canPurchase/apply via injected
// callbacks; the default behavior matches stat upgrades for backwards compat.
export class ShopItem {
    constructor(opts) {
        this.id        = opts.id;
        this.name      = opts.name;
        this.kind      = opts.kind || 'upgrade';
        this.baseCost  = opts.baseCost ?? 0;
        this.maxLevel  = opts.maxLevel ?? 0;
        this.weaponId  = opts.weaponId || null;
        this._apply             = opts.apply             || (() => {});
        this._getDescription    = opts.getDescription;
        this._getCost           = opts.getCost;
        this._canPurchase       = opts.canPurchase;
    }

    getCost(player) {
        if (this._getCost) return this._getCost(player);
        const level = player.upgrades[this.id] || 0;
        return Math.floor(this.baseCost * Math.pow(1.8, level));
    }

    getDescription(player) {
        return this._getDescription ? this._getDescription(player) : '';
    }

    canPurchase(player) {
        if (this._canPurchase) return this._canPurchase(player);
        const level = player.upgrades[this.id] || 0;
        return level < this.maxLevel && player.scrap >= this.getCost(player);
    }

    apply(player) { this._apply(player); }
}

// Helpers — describe stat upgrades as "current → next" using the canonical
// formulas in player.applyUpgrades. Keep these in sync with that file if the
// math ever changes (the formula values appear here for display only).
function upgradeApply(id) {
    return (p) => { p.upgrades[id] = (p.upgrades[id] || 0) + 1; p.applyUpgrades(); };
}
function statDesc(label, fn, unit, lvlKey, maxLevel) {
    return (p) => {
        const lvl = p.upgrades[lvlKey] || 0;
        const cur = fn(lvl);
        const next = fn(lvl + 1);
        if (lvl >= maxLevel) return `${label}: ${cur}${unit} (MAX)`;
        return `${label}: ${cur}${unit} → ${next}${unit}`;
    };
}

export const SHOP_ITEMS = [
    // ----- Stat upgrades -----
    new ShopItem({
        id: 'damage', name: 'DAMAGE', kind: 'upgrade',
        baseCost: 50, maxLevel: 5,
        apply: upgradeApply('damage'),
        getDescription: statDesc('DMG', (l) => (1 + l * 0.5).toFixed(1), '', 'damage', 5),
    }),
    new ShopItem({
        id: 'fireRate', name: 'FIRE RATE', kind: 'upgrade',
        baseCost: 50, maxLevel: 5,
        apply: upgradeApply('fireRate'),
        getDescription: statDesc('RATE', (l) => (0.18 - l * 0.015).toFixed(3), 's', 'fireRate', 5),
    }),
    new ShopItem({
        id: 'speed', name: 'SPEED', kind: 'upgrade',
        baseCost: 40, maxLevel: 5,
        apply: upgradeApply('speed'),
        getDescription: statDesc('SPD', (l) => 420 + l * 30, '', 'speed', 5),
    }),
    new ShopItem({
        id: 'bombs', name: 'MAX BOMBS', kind: 'upgrade',
        baseCost: 60, maxLevel: 5,
        apply: upgradeApply('bombs'),
        getDescription: statDesc('MAX', (l) => 2 + l, '', 'bombs', 5),
    }),
    new ShopItem({
        id: 'shields', name: 'MAX SHIELDS', kind: 'upgrade',
        baseCost: 45, maxLevel: 4,
        apply: upgradeApply('shields'),
        getDescription: statDesc('MAX', (l) => 3 + l, '', 'shields', 4),
    }),
    new ShopItem({
        id: 'lives', name: 'MAX LIVES', kind: 'upgrade',
        baseCost: 80, maxLevel: 4,
        apply: upgradeApply('lives'),
        getDescription: statDesc('MAX', (l) => 8 + l, '', 'lives', 4),
    }),

    // ----- Consumables — refill current stockpile, no level cap -----
    new ShopItem({
        id: 'restock_bombs', name: 'RESTOCK BOMBS', kind: 'consumable',
        getCost: (p) => Math.max(1, p.maxBombs - p.bombs) * 30,
        getDescription: (p) => `BOMBS: ${p.bombs}/${p.maxBombs}`,
        canPurchase: (p) => p.bombs < p.maxBombs && p.scrap >= (p.maxBombs - p.bombs) * 30,
        apply: (p) => { p.bombs = p.maxBombs; },
    }),
    new ShopItem({
        id: 'restore_shields', name: 'RESTORE SHIELDS', kind: 'consumable',
        getCost: (p) => Math.max(1, p.maxShieldCharges - p.shieldCharges) * 20,
        getDescription: (p) => `SHIELDS: ${p.shieldCharges}/${p.maxShieldCharges}`,
        canPurchase: (p) => p.shieldCharges < p.maxShieldCharges
                            && p.scrap >= (p.maxShieldCharges - p.shieldCharges) * 20,
        apply: (p) => { p.shieldCharges = p.maxShieldCharges; },
    }),

    new ShopItem({
        id: 'repair_hull', name: 'REPAIR HULL', kind: 'consumable',
        getCost: (p) => Math.max(1, p.maxLives - p.lives) * 40,
        getDescription: (p) => `HULL: ${p.lives}/${p.maxLives}`,
        canPurchase: (p) => p.lives < p.maxLives
                            && p.scrap >= (p.maxLives - p.lives) * 40,
        apply: (p) => { p.lives = p.maxLives; },
    }),

    // ----- Weapons — one-time purchases, switch in-run with X -----
    new ShopItem({
        id: 'weapon_spread', name: 'SPREAD GUN', kind: 'weapon', weaponId: 'SPREAD',
        getCost: () => WEAPON_DEFS.SPREAD.cost,
        getDescription: (p) => p.ownedWeapons.includes('SPREAD')
            ? `${WEAPON_DEFS.SPREAD.desc} — OWNED`
            : WEAPON_DEFS.SPREAD.desc,
        canPurchase: (p) => !p.ownedWeapons.includes('SPREAD')
                            && p.scrap >= WEAPON_DEFS.SPREAD.cost,
        apply: (p) => { p.unlockWeapon('SPREAD'); },
    }),
    new ShopItem({
        id: 'weapon_railgun', name: 'RAILGUN', kind: 'weapon', weaponId: 'RAILGUN',
        getCost: () => WEAPON_DEFS.RAILGUN.cost,
        getDescription: (p) => p.ownedWeapons.includes('RAILGUN')
            ? `${WEAPON_DEFS.RAILGUN.desc} — OWNED`
            : WEAPON_DEFS.RAILGUN.desc,
        canPurchase: (p) => !p.ownedWeapons.includes('RAILGUN')
                            && p.scrap >= WEAPON_DEFS.RAILGUN.cost,
        apply: (p) => { p.unlockWeapon('RAILGUN'); },
    }),

    // ----- Cosmetics — free, cycles to next variant -----
    new ShopItem({
        id: 'trail_color', name: 'TRAIL COLOR', kind: 'cosmetic',
        getCost: () => 0,
        getDescription: (p) => `TRAIL: ${p.trailColorNames[p.trailIndex]}`,
        canPurchase: () => true,
        apply: (p) => { p.cycleTrail(); },
    }),
    new ShopItem({
        id: 'ship_skin', name: 'SHIP SKIN', kind: 'cosmetic',
        getCost: () => 0,
        getDescription: (p) => {
            const passive = SKIN_PASSIVES[p.skinIndex] || SKIN_PASSIVES[0];
            return `${p.skinNames[p.skinIndex]} — ${passive.desc}`;
        },
        canPurchase: () => true,
        apply: (p) => { p.cycleSkin(); },
    }),
];

export class Shop {
    constructor() {
        this.selectedIndex = 0;
        this.purchaseFlash = 0;
        this.errorFlash = 0;
    }

    draw(ctx, canvas, player) {
        const w = canvas.width;
        const h = canvas.height;
        const s = uiScale(w, h);
        this._isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

        ctx.save();
        ctx.textBaseline = 'alphabetic';

        // Dark overlay
        ctx.fillStyle = 'rgba(6, 4, 7, 0.9)';
        ctx.fillRect(0, 0, w, h);
        drawVignette(ctx, w, h, 0.6);

        // Title
        glitchTitle(ctx, 'UPGRADE SHOP', w / 2, h * 0.115, Math.min(w * 0.08, h * 0.11, 68), { split: 2, glow: 16 });

        // Scrap counter
        ctx.textAlign = 'center';
        ctx.font = display(Math.max(16, 24 * s));
        track(ctx, 3);
        ctx.fillStyle = COLOR.amber;
        ctx.shadowColor = COLOR.amber;
        ctx.shadowBlur = 8;
        ctx.fillText(`◆ ${player.scrap} SCRAP`, w / 2, h * 0.175);
        ctx.shadowBlur = 0;
        track(ctx, 0);

        // Items
        const startY = h * 0.24;
        // Scale items to fit — ensure CONTINUE button isn't clipped
        const availableH = h * 0.6; // space between startY and continue button
        const itemH = Math.min(availableH / SHOP_ITEMS.length, 55);
        const itemW = Math.min(w * 0.88, 720);
        const startX = (w - itemW) / 2;
        const nameSize = Math.max(12, Math.min(19, itemH * 0.56));
        const textSize = Math.max(10, Math.min(13, itemH * 0.4));
        const descX = startX + Math.max(120, itemW * 0.24);
        const rowTop = iy => iy - itemH * 0.6;
        const rowH = itemH - 4;
        const baseline = iy => rowTop(iy) + rowH / 2 + nameSize * 0.36;

        let prevKind = null;
        for (let i = 0; i < SHOP_ITEMS.length; i++) {
            const item = SHOP_ITEMS[i];
            const selected = i === this.selectedIndex;
            const iy = startY + i * itemH;
            const by = baseline(iy);

            // Section divider between kinds (upgrade → consumable → cosmetic)
            if (prevKind && prevKind !== item.kind) {
                ctx.strokeStyle = 'rgba(255, 31, 31, 0.28)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(startX - 10, rowTop(iy) - 2);
                ctx.lineTo(startX + itemW + 10, rowTop(iy) - 2);
                ctx.stroke();
            }
            prevKind = item.kind;

            const cost = item.getCost(player);
            const canAfford = player.scrap >= cost;
            const purchasable = item.canPurchase(player);

            // Selection highlight
            if (selected) {
                panel(ctx, startX - 12, rowTop(iy), itemW + 24, rowH, {
                    fill: 'rgba(255, 31, 31, 0.15)', stroke: COLOR.red, cut: 7, lineWidth: 1.5,
                });
                ctx.fillStyle = COLOR.red;
                ctx.beginPath();
                ctx.moveTo(startX - 28, by - nameSize * 0.72);
                ctx.lineTo(startX - 19, by - nameSize * 0.36);
                ctx.lineTo(startX - 28, by);
                ctx.closePath();
                ctx.fill();
            }

            // Item name
            ctx.textAlign = 'left';
            ctx.font = display(nameSize);
            track(ctx, 1.5);
            ctx.fillStyle = !purchasable ? COLOR.dim : selected ? '#ffffff' : COLOR.bone;
            ctx.fillText(item.name, startX, by);

            // Description (current → next, or current/max for consumables).
            // Touch users get an explicit tap affordance on the selected row —
            // desktop's "select with W/S, confirm with SPACE" isn't obvious.
            ctx.font = mono(textSize);
            track(ctx, 0.5);
            if (selected && this._isTouch) {
                ctx.fillStyle = purchasable ? '#ff5a3c' : COLOR.dim;
                ctx.fillText(purchasable ? '» TAP AGAIN TO BUY' : '» SELECTED', descX, by - 1);
            } else {
                ctx.fillStyle = selected ? COLOR.text : COLOR.dim;
                ctx.fillText(item.getDescription(player), descX, by - 1);
            }

            // Right side: pips for upgrades; cost / FREE / MAXED for the rest.
            ctx.textAlign = 'right';
            const right = startX + itemW;
            const costLabel = (text, color) => {
                ctx.fillStyle = color;
                ctx.fillText(text, right, by - 1);
            };
            const priceColor = canAfford ? COLOR.amber : '#7a3a2a';
            if (item.kind === 'upgrade') {
                const level = player.upgrades[item.id] || 0;
                const pipW = item.maxLevel * 12;
                pips(ctx, right - 92 - pipW, by - 10, item.maxLevel, level, { cellW: 9, cellH: 10, gap: 3 });
                if (level >= item.maxLevel) costLabel('MAXED', COLOR.dim);
                else costLabel(`${cost} ◆`, priceColor);
            } else if (item.kind === 'consumable') {
                if (!purchasable && cost === 0) costLabel('FULL', COLOR.dim);
                else costLabel(`${cost} ◆`, priceColor);
            } else if (item.kind === 'weapon') {
                if (player.ownedWeapons.includes(item.weaponId)) costLabel('OWNED', COLOR.green);
                else costLabel(`${cost} ◆`, priceColor);
            } else if (item.kind === 'cosmetic') {
                costLabel('FREE', COLOR.text);
            }
        }
        track(ctx, 0);

        // Purchase flash
        if (this.purchaseFlash > 0) {
            ctx.fillStyle = `rgba(0, 204, 0, ${this.purchaseFlash * 0.3})`;
            ctx.fillRect(0, 0, w, h);
        }
        if (this.errorFlash > 0) {
            ctx.fillStyle = `rgba(204, 0, 0, ${this.errorFlash * 0.3})`;
            ctx.fillRect(0, 0, w, h);
        }

        // Continue button
        const btnW = this._isTouch ? 280 : 220;
        const btnH = 38;
        const btnX = (w - btnW) / 2;
        const btnY = h * 0.86;
        ctx.shadowColor = COLOR.red;
        ctx.shadowBlur = 16;
        panel(ctx, btnX, btnY, btnW, btnH, { fill: COLOR.red, stroke: null, cut: 10 });
        ctx.shadowBlur = 0;
        ctx.font = display(22);
        track(ctx, 4);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this._isTouch ? 'TAP TO CONTINUE' : 'CONTINUE', w / 2 + 2, btnY + 27);
        // Store button bounds for touch
        this._continueBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
        this._itemStartY = startY;
        this._itemH = itemH;
        this._canvasH = h;

        // Controls hint — touch-aware
        ctx.font = mono(Math.max(11, 13 * s));
        track(ctx, 1.5);
        ctx.fillStyle = COLOR.text;
        ctx.fillText(this._isTouch
            ? 'TAP AN ITEM TO SELECT  ·  TAP AGAIN TO BUY'
            : 'W / S  SELECT    ·    SPACE  BUY    ·    ENTER  CONTINUE', w / 2, Math.min(h - 8, btnY + btnH + 24));

        ctx.restore();
    }

    update(dt) {
        if (this.purchaseFlash > 0) this.purchaseFlash -= dt * 3;
        if (this.errorFlash > 0) this.errorFlash -= dt * 3;
    }

    moveUp() {
        this.selectedIndex = (this.selectedIndex - 1 + SHOP_ITEMS.length) % SHOP_ITEMS.length;
    }

    moveDown() {
        this.selectedIndex = (this.selectedIndex + 1) % SHOP_ITEMS.length;
    }

    handleTouch(x, y, player) {
        // Check continue button
        if (this._continueBtn &&
            x >= this._continueBtn.x && x <= this._continueBtn.x + this._continueBtn.w &&
            y >= this._continueBtn.y && y <= this._continueBtn.y + this._continueBtn.h) {
            return 'continue';
        }
        // Check item taps
        if (this._itemStartY && this._itemH) {
            for (let i = 0; i < SHOP_ITEMS.length; i++) {
                const iy = this._itemStartY + i * this._itemH;
                if (y >= iy - this._itemH * 0.6 && y < iy + this._itemH * 0.4) {
                    if (this.selectedIndex === i) {
                        this.tryPurchase(player);
                    } else {
                        this.selectedIndex = i;
                    }
                    return 'item';
                }
            }
        }
        return null;
    }

    tryPurchase(player) {
        const item = SHOP_ITEMS[this.selectedIndex];
        if (!item.canPurchase(player)) { this.errorFlash = 1; return false; }
        const cost = item.getCost(player);
        player.scrap -= cost;
        item.apply(player);
        localStorage.setItem('ninDefenderScrap', player.scrap.toString());
        localStorage.setItem('ninDefenderUpgrades', JSON.stringify(player.upgrades));
        this.purchaseFlash = 1;
        return true;
    }
}
