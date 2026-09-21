// Playwright Demo UI server (Node >= 18, Express 4)
// Serves static pages and small APIs used by the auth/network/upload/table scenarios.
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// ---------- Sessions (in memory) ----------
const sessions = new Map();
const parseCookies = (req) =>
  Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
    const [k, ...v] = c.trim().split('=');
    return [k, decodeURIComponent(v.join('='))];
  }));
const currentUser = (req) => sessions.get(parseCookies(req).sid) || null;

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
app.get('/api/me', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ username: u.username, role: u.role });
});
app.get('/api/secure-data', (req, res) => {
  const u = currentUser(req);
  if (!u) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ secret: `Secret data for ${u.username}`, role: u.role });
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
app.post('/api/echo', (req, res) => res.json({ received: req.body, at: new Date().toISOString() }));

// Virtual list source: GET /api/items?offset=0&limit=50 (10,000 items)
app.get('/api/items', (req, res) => {
  const offset = +req.query.offset || 0, limit = Math.min(200, +req.query.limit || 50);
  res.json(Array.from({ length: Math.max(0, Math.min(limit, 10000 - offset)) }, (_, i) => ({ id: offset + i + 1, label: `Item ${offset + i + 1}` })));
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
