import { test, expect } from '@playwright/test';

test('key events and modifiers', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByPlaceholder('Press any key here').focus();
  await page.keyboard.press('Shift+KeyQ');
  await expect(page.getByTestId('key-result')).toContainText('key: Q');
  await expect(page.getByTestId('key-result')).toContainText('shift:true');
});

test('Enter submits', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  const input = page.getByPlaceholder('Type and press Enter');
  await input.fill('hello');
  await input.press('Enter');
  await expect(page.getByTestId('enter-result')).toHaveText('Submitted: hello');
});

test('Tab order', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByPlaceholder('Field 1').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab2');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab3');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab2');
});

test('Escape and shortcuts', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  const escModal = page.getByRole('dialog', { name: 'Escape modal' });
  const palette = page.getByRole('dialog', { name: 'Command palette' });
  await page.getByRole('button', { name: 'Open modal (Esc to close)' }).click();
  await expect(escModal).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(escModal).toBeHidden();
  await page.keyboard.press('Control+KeyK');
  await expect(palette).toBeVisible();
  await expect(page.getByPlaceholder('Type a command')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+KeyS');
  await expect(page.getByTestId('shortcut-result')).toHaveText('Saved via Ctrl+S');
});
