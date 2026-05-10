import { test, expect } from '@playwright/test';

test('/pulse loads with brain backdrop and at least one node', async ({ page }) => {
  const layoutResponse = page.waitForResponse(/\/api\/pulse\/layout/);
  await page.goto('/pulse');
  const layout = await layoutResponse;
  expect(layout.status()).toBe(200);
  const body = await layout.json();
  expect(body.nodes.length).toBeGreaterThan(0);

  // Wait for the canvas to mount.
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
});

test('asking a question triggers activation events (auth required)', async ({ page }) => {
  test.skip(!process.env.PULSE_E2E_STATE, 'No logged-in storageState provided');

  await page.goto('/pulse');
  await page.locator('input[placeholder*="Ask the mind"]').fill('What are React hooks?');
  await page.locator('input[placeholder*="Ask the mind"]').press('Enter');

  // Response card appears once `text` event arrives.
  await expect(page.locator('text=/agents · .*chunks activated/')).toBeVisible({ timeout: 30000 });
});
