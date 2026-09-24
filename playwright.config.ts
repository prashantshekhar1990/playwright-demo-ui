import { defineConfig, devices } from '@playwright/test';
import { adminAuthFile } from './tests/support/auth-files';

// Set CHROMIUM_PATH to use a pre-installed browser binary (optional).
const executablePath = process.env.CHROMIUM_PATH;

// Environment management: point the suite at a different running instance without editing this
// file, e.g. BASE_URL=http://localhost:3001 npx playwright test (see the multi-server discussion).
const baseURL = process.env.BASE_URL || 'http://localhost:3000';

// One unique ID per run, e.g. 2026-09-21_14-30-05. Stored in an env var so worker
// processes (which re-load this config) reuse the same value. Override with RUN_ID.
const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
process.env.RUN_ID ??= `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const runId = process.env.RUN_ID;
const runDir = `./output/${runId}`;

export default defineConfig({
  testDir: './tests',
  outputDir: `${runDir}/artifacts`,
  // fullyParallel with a single worker is effectively serial (only one test runs at a time), which
  // keeps the auth/flaky/cart endpoints' shared server state safe. Raise `workers` only once specs
  // that mutate shared state (logout, /api/flaky, the cart) are isolated per test/worker.
  fullyParallel: true,
  workers: 4,
  retries: 0,
  // Explicit defaults (same values Playwright already uses) so the timeout budget is visible here
  // rather than implied. Override per test with test.setTimeout()/test.slow(), see 16-*.spec.ts.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${runDir}/html-report` }],
    ['json', { outputFile: `${runDir}/results.json` }],
    ['junit', { outputFile: `${runDir}/results.xml` }],
  ],
  use: {
    headless:false,
    baseURL,
    trace: 'retain-on-failure',
    acceptDownloads: true,
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  projects: [
    // Logs in once and saves the session to tests/.auth/admin.json
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    // All specs run pre-authenticated; specs that need a logged-out start override storageState.
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: adminAuthFile }, dependencies: ['setup'] },
  ],
  // Starts the demo app automatically before tests
  webServer: { command: 'npm start', url: baseURL, reuseExistingServer: true, timeout: 30_000 },
});
