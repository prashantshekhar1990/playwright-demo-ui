// SQLite-backed storage. Deliberately additive: every other piece of app state (sessions, cart,
// the users/products lists, OAuth tokens) stays in memory as before. This is the one place with
// real persistence, added specifically to demonstrate database-backed test scenarios — see
// tests/20-database.spec.ts and tests/support/db.ts.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'app.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // lets a reader (e.g. a test's own connection) read while the server holds the file open

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    items TEXT NOT NULL,
    total REAL NOT NULL,
    created_at TEXT NOT NULL
  )
`);

function insertOrder({ orderId, username, items, total }) {
  db.prepare('INSERT INTO orders (order_id, username, items, total, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, username, JSON.stringify(items), total, new Date().toISOString());
}

function rowToOrder(row) {
  return { orderId: row.order_id, username: row.username, items: JSON.parse(row.items), total: row.total, createdAt: row.created_at };
}

function getOrder(orderId) {
  const row = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
  return row ? rowToOrder(row) : null;
}

function listOrdersForUser(username) {
  return db.prepare('SELECT * FROM orders WHERE username = ? ORDER BY created_at DESC').all(username).map(rowToOrder);
}

module.exports = { dbPath, insertOrder, getOrder, listOrdersForUser };
