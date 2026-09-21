import { test, expect } from '@playwright/test';

test('static table content', async ({ page }) => {
  await page.goto('/pages/tables.html');
  const rows = page.locator('[data-testid=static-table] tbody tr');
  await expect(rows).toHaveCount(4);
  const desk = rows.filter({ hasText: 'Desk' });
  await expect(desk.getByRole('button', { name: 'Buy' })).toBeDisabled();
  await expect(rows.nth(0).locator('td').nth(2)).toHaveText('999.99');
});

test('dynamic table: pagination', async ({ page }) => {
  await page.goto('/pages/tables.html');
  const rows = page.getByTestId('user-row');
  await expect(rows).toHaveCount(10);
  await expect(page.getByTestId('page-info')).toHaveText('Page 1 of 6');
  await expect(page.getByTestId('prev-page')).toBeDisabled();
  for (let i = 0; i < 5; i++) await page.getByTestId('next-page').click();
  await expect(page.getByTestId('page-info')).toHaveText('Page 6 of 6');
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId('next-page')).toBeDisabled();
});

test('dynamic table: sorting', async ({ page }) => {
  await page.goto('/pages/tables.html');
  await page.getByTestId('th-age').click();
  await expect(page.getByTestId('th-age')).toHaveAttribute('aria-sort', 'ascending');
  const ages = (await page.locator('[data-testid=user-row] td:nth-child(5)').allTextContents()).map(Number);
  expect(ages).toEqual([...ages].sort((a, b) => a - b));
  await page.getByTestId('th-age').click();
  await expect(page.getByTestId('th-age')).toHaveAttribute('aria-sort', 'descending');
});

test('dynamic table: search and page size', async ({ page }) => {
  await page.goto('/pages/tables.html');
  await page.getByTestId('table-search').fill('editor');
  await expect(page.getByTestId('total-count')).toHaveText('18 users');
  await page.getByTestId('table-search').fill('zzzz');
  await expect(page.getByTestId('no-rows')).toBeVisible();
  await page.getByTestId('table-search').fill('');
  await page.getByTestId('page-size').selectOption('20');
  await expect(page.getByTestId('user-row')).toHaveCount(20);
});
