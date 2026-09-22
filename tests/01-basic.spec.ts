import { test, expect } from '@playwright/test';

test('basic form elements', async ({ page }) => {
  await page.goto('/pages/basic.html');
  await page.getByLabel('Full name').fill('Jane Doe');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByLabel('Age', { exact: true }).fill('30');
  await page.getByRole('checkbox', { name: 'Subscribe to newsletter' }).check();
  await page.getByRole('checkbox', { name: 'Accept terms' }).uncheck();
  await page.getByRole('radio', { name: 'Female' }).check();
  await page.getByLabel('Country').selectOption({ label: 'India' });
  await expect(page.getByLabel('Disabled input')).toBeDisabled();
  await expect(page.getByLabel('Read-only')).not.toBeEditable();
  await page.getByRole('button', { name: 'Submit' }).click();
  const data = JSON.parse((await page.getByTestId('basic-result').textContent())!);
  expect(data).toMatchObject({ name: 'Jane Doe', newsletter: true, terms: false, gender: 'female', country: 'in', age: '30' });
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('');
});
