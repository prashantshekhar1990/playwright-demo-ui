import { test, expect } from '@playwright/test';

test('hover shows tooltip', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await expect(page.getByRole('tooltip')).toBeHidden();
  await page.getByText('Hover over me').hover();
  await expect(page.getByRole('tooltip')).toBeVisible();
});

test('drag and drop', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByText('Drag me').dragTo(page.getByTestId('zone-b'));
  await expect(page.getByTestId('drag-result')).toHaveText('Item is in Zone B');
  await expect(page.getByTestId('zone-b').getByText('Drag me')).toBeVisible();
});

test('right click context menu', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByText('Right-click here').click({ button: 'right' });
  await expect(page.getByRole('menu', { name: 'Context menu' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Copy' }).click();
  await expect(page.getByTestId('context-result')).toHaveText('Action: Copy');
});

test('double click, counters, mouse position', async ({ page }) => {
  await page.goto('/pages/mouse.html');
  await page.getByRole('button', { name: 'Double-click me' }).dblclick();
  await expect(page.getByTestId('double-click-result')).toHaveText('Double-clicked!');
  await page.getByRole('button', { name: 'Click me', exact: true }).click({ clickCount: 3 });
  await expect(page.getByTestId('click-count')).toHaveText('3');
  const pad = page.getByText('Move mouse here');
  await pad.hover({ position: { x: 50, y: 30 } });
  await expect(page.getByTestId('mouse-pos')).toHaveText('x: 50, y: 30');
});
