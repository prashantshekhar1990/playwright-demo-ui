// Playwright Demo UI server (Node >= 18, Express 4)
// Serves static pages and small APIs used by the auth/network/upload/table scenarios.
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { insertOrder, getOrder, listOrdersForUser } = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.use(express.json());
// Browsers request this automatically on every page load; without a route it 404s and (harmlessly
// but noisily) logs a console error, which tests/fixtures.ts's failOnConsoleError fixture treats as
// a real failure. Answer it before the login gate so it never triggers a redirect either.
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ---------- Data ----------
const users = Array.from({ length: 53 }, (_, i) => ({
  id: i + 1,
  name: `User ${String(i + 1).padStart(2, '0')}`,
  email: `user${i + 1}@example.com`,
  role: ['Admin', 'Editor', 'Viewer'][i % 3],
  age: 20 + ((i * 7) % 40),
}));

const countries = ['Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Denmark',
  'Egypt', 'Finland', 'France', 'Germany', 'Greece', 'India', 'Indonesia', 'Ireland', 'Italy', 'Japan', 'Kenya',
  'Mexico', 'Netherlands', 'New Zealand', 'Norway', 'Peru', 'Poland', 'Portugal', 'Singapore', 'Spain', 'Sweden',
  'Switzerland', 'Thailand', 'Turkey', 'United Kingdom', 'United States', 'Vietnam'];

const products = [
  { id: 1, name: 'Laptop', price: 999.99 },
  { id: 2, name: 'Phone', price: 599.5 },
  { id: 3, name: 'Headphones', price: 149 },
];

// Catalog for the mini e-commerce demo (shop-*.html). Separate from `products` above,
// which the network-mocking scenario (14-network.spec.ts) depends on unchanged.
const shopProducts = [
  { id: 1, name: 'Bananas', category: 'Fruits & Vegetables', price: 40, unit: '1 dozen', stock: 50, emoji: '🍌', description: 'Fresh ripe bananas, sold by the dozen.' },
  { id: 2, name: 'Tomatoes', category: 'Fruits & Vegetables', price: 30, unit: '1 kg', stock: 40, emoji: '🍅', description: 'Farm-fresh tomatoes, ideal for curries and salads.' },
  { id: 3, name: 'Potatoes', category: 'Fruits & Vegetables', price: 25, unit: '1 kg', stock: 60, emoji: '🥔', description: 'Everyday potatoes for all your cooking needs.' },
  { id: 4, name: 'Spinach', category: 'Fruits & Vegetables', price: 20, unit: '250 g', stock: 0, emoji: '🥬', description: 'Leafy green spinach bunch, washed and ready to cook.' },
  { id: 5, name: 'Milk', category: 'Dairy & Bakery', price: 28, unit: '500 ml', stock: 30, emoji: '🥛', description: 'Pasteurized toned milk, delivered chilled.' },
  { id: 6, name: 'Bread', category: 'Dairy & Bakery', price: 35, unit: '400 g', stock: 25, emoji: '🍞', description: 'Soft white sandwich bread, baked fresh daily.' },
  { id: 7, name: 'Paneer', category: 'Dairy & Bakery', price: 80, unit: '200 g', stock: 20, emoji: '🧀', description: 'Fresh cottage cheese block, high in protein.' },
  { id: 8, name: 'Potato Chips', category: 'Snacks', price: 20, unit: '52 g', stock: 100, emoji: '🍟', description: 'Crunchy salted potato chips.' },
  { id: 9, name: 'Chocolate Cookies', category: 'Snacks', price: 45, unit: '200 g', stock: 45, emoji: '🍪', description: 'Chocolate-chip cookies, a family favourite.' },
  { id: 10, name: 'Mixed Namkeen', category: 'Snacks', price: 55, unit: '200 g', stock: 35, emoji: '🥨', description: 'Spiced savoury snack mix.' },
  { id: 11, name: 'Orange Juice', category: 'Beverages', price: 99, unit: '1 L', stock: 22, emoji: '🧃', description: '100% orange juice, no added sugar.' },
  { id: 12, name: 'Cola', category: 'Beverages', price: 40, unit: '750 ml', stock: 0, emoji: '🥤', description: 'Chilled cola soft drink.' },
  { id: 13, name: 'Shampoo', category: 'Personal Care', price: 199, unit: '340 ml', stock: 15, emoji: '🧴', description: 'Gentle daily-use shampoo for all hair types.' },
  { id: 14, name: 'Toothpaste', category: 'Personal Care', price: 55, unit: '100 g', stock: 40, emoji: '🪥', description: 'Fluoride toothpaste for cavity protection.' },
];
const shopCategories = [...new Set(shopProducts.map((p) => p.category))];

// ---------- Sessions (in memory) ----------
const sessions = new Map();
const parseCookies = (req) =>
  Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
    const [k, ...v] = c.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
const currentUser = (req) => sessions.get(parseCookies(req).sid) || null;
// Shared auth check for the API endpoints below that require a logged-in cookie session —
// replaces the same "const u = currentUser(req); if (!u) return 401" pair that used to be
// repeated in 9 different handlers. Attaches the session to req.user for the handler to use.
function requireAuth(req, res, next) {
  req.user = currentUser(req);
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// ---------- Page gate ----------
// Deny by default: without a session only the login page, assets, APIs and downloads are reachable.
// Everything else (index, /pages/*, unknown paths) redirects to /login.html?redirect=<original url>.
// /oauth/* and its two pages are a separate identity system (a mock third-party provider) and
// must stay reachable regardless of the main app's cookie session — see the OAuth section below.
const isOpenPath = (p) => p === '/login.html' || p === '/pages/oauth-demo.html' || p === '/pages/oauth-consent.html' ||
  p.startsWith('/assets/') || p.startsWith('/api/') || p.startsWith('/download/') || p.startsWith('/oauth/');
// Only same-site absolute paths are valid redirect targets (blocks //host, /\host and login loops).
const safeRedirect = (r) => (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//') && !r.includes('\\') && !r.startsWith('/login.html') ? r : '/index.html');
app.use((req, res, next) => {
  const user = currentUser(req);
  if (req.path === '/login.html') return user ? res.redirect(safeRedirect(req.query.redirect)) : next();
  if (user || isOpenPath(req.path)) return next();
  res.redirect(`/login.html?redirect=${encodeURIComponent(req.originalUrl)}`);
});
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth ----------
// Valid: admin/admin123 (role admin), user/user123 (role user). "locked"/anything => 403.
const creds = { admin: { pw: 'admin123', role: 'admin' }, user: { pw: 'user123', role: 'user' } };
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  await sleep(300);
  if (username === 'locked') return res.status(403).json({ error: 'Account locked' });
  const c = creds[username];
  if (!c || c.pw !== password) return res.status(401).json({ error: 'Invalid credentials' });
  const sid = crypto.randomBytes(16).toString('hex');
  const token = crypto.randomBytes(12).toString('hex');
  sessions.set(sid, { username, role: c.role, token });
  res.setHeader('Set-Cookie', `sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
  res.json({ username, role: c.role, token });
});
app.post('/api/logout', (req, res) => {
  sessions.delete(parseCookies(req).sid);
  res.setHeader('Set-Cookie', 'sid=; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({ username: u.username, role: u.role });
});
app.get('/api/secure-data', requireAuth, (req, res) => {
  const u = req.user;
  res.json({ secret: `Secret data for ${u.username}`, role: u.role });
});

// ---------- OAuth 2.0 demo (Authorization Code flow) ----------
// This single server plays all three OAuth roles, purely for demo purposes:
//   - "client"               the pages under /pages/oauth-demo.html
//   - "authorization server" /oauth/authorize, /oauth/consent.html's POST target, /oauth/token
//   - "resource server"      /api/oauth/profile, guarded by a Bearer access token
// None of this touches the cookie-session login above — it's a deliberately separate identity
// system, the way a real third-party provider (e.g. "Login with Google") would be.
const OAUTH_CLIENT = { id: 'demo-client', secret: 'demo-client-secret' };
const OAUTH_REDIRECT_PATH = '/pages/oauth-demo.html';
const oauthUsers = { oauthuser: { pw: 'oauthpass123', name: 'OAuth Demo User', email: 'oauthuser@example.com' } };
const oauthCodes = new Map();         // code -> { redirectUri, scope, username, expiresAt } (one-time use)
const oauthTokens = new Map();        // accessToken -> { scope, username, expiresAt }
const oauthRefreshTokens = new Map(); // refreshToken -> { scope, username } (no expiry modeled; rotated on use)
const genToken = () => crypto.randomBytes(20).toString('hex');
// Mints a fresh access/refresh token pair for a user. Used by both the authorization_code and
// refresh_token grants below, so a refresh returns the exact same shape a first login does.
function issueTokens(username, scope) {
  const accessToken = genToken();
  oauthTokens.set(accessToken, { scope, username, expiresAt: Date.now() + 60 * 60 * 1000 });
  const refreshToken = genToken();
  oauthRefreshTokens.set(refreshToken, { scope, username });
  return { access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer', expires_in: 3600, scope };
}

// Step 1: the client redirects the browser here to start the flow.
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, state, scope } = req.query;
  let redirectPath;
  try { redirectPath = new URL(String(redirect_uri), `http://${req.headers.host}`).pathname; } catch { redirectPath = ''; }
  if (client_id !== OAUTH_CLIENT.id || response_type !== 'code' || redirectPath !== OAUTH_REDIRECT_PATH) {
    return res.status(400).json({ error: 'invalid_request' });
  }
  const qs = new URLSearchParams({ client_id: String(client_id), redirect_uri: String(redirect_uri), state: String(state || ''), scope: String(scope || 'profile') });
  res.redirect(`/pages/oauth-consent.html?${qs}`);
});

// Step 2: the consent screen (its own page) posts the user's decision here as JSON — the same
// fetch-based pattern login.html uses, rather than a raw HTML form submit. Returns where the
// browser should go next; the page does the actual redirect client-side.
app.post('/oauth/consent', (req, res) => {
  const { username, password, decision, redirect_uri, state, scope } = req.body || {};
  let redirectUrl;
  try { redirectUrl = new URL(String(redirect_uri)); } catch { return res.status(400).json({ error: 'invalid_request' }); }
  if (state) redirectUrl.searchParams.set('state', String(state));
  if (decision !== 'allow') { redirectUrl.searchParams.set('error', 'access_denied'); return res.json({ redirectUrl: redirectUrl.toString() }); }
  const u = oauthUsers[username];
  if (!u || u.pw !== password) return res.status(401).json({ error: 'Invalid username or password for the OAuth demo provider' });
  const code = genToken();
  oauthCodes.set(code, { redirectUri: String(redirect_uri), scope: scope || 'profile', username, expiresAt: Date.now() + 2 * 60 * 1000 });
  redirectUrl.searchParams.set('code', code);
  res.json({ redirectUrl: redirectUrl.toString() });
});

// Step 3: the client exchanges the one-time code for an access token (in a real app this call is
// server-to-server; here the demo page makes it directly for simplicity). Also handles the
// refresh_token grant, so a caller whose access token has gone bad (expired or revoked) can get a
// new one without the user going through consent again.
app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token } = req.body || {};
  await sleep(200); // simulate a network hop to a real token endpoint
  if (client_id !== OAUTH_CLIENT.id || client_secret !== OAUTH_CLIENT.secret) return res.status(401).json({ error: 'invalid_client' });

  if (grant_type === 'authorization_code') {
    const entry = oauthCodes.get(code);
    if (!entry || entry.expiresAt < Date.now() || entry.redirectUri !== redirect_uri) return res.status(400).json({ error: 'invalid_grant' });
    oauthCodes.delete(code); // one-time use: a replayed code fails from here on
    return res.json(issueTokens(entry.username, entry.scope));
  }
  if (grant_type === 'refresh_token') {
    const entry = oauthRefreshTokens.get(refresh_token);
    if (!entry) return res.status(400).json({ error: 'invalid_grant' });
    oauthRefreshTokens.delete(refresh_token); // rotated: this refresh token is now dead too
    return res.json(issueTokens(entry.username, entry.scope));
  }
  res.status(400).json({ error: 'unsupported_grant_type' });
});

app.post('/oauth/revoke', (req, res) => { oauthTokens.delete((req.body || {}).token); res.json({ ok: true }); });

// Step 4: the resource server. Bearer-token protected, independent of the cookie-session gate.
app.get('/api/oauth/profile', (req, res) => {
  const authz = req.headers.authorization || '';
  const token = authz.startsWith('Bearer ') ? authz.slice(7) : '';
  const entry = oauthTokens.get(token);
  if (!entry || entry.expiresAt < Date.now()) return res.status(401).json({ error: 'invalid_token' });
  const u = oauthUsers[entry.username];
  res.json({ name: u.name, email: u.email, scope: entry.scope });
});

// ---------- Tables ----------
// GET /api/users?page=1&size=10&sort=name&dir=asc&q=text
app.get('/api/users', async (req, res) => {
  const page = Math.max(1, +req.query.page || 1);
  const size = Math.min(50, Math.max(1, +req.query.size || 10));
  const { sort, dir = 'asc', q = '' } = req.query;
  let rows = users.filter((u) => !q || Object.values(u).join(' ').toLowerCase().includes(String(q).toLowerCase()));
  if (sort && rows[0] && sort in rows[0]) {
    rows = [...rows].sort((a, b) => (a[sort] > b[sort] ? 1 : a[sort] < b[sort] ? -1 : 0) * (dir === 'desc' ? -1 : 1));
  }
  await sleep(+req.query.delay || 250);
  res.json({ total: rows.length, page, size, rows: rows.slice((page - 1) * size, page * size) });
});

// ---------- Dropdown / autocomplete data ----------
app.get('/api/countries', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  await sleep(+req.query.delay || 200);
  res.json(countries.filter((c) => c.toLowerCase().includes(q)));
});

// ---------- Waits / network ----------
app.get('/api/slow', async (req, res) => {
  const delay = Math.min(10000, +req.query.delay || 2000);
  await sleep(delay);
  res.json({ message: `Responded after ${delay}ms`, delay });
});
app.get('/api/products', async (req, res) => {
  await sleep(+req.query.delay || 300);
  res.json(products);
});
let flakyCount = 0;
// Fails on the first 2 calls, succeeds on the 3rd (use /api/flaky/reset to restart)
app.get('/api/flaky', (req, res) => {
  flakyCount++;
  if (flakyCount % 3 !== 0) return res.status(500).json({ error: `Failure #${flakyCount}` });
  res.json({ message: 'Success after retries', attempts: flakyCount });
});
app.post('/api/flaky/reset', (req, res) => { flakyCount = 0; res.json({ ok: true }); });
const echoHandler = (req, res) => res.json({ method: req.method, received: req.body, at: new Date().toISOString() });
app.post('/api/echo', echoHandler);
app.put('/api/echo', echoHandler); // same handler, only here to demo request.put()

// HTTP Basic Auth demo (independent of the cookie session above), for context.httpCredentials.
const BASIC_AUTH = { user: 'basicuser', pass: 'basicpass123' };
app.get('/api/basic-auth/secret', (req, res) => {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  const [user, pass] = scheme === 'Basic' ? Buffer.from(encoded || '', 'base64').toString().split(':') : [];
  if (user !== BASIC_AUTH.user || pass !== BASIC_AUTH.pass) {
    res.setHeader('WWW-Authenticate', 'Basic realm="demo"');
    return res.status(401).json({ error: 'Basic auth required' });
  }
  res.json({ secret: 'You authenticated with HTTP Basic Auth', user });
});

// Virtual list source: GET /api/items?offset=0&limit=50 (10,000 items)
app.get('/api/items', (req, res) => {
  const offset = +req.query.offset || 0, limit = Math.min(200, +req.query.limit || 50);
  res.json(Array.from({ length: Math.max(0, Math.min(limit, 10000 - offset)) }, (_, i) => ({ id: offset + i + 1, label: `Item ${offset + i + 1}` })));
});

// ---------- Shop (mini e-commerce demo: catalog, cart, checkout) ----------
// GET /api/shop/products?q=&category=&page=&size=
app.get('/api/shop/products', async (req, res) => {
  const { q = '', category = '' } = req.query;
  const page = Math.max(1, +req.query.page || 1);
  const size = Math.min(50, Math.max(1, +req.query.size || 12));
  const rows = shopProducts.filter((p) =>
    (!q || p.name.toLowerCase().includes(String(q).toLowerCase())) &&
    (!category || p.category === category));
  await sleep(+req.query.delay || 200);
  res.json({ total: rows.length, page, size, rows: rows.slice((page - 1) * size, page * size), categories: shopCategories });
});
app.get('/api/shop/products/:id', (req, res) => {
  const p = shopProducts.find((x) => x.id === +req.params.id);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  res.json(p);
});

// Cart lives on the logged-in user's session object, so it's already behind the page/API auth gate
// and is naturally per-user and per-server-restart, like `sessions` itself.
function cartSummary(u) {
  u.cart = u.cart || {};
  const items = Object.entries(u.cart).map(([id, qty]) => {
    const p = shopProducts.find((x) => x.id === +id);
    return p ? { id: p.id, name: p.name, price: p.price, unit: p.unit, qty, subtotal: +(p.price * qty).toFixed(2) } : null;
  }).filter(Boolean);
  return { items, total: +items.reduce((s, i) => s + i.subtotal, 0).toFixed(2), count: items.reduce((s, i) => s + i.qty, 0) };
}
app.get('/api/shop/cart', requireAuth, (req, res) => {
  res.json(cartSummary(req.user));
});
app.post('/api/shop/cart', requireAuth, (req, res) => {
  const u = req.user;
  const { productId, qty = 1 } = req.body || {};
  const p = shopProducts.find((x) => x.id === +productId);
  if (!p) return res.status(404).json({ error: 'Product not found' });
  if (p.stock <= 0) return res.status(400).json({ error: 'Out of stock' });
  u.cart = u.cart || {};
  u.cart[productId] = Math.min(p.stock, (u.cart[productId] || 0) + (+qty || 1));
  res.json(cartSummary(u));
});
app.patch('/api/shop/cart/:productId', requireAuth, (req, res) => {
  const u = req.user;
  const { qty } = req.body || {};
  u.cart = u.cart || {};
  if (+qty <= 0) delete u.cart[req.params.productId]; else u.cart[req.params.productId] = +qty;
  res.json(cartSummary(u));
});
app.delete('/api/shop/cart/:productId', requireAuth, (req, res) => {
  const u = req.user;
  u.cart = u.cart || {};
  delete u.cart[req.params.productId];
  res.json(cartSummary(u));
});
app.post('/api/shop/checkout', requireAuth, async (req, res) => {
  const u = req.user;
  const { cardNumber, expiry, cvv } = req.body || {};
  const { items, total } = cartSummary(u);
  if (!items.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!/^\d{16}$/.test(String(cardNumber || '').replace(/\s/g, ''))) return res.status(400).json({ error: 'Card number must be 16 digits' });
  if (!/^\d{2}\/\d{2}$/.test(String(expiry || ''))) return res.status(400).json({ error: 'Expiry must be in MM/YY format' });
  if (!/^\d{3,4}$/.test(String(cvv || ''))) return res.status(400).json({ error: 'CVV must be 3 or 4 digits' });
  await sleep(500); // simulate a dummy payment gateway call
  const orderId = 'ORD' + crypto.randomBytes(4).toString('hex').toUpperCase();
  insertOrder({ orderId, username: u.username, items, total }); // the one piece of real, persistent state in this app
  u.cart = {};
  res.json({ orderId, total, items, message: 'Payment successful' });
});

// Orders placed via checkout above, read back from SQLite (not from server memory).
app.get('/api/orders', requireAuth, (req, res) => {
  res.json(listOrdersForUser(req.user.username));
});
app.get('/api/orders/:orderId', requireAuth, (req, res) => {
  const order = getOrder(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

// ---------- Upload / download ----------
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  const files = (req.files || []).map((f) => ({ name: f.originalname, size: f.size, type: f.mimetype }));
  if (!files.length) return res.status(400).json({ error: 'No files received' });
  res.json({ count: files.length, files });
});
app.get('/download/sample.txt', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="sample.txt"');
  res.type('text/plain').send('Hello from Playwright Demo UI\nLine 2\n');
});
app.get('/download/users.csv', (req, res) => {
  const csv = ['id,name,email,role,age', ...users.slice(0, 10).map((u) => `${u.id},${u.name},${u.email},${u.role},${u.age}`)].join('\n');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.type('text/csv').send(csv);
});
app.get('/download/data.json', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="data.json"');
  res.json({ products });
});

app.get('/', (req, res) => res.redirect('/index.html'));
if (require.main === module) app.listen(PORT, () => console.log(`Playwright Demo UI running at http://localhost:${PORT}`));
module.exports = app;
