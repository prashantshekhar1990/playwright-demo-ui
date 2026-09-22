import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('single file upload (buffer payload)', async ({ page }) => {
  await page.goto('/pages/files.html');
  await page.getByLabel('Single file').setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world') });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByTestId('single-result')).toHaveText('Uploaded 1 file(s): note.txt (11 bytes)');
});

test('multiple file upload and clearing', async ({ page }) => {
  await page.goto('/pages/files.html');
  const multi = page.getByLabel('Multiple files');
  const selected = page.getByTestId('file-list').getByRole('listitem');
  await multi.setInputFiles([
    { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('aaa') },
    { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('bb') },
  ]);
  await expect(selected).toHaveText(['a.txt', 'b.txt']);
  await page.getByRole('button', { name: 'Upload all' }).click();
  await expect(page.getByTestId('multi-result')).toContainText('Uploaded 2 file(s)');
  await multi.setInputFiles([]);
  await expect(selected).toHaveCount(0);
});

test('upload without file shows message', async ({ page }) => {
  await page.goto('/pages/files.html');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByTestId('single-result')).toHaveText('Please choose a file');
});

test('download validation (txt and csv)', async ({ page }) => {
  await page.goto('/pages/files.html');
  const [txt] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download sample.txt' }).click()]);
  expect(txt.suggestedFilename()).toBe('sample.txt');
  expect(fs.readFileSync((await txt.path())!, 'utf8')).toContain('Hello from Playwright Demo UI');

  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download users.csv' }).click()]);
  expect(csv.suggestedFilename()).toBe('users.csv');
  const lines = fs.readFileSync((await csv.path())!, 'utf8').split('\n');
  expect(lines[0]).toBe('id,name,email,role,age');
  expect(lines).toHaveLength(11);
});

test('blob download', async ({ page }) => {
  await page.goto('/pages/files.html');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download generated file (Blob)' }).click()]);
  expect(dl.suggestedFilename()).toBe('generated.csv');
});
