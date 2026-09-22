import { test, expect } from '@playwright/test';

test('shadow DOM (auto-pierced) incl. nested shadow', async ({ page }) => {
  await page.goto('/pages/complex.html');
  const card = page.getByTestId('user-card');
  await card.getByPlaceholder('Shadow input').fill('Grace');
  await card.getByRole('button', { name: 'Greet' }).click();
  await expect(card.getByText('Hello, Grace')).toBeVisible();
  await expect(card.getByText('Nested shadow badge')).toBeVisible();
});

test('custom calendar', async ({ page }) => {
  await page.goto('/pages/complex.html');
  const dateInput = page.getByPlaceholder('Pick a date');
  await dateInput.click();
  await page.getByRole('button', { name: 'Next month' }).click();
  const title = await page.getByTestId('cal-title').textContent();
  await page.getByRole('button', { name: '15', exact: true }).click();
  const value = await dateInput.inputValue();
  expect(value).toMatch(/^\d{4}-\d{2}-15$/);
  await expect(page.getByTestId('date-result')).toHaveText(`Selected date: ${value}`);
  expect(title).toBeTruthy();
  await page.getByLabel('Native date').fill('2026-12-25');
  await expect(page.getByLabel('Native date')).toHaveValue('2026-12-25');
});

test('autocomplete with mouse and keyboard', async ({ page }) => {
  await page.goto('/pages/complex.html');
  const country = page.getByRole('combobox', { name: 'Country' });
  const options = page.getByRole('listbox', { name: 'Country suggestions' }).getByRole('option');
  await country.pressSequentially('uni', { delay: 50 });
  await expect(options).toHaveText(['United Kingdom', 'United States']);
  await options.getByText('United States').click();
  await expect(page.getByTestId('ac-result')).toHaveText('Chosen: United States');
  await country.fill('');
  await country.pressSequentially('sw', { delay: 50 });
  await expect(options.first()).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('ac-result')).toHaveText('Chosen: Sweden');
});

test('virtual list: only visible rows rendered; scroll to reach item', async ({ page }) => {
  await page.goto('/pages/complex.html');
  const rows = page.getByTestId('virtual-row');
  expect(await rows.count()).toBeLessThan(15);
  await expect(page.getByText('Item 5000', { exact: true })).toHaveCount(0);
  await page.getByTestId('virtual-list').evaluate((el) => { el.scrollTop = 40 * 4999; });
  await expect(page.getByText('Item 5000', { exact: true })).toBeVisible();
  await expect(page.getByTestId('virtual-info')).toContainText('first visible: Item 5000');
});
