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
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await expect(rows).toHaveCount(10);
  await expect(page.getByTestId('page-info')).toHaveText('Page 1 of 6');
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  for (let i = 0; i < 5; i++) await next.click();
  await expect(page.getByTestId('page-info')).toHaveText('Page 6 of 6');
  await expect(rows).toHaveCount(3);
  await expect(next).toBeDisabled();
});

test('dynamic table: sorting', async ({ page }) => {
  await page.goto('/pages/tables.html');
  const ageHeader = page.getByRole('columnheader', { name: 'Age', exact: true });
  await ageHeader.click();
  await expect(ageHeader).toHaveAttribute('aria-sort', 'ascending');
  const ages = (await page.locator('[data-testid=user-row] td:nth-child(5)').allTextContents()).map(Number);
  expect(ages).toEqual([...ages].sort((a, b) => a - b));
  await ageHeader.click();
  await expect(ageHeader).toHaveAttribute('aria-sort', 'descending');
});

test('dynamic table: search and page size', async ({ page }) => {
  await page.goto('/pages/tables.html');
  const search = page.getByPlaceholder('Search users');
  await search.fill('editor');
  await expect(page.getByTestId('total-count')).toHaveText('18 users');
  await search.fill('zzzz');
  await expect(page.getByText('No results')).toBeVisible();
  await search.fill('');
  await page.getByLabel('Page size').selectOption('20');
  await expect(page.getByTestId('user-row')).toHaveCount(20);
});
