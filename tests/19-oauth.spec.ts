import { test, expect } from '@playwright/test';
import { credentials, oauthClient } from './support/testData';
import { getAuthCode, createOAuthApiClient } from './support/oauth';

test.describe('OAuth: full flow through the browser', () => {
  test('login, consent, and the resulting profile', async ({ page }) => {
    await page.goto('/pages/oauth-demo.html');
    await page.getByTestId('oauth-login').click();

    // Now on the (separate) consent screen.
    await expect(page.getByTestId('oauth-client-name')).toHaveText(oauthClient.id);
    await page.getByLabel('Username').fill(credentials.oauthProvider.username);
    await page.getByLabel('Password').fill(credentials.oauthProvider.password);
    await page.getByRole('button', { name: 'Allow' }).click();

    // Back on the client, which exchanged the code for a token and fetched the profile.
    await page.waitForURL(/\/pages\/oauth-demo\.html/);
    await expect(page.getByTestId('oauth-profile-name')).toHaveText('OAuth Demo User');
    await expect(page.getByTestId('oauth-profile-email')).toHaveText('oauthuser@example.com');
    await expect(page.getByTestId('oauth-profile-scope')).toHaveText('profile');
  });

  test('denying consent returns an error to the client, not a profile', async ({ page }) => {
    await page.goto('/pages/oauth-demo.html');
    await page.getByTestId('oauth-login').click();
    await page.getByRole('button', { name: 'Deny' }).click();
    await expect(page.getByTestId('oauth-error')).toContainText('access_denied');
    await expect(page.getByTestId('oauth-profile-name')).toBeHidden();
  });

  test('wrong provider credentials are rejected on the consent screen', async ({ page }) => {
    await page.goto('/pages/oauth-demo.html');
    await page.getByTestId('oauth-login').click();
    await page.getByLabel('Username').fill(credentials.oauthProvider.username);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Allow' }).click();
    await expect(page.getByTestId('consent-error')).toContainText('Invalid username or password');
    await expect(page).toHaveURL(/oauth-consent\.html/); // stayed on the provider's page
  });

  test('logout revokes the token; the profile then requires logging in again', async ({ page }) => {
    await page.goto('/pages/oauth-demo.html');
    await page.getByTestId('oauth-login').click();
    await page.getByLabel('Username').fill(credentials.oauthProvider.username);
    await page.getByLabel('Password').fill(credentials.oauthProvider.password);
    await page.getByRole('button', { name: 'Allow' }).click();
    await expect(page.getByTestId('oauth-profile-name')).toBeVisible();

    await page.getByTestId('oauth-logout').click();
    await expect(page.getByTestId('oauth-login')).toBeVisible();
    await expect(page.getByTestId('oauth-status')).toContainText('Logged out and token revoked');
  });

  test('a state mismatch aborts the exchange (CSRF protection)', async ({ page, request, baseURL }) => {
    // A valid code, obtained without ever visiting oauth-demo.html — so its sessionStorage has no
    // saved state at all, making any incoming state a guaranteed mismatch.
    const { code } = await getAuthCode(request, `${baseURL}/pages/oauth-demo.html`, 'irrelevant');
    await page.goto(`/pages/oauth-demo.html?code=${code}&state=WRONG-STATE`);
    await expect(page.getByTestId('oauth-error')).toContainText('State mismatch');
    await expect(page.getByTestId('oauth-profile-name')).toBeHidden();
  });
});

test.describe('OAuth: pure API (no browser)', () => {
  test('full flow: consent -> token -> profile', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { res: consentRes, code } = await getAuthCode(request, redirectUri, 's1');
    expect(consentRes.ok()).toBeTruthy();

    const tokenRes = await request.post('/oauth/token', {
      data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret },
    });
    expect(tokenRes.ok()).toBeTruthy();
    const token = await tokenRes.json();
    expect(token.token_type).toBe('Bearer');

    const profileRes = await request.get('/api/oauth/profile', { headers: { Authorization: `Bearer ${token.access_token}` } });
    expect(await profileRes.json()).toEqual({ name: 'OAuth Demo User', email: 'oauthuser@example.com', scope: 'profile' });
  });

  test('an authorization code can only be exchanged once', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { code } = await getAuthCode(request, redirectUri, 's2');
    const tokenData = { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret };

    const first = await request.post('/oauth/token', { data: tokenData });
    expect(first.ok()).toBeTruthy();

    const second = await request.post('/oauth/token', { data: tokenData });
    expect(second.status()).toBe(400);
    expect((await second.json()).error).toBe('invalid_grant');
  });

  test('wrong client secret is rejected', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { code } = await getAuthCode(request, redirectUri, 's3');
    const res = await request.post('/oauth/token', {
      data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: 'not-the-real-secret' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toBe('invalid_client');
  });

  test('unknown client_id is rejected at /oauth/authorize', async ({ request, baseURL }) => {
    const qs = new URLSearchParams({ client_id: 'someone-else', redirect_uri: `${baseURL}/pages/oauth-demo.html`, response_type: 'code', state: 'x' });
    const res = await request.get(`/oauth/authorize?${qs}`);
    expect(res.status()).toBe(400);
  });

  test('missing or invalid bearer token is rejected on the resource server', async ({ request }) => {
    expect((await request.get('/api/oauth/profile')).status()).toBe(401);
    expect((await request.get('/api/oauth/profile', { headers: { Authorization: 'Bearer not-a-real-token' } })).status()).toBe(401);
  });

  test('revoking a token invalidates it immediately', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { code } = await getAuthCode(request, redirectUri, 's4');
    const tokenRes = await request.post('/oauth/token', {
      data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret },
    });
    const { access_token } = await tokenRes.json();

    const before = await request.get('/api/oauth/profile', { headers: { Authorization: `Bearer ${access_token}` } });
    expect(before.ok()).toBeTruthy();

    await request.post('/oauth/revoke', { data: { token: access_token } });

    const after = await request.get('/api/oauth/profile', { headers: { Authorization: `Bearer ${access_token}` } });
    expect(after.status()).toBe(401);
  });
});

test.describe('OAuth: refresh tokens', () => {
  test('a refresh token mints a new, working access token', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { code } = await getAuthCode(request, redirectUri, 's5');
    const first = await request.post('/oauth/token', {
      data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret },
    }).then((r) => r.json());

    const refreshed = await request.post('/oauth/token', {
      data: { grant_type: 'refresh_token', refresh_token: first.refresh_token, client_id: oauthClient.id, client_secret: oauthClient.secret },
    }).then((r) => r.json());

    expect(refreshed.access_token).not.toBe(first.access_token); // a genuinely new token, not the same one
    const profile = await request.get('/api/oauth/profile', { headers: { Authorization: `Bearer ${refreshed.access_token}` } });
    expect(profile.ok()).toBeTruthy();
  });

  test('refresh tokens are rotated: the old one dies after a single use', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const { code } = await getAuthCode(request, redirectUri, 's6');
    const tokens = await request.post('/oauth/token', {
      data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret },
    }).then((r) => r.json());

    const firstRefresh = await request.post('/oauth/token', { data: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: oauthClient.id, client_secret: oauthClient.secret } });
    expect(firstRefresh.ok()).toBeTruthy();

    // Replaying the ORIGINAL refresh token — already used above — must now fail.
    const secondRefresh = await request.post('/oauth/token', { data: { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: oauthClient.id, client_secret: oauthClient.secret } });
    expect(secondRefresh.status()).toBe(400);
    expect((await secondRefresh.json()).error).toBe('invalid_grant');
  });

  test('an authenticated client auto-refreshes on an invalid token and retries the call', async ({ request, baseURL }) => {
    const redirectUri = `${baseURL}/pages/oauth-demo.html`;
    const client = createOAuthApiClient(request, redirectUri);

    const first = await client.authedGet('/api/oauth/profile');
    expect(first.ok()).toBeTruthy();
    const tokenBeforeRevoke = client.currentAccessToken();

    // Simulate the access token going bad (expiry or a server-side revocation) without waiting a
    // real hour — the client has no way to know this happened until it actually tries the call.
    await request.post('/oauth/revoke', { data: { token: tokenBeforeRevoke } });

    const second = await client.authedGet('/api/oauth/profile'); // should transparently refresh + retry
    expect(second.ok()).toBeTruthy();
    expect(await second.json()).toEqual({ name: 'OAuth Demo User', email: 'oauthuser@example.com', scope: 'profile' });
    expect(client.currentAccessToken()).not.toBe(tokenBeforeRevoke); // proves a new token was actually minted
  });
});
