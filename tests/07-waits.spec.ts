import { test, expect } from '@playwright/test';

test('auto-wait: click a button that appears after 3s', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Late button', exact: true }).click(); // auto-waits (default action timeout)
  await expect(page.getByRole('button', { name: 'Clicked late button' })).toBeVisible();
});

test('explicit conditions: spinner then content', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByRole('button', { name: 'Load content' }).click();
  await expect(page.getByText('Loading...')).toBeVisible();
  await page.getByText('Loading...').waitFor({ state: 'hidden' });
  await expect(page.getByText('Content loaded successfully')).toBeVisible();
});

test('web-first assertion with custom timeout / polling', async ({ page }) => {
  await page.goto('/pages/waits.html');
  await page.getByRole('button', { name: 'Change status' }).click();
  await expect(page.getByTestId('status')).toHaveText('Processing...');
  await expect(page.getByTestId('status')).toHaveText('Done', { timeout: 5000 });
  await expect.poll(async () => page.getByTestId('status').textContent()).toBe('Done');
});

test('network wait: waitForResponse and waitForFunction', async ({ page }) => {
  await page.goto('/pages/waits.html');
  const respPromise = page.waitForResponse((r) => r.url().includes('/api/slow') && r.status() === 200);
  await page.getByRole('button', { name: 'Call slow API' }).click();
  const body = await (await respPromise).json();
  expect(body.delay).toBe(3000);
  await expect(page.getByTestId('slow-result')).toHaveText('Responded after 3000ms');
  await page.getByRole('button', { name: 'Start progress' }).click();
  await page.waitForFunction(() => (document.getElementById('progress') as HTMLProgressElement).value === 100);
  await expect(page.getByTestId('progress-pct')).toHaveText('100%');
});
