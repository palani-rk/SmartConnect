
import { test, expect } from '@playwright/test';

test.describe('Channel Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the channels page before each test
    await page.goto('/channels');
  });

  test.describe('View Channels', () => {
    test('TC-VIEW-001: should display a list of existing channels', async ({ page }) => {
      // Wait for the channel list to be visible
      await expect(page.locator('div[role="list"]')).toBeVisible();

      // Check that there is at least one channel item
      const channelItems = await page.locator('div[role="listitem"]').count();
      expect(channelItems).toBeGreaterThan(0);
    });

    test('TC-VIEW-002: should display a message when no channels exist', async ({ page }) => {
        // Mock the API response to return an empty array of channels
        await page.route('**/api/channels', route => {
            route.fulfill({
                status: 200,
                body: JSON.stringify([]),
            });
        });

        // Reload the page to get the mocked response
        await page.reload();

        // Check that the "No channels found" message is visible
        await expect(page.locator('text="No channels found"')).toBeVisible();
    });
  });

  test.describe('Create Channel', () => {
    test('TC-CREATE-001: should open the create channel form', async ({ page }) => {
      // Click the "Create Channel" button
      await page.locator('button:has-text("Create Channel")').click();

      // Check that the form is visible
      await expect(page.locator('form[aria-label="Create Channel Form"]')).toBeVisible();
    });

    test('TC-CREATE-002: should create a channel successfully', async ({ page }) => {
      // Click the "Create Channel" button
      await page.locator('button:has-text("Create Channel")').click();

      // Fill in the form
      await page.locator('input[name="name"]').fill('Test Channel');
      await page.locator('textarea[name="description"]').fill('This is a test channel.');

      // Submit the form
      await page.locator('button[type="submit"]').click();

      // Check that the new channel is visible in the list
      await expect(page.locator('text="Test Channel"')).toBeVisible();
    });
  });
});
