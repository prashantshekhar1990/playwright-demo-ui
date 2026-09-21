import { test, expect } from '@playwright/test';

test('popup window communicates with opener', async ({ page }) => {
  await page.goto('/pages/popups.html');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId('open-popup').click()]);
  await popup.getByTestId('popup-input').fill('hi from popup');
  await popup.getByTestId('popup-send').click();
  await expect(page.getByTestId('popup-result')).toHaveText('Popup says: hi from popup');
  const closed = popup.waitForEvent('close');
  await popup.getByTestId('popup-close').click();
  await closed;
});

test('alert dialog', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', async (d) => { expect(d.type()).toBe('alert'); expect(d.message()).toBe('Hello Alert'); await d.accept(); });
  await page.getByTestId('btn-alert').click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Alert dismissed');
});

test('confirm dialog accept and dismiss', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Confirmed: OK');
  page.once('dialog', (d) => d.dismiss());
  await page.getByTestId('btn-confirm').click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Confirmed: Cancel');
});

test('prompt dialog', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', (d) => d.accept('Playwright'));
  await page.getByTestId('btn-prompt').click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Prompt value: Playwright');
});

test('in-page modal', async ({ page }) => {
  await page.goto('/pages/popups.html');
  await page.getByTestId('open-modal').click();
  await expect(page.getByRole('dialog', { name: 'Sample modal' })).toBeVisible();
  await page.getByTestId('close-modal').click();
  await expect(page.getByTestId('modal')).toBeHidden();
});
