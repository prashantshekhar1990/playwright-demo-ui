import { test, expect } from '@playwright/test';

test('native single and multi select', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  await page.getByTestId('native-single').selectOption('banana');
  await expect(page.getByTestId('native-result')).toHaveText('Selected: banana');
  await page.getByTestId('native-multi').selectOption(['red', 'blue']);
  await expect(page.getByTestId('multi-result')).toHaveText('Selected: red, blue');
});

test('custom dropdown', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  await page.getByTestId('custom-toggle').click();
  await expect(page.getByTestId('custom-menu')).toBeVisible();
  await page.getByRole('option', { name: 'Playwright' }).click();
  await expect(page.getByTestId('custom-toggle')).toHaveText('Playwright');
  await expect(page.getByTestId('custom-result')).toHaveText('Selected: playwright');
});

test('searchable dropdown', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  await page.getByTestId('searchable-toggle').click();
  await page.getByTestId('searchable-input').fill('ind');
  await expect(page.getByTestId('country-option')).toHaveText(['India', 'Indonesia']);
  await page.getByTestId('country-option').filter({ hasText: /^India$/ }).click();
  await expect(page.getByTestId('searchable-result')).toHaveText('Selected: India');
  await page.getByTestId('searchable-toggle').click();
  await page.getByTestId('searchable-input').fill('xyz');
  await expect(page.getByTestId('no-country')).toBeVisible();
});
