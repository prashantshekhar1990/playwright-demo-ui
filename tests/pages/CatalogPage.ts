import { type Locator, type Page } from '@playwright/test';

// Component/element abstraction for shop-catalog.html — reused by fixtures.ts and by specs
// that data-drive over several products instead of repeating raw locators per test.
export class CatalogPage {
  readonly page: Page;
  readonly search: Locator;
  readonly category: Locator;
  readonly resultsCount: Locator;
  readonly cartBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.search = page.getByPlaceholder('Search products');
    this.category = page.getByLabel('Category');
    this.resultsCount = page.getByTestId('shop-results-count');
    this.cartBadge = page.getByTestId('cart-badge');
  }

  async goto() {
    await this.page.goto('/pages/shop-catalog.html');
  }

  productCard(name: string) {
    return this.page.getByTestId('product-card').filter({ hasText: name });
  }

  async addToCart(name: string) {
    await this.productCard(name).getByRole('button', { name: `Add ${name} to cart` }).click();
  }

  async searchFor(text: string) {
    const response = this.page.waitForResponse((r) => r.url().includes('/api/shop/products') && r.status() === 200);
    await this.search.fill(text);
    await response;
  }
}
