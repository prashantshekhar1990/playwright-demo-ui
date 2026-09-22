import { test as setup } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { adminAuthFile } from './support/auth-files';
import { LoginPage } from './pages/LoginPage';

// Runs once before the test project (see `dependencies` in playwright.config.ts): logs in through
// the real login screen and saves the session so every other test starts already authenticated.
setup('log in as admin and save the session', async ({ page }) => {
  fs.mkdirSync(path.dirname(adminAuthFile), { recursive: true });
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitForHome('admin', 'admin123');
  await page.context().storageState({ path: adminAuthFile });
});
