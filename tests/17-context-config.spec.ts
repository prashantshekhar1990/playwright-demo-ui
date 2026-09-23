import { test, expect } from '@playwright/test';
import { adminAuthFile } from './support/auth-files';
import { credentials } from './support/testData';

// These tests build their own browser.newContext() with specific options, so each one passes
// storageState explicitly — a manually created context does not inherit the project's default
// storageState the way the built-in `page`/`context` fixtures do.
test.describe('browser context configuration', () => {
  test('viewport, locale and timezone are applied to the page', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 500, height: 700 },
      locale: 'fr-FR',
      timezoneId: 'America/New_York', // avoid zone IDs with ambiguous ICU aliases, e.g. Asia/Kolkata -> Asia/Calcutta
      storageState: adminAuthFile,
    });
    const page = await context.newPage();
    await page.goto('/pages/env-info.html');
    await expect(page.getByTestId('env-viewport')).toHaveText('500 x 700');
    await expect(page.getByTestId('env-locale')).toHaveText('fr-FR');
    await expect(page.getByTestId('env-timezone')).toHaveText('America/New_York');
    await context.close();
  });

  test('dark color scheme is applied', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark', storageState: adminAuthFile });
    const page = await context.newPage();
    await page.goto('/pages/env-info.html');
    await expect(page.getByTestId('env-color-scheme')).toHaveText('dark');
    await context.close();
  });

  test('custom user agent is sent and reflected back by the page', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: 'PlaywrightDemoBot/1.0', storageState: adminAuthFile });
    const page = await context.newPage();
    await page.goto('/pages/env-info.html');
    await expect(page.getByTestId('env-user-agent')).toContainText('PlaywrightDemoBot/1.0');
    await context.close();
  });

  test('geolocation permission + coordinates', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 51.5072, longitude: -0.1276 }, // London
      storageState: adminAuthFile,
    });
    const page = await context.newPage();
    await page.goto('/pages/env-info.html');
    await page.getByTestId('env-geo').click();
    await expect(page.getByTestId('env-geo-result')).toContainText('lat: 51.5072');
    await context.close();
  });

  test('httpCredentials satisfy HTTP Basic Auth', async ({ browser }) => {
    const context = await browser.newContext({
      httpCredentials: { username: credentials.basicAuth.username, password: credentials.basicAuth.password },
      storageState: adminAuthFile,
    });
    const page = await context.newPage();
    await page.goto('/pages/env-info.html');
    await page.getByTestId('env-basic-auth').click();
    await expect(page.getByTestId('env-basic-auth-result')).toHaveText('You authenticated with HTTP Basic Auth');
    await context.close();
  });

  // Deliberately not driven through the page/browser: without httpCredentials configured, a
  // WWW-Authenticate challenge makes Chromium raise a native HTTP-auth dialog even for a background
  // fetch(), and nothing is there to answer it, so an in-page fetch just hangs forever. An
  // APIRequestContext (no browser involved) gets the raw 401 with no dialog in the way.
  test('without httpCredentials, Basic Auth is rejected', async ({ request }) => {
    const res = await request.get('/api/basic-auth/secret');
    expect(res.status()).toBe(401);
  });
});

test.describe('context isolation and browser.newPage()', () => {
  test('two contexts do not share localStorage', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: adminAuthFile });
    const pageA = await contextA.newPage();
    await pageA.goto('/pages/env-info.html');
    await pageA.evaluate(() => localStorage.setItem('isolation-marker', 'set-by-A'));

    const contextB = await browser.newContext({ storageState: adminAuthFile });
    const pageB = await contextB.newPage();
    await pageB.goto('/pages/env-info.html');
    expect(await pageB.evaluate(() => localStorage.getItem('isolation-marker'))).toBeNull();

    await contextA.close();
    await contextB.close();
  });

  test('browser.newPage() is shorthand for newContext() + newPage()', async ({ browser }) => {
    const page = await browser.newPage({ storageState: adminAuthFile });
    await page.goto('/index.html');
    await expect(page).toHaveTitle('Playwright Demo UI');
    await page.close(); // closes its implicit context too
  });

  test('context.cookies() and addCookies() transfer a session to a fresh context', async ({ browser }) => {
    const context = await browser.newContext({ storageState: adminAuthFile });
    const page = await context.newPage();
    await page.goto('/index.html');
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name === 'sid')).toBe(true);

    const freshContext = await browser.newContext();
    await freshContext.addCookies(cookies);
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/index.html');
    await expect(freshPage).toHaveURL(/\/index\.html$/); // already authenticated, no redirect to login

    await context.close();
    await freshContext.close();
  });
});

// These use the default `page` fixture, which already carries the project's admin storageState.
test.describe('locators and assertions not exercised elsewhere', () => {
  test('getByAltText finds the logo image', async ({ page }) => {
    await page.goto('/pages/env-info.html');
    await expect(page.getByAltText('Shop logo')).toBeVisible();
  });

  test('getByTitle finds the icon-only refresh button', async ({ page }) => {
    await page.goto('/pages/env-info.html');
    await expect(page.getByTitle('Refresh info')).toBeVisible();
  });

  test('toHaveTitle reflects a client-side document.title change', async ({ page }) => {
    await page.goto('/pages/env-info.html');
    await expect(page).toHaveTitle('Environment Info');
    await page.getByTestId('env-rename').click();
    await expect(page).toHaveTitle('Renamed!');
  });
});

test.describe('waitForURL after a client-side redirect', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // must start logged out for this one

  test('waitForURL resolves once the login page\'s own JS redirect completes', async ({ page }) => {
    await page.goto('/login.html');
    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/index\.html$/); // the page does location.replace() after its fetch resolves
    await expect(page.getByTestId('nav-user')).toHaveText('admin (admin)');
  });
});
