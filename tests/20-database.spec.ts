import { test, expect } from '@playwright/test';
import { openDb, deleteOrder } from './support/db';
import { credentials, shopProductIds } from './support/testData';

const dummyCard = { cardNumber: '4111111111111111', expiry: '12/29', cvv: '123' };

test.describe('Database: checkout persists to SQLite', () => {
  test('checkout writes a real row, verified by querying SQLite directly (bypassing the API)', async ({ request }) => {
    await request.post('/api/login', { data: credentials.admin });
    await request.post('/api/shop/cart', { data: { productId: shopProductIds.bananas, qty: 2 } });
    const checkout = await (await request.post('/api/shop/checkout', { data: dummyCard })).json();

    // Ground truth: read the same file server.js writes to, not through any API. This is the
    // "did it really persist, correctly" check that a pure API/UI test can never give you.
    const db = openDb({ readonly: true });
    const row: any = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(checkout.orderId);
    db.close();

    expect(row).toBeTruthy();
    expect(row.username).toBe('admin');
    expect(row.total).toBe(checkout.total);
    const items = JSON.parse(row.items);
    expect(items).toEqual(expect.arrayContaining([expect.objectContaining({ id: shopProductIds.bananas, qty: 2 })]));

    deleteOrder(checkout.orderId); // cleanup, so re-running this test doesn't grow the table forever
  });

  test('GET /api/orders/:id matches what is actually stored in the database', async ({ request }) => {
    await request.post('/api/login', { data: credentials.admin });
    await request.post('/api/shop/cart', { data: { productId: shopProductIds.milk, qty: 1 } });
    const { orderId } = await (await request.post('/api/shop/checkout', { data: dummyCard })).json();

    const apiOrder = await (await request.get(`/api/orders/${orderId}`)).json();

    const db = openDb({ readonly: true });
    const row: any = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
    db.close();

    expect(apiOrder.total).toBe(row.total);
    expect(apiOrder.items).toEqual(JSON.parse(row.items));

    deleteOrder(orderId);
  });

  test('an unknown order id returns 404', async ({ request }) => {
    await request.post('/api/login', { data: credentials.admin });
    const res = await request.get('/api/orders/NOT-A-REAL-ORDER');
    expect(res.status()).toBe(404);
  });
});

test.describe('Database: seeding directly, then verifying through the app', () => {
  test('a row inserted directly via SQL is visible through GET /api/orders', async ({ request }) => {
    await request.post('/api/login', { data: credentials.user });
    const orderId = 'ORDTESTSEED' + Date.now();

    // Seed by writing straight to the database — skips the cart/checkout flow entirely. Useful
    // when a test needs data to already exist and doesn't care how it got there.
    const db = openDb();
    db.prepare('INSERT INTO orders (order_id, username, items, total, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(orderId, 'user', JSON.stringify([{ id: shopProductIds.bananas, name: 'Bananas', qty: 1 }]), 40, new Date().toISOString());
    db.close();

    const orders = await (await request.get('/api/orders')).json();
    expect(orders.some((o: any) => o.orderId === orderId)).toBe(true);

    deleteOrder(orderId);
  });
});

test.describe('Database: transaction-per-test isolation', () => {
  test('a row inserted inside a rolled-back transaction never actually persists', async () => {
    const db = openDb();
    const orderId = 'ORDROLLBACK' + Date.now();

    const insertAndRollback = db.transaction(() => {
      db.prepare('INSERT INTO orders (order_id, username, items, total, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(orderId, 'admin', JSON.stringify([]), 0, new Date().toISOString());
      // Inside the transaction, on this same connection, the row is visible...
      expect(db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId)).toBeTruthy();
      throw new Error('deliberate rollback'); // better-sqlite3 rolls back the transaction when the fn throws
    });

    expect(() => insertAndRollback()).toThrow('deliberate rollback');

    // ...but once the transaction rolled back, it never really landed. No cleanup needed — there's
    // nothing to clean up, which is the whole point of this pattern.
    const row = db.prepare('SELECT * FROM orders WHERE order_id = ?').get(orderId);
    expect(row).toBeUndefined();
    db.close();
  });
});
