import type { APIRequestContext, APIResponse } from '@playwright/test';
import { credentials, oauthClient } from './testData';

export type OAuthTokens = { access_token: string; refresh_token: string; token_type: string; expires_in: number; scope: string };

/** Drives the consent step directly (equivalent to submitting the consent form) and returns the
 *  resulting authorization code — no browser involved. */
export async function getAuthCode(request: APIRequestContext, redirectUri: string, state: string, decision: 'allow' | 'deny' = 'allow') {
  const res = await request.post('/oauth/consent', {
    data: { ...credentials.oauthProvider, decision, redirect_uri: redirectUri, state, scope: 'profile' },
  });
  const body = await res.json();
  return { res, code: body.redirectUrl ? new URL(body.redirectUrl).searchParams.get('code') : null, redirectUrl: body.redirectUrl as string | undefined };
}

/** Full authorization_code exchange: consent -> code -> access + refresh token. */
export async function mintOAuthTokens(request: APIRequestContext, redirectUri: string, state: string): Promise<OAuthTokens> {
  const { code } = await getAuthCode(request, redirectUri, state);
  const res = await request.post('/oauth/token', {
    data: { grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: oauthClient.id, client_secret: oauthClient.secret },
  });
  return res.json();
}

/** Exchanges a refresh token for a new access/refresh token pair (the old refresh token is rotated
 *  out server-side, see server.js). */
export async function refreshOAuthTokens(request: APIRequestContext, refreshToken: string): Promise<OAuthTokens> {
  const res = await request.post('/oauth/token', {
    data: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: oauthClient.id, client_secret: oauthClient.secret },
  });
  return res.json();
}

/**
 * A tiny authenticated API client: it holds a token pair and, on any 401 from a call, refreshes
 * once via the refresh token and retries the same call before giving up. This is the standard
 * "interceptor" pattern real HTTP clients (axios, etc.) use for OAuth-protected APIs — checking
 * the server's actual answer rather than guessing at a token's validity from a locally-tracked
 * expiry, so it transparently survives both real expiry and server-side revocation.
 */
export function createOAuthApiClient(request: APIRequestContext, redirectUri: string) {
  let tokens: OAuthTokens | null = null;

  async function ensureTokens() {
    if (!tokens) tokens = await mintOAuthTokens(request, redirectUri, `api-client-${Math.random().toString(36).slice(2)}`);
    return tokens;
  }

  return {
    async authedGet(path: string): Promise<APIResponse> {
      const t = await ensureTokens();
      let res = await request.get(path, { headers: { Authorization: `Bearer ${t.access_token}` } });
      if (res.status() === 401) {
        tokens = await refreshOAuthTokens(request, t.refresh_token);
        res = await request.get(path, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      }
      return res;
    },
    currentAccessToken() { return tokens?.access_token; },
  };
}
