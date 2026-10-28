import { test, expect } from '@playwright/test';

test.describe('HomeBooks Pharmacy ERP End-to-End Business Journeys', () => {
  test('Complete Pharmacist Journey: Login, Dashboard KPIs, POS Search, Checkout & Receipt', async ({ page }) => {
    // 1. Visit Login Page
    await page.goto('/login');
    await expect(page).toHaveTitle(/HomeBooks/);
    await expect(page.getByText('HomeBooks Pharmacy ERP')).toBeVisible();

    // 2. Click 1-Click Quick Pharmacist Login
    await page.getByRole('button', { name: /Pharmacist/i }).click();

    // 3. Verify redirected to Dashboard
    await page.waitForURL('/');
    await expect(page.getByText('Pharmacy Operations Dashboard')).toBeVisible();
    await expect(page.getByText("Today's Sales")).toBeVisible();
    await expect(page.getByText('Inventory Value')).toBeVisible();

    // 4. Navigate to POS Billing
    await page.getByRole('link', { name: /POS Billing/i }).click();
    await page.waitForURL('/pos');
    await expect(page.getByText('Fast Pharmacy POS Billing')).toBeVisible();

    // 5. Search for medicine 'Calpol'
    const searchInput = page.getByPlaceholder(/Search by Medicine name/i);
    await searchInput.fill('Calpol');

    // 6. Verify Calpol appears in search results and click Add
    await expect(page.getByText('Calpol 650 Tablet')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Add' }).first().click();

    // 7. Verify item added to POS Cart
    await expect(page.getByText('Net Payable')).toBeVisible();

    // 8. Select Cash payment and Checkout
    await page.getByRole('button', { name: /Cash/i }).first().click();
    await page.getByRole('button', { name: /Print & Checkout/i }).click();

    // 9. Verify Thermal Receipt Modal appears with Invoice details
    await expect(page.getByText('Payment Successful — Cash Memo Generated')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Print Thermal Bill/i)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    // 10. Visit Products Catalog
    await page.getByRole('link', { name: /Products & Medicines/i }).click();
    await page.waitForURL('/products');
    await expect(page.getByText('Medicine & Product Catalog')).toBeVisible();
    await expect(page.getByText('Calpol 650 Tablet')).toBeVisible();

    // 11. Visit Inventory & Batches
    await page.getByRole('link', { name: /Inventory & Batches/i }).click();
    await page.waitForURL('/inventory');
    await expect(page.getByText('Batch & Inventory Management')).toBeVisible();

    // 12. Visit Reports & GST
    await page.getByRole('link', { name: /Reports & GST/i }).click();
    await page.waitForURL('/reports');
    await expect(page.getByText('Reports & Regulatory Compliance')).toBeVisible();
  });
});
