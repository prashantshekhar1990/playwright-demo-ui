import { test, expect } from '@playwright/test';

test('hover shows tooltip', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await expect(page.getByTestId('tooltip')).toBeHidden();
  await page.getByTestId('hover-box').hover();
  await expect(page.getByTestId('tooltip')).toBeVisible();
});

test('drag and drop', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByTestId('drag-item').dragTo(page.getByTestId('zone-b'));
  await expect(page.getByTestId('drag-result')).toHaveText('Item is in Zone B');
  await expect(page.getByTestId('zone-b').getByTestId('drag-item')).toBeVisible();
});

test('right click context menu', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByTestId('context-area').click({ button: 'right' });
  await expect(page.getByTestId('context-menu')).toBeVisible();
  await page.getByTestId('ctx-copy').click();
  await expect(page.getByTestId('context-result')).toHaveText('Action: Copy');
});

test('double click, counters, mouse position', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByTestId('double-click-btn').dblclick();
  await expect(page.getByTestId('double-click-result')).toHaveText('Double-clicked!');
  await page.getByTestId('click-counter').click({ clickCount: 3 });
  await expect(page.getByTestId('click-count')).toHaveText('3');
  const pad = page.getByTestId('mouse-pad');
  await pad.hover({ position: { x: 50, y: 30 } });
  await expect(page.getByTestId('mouse-pos')).toHaveText('x: 50, y: 30');
});
