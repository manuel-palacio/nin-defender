// Vitest 4's jsdom backend ships a localStorage proxy where most methods
// (setItem/getItem/removeItem/clear) are not callable. Replace the global
// with a plain in-memory Storage so test code that touches localStorage
// behaves like a real browser.

const _store = new Map();
const fakeLocalStorage = {
    get length() { return _store.size; },
    key(i) {
        const keys = [..._store.keys()];
        return keys[i] ?? null;
    },
    getItem(k) { return _store.has(k) ? _store.get(k) : null; },
    setItem(k, v) { _store.set(String(k), String(v)); },
    removeItem(k) { _store.delete(k); },
    clear() { _store.clear(); },
};

Object.defineProperty(globalThis, 'localStorage', {
    value: fakeLocalStorage,
    writable: false,
    configurable: true,
});
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: fakeLocalStorage,
        writable: false,
        configurable: true,
    });
}

// Helper for tests' beforeEach — reset every game key plus any stragglers.
globalThis.clearGameStorage = function clearGameStorage() {
    fakeLocalStorage.clear();
};
