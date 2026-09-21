import { test, expect } from '@playwright/test';

test('basic form elements', async ({ page }) => {
  await page.goto('/pages/basic.html');
  await page.getByTestId('fullname').fill('Jane Doe');
  await page.getByLabel('Email').fill('jane@example.com');
  await page.getByTestId('age').fill('30');
  await page.getByTestId('chk-newsletter').check();
  await page.getByTestId('chk-terms').uncheck();
  await page.getByTestId('radio-female').check();
  await page.getByTestId('country').selectOption({ label: 'India' });
  await expect(page.getByTestId('disabled-input')).toBeDisabled();
  await expect(page.getByTestId('readonly-input')).not.toBeEditable();
  await page.getByRole('button', { name: 'Submit' }).click();
  const data = JSON.parse((await page.getByTestId('basic-result').textContent())!);
  expect(data).toMatchObject({ name: 'Jane Doe', newsletter: true, terms: false, gender: 'female', country: 'in', age: '30' });
  await page.getByTestId('reset-btn').click();
  await expect(page.getByTestId('fullname')).toHaveValue('');
});
