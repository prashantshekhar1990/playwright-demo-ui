import { test, expect } from '@playwright/test';

test('native single and multi select', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  await page.getByRole('combobox', { name: 'Fruit' }).selectOption('banana');
  await expect(page.getByTestId('native-result')).toHaveText('Selected: banana');
  await page.getByRole('listbox', { name: 'Colors' }).selectOption(['red', 'blue']);
  await expect(page.getByTestId('multi-result')).toHaveText('Selected: red, blue');
});

test('custom dropdown', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  const menu = page.getByRole('listbox', { name: 'Frameworks' });
  await page.getByRole('button', { name: 'Select framework' }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole('option', { name: 'Playwright' }).click();
  await expect(page.getByRole('button', { name: 'Playwright' })).toBeVisible(); // toggle now shows the choice
  await expect(page.getByTestId('custom-result')).toHaveText('Selected: playwright');
});

test('searchable dropdown', async ({ page }) => {
  await page.goto('/pages/dropdowns.html');
  const countries = page.getByRole('listbox', { name: 'Countries' }).getByRole('option');
  await page.getByRole('button', { name: 'Select country' }).click();
  await page.getByPlaceholder('Search country').fill('ind');
  await expect(countries).toHaveText(['India', 'Indonesia']);
  await countries.filter({ hasText: /^India$/ }).click();
  await expect(page.getByTestId('searchable-result')).toHaveText('Selected: India');
  await page.getByRole('button', { name: 'India', exact: true }).click(); // toggle now shows the choice
  await page.getByPlaceholder('Search country').fill('xyz');
  await expect(page.getByText('No matches')).toBeVisible();
});
