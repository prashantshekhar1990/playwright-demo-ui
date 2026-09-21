import { test, expect } from '@playwright/test';

test('auto-wait: click a button that appears after 3s', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByTestId('start-appear').click();
  await page.getByTestId('late-button').click(); // auto-waits (default action timeout)
  await expect(page.getByTestId('late-button')).toHaveText('Clicked late button');
});

test('explicit conditions: spinner then content', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByTestId('load-content').click();
  await expect(page.getByTestId('spinner')).toBeVisible();
  await page.getByTestId('spinner').waitFor({ state: 'hidden' });
  await expect(page.getByTestId('loaded-content')).toBeVisible();
});

test('web-first assertion with custom timeout / polling', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByTestId('change-text').click();
  await expect(page.getByTestId('status')).toHaveText('Processing...');
  await expect(page.getByTestId('status')).toHaveText('Done', { timeout: 5000 });
  await expect.poll(async () => page.getByTestId('status').textContent()).toBe('Done');
});

test('network wait: waitForResponse and waitForFunction', async ({ page }) => {
  await page.goto('/pages/waits.html');
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/slow') && r.status() === 200);
  await page.getByTestId('slow-call').click();
  const body = await (await respPromise).json();
  expect(body.delay).toBe(3000);
  await expect(page.getByTestId('slow-result')).toHaveText('Responded after 3000ms');
  await page.getByTestId('start-progress').click();
  await page.waitForFunction(() => (document.getElementById('progress') as HTMLProgressElement).value === 100);
  await expect(page.getByTestId('progress-pct')).toHaveText('100%');
});
