import { test, expect, request as pwRequest } from '@playwright/test';
import { credentials, shopProductIds, countrySearchCases } from './support/testData';
import { CatalogPage } from './pages/CatalogPage';
import { CartPage } from './pages/CartPage';

test.describe('API testing: all five HTTP verbs via APIRequestContext', () => {
  test('GET /api/products (public)', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toHaveLength(3);
  });

  test('POST /api/echo', async ({ request }) => {
    const res = await request.post('/api/echo', { data: { hello: 'world' } });
    expect((await res.json()).received).toEqual({ hello: 'world' });
  });

  test('PUT /api/echo', async ({ request }) => {
    const res = await request.put('/api/echo', { data: { replaced: true } });
    const body = await res.json();
    expect(body.method).toBe('PUT');
    expect(body.received).toEqual({ replaced: true });
  });

  test('PATCH and DELETE against the shop cart', async ({ request }) => {
    await request.post('/api/login', { data: credentials.admin });
    await request.post('/api/shop/cart', { data: { productId: shopProductIds.milk, qty: 1 } });
    const patched = await request.patch(`/api/shop/cart/${shopProductIds.milk}`, { data: { qty: 4 } });
    expect((await patched.json()).items[0].qty).toBe(4);
    const deleted = await request.delete(`/api/shop/cart/${shopProductIds.milk}`);
    expect((await deleted.json()).items).toHaveLength(0);
  });

  test('a standalone APIRequestContext, created outside any test fixture', async () => {
    // request.newContext() (imported from @playwright/test) builds an APIRequestContext directly —
    // the same type the `request` fixture above hands you. Useful for pure API test files that
    // never need a browser at all, so nothing tears it down automatically; call dispose() yourself.
    const api = await pwRequest.newContext({ baseURL: 'http://localhost:3000' });
    const res = await api.get('/api/countries?q=ind');
    expect(await res.json()).toEqual(['India', 'Indonesia']);
    await api.dispose();
  });
});

test.describe('data-driven testing: API', () => {
  for (const c of countrySearchCases) {
    test(`country search "${c.query}" returns ${c.expected.join(', ')}`, { tag: '@regression' }, async ({ request }) => {
      const res = await request.get(`/api/countries?q=${c.query}`);
      expect(await res.json()).toEqual([...c.expected]);
    });
  }
});

test.describe('data-driven testing: UI, via the Catalog/Cart page objects', () => {
  for (const name of ['Bananas', 'Bread', 'Orange Juice']) {
    test(`add ${name} from the catalog and see it in the cart`, async ({ page }) => {
      const catalog = new CatalogPage(page);
      await catalog.goto();
      await catalog.addToCart(name);

      const cart = new CartPage(page);
      await cart.goto();
      await expect(cart.row(name)).toBeVisible();
      // leave the cart as found for whichever test runs next
      await cart.row(name).getByTestId('cart-remove').click();
    });
  }
});
