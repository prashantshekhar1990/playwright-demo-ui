import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { adminAuthFile } from './support/auth-files';

// Runs once before the test project (see `dependencies` in playwright.config.ts): logs in through
// the real login screen and saves the session so every other test starts already authenticated.
setup('log in as admin and save the session', async ({ page }) => {
  fs.mkdirSync(path.dirname(adminAuthFile), { recursive: true });
  await page.goto('/login.html');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/index\.html$/);
  await page.context().storageState({ path: adminAuthFile });
});
