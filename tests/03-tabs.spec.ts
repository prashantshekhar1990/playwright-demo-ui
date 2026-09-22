import { test, expect } from '@playwright/test';

test('parent -> child -> grandchild', async ({ page, context }) => {
  await page.goto('/pages/tabs.html');
  const [child] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Open child tab' }).click()]);
  await expect(child.getByRole('heading', { name: 'Child tab (level 1)' })).toBeVisible();
  const [grandchild] = await Promise.all([context.waitForEvent('page'), child.getByRole('link', { name: 'Open next tab' }).click()]);
  await expect(grandchild.getByRole('heading', { name: 'Grandchild tab (level 2)' })).toBeVisible();
  await expect(grandchild.getByTestId('lineage')).toContainText('Parent > Child > Grandchild');
  expect(context.pages()).toHaveLength(3);
  await grandchild.close();
  await child.close();
  expect(context.pages()).toHaveLength(1);
  await expect(page.getByRole('link', { name: 'Open child tab' })).toBeVisible();
});
