import { Page, BrowserContext } from '@playwright/test';
import { E2E_TEST_CONFIG } from './test-config';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: string;
}

export const TEST_USERS = {
  admin: E2E_TEST_CONFIG.users.admin,
  user: E2E_TEST_CONFIG.users.user,
  client: E2E_TEST_CONFIG.users.client,
} as const;

export class AuthHelper {
  constructor(private page: Page) {}

  async login(user: TestUser): Promise<void> {
    await this.page.goto('/auth/login');
    
    // Fill login form - using id selectors based on the actual component
    await this.page.fill('#email', user.email);
    await this.page.fill('#password', user.password);
    
    // Submit login
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect after successful login
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async logout(): Promise<void> {
    // Look for logout button or menu
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for redirect to login page
    await this.page.waitForURL('**/auth/login', { timeout: 5000 });
  }

  async navigateToMessages(): Promise<void> {
    await this.page.goto('/messages');
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if user is redirected to login page
      await this.page.waitForURL('**/auth/login', { timeout: 2000 });
      return false;
    } catch {
      // If not redirected to login, user is authenticated
      return true;
    }
  }

  async getAuthenticationError(): Promise<string | null> {
    try {
      const errorElement = await this.page.locator('[data-testid="auth-error"]');
      return await errorElement.textContent();
    } catch {
      return null;
    }
  }

  async hasOrganization(): Promise<boolean> {
    try {
      const orgErrorElement = await this.page.locator('text=No organization found');
      return !(await orgErrorElement.isVisible());
    } catch {
      return true;
    }
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export async function createAuthenticatedContext(
  browserContext: BrowserContext,
  user: TestUser
): Promise<{ page: Page; authHelper: AuthHelper }> {
  const page = await browserContext.newPage();
  const authHelper = new AuthHelper(page);
  
  await authHelper.login(user);
  
  return { page, authHelper };
}

export async function createUnauthenticatedContext(
  browserContext: BrowserContext
): Promise<{ page: Page; authHelper: AuthHelper }> {
  const page = await browserContext.newPage();
  const authHelper = new AuthHelper(page);
  
  return { page, authHelper };
}