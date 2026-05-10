import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    coverage: { reporter: ['text', 'html'] },
    include: ['src/**/__tests__/**/*.test.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
});
