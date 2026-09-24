import Database from 'better-sqlite3';
import * as path from 'path';

// The exact same SQLite file server.js/db.js writes to. Tests open their own connection to it —
// this is what makes "direct database verification" possible: checking ground truth without
// going through the app's own API at all.
const dbPath = path.join(__dirname, '..', '..', 'data', 'app.db');

export function openDb(options: { readonly?: boolean } = {}) {
  return new Database(dbPath, options);
}

export type OrderRow = { order_id: string; username: string; items: string; total: number; created_at: string };

/** Deletes one order row directly. Used to clean up after tests that create real orders through
 *  the checkout API, so repeated runs don't leave the table growing forever. */
export function deleteOrder(orderId: string) {
  const db = openDb();
  db.prepare('DELETE FROM orders WHERE order_id = ?').run(orderId);
  db.close();
}
