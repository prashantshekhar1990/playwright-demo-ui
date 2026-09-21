import { test, expect } from '@playwright/test';

test('add and remove elements', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  const items = page.getByTestId('added-item');
  await page.getByTestId('add-element').click();
  await page.getByTestId('add-element').click();
  await expect(items).toHaveCount(2);
  await items.first().getByRole('button', { name: 'Remove' }).click();
  await expect(items).toHaveCount(1);
});

test('element appears and disappears', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await expect(page.getByTestId('delayed-element')).toBeHidden();
  await page.getByTestId('show-delayed').click();
  await expect(page.getByTestId('delayed-element')).toBeVisible();
  await page.getByTestId('start-disappear').click();
  await expect(page.getByTestId('vanishing-element')).toHaveCount(0);
});

test('toggle visibility and delayed enable', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await page.getByTestId('toggle-visibility').click();
  await expect(page.getByTestId('toggle-target')).toBeHidden();
  await page.getByTestId('toggle-display').click();
  await expect(page.getByTestId('toggle-target2')).toBeHidden(); // visibility:hidden counts as hidden
  await expect(page.getByTestId('delayed-enabled-btn')).toBeDisabled();
  await page.getByTestId('enable-start').click();
  await expect(page.getByTestId('delayed-enabled-btn')).toBeEnabled();
});

test('dynamic id handled with stable locator', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await page.getByTestId('randomize').click();
  await expect(page.getByTestId('random-btn')).toBeVisible();
  await expect(page.locator('[id^="rand-"]')).toHaveCount(1);
});
