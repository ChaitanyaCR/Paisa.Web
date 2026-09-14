import { defineConfig } from 'vitest/config';

// Deliberately does not load the app's Vite config: these are Node-side unit
// tests against a real SQLite file, with no need for the RSC/SSR pipeline.
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: { '@': new URL('.', import.meta.url).pathname },
  },
});
