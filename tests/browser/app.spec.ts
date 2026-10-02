import { test, expect } from '@playwright/test';

test('draft, preserve squad across a new session, simulate and get a local debrief', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('#autofill-squad-btn').click();
  await expect(page.getByText('11 / 11 Players Drafted')).toBeVisible();
  await page.evaluate(() => { sessionStorage.clear(); localStorage.setItem('unrelated-data', 'keep'); });
  await page.reload();
  await expect(page.getByText('11 / 11 Players Drafted')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-data'))).toBe('keep');
  await page.locator('#formation-select-4-4-2').click();
  await expect(page.getByText('11 / 11 Players Drafted')).toBeVisible();
  await page.locator('#proceed-to-sim-btn').click();
  await page.locator('#instant-sim-btn').click();
  await expect(page.locator('#tab-overview')).toBeVisible();
  await page.getByRole('button', { name: /coach/i }).click();
  await expect(page.getByText('Local Tactical Report', { exact: false })).toBeVisible();
  await expect(page.locator('strong').filter({ hasText: 'Final Score' })).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/debrief.png', fullPage: true });
});

test('corrupted saved data recovers, mobile layout fits and server sources are private', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(() => {
    for (const key of ['drafted_players', 'pricing_weights', 'squad_tactics', 'custom_scouted_players', 'slot_assignments']) localStorage.setItem(key, '{bad');
  });
  await page.reload();
  await expect(page.locator('#catalog-search-input')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const response = await request.get('/server.cjs');
  expect(await response.text()).not.toContain('GoogleGenAI');
  expect((await request.get('/api/nonexistent')).status()).toBe(404);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('scouting fallback models and imports a player, and scout dialogs support Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Live AI Analytics Hub/i }).click();
  await page.locator('#live-api-search-input').fill('Messi');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lionel Messi' })).toBeVisible();
  await page.getByRole('button', { name: /Run AI Model/i }).click();
  await expect(page.getByRole('button', { name: /Sign to Scout pool/i })).toBeVisible();
  await page.getByRole('button', { name: /Sign to Scout pool/i }).click();
  await expect(page.getByRole('status')).toContainText('already in your scouting catalog');
  // Provider fixture exercises importing a new identity without paid API calls.
  await page.route('**/api/search-players?**', route => route.fulfill({ json: { source: 'demo', players: [{ id: 'test-prospect', name: 'Demo Prospect', position: 'MID', club: 'Test Club', nationality: 'Spain' }] } }));
  await page.locator('#live-api-search-input').fill('Demo Prospect');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByRole('button', { name: /Run AI Model/i }).click();
  await page.getByRole('button', { name: /Sign to Scout pool/i }).click();
  await page.reload();
  await page.locator('#catalog-search-input').fill('Demo Prospect');
  await expect(page.getByRole('heading', { name: 'Demo Prospect' })).toBeVisible();
  await page.getByTitle('View Scout Report').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('live playback includes kickoff and reaches the debrief', async ({ page }) => {
  await page.goto('/');
  await page.locator('#autofill-squad-btn').click();
  await page.locator('#proceed-to-sim-btn').click();
  await page.locator('#start-live-sim-btn').click();
  await expect(page.getByText(/Kickoff! The match between/)).toBeVisible();
  await expect(page.locator('#tab-overview')).toBeVisible({ timeout: 25000 });
});
