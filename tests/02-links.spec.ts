import { test, expect } from '@playwright/test';

test('same tab link', async ({ page }) => {
  await page.goto('/pages/links.html');
  await page.getByTestId('link-same-tab').click();
  await expect(page).toHaveURL(/basic\.html/);
});

test('new tab link', async ({ page, context }) => {
  await page.goto('/pages/links.html');
  const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByTestId('link-new-tab').click()]);
  await newPage.waitForLoadState();
  await expect(newPage).toHaveURL(/basic\.html/);
  await expect(newPage.getByTestId('page-title')).toHaveText('Basic Elements');
});

test('new window via window.open', async ({ page }) => {
  await page.goto('/pages/links.html');
  const popupPromise = page.waitForEvent('popup');
  await page.getByTestId('btn-new-window').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/basic\.html/);
});

test('broken link returns 404', async ({ page, request }) => {
  await page.goto('/pages/links.html');
  const href = await page.getByTestId('link-broken').getAttribute('href');
  expect((await request.get(href!)).status()).toBe(404);
});
