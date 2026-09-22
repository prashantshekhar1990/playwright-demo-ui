import { test, expect } from '@playwright/test';

test('same tab link', async ({ page }) => {
  await page.goto('/pages/links.html');
  await page.getByRole('link', { name: 'Open in same tab' }).click();
  await expect(page).toHaveURL(/basic\.html/);
});

test('new tab link', async ({ page, context }) => {
  await page.goto('/pages/links.html');
  const [newPage] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Open in new tab (target=_blank)' }).click()]);
  await newPage.waitForLoadState();
  await expect(newPage).toHaveURL(/basic\.html/);
  await expect(newPage.getByRole('heading', { name: 'Basic Elements', level: 1 })).toBeVisible();
});

test('new window via window.open', async ({ page }) => {
  await page.goto('/pages/links.html');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open new window (window.open with size)' }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/basic\.html/);
});

test('broken link returns 404', async ({ page, request }) => {
  await page.goto('/pages/links.html');
  const href = await page.getByRole('link', { name: 'Broken link (404)' }).getAttribute('href');
  expect((await request.get(href!)).status()).toBe(404);
});
