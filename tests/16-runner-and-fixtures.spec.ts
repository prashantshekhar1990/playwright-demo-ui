// Uses the custom `test`/`expect` from ./fixtures.ts (built with test.extend), not the default
// @playwright/test import — that's what brings in userPage / catalogPage / workerStartedAt /
// failOnConsoleError into every test below.
import { test, expect } from './fixtures';

test.describe('test runner building blocks', () => {
  test.beforeAll(async () => {
    // Runs once before any test in this describe block, not once per test.
    console.log('[16-runner] beforeAll: suite starting');
  });
  test.afterAll(async () => {
    console.log('[16-runner] afterAll: suite finished');
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/basic.html'); // common starting point for the tests in this block
  });
  test.afterEach(async ({}, testInfo) => {
    console.log(`[16-runner] afterEach: "${testInfo.title}" -> ${testInfo.status}`);
  });

  test('test.step breaks a test into named, reportable steps', async ({ page }) => {
    await test.step('fill the form', async () => {
      await page.getByLabel('Full name').fill('Ada Lovelace');
    });
    await test.step('submit', async () => {
      await page.getByRole('button', { name: 'Submit' }).click();
    });
    await expect(page.getByTestId('basic-result')).toContainText('Ada Lovelace');
  });

  test('worker-scoped fixture is shared across tests in this worker', async ({ workerStartedAt }) => {
    expect(workerStartedAt).toBeLessThanOrEqual(Date.now());
  });

  test('global setup ran before this test and set an env var', async () => {
    expect(process.env.GLOBAL_SETUP_AT).toBeTruthy();
  });
});

test.describe('skip / fixme / fail / slow', () => {
  test('skipped unconditionally', async () => {
    test.skip(true, 'demonstrates test.skip() — never runs, reported as skipped, not failed');
  });

  test('skipped only on WebKit', async ({ browserName }) => {
    test.skip(browserName === 'webkit', 'this feature is not under test on WebKit here');
    expect(browserName).not.toBe('webkit');
  });

  // test.fixme(title, fn) declares a known-broken/not-yet-written test up front. Playwright skips
  // it but flags it distinctly from test.skip() in the HTML report.
  test.fixme('not implemented yet', async () => {
    expect(false).toBe(true);
  });

  test('expected to fail, and does', async () => {
    test.fail(); // inverts the result: this test PASSES the run only because its assertion fails
    expect(1).toBe(2);
  });

  test('a legitimately slow test gets extra time instead of raising the global timeout', async ({ page }) => {
    test.slow(); // triples this test's timeout (30s -> 90s here)
    await page.goto('/pages/waits.html');
    await page.getByRole('button', { name: 'Load content' }).click();
    await expect(page.getByText('Content loaded successfully')).toBeVisible();
  });
});

test.describe('annotations and tags (filter with: npx playwright test --grep @smoke)', () => {
  test('tagged as smoke', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByRole('heading', { name: 'Playwright Demo UI', level: 1 })).toBeVisible();
  });

  test('tagged as regression, with a free-form annotation', {
    tag: '@regression',
    annotation: { type: 'issue', description: 'https://example.com/TICKET-123' },
  }, async ({ page }) => {
    await page.goto('/pages/basic.html');
    await expect(page.getByTestId('page-title')).toBeVisible();
  });

  // test.only() is deliberately not used anywhere in this project: it would make Playwright run
  // ONLY that one test for the whole project, skipping every other file. It's a local, throwaway
  // debugging tool, e.g.:
  //   test.only('debug this one', async ({ page }) => { ... });
  // — never something to commit.
});

test.describe('custom fixtures: test.extend, composition, teardown', () => {
  test('userPage fixture starts pre-authenticated as the user role', async ({ userPage }) => {
    await userPage.goto('/pages/dashboard.html');
    await expect(userPage.getByTestId('dashboard-user')).toHaveText('Logged in as user (user)');
    // userPage's browser context is closed automatically by the fixture's teardown afterwards.
  });

  test('catalogPage fixture composes on top of userPage', async ({ catalogPage }) => {
    // catalogPage already navigated to /pages/shop-catalog.html — see fixtures.ts.
    await expect(catalogPage.resultsCount).toContainText('products found');
  });
});
