import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure for user creation
    await page.route('**/api/users', (route) => {
      route.abort('failed');
    });

    // Try to create a user
    await page.getByLabelText('Email Address').fill('network@example.com');
    await page.getByLabelText('Full Name').fill('Network User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error message
    await expect(page.getByText(/Error.*Failed to fetch/)).toBeVisible();
  });

  test('should handle server errors gracefully', async ({ page }) => {
    // Mock server error response
    await page.route('**/api/users', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      } else {
        route.continue();
      }
    });

    // Try to create a user
    await page.getByLabelText('Email Address').fill('server@example.com');
    await page.getByLabelText('Full Name').fill('Server User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error message
    await expect(page.getByText(/Error.*Internal server error/)).toBeVisible();
  });

  test('should show error when user list fails to load', async ({ page }) => {
    // Mock error for user list loading
    await page.route('**/api/users', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' }),
        });
      } else {
        route.continue();
      }
    });

    // Reload the page to trigger the error
    await page.reload();

    // Should show error state instead of user list
    await expect(page.getByText('Error loading users')).toBeVisible();
    await expect(page.getByText('Database connection failed')).toBeVisible();
    await expect(page.getByText('Please try refreshing the page')).toBeVisible();
  });

  test('should recover from errors when retrying', async ({ page }) => {
    let shouldFail = true;

    // Mock intermittent failure
    await page.route('**/api/users', (route) => {
      if (route.request().method() === 'POST' && shouldFail) {
        shouldFail = false; // Next attempt will succeed
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary error' }),
        });
      } else {
        route.continue();
      }
    });

    // Try to create a user (this will fail)
    await page.getByLabelText('Email Address').fill('retry@example.com');
    await page.getByLabelText('Full Name').fill('Retry User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error first
    await expect(page.getByText(/Error.*Temporary error/)).toBeVisible();

    // Try again (this should succeed)
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should succeed and show the user
    await expect(page.getByText('Retry User')).toBeVisible();
    await expect(page.getByText('retry@example.com')).toBeVisible();
  });

  test('should maintain form data when submission fails', async ({ page }) => {
    // Mock server error
    await page.route('**/api/users', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Validation failed' }),
        });
      } else {
        route.continue();
      }
    });

    const email = 'maintain@example.com';
    const name = 'Maintain User';

    // Fill form and submit
    await page.getByLabelText('Email Address').fill(email);
    await page.getByLabelText('Full Name').fill(name);
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error
    await expect(page.getByText(/Error.*Validation failed/)).toBeVisible();

    // Form data should be maintained
    await expect(page.getByLabelText('Email Address')).toHaveValue(email);
    await expect(page.getByLabelText('Full Name')).toHaveValue(name);
  });
});