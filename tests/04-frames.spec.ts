import { test, expect } from '@playwright/test';

test('single iframe', async ({ page }) => {
  await page.goto('/pages/frames.html');
  const frame = page.frameLocator('#single-frame');
  await frame.getByTestId('frame-input').fill('hello');
  await frame.getByTestId('frame-btn').click();
  await expect(frame.getByTestId('frame-result')).toHaveText('[Single] You typed: hello');
});

test('nested iframe', async ({ page }) => {
  await page.goto('/pages/frames.html');
  const outer = page.frameLocator('#outer-frame');
  await outer.getByTestId('outer-btn').click();
  await expect(outer.getByTestId('outer-msg')).toHaveText('Outer clicked');
  const inner = outer.frameLocator('#inner-frame');
  await inner.getByTestId('frame-input').fill('deep');
  await inner.getByTestId('frame-btn').click();
  await expect(inner.getByTestId('frame-result')).toContainText('[Inner] You typed: deep');
});

test('multiple frames and srcdoc', async ({ page }) => {
  await page.goto('/pages/frames.html');
  for (const [sel, name] of [['#frame-a', 'A'], ['#frame-b', 'B']]) {
    const f = page.frameLocator(sel);
    await f.getByTestId('frame-input').fill(`v${name}`);
    await f.getByTestId('frame-btn').click();
    await expect(f.getByTestId('frame-result')).toHaveText(`[${name}] You typed: v${name}`);
  }
  await page.frameLocator('#srcdoc-frame').locator('#srcdoc-btn').click();
  await expect(page.frameLocator('#srcdoc-frame').locator('#srcdoc-btn')).toHaveText('Clicked!');
  // Frame API alternative
  expect(page.frames().length).toBeGreaterThan(5);
});
