import { test, expect } from '@playwright/test';

test('popup window communicates with opener', async ({ page }) => {
  await page.goto('/pages/popups.html');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Open popup' }).click()]);
  await popup.getByPlaceholder('Message').fill('hi from popup');
  await popup.getByRole('button', { name: 'Send to opener' }).click();
  await expect(page.getByTestId('popup-result')).toHaveText('Popup says: hi from popup');
  const closed = popup.waitForEvent('close');
  await popup.getByRole('button', { name: 'Close' }).click();
  await closed;
});

test('alert dialog', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', async (d) => { expect(d.type()).toBe('alert'); expect(d.message()).toBe('Hello Alert'); await d.accept(); });
  await page.getByRole('button', { name: 'Alert', exact: true }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Alert dismissed');
});

test('confirm dialog accept and dismiss', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Confirmed: OK');
  page.once('dialog', (d) => d.dismiss());
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Confirmed: Cancel');
});

test('prompt dialog', async ({ page }) => {
  await page.goto('/pages/popups.html');
  page.once('dialog', (d) => d.accept('Playwright'));
  await page.getByRole('button', { name: 'Prompt', exact: true }).click();
  await expect(page.getByTestId('dialog-result')).toHaveText('Prompt value: Playwright');
});

test('in-page modal', async ({ page }) => {
  await page.goto('/pages/popups.html');
  const modal = page.getByRole('dialog', { name: 'Sample modal' });
  await page.getByRole('button', { name: 'Open modal' }).click();
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Close' }).click();
  await expect(modal).toBeHidden();
});
