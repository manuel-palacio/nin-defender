import { describe, it, expect, beforeEach } from 'vitest';
import { ShopItem, SHOP_ITEMS, Shop } from '../js/shop.js';
import { Player } from '../js/player.js';

const mockCanvas = { width: 1280, height: 720 };

beforeEach(() => clearGameStorage());

describe('ShopItem.getCost (default upgrade scaling)', () => {
    it('scales exponentially with level', () => {
        const damage = SHOP_ITEMS.find(i => i.id === 'damage');
        const p = new Player(mockCanvas, {});
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        // Level 0 cost = baseCost
        expect(damage.getCost(p)).toBe(50);
        // Level 1 cost = floor(50 * 1.8) = 90
        p.upgrades.damage = 1; expect(damage.getCost(p)).toBe(90);
        // Level 2 cost = floor(50 * 1.8^2) = floor(162) = 162
        p.upgrades.damage = 2; expect(damage.getCost(p)).toBe(162);
    });
});

describe('Shop.tryPurchase', () => {
    it('deducts correct scrap and increments upgrade level', () => {
        const shop = new Shop();
        const p = new Player(mockCanvas, {});
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.scrap = 200;
        // Find damage's index in SHOP_ITEMS
        shop.selectedIndex = SHOP_ITEMS.findIndex(i => i.id === 'damage');
        const result = shop.tryPurchase(p);
        expect(result).toBe(true);
        expect(p.scrap).toBe(200 - 50);
        expect(p.upgrades.damage).toBe(1);
    });

    it('fails gracefully if scrap insufficient', () => {
        const shop = new Shop();
        const p = new Player(mockCanvas, {});
        p.upgrades = { damage: 0, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.scrap = 10;
        shop.selectedIndex = SHOP_ITEMS.findIndex(i => i.id === 'damage');
        expect(shop.tryPurchase(p)).toBe(false);
        expect(p.scrap).toBe(10);
        expect(p.upgrades.damage).toBe(0);
    });

    it('fails gracefully if upgrade is maxed', () => {
        const shop = new Shop();
        const p = new Player(mockCanvas, {});
        p.upgrades = { damage: 5, fireRate: 0, speed: 0, bombs: 0, shields: 0, lives: 0 };
        p.scrap = 100000;
        shop.selectedIndex = SHOP_ITEMS.findIndex(i => i.id === 'damage');
        expect(shop.tryPurchase(p)).toBe(false);
        expect(p.upgrades.damage).toBe(5);
    });
});

describe('Shop consumables', () => {
    it('RESTOCK BOMBS cost = (maxBombs - bombs) * 30', () => {
        const restock = SHOP_ITEMS.find(i => i.id === 'restock_bombs');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.bombs = 0;
        expect(restock.getCost(p)).toBe(p.maxBombs * 30);
        p.bombs = p.maxBombs;
        // Edge case: full bombs — getCost still returns positive (deficit clamped to 1)
        expect(restock.getCost(p)).toBe(30);
    });

    it('RESTOCK BOMBS canPurchase=false when full', () => {
        const restock = SHOP_ITEMS.find(i => i.id === 'restock_bombs');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.bombs = p.maxBombs;
        p.scrap = 999;
        expect(restock.canPurchase(p)).toBe(false);
    });

    it('RESTOCK BOMBS apply fills to max', () => {
        const restock = SHOP_ITEMS.find(i => i.id === 'restock_bombs');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.bombs = 0;
        restock.apply(p);
        expect(p.bombs).toBe(p.maxBombs);
    });
});

describe('Shop weapons', () => {
    it('SPREAD GUN is a one-time 150-scrap purchase', () => {
        const item = SHOP_ITEMS.find(i => i.id === 'weapon_spread');
        const p = new Player(mockCanvas, {});
        expect(item.kind).toBe('weapon');
        expect(item.getCost(p)).toBe(150);
        p.scrap = 149;
        expect(item.canPurchase(p)).toBe(false);
        p.scrap = 150;
        expect(item.canPurchase(p)).toBe(true);
        item.apply(p);
        expect(p.ownedWeapons).toContain('SPREAD');
        expect(item.canPurchase(p)).toBe(false); // already owned
    });

    it('RAILGUN purchase unlocks via tryPurchase and deducts scrap', () => {
        const shop = new Shop();
        const p = new Player(mockCanvas, {});
        p.scrap = 300;
        shop.selectedIndex = SHOP_ITEMS.findIndex(i => i.id === 'weapon_railgun');
        expect(shop.tryPurchase(p)).toBe(true);
        expect(p.scrap).toBe(50);
        expect(p.ownedWeapons).toContain('RAILGUN');
        expect(shop.tryPurchase(p)).toBe(false); // owned — no double buy
    });
});

describe('Shop REPAIR HULL', () => {
    it('costs 40 scrap per missing life', () => {
        const repair = SHOP_ITEMS.find(i => i.id === 'repair_hull');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.lives = p.maxLives - 3;
        expect(repair.getCost(p)).toBe(120);
    });

    it('not purchasable at full hull', () => {
        const repair = SHOP_ITEMS.find(i => i.id === 'repair_hull');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.lives = p.maxLives;
        p.scrap = 9999;
        expect(repair.canPurchase(p)).toBe(false);
    });

    it('apply restores lives to max', () => {
        const repair = SHOP_ITEMS.find(i => i.id === 'repair_hull');
        const p = new Player(mockCanvas, {});
        p.applyUpgrades();
        p.lives = 1;
        repair.apply(p);
        expect(p.lives).toBe(p.maxLives);
    });
});

describe('Shop cosmetics', () => {
    it('TRAIL COLOR is free and always purchasable', () => {
        const trail = SHOP_ITEMS.find(i => i.id === 'trail_color');
        const p = new Player(mockCanvas, {});
        p.scrap = 0;
        expect(trail.getCost(p)).toBe(0);
        expect(trail.canPurchase(p)).toBe(true);
    });

    it('SHIP SKIN apply cycles only within unlocked skins', () => {
        const skin = SHOP_ITEMS.find(i => i.id === 'ship_skin');
        const p = new Player(mockCanvas, {});
        p.skinIndex = 0;
        skin.apply(p);
        expect(p.skinIndex).toBe(0); // nothing unlocked yet
        p.unlockSkin(1);
        skin.apply(p);
        expect(p.skinIndex).toBe(1);
    });
});
