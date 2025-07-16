import { test, expect } from '@playwright/test';

test.describe('Simple Navigation Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Should be redirected to login page since not authenticated
    await expect(page).toHaveURL(/.*auth\/login/);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should see login form elements
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should navigate to messages and redirect to login', async ({ page }) => {
    await page.goto('/messages');
    
    // Should be redirected to login page since not authenticated
    await expect(page).toHaveURL(/.*auth\/login/);
  });
});