import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, createAuthenticatedContext, createUnauthenticatedContext } from '../../utils/auth-helpers';
import { MessagesPage } from '../page-objects/MessagesPage';

test.describe('Messages Page - Authentication and Navigation Tests', () => {
  
  test.describe('Authentication Tests', () => {
    test('should show login prompt for unauthenticated users', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createUnauthenticatedContext(context);
      const messagesPage = new MessagesPage(page);
      
      // Navigate to messages page without authentication
      await messagesPage.navigateToMessages();
      
      // Should be redirected to login page or show auth warning
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(false);
      
      // Should show authentication error message
      const authError = await messagesPage.getAuthenticationError();
      expect(authError).toContain('Please log in to view messages');
      
      await context.close();
    });

    test('should handle users without organization', async ({ browser }) => {
      const context = await browser.newContext();
      
      // Create a user without organization (we'll simulate this)
      const page = await context.newPage();
      const authHelper = new AuthHelper(page);
      
      // For this test, we'll need to mock a user without organization
      // This would typically involve creating a test user without org association
      // For now, we'll test the UI behavior when org is null
      
      await page.goto('/messages');
      
      // Mock the auth state to have user but no organization
      await page.evaluate(() => {
        // Mock the auth store to return user without organization
        window.localStorage.setItem('auth-user', JSON.stringify({
          id: 'test-user-id',
          email: 'test@example.com',
          organization_id: null
        }));
      });
      
      await page.reload();
      
      const messagesPage = new MessagesPage(page);
      
      const hasOrganization = await messagesPage.hasOrganization();
      expect(hasOrganization).toBe(false);
      
      const authError = await messagesPage.getAuthenticationError();
      expect(authError).toContain('No organization found');
      
      await context.close();
    });

    test('should allow authenticated users with organization to access messages', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      // Navigate to messages page
      await messagesPage.navigateToMessages();
      
      // Should be authenticated
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      // Should have organization
      const hasOrganization = await messagesPage.hasOrganization();
      expect(hasOrganization).toBe(true);
      
      // Should not show auth errors
      const authError = await messagesPage.getAuthenticationError();
      expect(authError).toBeNull();
      
      await context.close();
    });
  });

  test.describe('Page Loading Tests', () => {
    test('should load messages page within 3 seconds', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      // Measure page load time
      const loadTime = await messagesPage.measurePageLoadTime();
      
      // Should load within 3 seconds (3000ms)
      expect(loadTime).toBeLessThan(3000);
      
      // Page should be loaded
      const isLoaded = await messagesPage.isPageLoaded();
      expect(isLoaded).toBe(true);
      
      // Should show correct page title
      const title = await messagesPage.getPageTitle();
      expect(title).toBe('Messages');
      
      await context.close();
    });

    test('should display proper page elements after loading', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      // Should show page title
      const title = await messagesPage.getPageTitle();
      expect(title).toBe('Messages');
      
      // Should show message interface (even if empty)
      const hasMessageInterface = await messagesPage.isMessageInterfaceVisible();
      expect(hasMessageInterface).toBe(true);
      
      // Should show empty channel message when no channel selected
      const hasEmptyMessage = await messagesPage.isEmptyChannelMessageVisible();
      expect(hasEmptyMessage).toBe(true);
      
      await context.close();
    });
  });

  test.describe('Channel Loading Tests', () => {
    test('should load channels within 5 seconds', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      // Measure channel load time
      const loadTime = await messagesPage.measureChannelLoadTime();
      
      // Should load within 5 seconds (5000ms)
      expect(loadTime).toBeLessThan(5000);
      
      // Should not have channel errors
      const hasError = await messagesPage.hasChannelError();
      expect(hasError).toBe(false);
      
      await context.close();
    });

    test('should display channels list correctly', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      // Get channels list
      const channels = await messagesPage.getChannelList();
      
      // Should have at least one channel (assuming test data exists)
      expect(channels.length).toBeGreaterThan(0);
      
      // Each channel should have a name
      channels.forEach(channel => {
        expect(channel).toBeTruthy();
        expect(typeof channel).toBe('string');
      });
      
      await context.close();
    });

    test('should handle channel loading errors gracefully', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      // Mock network failure for channels
      await page.route('**/channels**', route => route.abort());
      
      await messagesPage.navigateToMessages();
      
      // Should show error state
      const hasError = await messagesPage.hasChannelError();
      expect(hasError).toBe(true);
      
      const errorMessage = await messagesPage.getChannelError();
      expect(errorMessage).toBeTruthy();
      
      await context.close();
    });
  });

  test.describe('Navigation Tests', () => {
    test('should navigate between different pages', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      // Start from dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Navigate to messages
      await messagesPage.navigateToMessages();
      
      // Should be on messages page
      const isLoaded = await messagesPage.isPageLoaded();
      expect(isLoaded).toBe(true);
      
      // Navigate back to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Should not be on messages page anymore
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
      
      await context.close();
    });

    test('should handle direct navigation to messages URL', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      // Navigate directly to messages URL
      await page.goto('/messages');
      
      // Should load correctly
      const isLoaded = await messagesPage.isPageLoaded();
      expect(isLoaded).toBe(true);
      
      // Should be authenticated
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      await context.close();
    });
  });

  test.describe('User Role Tests', () => {
    test('should allow admin users to access messages', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.admin);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      const hasOrganization = await messagesPage.hasOrganization();
      expect(hasOrganization).toBe(true);
      
      await context.close();
    });

    test('should allow regular users to access messages', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.user);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      const hasOrganization = await messagesPage.hasOrganization();
      expect(hasOrganization).toBe(true);
      
      await context.close();
    });

    test('should allow client users to access messages', async ({ browser }) => {
      const context = await browser.newContext();
      const { page, authHelper } = await createAuthenticatedContext(context, TEST_USERS.client);
      const messagesPage = new MessagesPage(page);
      
      await messagesPage.navigateToMessages();
      
      const isAuthenticated = await messagesPage.isAuthenticated();
      expect(isAuthenticated).toBe(true);
      
      const hasOrganization = await messagesPage.hasOrganization();
      expect(hasOrganization).toBe(true);
      
      await context.close();
    });
  });
});