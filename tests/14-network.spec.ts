import { test, expect } from '@playwright/test';

test('validate real response', async ({ page }) => {
  await page.goto('/pages/network.html');
  const [resp] = await Promise.all([page.waitForResponse('**/api/products'), page.getByRole('button', { name: 'Load products' }).click()]);
  expect(resp.status()).toBe(200);
  expect(await resp.json()).toHaveLength(3);
  await expect(page.getByTestId('products-list').getByRole('listitem')).toHaveCount(3);
});

test('mock response with route.fulfill', async ({ page }) => {
  await page.route('**/api/products', (route) => route.fulfill({ json: [{ id: 9, name: 'Mocked Item', price: 1 }] }));
  await page.goto('/pages/network.html');
  await page.getByRole('button', { name: 'Load products' }).click();
  await expect(page.getByTestId('products-list').getByRole('listitem')).toHaveText('Mocked Item - $1.00');
});

test('mock empty list and server error', async ({ page }) => {
  await page.goto('/pages/network.html');
  const load = page.getByRole('button', { name: 'Load products' });
  await page.route('**/api/products', (route) => route.fulfill({ json: [] }));
  await load.click();
  await expect(page.getByTestId('products-state')).toHaveText('No products found');
  await page.unroute('**/api/products');
  await page.route('**/api/products', (route) => route.fulfill({ status: 500, body: 'boom' }));
  await load.click();
  await expect(page.getByTestId('products-state')).toHaveText('Error: HTTP 500');
});

test('modify real response (fetch + fulfill)', async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json[0].name = 'Patched Laptop';
    await route.fulfill({ response, json });
  });
  await page.goto('/pages/network.html');
  await page.getByRole('button', { name: 'Load products' }).click();
  await expect(page.getByTestId('products-list').getByRole('listitem').first()).toContainText('Patched Laptop');
});

test('abort a request', async ({ page }) => {
  await page.route('**/api/analytics', (route) => route.abort());
  await page.goto('/pages/network.html');
  await page.getByRole('button', { name: 'Send analytics ping (POST /api/analytics)' }).click();
  await expect(page.getByTestId('misc-result')).toContainText('Analytics blocked');
});

test('intercept request: validate payload and headers', async ({ page }) => {
  await page.goto('/pages/network.html');
  await page.getByPlaceholder('Message').fill('ping');
  const [req] = await Promise.all([page.waitForRequest('**/api/echo'), page.getByRole('button', { name: 'Send', exact: true }).click()]);
  expect(req.method()).toBe('POST');
  expect(req.postDataJSON()).toEqual({ message: 'ping' });
  const [req2] = await Promise.all([page.waitForRequest('**/api/echo'), page.getByRole('button', { name: 'Call with custom header' }).click()]);
  expect(req2.headers()['x-demo-header']).toBe('playwright');
});

test('flaky endpoint: fails twice then succeeds', async ({ page }) => {
  await page.goto('/pages/network.html');
  const call = page.getByRole('button', { name: 'Call flaky API' });
  await page.getByRole('button', { name: 'Reset counter' }).click();
  await call.click();
  await expect(page.getByTestId('flaky-result')).toContainText('Failed');
  await call.click();
  await expect(page.getByTestId('flaky-result')).toContainText('Failed');
  await call.click();
  await expect(page.getByTestId('flaky-result')).toHaveText('OK: Success after retries');
});
