import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';
import { adminAuthFile } from './tests/support/auth-files';

// Runs the suite against Chromium, Firefox and WebKit. Kept as an opt-in config (not part of the
// default `npm test`, which stays Chromium-only) because it roughly triples run time.
// Usage: npx playwright test --config=playwright.cross-browser.config.ts
export default defineConfig(baseConfig, {
  use: { headless: true },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: adminAuthFile }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], storageState: adminAuthFile }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'], storageState: adminAuthFile }, dependencies: ['setup'] },
  ],
});
