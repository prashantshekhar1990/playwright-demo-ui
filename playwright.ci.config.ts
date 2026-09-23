import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// CI variant: headless (no visible browser window) and retries flaky failures once instead of
// failing the run outright. Everything else (projects, globalSetup, reporters, timeouts) is
// inherited from playwright.config.ts.
// Usage: npx playwright test --config=playwright.ci.config.ts
export default defineConfig(baseConfig, {
  retries: 2,
  use: { headless: true },
});
