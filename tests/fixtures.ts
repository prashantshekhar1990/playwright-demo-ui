import { test as base, expect } from '@playwright/test';
import { credentials } from './support/testData';
import { CatalogPage } from './pages/CatalogPage';

type TestFixtures = {
  /** A page pre-authenticated as the `user` role, in its own browser context. */
  userPage: import('@playwright/test').Page;
  /** Built on top of `userPage` (fixture composition): already navigated to the catalog. */
  catalogPage: CatalogPage;
  /** Automatic (auto: true) — applies to every test in a file that imports `test` from here,
   *  without being requested. Fails the test if the page logged any console error. */
  failOnConsoleError: void;
};
type WorkerFixtures = {
  /** Worker-scoped: computed once per worker process and shared by every test that worker runs,
   *  unlike test-scoped fixtures which are torn down and rebuilt for each test. */
  workerStartedAt: number;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerStartedAt: [async ({}, use) => {
    await use(Date.now());
  }, { scope: 'worker' }],

  // Depends on the built-in `browser` and `baseURL` fixtures. Logs in via the API rather than a
  // saved storageState file: context.request shares cookies with the browser context it belongs
  // to (the documented "reuse signed-in state" pattern), so this needs no file on disk and has no
  // dependency on another test having run first — one API call, done fresh for every test.
  userPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL });
    await context.request.post('/api/login', { data: credentials.user });
    const page = await context.newPage();
    await use(page); // hand control to the test
    await context.close(); // teardown: runs after the test finishes, even if it failed
  },

  // Fixture composition: depends on the custom `userPage` fixture above, not a built-in one.
  catalogPage: async ({ userPage }, use) => {
    const catalog = new CatalogPage(userPage);
    await catalog.goto();
    await use(catalog);
  },

  // `auto: true` fixtures don't need to appear in a test's destructured arguments to run.
  // This one still depends on the built-in `page` fixture, so requesting only `userPage` in a
  // test also brings up the default (unused) `page` — an accepted cost of auto fixtures.
  failOnConsoleError: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await use();
    expect(errors, `unexpected console error(s): ${errors.join(' | ')}`).toHaveLength(0);
  }, { auto: true }],
});

export { expect };
