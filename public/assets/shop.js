// Shared helpers for the shop-*.html pages: cart badge refresh and add-to-cart calls.
async function shopCartCount() {
  try { const r = await fetch('/api/shop/cart'); if (!r.ok) return 0; return (await r.json()).count; } catch { return 0; }
}
async function shopRenderCartBadge() {
  const el = document.querySelector('[data-testid=cart-badge]');
  if (el) el.textContent = String(await shopCartCount());
}
async function shopAddToCart(productId, qty = 1) {
  const r = await fetch('/api/shop/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, qty }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Failed to add to cart');
  await shopRenderCartBadge();
  return j;
}
