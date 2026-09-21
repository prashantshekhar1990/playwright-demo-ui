import { test, expect } from '@playwright/test';

test('parent -> child -> grandchild', async ({ page, context }) => {
  await page.goto('/pages/tabs.html');
  const [child] = await Promise.all([context.waitForEvent('page'), page.getByTestId('open-child').click()]);
  await expect(child.getByTestId('level-heading')).toHaveText('Child tab (level 1)');
  const [grandchild] = await Promise.all([context.waitForEvent('page'), child.getByTestId('open-next').click()]);
  await expect(grandchild.getByTestId('level-heading')).toHaveText('Grandchild tab (level 2)');
  await expect(grandchild.getByTestId('lineage')).toContainText('Parent > Child > Grandchild');
  expect(context.pages()).toHaveLength(3);
  await grandchild.close();
  await child.close();
  expect(context.pages()).toHaveLength(1);
  await expect(page.getByTestId('open-child')).toBeVisible();
});
