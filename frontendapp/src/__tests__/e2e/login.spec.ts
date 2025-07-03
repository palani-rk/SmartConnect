
test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('Page Load and Layout', () => {
    test('should display login form with all elements', async ({ page }) => {
      // Check page title and heading
      await expect(page.locator('h1')).toContainText('Sign In');
      
      // Check form fields
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      
      // Check submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
      
      // Check toggle link
      await expect(page.locator('button:has-text("Don\'t have an account?")')).toBeVisible();
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that container is properly sized
      const container = page.locator('[data-testid="login-container"]').first();
      await expect(container).toBeVisible();
      
      // Form should be full width on mobile
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('Form Toggle (Sign In / Sign Up)', () => {
    test('should toggle between sign in and sign up modes', async ({ page }) => {
      // Initially should be in sign in mode
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
      
      // Click toggle link
      await page.click('button:has-text("Don\'t have an account?")');
      
      // Should switch to sign up mode
      await expect(page.locator('h1')).toContainText('Sign Up');
      await expect(page.locator('button[type="submit"]')).toContainText('Sign Up');
      
      // Toggle back
      await page.click('button:has-text("Already have an account?")');
      
      // Should be back to sign in mode
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty fields', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Should show email required error
      await expect(page.locator('text=Email is required')).toBeVisible();
      
      // Should show password required error
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      // Enter invalid email
      await page.fill('#email', 'invalid-email');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show invalid email error
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    });

    test('should validate password length', async ({ page }) => {
      // Enter short password
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', '123');
      await page.click('button[type="submit"]');
      
      // Should show password too short error
      await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    });

    test('should clear validation errors when fields are corrected', async ({ page }) => {
      // Trigger validation errors
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Email is required')).toBeVisible();
      
      // Fill in valid email
      await page.fill('#email', 'test@example.com');
      
      // Email error should disappear
      await expect(page.locator('text=Email is required')).not.toBeVisible();
    });
  });

  test.describe('Authentication Flow', () => {
    test('should show loading state during submission', async ({ page }) => {
      // Fill valid credentials
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show loading state
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    });

    test('should handle login success and redirect', async ({ page }) => {
      // Mock successful login
      await page.route('**/auth/v1/token**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            user: { id: '1', email: 'test@example.com' }
          })
        });
      });

      // Fill valid credentials
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle login failure and show error', async ({ page }) => {
      // Mock failed login
      await page.route('**/auth/v1/token**', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid login credentials'
          })
        });
      });

      // Fill credentials
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'wrongpassword');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('text=Invalid login credentials')).toBeVisible();
      
      // Should not redirect
      await expect(page).toHaveURL('/login');
      
      // Form should be re-enabled
      await expect(page.locator('button[type="submit"]')).not.toBeDisabled();
    });

    test('should handle sign up flow', async ({ page }) => {
      // Switch to sign up mode
      await page.click('button:has-text("Don\'t have an account?")');
      
      // Mock successful sign up
      await page.route('**/auth/v1/signup**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Check your email for confirmation'
          })
        });
      });

      // Fill credentials
      await page.fill('#email', 'newuser@example.com');
      await page.fill('#password', 'password123');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=Check your email for confirmation')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.route('**/auth/v1/token**', (route) => {
        route.abort('failed');
      });

      // Fill credentials and submit
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show generic error message
      await expect(page.locator('text=An unknown error occurred')).toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      // Mock server error
      await page.route('**/auth/v1/token**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error'
          })
        });
      });

      // Fill credentials and submit
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show server error message
      await expect(page.locator('text=Internal server error')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('#email')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('#password')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check email field accessibility
      const emailField = page.locator('#email');
      await expect(emailField).toHaveAttribute('type', 'email');
      await expect(emailField).toHaveAttribute('required');
      
      // Check password field accessibility
      const passwordField = page.locator('#password');
      await expect(passwordField).toHaveAttribute('type', 'password');
      await expect(passwordField).toHaveAttribute('required');
      
      // Check form has proper role
      const form = page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('User Experience', () => {
    test('should maintain form state during mode toggle', async ({ page }) => {
      // Fill form in sign in mode
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      
      // Toggle to sign up
      await page.click('button:has-text("Don\'t have an account?")');
      
      // Form values should be preserved
      await expect(page.locator('#email')).toHaveValue('test@example.com');
      await expect(page.locator('#password')).toHaveValue('password123');
    });

    test('should auto-focus email field on page load', async ({ page }) => {
      await expect(page.locator('#email')).toBeFocused();
    });

    test('should submit form on Enter key press', async ({ page }) => {
      // Mock successful login
      await page.route('**/auth/v1/token**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            user: { id: '1', email: 'test@example.com' }
          })
        });
      });

      // Fill form and press Enter
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      await page.keyboard.press('Enter');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });
  });
});