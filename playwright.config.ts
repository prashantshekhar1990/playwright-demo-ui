import { defineConfig, devices } from '@playwright/test';

// Set CHROMIUM_PATH to use a pre-installed browser binary (optional).
const executablePath = process.env.CHROMIUM_PATH;

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
  fullyParallel: false, // auth/flaky endpoints hold server state
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${runDir}/html-report` }],
    ['json', { outputFile: `${runDir}/results.json` }],
    ['junit', { outputFile: `${runDir}/results.xml` }],
  ],
  use: {
    headless:false,
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    acceptDownloads: true,
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Starts the demo app automatically before tests
  webServer: { command: 'npm start', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 30_000 },
});
