import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { userAuthFile } from './support/auth-files';

const loggedOut = { cookies: [], origins: [] };

async function login(page: Page, username: string, password: string) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

// By default every test starts logged in as admin (session saved by auth.setup.ts).
// These tests opt out and start with an empty browser.
test.describe('logged out', () => {
  test.use({ storageState: loggedOut });

  test('invalid and locked login show errors', async ({ page }) => {
    await page.goto('/login.html');
    await login(page, 'admin', 'wrong');
    // getByRole('alert') only matches while the error is actually shown, so this also proves it is visible.
    await expect(page.getByRole('alert')).toHaveText('Invalid credentials');
    await page.getByLabel('Username').fill('locked');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('alert')).toHaveText('Account locked');
    await expect(page).toHaveURL(/\/login\.html/);
  });

  test('every page redirects to login when unauthenticated', async ({ page }) => {
    for (const p of ['/', '/index.html', '/pages/basic.html', '/pages/dashboard.html']) {
      await page.goto(p);
      await expect(page, `visiting ${p}`).toHaveURL(new RegExp(`/login\\.html\\?redirect=${encodeURIComponent(p).replace(/\./g, '\\.')}$`));
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    }
  });

  test('login lands on home, session survives reload, logout ends it', async ({ page }) => {
    await page.goto('/login.html');
    await login(page, 'admin', 'admin123');
    await expect(page).toHaveURL(/\/index\.html$/);
    await expect(page.getByTestId('nav-user')).toHaveText('admin (admin)');
    expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeTruthy();
    await page.reload(); // session cookie persists
    await expect(page.getByTestId('nav-user')).toBeVisible();

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login\.html$/);
    expect(await page.evaluate(() => localStorage.getItem('authToken'))).toBeNull();
    await page.goto('/pages/basic.html'); // session is gone
    await expect(page).toHaveURL(/\/login\.html\?redirect=/);
  });

  test('deep link: login returns you to the page you asked for', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    await expect(page).toHaveURL(/\/login\.html\?redirect=%2Fpages%2Fdashboard\.html$/);
    await login(page, 'user', 'user123');
    await expect(page).toHaveURL(/\/pages\/dashboard\.html$/);
    await expect(page.getByTestId('dashboard-user')).toHaveText('Logged in as user (user)');
  });

  test('redirect parameter cannot send you to another site', async ({ page }) => {
    await page.goto('/login.html?redirect=%2F%2Fevil.example');
    await login(page, 'admin', 'admin123');
    await expect(page).toHaveURL(/localhost:\d+\/index\.html$/);
  });

  test('save storage state and reuse it (second role)', async ({ page, browser }) => {
    fs.mkdirSync(path.dirname(userAuthFile), { recursive: true });
    await page.goto('/login.html');
    await login(page, 'user', 'user123');
    await expect(page).toHaveURL(/\/index\.html$/);
    await page.context().storageState({ path: userAuthFile });

    const ctx = await browser.newContext({ storageState: userAuthFile });
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
});

// Default state: already logged in as admin. None of these may log out, because the saved
// session is shared with every other test in the run.
test.describe('logged in (saved session)', () => {
  test('home page loads and shows the current user', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/localhost:\d+\/$/); // served in place, no redirect to login
    await expect(page.getByRole('heading', { name: 'Playwright Demo UI', level: 1 })).toBeVisible();
    await expect(page.getByTestId('nav-user')).toHaveText('admin (admin)');
  });

  test('auth page shows session details and fetches secure data', async ({ page }) => {
    await page.goto('/pages/auth.html');
    await expect(page.getByRole('heading', { name: 'Welcome, admin' })).toBeVisible();
    await expect(page.getByTestId('role')).toHaveText('admin');
    await expect(page.getByTestId('token-present')).toHaveText('yes');
    await page.getByRole('button', { name: 'Fetch secure data' }).click();
    await expect(page.getByTestId('secure-result')).toHaveText('Secret data for admin');
  });

  test('protected dashboard is reachable', async ({ page }) => {
    await page.goto('/pages/dashboard.html');
    await expect(page.getByTestId('dashboard-user')).toHaveText('Logged in as admin (admin)');
    await expect(page.getByTestId('token-present')).toHaveText('yes');
  });

  test('login page bounces an authenticated user away', async ({ page }) => {
    await page.goto('/login.html');
    await expect(page).toHaveURL(/\/index\.html$/);
    await page.goto('/login.html?redirect=%2Fpages%2Ftables.html');
    await expect(page).toHaveURL(/\/pages\/tables\.html$/);
  });
});
