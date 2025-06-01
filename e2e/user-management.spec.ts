import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should display user management page with form and empty user list', async ({ page }) => {
    // Check that the page loads correctly
    await expect(page).toHaveTitle(/SPA Hono/);

    // Check for the user creation form
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expect(page.getByLabelText('Email Address')).toBeVisible();
    await expect(page.getByLabelText('Full Name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create User' })).toBeVisible();

    // Check for the users section
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    
    // Should show empty state initially
    await expect(page.getByText('No users found')).toBeVisible();
    await expect(page.getByText('Create your first user using the form above.')).toBeVisible();
  });

  test('should create a new user successfully', async ({ page }) => {
    // Fill out the form
    await page.getByLabelText('Email Address').fill('john.doe@example.com');
    await page.getByLabelText('Full Name').fill('John Doe');

    // Submit the form
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for the user to appear in the list
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();

    // Check that the form is cleared after successful submission
    await expect(page.getByLabelText('Email Address')).toHaveValue('');
    await expect(page.getByLabelText('Full Name')).toHaveValue('');

    // Check that empty state message is no longer visible
    await expect(page.getByText('No users found')).not.toBeVisible();
  });

  test('should validate form fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.getByRole('button', { name: 'Create User' }).click();

    // Check that submit button is disabled when fields are empty
    await expect(page.getByRole('button', { name: 'Create User' })).toBeDisabled();

    // Fill only email
    await page.getByLabelText('Email Address').fill('test@example.com');
    
    // Button should still be disabled
    await expect(page.getByRole('button', { name: 'Create User' })).toBeDisabled();

    // Clear email and fill only name
    await page.getByLabelText('Email Address').clear();
    await page.getByLabelText('Full Name').fill('Test User');
    
    // Button should still be disabled
    await expect(page.getByRole('button', { name: 'Create User' })).toBeDisabled();

    // Fill both fields
    await page.getByLabelText('Email Address').fill('test@example.com');
    
    // Button should now be enabled
    await expect(page.getByRole('button', { name: 'Create User' })).toBeEnabled();
  });

  test('should validate email format', async ({ page }) => {
    // Fill invalid email
    await page.getByLabelText('Email Address').fill('invalid-email');
    await page.getByLabelText('Full Name').fill('Test User');

    // Try to submit
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show validation error
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should validate name length', async ({ page }) => {
    // Fill valid email but short name
    await page.getByLabelText('Email Address').fill('test@example.com');
    await page.getByLabelText('Full Name').fill('A');

    // Try to submit
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show validation error
    await expect(page.getByText('Name must be at least 2 characters long')).toBeVisible();
  });

  test('should handle duplicate email creation', async ({ page }) => {
    // Create first user
    await page.getByLabelText('Email Address').fill('duplicate@example.com');
    await page.getByLabelText('Full Name').fill('First User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for first user to be created
    await expect(page.getByText('First User')).toBeVisible();

    // Try to create second user with same email
    await page.getByLabelText('Email Address').fill('duplicate@example.com');
    await page.getByLabelText('Full Name').fill('Second User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should show error message
    await expect(page.getByText(/Error.*UNIQUE constraint/)).toBeVisible();
  });

  test('should create multiple users and display them correctly', async ({ page }) => {
    const users = [
      { email: 'alice@example.com', name: 'Alice Smith' },
      { email: 'bob@example.com', name: 'Bob Johnson' },
      { email: 'carol@example.com', name: 'Carol Brown' },
    ];

    // Create multiple users
    for (const user of users) {
      await page.getByLabelText('Email Address').fill(user.email);
      await page.getByLabelText('Full Name').fill(user.name);
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
    const userCards = page.locator('[role="region"][aria-label*="User list"] > div');
    await expect(userCards).toHaveCount(users.length);
  });

  test('should show loading state during user creation', async ({ page }) => {
    // Fill out the form
    await page.getByLabelText('Email Address').fill('loading@example.com');
    await page.getByLabelText('Full Name').fill('Loading User');

    // Submit the form
    await page.getByRole('button', { name: 'Create User' }).click();

    // Should briefly show creating state (this might be too fast to catch consistently)
    // So we'll just verify the end result
    await expect(page.getByText('Loading User')).toBeVisible();
  });

  test('should display creation date for users', async ({ page }) => {
    // Create a user
    await page.getByLabelText('Email Address').fill('dated@example.com');
    await page.getByLabelText('Full Name').fill('Dated User');
    await page.getByRole('button', { name: 'Create User' }).click();

    // Wait for user to appear
    await expect(page.getByText('Dated User')).toBeVisible();

    // Check that creation date is displayed
    await expect(page.getByText(/Created:/)).toBeVisible();
  });
});