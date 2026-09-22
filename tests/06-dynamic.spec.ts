import { test, expect } from '@playwright/test';

test('add and remove elements', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  const items = page.getByTestId('added-item');
  await page.getByRole('button', { name: 'Add element' }).click();
  await page.getByRole('button', { name: 'Add element' }).click();
  await expect(items).toHaveCount(2);
  await items.first().getByRole('button', { name: 'Remove' }).click();
  await expect(items).toHaveCount(1);
});

test('element appears and disappears', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await expect(page.getByText('I appeared!')).toBeHidden();
  await page.getByRole('button', { name: 'Show delayed element' }).click();
  await expect(page.getByText('I appeared!')).toBeVisible();
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(page.getByText('I will vanish')).toHaveCount(0);
});

test('toggle visibility and delayed enable', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await page.getByRole('button', { name: 'Toggle', exact: true }).click();
  await expect(page.getByText('Now you see me')).toBeHidden();
  await page.getByRole('button', { name: 'Toggle display:none vs visibility:hidden' }).click();
  await expect(page.getByText('Second target')).toBeHidden(); // visibility:hidden counts as hidden
  await expect(page.getByRole('button', { name: 'Initially disabled' })).toBeDisabled();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Now enabled' })).toBeEnabled(); // label changes when it enables
});

test('dynamic id handled with stable locator', async ({ page }) => {
  await page.goto('/pages/dynamic.html');
  await page.getByRole('button', { name: 'Regenerate' }).click();
  await expect(page.getByRole('button', { name: 'Dynamic ID button' })).toBeVisible();
  await expect(page.locator('[id^="rand-"]')).toHaveCount(1);
});
