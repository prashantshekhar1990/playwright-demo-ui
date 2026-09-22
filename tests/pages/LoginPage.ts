import { expect, type Locator, type Page } from '@playwright/test';

// Page object for /login.html. Used by auth.setup.ts (the one-time admin login) and by the
// "logged out" tests in 13-auth.spec.ts that need to drive the login form themselves.
export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginButton: Locator;
  // getByRole('alert') only matches while the error box is actually shown (role="alert" + visible
  // text), so asserting on it also proves the error was surfaced to the user, not just written to the DOM.
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.error = page.getByRole('alert');
  }

  async goto(redirectPath?: string) {
    const url = redirectPath ? `/login.html?redirect=${encodeURIComponent(redirectPath)}` : '/login.html';
    await this.page.goto(url);
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
  }

  /** Fills and submits, then waits for a successful login to land on the home page. */
  async loginAndWaitForHome(username: string, password: string) {
    await this.login(username, password);
    await expect(this.page).toHaveURL(/\/index\.html$/);
  }
}
