import { test, expect } from '@playwright/test';

test('key events and modifiers', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByTestId('key-input').focus();
  await page.keyboard.press('Shift+KeyQ');
  await expect(page.getByTestId('key-result')).toContainText('key: Q');
  await expect(page.getByTestId('key-result')).toContainText('shift:true');
});

test('Enter submits', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByTestId('enter-input').fill('hello');
  await page.getByTestId('enter-input').press('Enter');
  await expect(page.getByTestId('enter-result')).toHaveText('Submitted: hello');
});

test('Tab order', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByTestId('tab-1').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab2');
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab3');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('focus-result')).toHaveText('Focused: tab2');
});

test('Escape and shortcuts', async ({ page }) => {
  await page.goto('/pages/keyboard.html');
  await page.getByTestId('open-esc-modal').click();
  await expect(page.getByTestId('esc-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('esc-modal')).toBeHidden();
  await page.keyboard.press('Control+KeyK');
  await expect(page.getByTestId('palette')).toBeVisible();
  await expect(page.getByTestId('palette-input')).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+KeyS');
  await expect(page.getByTestId('shortcut-result')).toHaveText('Saved via Ctrl+S');
});
