import { test, expect, type FrameLocator, type Page } from '@playwright/test';

// Frames are located by their title attribute (what assistive tech announces), not by id.
const frameByTitle = (scope: Page | FrameLocator, title: string) => scope.frameLocator(`iframe[title="${title}"]`);

test('single iframe', async ({ page }) => {
  await page.goto('/pages/frames.html');
  const frame = frameByTitle(page, 'Single Frame');
  await frame.getByPlaceholder('Type inside frame').fill('hello');
  await frame.getByRole('button', { name: 'Submit' }).click();
  await expect(frame.getByTestId('frame-result')).toHaveText('[Single] You typed: hello');
});

test('nested iframe', async ({ page }) => {
  await page.goto('/pages/frames.html');
  const outer = frameByTitle(page, 'Outer Frame');
  await outer.getByRole('button', { name: 'Outer button' }).click();
  await expect(outer.getByTestId('outer-msg')).toHaveText('Outer clicked');
  const inner = frameByTitle(outer, 'Inner Frame');
  await inner.getByPlaceholder('Type inside frame').fill('deep');
  await inner.getByRole('button', { name: 'Submit' }).click();
  await expect(inner.getByTestId('frame-result')).toContainText('[Inner] You typed: deep');
});

test('multiple frames and srcdoc', async ({ page }) => {
  await page.goto('/pages/frames.html');
  for (const [title, name] of [['Frame A', 'A'], ['Frame B', 'B']]) {
    const f = frameByTitle(page, title);
    await f.getByPlaceholder('Type inside frame').fill(`v${name}`);
    await f.getByRole('button', { name: 'Submit' }).click();
    await expect(f.getByTestId('frame-result')).toHaveText(`[${name}] You typed: v${name}`);
  }
  const srcdoc = frameByTitle(page, 'Srcdoc Frame');
  await srcdoc.getByRole('button', { name: 'Click me' }).click();
  await expect(srcdoc.getByRole('button')).toHaveText('Clicked!'); // its label changes on click
  // Frame API alternative
  expect(page.frames().length).toBeGreaterThan(5);
});
