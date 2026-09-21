import { test, expect } from '@playwright/test';

test('shadow DOM (auto-pierced) incl. nested shadow', async ({ page }) => {
  await page.goto('/pages/complex.html');
  const card = page.getByTestId('user-card');
  await card.locator('#sh-input').fill('Grace');
  await card.getByRole('button', { name: 'Greet' }).click();
  await expect(card.locator('#sh-out')).toHaveText('Hello, Grace');
  await expect(card.locator('#badge')).toHaveText('Nested shadow badge');
});

test('custom calendar', async ({ page }) => {
  await page.goto('/pages/complex.html');
  await page.getByTestId('date-input').click();
  await page.getByTestId('cal-next').click();
  const title = await page.getByTestId('cal-title').textContent();
  await page.getByTestId('day-15').click();
  const value = await page.getByTestId('date-input').inputValue();
  expect(value).toMatch(/^\d{4}-\d{2}-15$/);
  await expect(page.getByTestId('date-result')).toHaveText(`Selected date: ${value}`);
  expect(title).toBeTruthy();
  await page.getByTestId('native-date').fill('2026-12-25');
  await expect(page.getByTestId('native-date')).toHaveValue('2026-12-25');
});

test('autocomplete with mouse and keyboard', async ({ page }) => {
  await page.goto('/pages/complex.html');
  await page.getByTestId('ac-input').pressSequentially('uni', { delay: 50 });
  await expect(page.getByTestId('ac-option')).toHaveText(['United Kingdom', 'United States']);
  await page.getByTestId('ac-option').getByText('United States').click();
  await expect(page.getByTestId('ac-result')).toHaveText('Chosen: United States');
  await page.getByTestId('ac-input').fill('');
  await page.getByTestId('ac-input').pressSequentially('sw', { delay: 50 });
  await expect(page.getByTestId('ac-option').first()).toBeVisible();
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
