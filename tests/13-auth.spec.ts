import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const authFile = path.join(__dirname, '.auth', 'admin.json');

test('invalid and locked login show errors', async ({ page }) => {
  await page.goto('/pages/auth.html');
  await page.getByTestId('username').fill('admin');
  await page.getByTestId('password').fill('wrong');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-error')).toHaveText('Invalid credentials');
  await page.getByTestId('username').fill('locked');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('login-error')).toHaveText('Account locked');
});

test('login, session and logout', async ({ page }) => {
  await page.goto('/pages/auth.html');
  await page.getByTestId('username').fill('admin');
  await page.getByTestId('password').fill('admin123');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, admin');
  await expect(page.getByTestId('role')).toHaveText('admin');
  expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeTruthy();
  await page.reload(); // session cookie persists
  await expect(page.getByTestId('welcome')).toBeVisible();
  await page.getByTestId('fetch-secure').click();
  await expect(page.getByTestId('secure-result')).toHaveText('Secret data for admin');
  await page.getByTestId('logout-btn').click();
  await expect(page.getByTestId('login-form')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
});

test('protected page redirects when unauthenticated', async ({ page }) => {
  await page.goto('/pages/dashboard.html');
  await expect(page).toHaveURL(/auth\.html\?redirect=dashboard/);
});

test('save storage state and reuse it', async ({ page, browser }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.goto('/pages/auth.html');
  await page.getByTestId('username').fill('user');
  await page.getByTestId('password').fill('user123');
  await page.getByTestId('login-btn').click();
  await expect(page.getByTestId('welcome')).toBeVisible();
  await page.context().storageState({ path: authFile });

  const ctx = await browser.newContext({ storageState: authFile });
  const p2 = await ctx.newPage();
  await p2.goto('/pages/dashboard.html');
  await expect(p2.getByTestId('dashboard-user')).toHaveText('Logged in as user (user)');
  await expect(p2.getByTestId('token-present')).toHaveText('yes');
  await ctx.close();
});

test('API-based login via request context', async ({ request }) => {
  expect((await request.get('/api/secure-data')).status()).toBe(401);
  const login = await request.post('/api/login', { data: { username: 'admin', password: 'admin123' } });
  expect(login.ok()).toBeTruthy();
  const res = await request.get('/api/secure-data'); // cookie is kept by the request context
  expect(await res.json()).toMatchObject({ role: 'admin' });
});
