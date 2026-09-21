import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('single file upload (buffer payload)', async ({ page }) => {
  await page.goto('/pages/files.html');
  await page.getByTestId('single-file').setInputFiles({ name: 'note.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world') });
  await page.getByTestId('upload-single').click();
  await expect(page.getByTestId('single-result')).toHaveText('Uploaded 1 file(s): note.txt (11 bytes)');
});

test('multiple file upload and clearing', async ({ page }) => {
  await page.goto('/pages/files.html');
  await page.getByTestId('multi-file').setInputFiles([
    { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('aaa') },
    { name: 'b.txt', mimeType: 'text/plain', buffer: Buffer.from('bb') },
  ]);
  await expect(page.getByTestId('selected-file')).toHaveText(['a.txt', 'b.txt']);
  await page.getByTestId('upload-multi').click();
  await expect(page.getByTestId('multi-result')).toContainText('Uploaded 2 file(s)');
  await page.getByTestId('multi-file').setInputFiles([]);
  await expect(page.getByTestId('selected-file')).toHaveCount(0);
});

test('upload without file shows message', async ({ page }) => {
  await page.goto('/pages/files.html');
  await page.getByTestId('upload-single').click();
  await expect(page.getByTestId('single-result')).toHaveText('Please choose a file');
});

test('download validation (txt and csv)', async ({ page }) => {
  await page.goto('/pages/files.html');
  const [txt] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-txt').click()]);
  expect(txt.suggestedFilename()).toBe('sample.txt');
  expect(fs.readFileSync((await txt.path())!, 'utf8')).toContain('Hello from Playwright Demo UI');

  const [csv] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-csv').click()]);
  expect(csv.suggestedFilename()).toBe('users.csv');
  const lines = fs.readFileSync((await csv.path())!, 'utf8').split('\n');
  expect(lines[0]).toBe('id,name,email,role,age');
  expect(lines).toHaveLength(11);
});

test('blob download', async ({ page }) => {
  await page.goto('/pages/files.html');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-blob').click()]);
  expect(dl.suggestedFilename()).toBe('generated.csv');
});
