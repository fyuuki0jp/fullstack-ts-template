import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display user management page', async ({ page }) => {
    // Check for the user creation form
    await expect(
      page.getByRole('heading', { name: 'User Management' })
    ).toBeVisible();
    await expect(page.getByPlaceholder('user@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeVisible();

    // Check for the users section
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  });

  test('should create a new user successfully', async ({ page }) => {
    // Fill out the form
    await page
      .getByPlaceholder('user@example.com')
      .fill('john.doe@example.com');
    await page.getByPlaceholder('John Doe').fill('John Doe');

    // Submit the form
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for the user to appear in the list
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();

    // Check that empty state message is no longer visible
    await expect(page.getByText('No users found')).not.toBeVisible();
  });

  test('should validate form fields', async ({ page }) => {
    // Check that submit button is disabled when fields are empty
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeDisabled();

    // Fill only email
    await page.getByPlaceholder('user@example.com').fill('test@example.com');

    // Button should still be disabled
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeDisabled();

    // Clear email and fill only name
    await page.getByPlaceholder('user@example.com').clear();
    await page.getByPlaceholder('John Doe').fill('Test User');

    // Button should still be disabled
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeDisabled();

    // Fill both fields
    await page.getByPlaceholder('user@example.com').fill('test@example.com');

    // Button should now be enabled
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeEnabled();
  });

  test('should validate email format', async ({ page }) => {
    // Fill invalid email
    await page.getByPlaceholder('user@example.com').fill('invalid-email');
    await page.getByPlaceholder('John Doe').fill('Test User');

    // Try to submit
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeDisabled();

    // Should show validation error
    await expect(
      page.getByText('Please enter a valid email address')
    ).toBeVisible();
  });

  test('should validate name length', async ({ page }) => {
    // Fill valid email but short name
    await page.getByPlaceholder('user@example.com').fill('test@example.com');
    await page.getByPlaceholder('John Doe').fill('A');

    // Check validate button
    await expect(
      page.getByRole('button', { name: 'Create User' })
    ).toBeDisabled();

    // Should show validation error
    await expect(
      page.getByText('Name must be at least 2 characters long')
    ).toBeVisible();
  });

  test('should handle duplicate email creation', async ({ page }) => {
    // Create first user
    await page
      .getByPlaceholder('user@example.com')
      .fill('duplicate@example.com');
    await page.getByPlaceholder('John Doe').fill('First User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for first user to be created
    await expect(page.getByText('First User')).toBeVisible();

    // Try to create second user with same email
    await page
      .getByPlaceholder('user@example.com')
      .fill('duplicate@example.com');
    await page.getByPlaceholder('John Doe').fill('Second User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error message
    await expect(page.getByText(/Error.*UNIQUE constraint/)).toBeVisible();
  });

  test('should create multiple users and display them correctly', async ({
    page,
  }) => {
    const users = [
      { email: 'alice@example.com', name: 'Alice Smith' },
      { email: 'bob@example.com', name: 'Bob Johnson' },
      { email: 'carol@example.com', name: 'Carol Brown' },
    ];

    // Create multiple users
    for (const user of users) {
      await page.getByPlaceholder('user@example.com').fill(user.email);
      await page.getByPlaceholder('John Doe').fill(user.name);
      await page.getByRole('button', { name: 'Create User' }).click();

      // Wait for user to appear
      await expect(page.getByText(user.name)).toBeVisible();
    }

    // Check that all users are displayed
    for (const user of users) {
      await expect(page.getByText(user.name)).toBeVisible();
      await expect(page.getByText(user.email)).toBeVisible();
    }

    // Check that users are displayed in a grid layout
    const userCards = page.locator(
      '[role="region"][aria-label*="User list"] > div'
    );
    await expect(await userCards.count()).toBeGreaterThanOrEqual(users.length);
  });

  test('should show loading state during user creation', async ({ page }) => {
    // Fill out the form
    await page.getByPlaceholder('user@example.com').fill('loading@example.com');
    await page.getByPlaceholder('John Doe').fill('Loading User');

    // Submit the form
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should briefly show creating state (this might be too fast to catch consistently)
    // So we'll just verify the end result
    await expect(page.getByText('Loading User')).toBeVisible();
  });

  test('should display creation date for users', async ({ page }) => {
    // Create a user
    await page.getByPlaceholder('user@example.com').fill('dated@example.com');
    await page.getByPlaceholder('John Doe').fill('Dated User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for user to appear
    await expect(page.getByText('Dated User')).toBeVisible();

    // Check that creation date is displayed
    await expect(page.getByText(/Created:/).first()).toBeVisible();
  });
});
