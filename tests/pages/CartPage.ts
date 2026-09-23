import { type Locator, type Page } from '@playwright/test';

// Component/element abstraction for shop-cart.html.
export class CartPage {
  readonly page: Page;
  readonly total: Locator;
  readonly placeOrder: Locator;
  readonly payError: Locator;
  readonly confirmation: Locator;

  constructor(page: Page) {
    this.page = page;
    this.total = page.getByTestId('cart-total');
    this.placeOrder = page.getByTestId('place-order');
    this.payError = page.getByTestId('pay-error');
    this.confirmation = page.getByTestId('order-confirmation');
  }

  async goto() {
    await this.page.goto('/pages/shop-cart.html');
  }

  row(productName: string) {
    return this.page.getByTestId('cart-row').filter({ hasText: productName });
  }

  async payWithDummyCard(card: { name: string; number: string; expiry: string; cvv: string }) {
    await this.page.getByLabel('Name on card').fill(card.name);
    await this.page.getByLabel('Card number').fill(card.number);
    await this.page.getByLabel('Expiry (MM/YY)').fill(card.expiry);
    await this.page.getByLabel('CVV').fill(card.cvv);
    await this.placeOrder.click();
  }
}
