// Vitest config — uses Vite's bundler so import paths match runtime.
// jsdom environment provides document/window/localStorage so classes that
// touch them (Player reads localStorage in its constructor) just work.
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.js'],
        exclude: ['tests/setup.js', 'tests/probe.test.js'],
        setupFiles: ['./tests/setup.js'],
        globals: false,
    },
});
