import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: process.env.PULSE_E2E_URL || 'http://localhost:3000',
    headless: true,
    storageState: process.env.PULSE_E2E_STATE, // optional: path to logged-in MW session
  },
});
