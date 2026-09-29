import { expect, test, type Page } from '@playwright/test';
import { mockApi, openNav, PASSWORD, signedIn } from './support/mock-api.ts';

async function signOut(page: Page) {
  await page.getByTestId('user-menu').click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
}

async function fillLogin(page: Page, email: string, password = PASSWORD) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('Authentication', () => {
  test('register → verify → login → logout', async ({ page }) => {
    const api = await mockApi(page);
    const email = 'new.learner@example.com';

    // Register
    await page.goto('/auth/register');
    await page.getByLabel('Display name').fill('New Learner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByTestId('register-sent')).toContainText(email);

    // Not verified yet: login is refused with a way to resend the link.
    await page.goto('/auth/login');
    await fillLogin(page, email);
    await expect(page.getByTestId('login-unverified')).toBeVisible();

    // Verify via the link from the email.
    const tokenHash = api.signupLinkFor(email)!;
    await page.goto(`/auth/verify?token_hash=${tokenHash}&type=email`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByTestId('user-menu')).toContainText('NL');

    // Logout, then protected pages send you to login.
    await signOut(page);
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fprofile$/);

    // Login returns to the page you asked for.
    await fillLogin(page, email);
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByTestId('profile-email')).toHaveText(email);

    await signOut(page);
    // The session was revoked on the server, not just forgotten locally.
    expect(api.calls).toContainEqual({ method: 'POST', path: '/auth/logout' });
    await page.reload();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('shows a generic error for wrong credentials', async ({ page }) => {
    const api = await mockApi(page);
    api.addUser({ email: 'known@example.com' });
    await page.goto('/auth/login');

    await fillLogin(page, 'known@example.com', 'wrong-password');
    await expect(page.getByTestId('login-error')).toHaveText(
      'Email or password is incorrect.',
    );

    await fillLogin(page, 'unknown@example.com', 'wrong-password');
    await expect(page.getByTestId('login-error')).toHaveText(
      'Email or password is incorrect.',
    );
  });

  test('validates the forms before calling the API', async ({ page }) => {
    const api = await mockApi(page);

    await page.goto('/auth/register');
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter a display name.')).toBeVisible();
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
    expect(api.calls.filter((c) => c.path === '/auth/register')).toEqual([]);
  });

  test('keeps you signed in across a reload', async ({ page }) => {
    await signedIn(page);
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
  });

  test('sends you to login when the session is revoked elsewhere', async ({
    page,
  }) => {
    const { api } = await signedIn(page);
    await page.goto('/progress');
    await expect(page.getByTestId('user-menu')).toBeVisible();

    api.revokeAllSessions();
    await page.reload();

    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fprogress$/);
  });

  test('ignores redirects to other sites', async ({ page }) => {
    const api = await mockApi(page);
    api.addUser({ email: 'known@example.com' });

    await page.goto('/auth/login?redirect=//evil.example.com');
    await fillLogin(page, 'known@example.com');

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('signed-in users skip the login page', async ({ page }) => {
    await signedIn(page);
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('a bad verification link offers a new one', async ({ page }) => {
    await mockApi(page);
    await page.goto('/auth/verify?token_hash=used-or-expired&type=email');

    await expect(page.getByTestId('verify-failed')).toBeVisible();
    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByRole('button', { name: 'Send a new link' }).click();
    await expect(page.getByTestId('resend-sent')).toBeVisible();
  });

  test('forgot password → reset → login with the new password', async ({
    page,
  }) => {
    const api = await mockApi(page);
    const { email } = api.addUser({ email: 'forgetful@example.com' });

    await page.goto('/auth/login');
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByTestId('forgot-sent')).toContainText(email);

    const tokenHash = api.recoveryLinkFor(email)!;
    await page.goto(`/auth/reset-password?token_hash=${tokenHash}`);
    await page
      .getByLabel('New password', { exact: true })
      .fill('brand-new-pass');
    await page.getByLabel('Confirm new password').fill('different-pass');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();

    await page.getByLabel('Confirm new password').fill('brand-new-pass');
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByTestId('reset-done')).toBeVisible();

    await page.getByRole('button', { name: 'Sign in' }).click();
    await fillLogin(page, email, 'brand-new-pass');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('a used reset link asks for a new one', async ({ page }) => {
    await mockApi(page);
    await page.goto('/auth/reset-password?token_hash=already-used');
    await page
      .getByLabel('New password', { exact: true })
      .fill('brand-new-pass');
    await page.getByLabel('Confirm new password').fill('brand-new-pass');
    await page.getByRole('button', { name: 'Set new password' }).click();

    await expect(page.getByTestId('reset-invalid')).toBeVisible();
  });
});

test.describe('Roles', () => {
  test('learners do not see admin and cannot open it', async ({ page }) => {
    await signedIn(page, { role: 'learner' });
    await page.goto('/dashboard');

    await openNav(page);
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    await page.goto('/admin/courses');
    await expect(page.getByTestId('bug-report')).toContainText('No access');
  });

  test('admins see and open the admin area', async ({ page }) => {
    await signedIn(page, { role: 'admin' });
    await page.goto('/dashboard');

    await openNav(page);
    await page.getByRole('link', { name: 'Admin', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
  });
});

test.describe('Profile', () => {
  test('edits the profile', async ({ page }) => {
    const { user } = await signedIn(page);
    await page.goto('/profile');

    await expect(page.getByTestId('profile-role')).toHaveAttribute(
      'data-state',
      'learner',
    );
    await page.getByLabel('Display name').fill('Minh T.');
    await page.getByLabel('Experience level').click();
    await page.getByTitle('Working QA/QC').click();
    await page.getByLabel('Learning goals').fill('Write clear bug reports');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Save profile' }).click();

    await expect(page.getByText('Profile saved.')).toBeVisible();
    expect(user).toMatchObject({
      displayName: 'Minh T.',
      experienceLevel: 'working_qa',
      learningGoals: ['Write clear bug reports'],
    });
    await expect(page.getByTestId('user-menu')).toContainText('MT');
  });

  test('change password checks the current password', async ({ page }) => {
    const { user } = await signedIn(page);
    await page.goto('/profile');

    await page.getByLabel('Current password').fill('wrong-password');
    await page
      .getByLabel('New password', { exact: true })
      .fill('brand-new-pass');
    await page.getByLabel('Confirm new password').fill('brand-new-pass');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(
      page.getByText('The current password is incorrect.'),
    ).toBeVisible();

    await page.getByLabel('Current password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed.')).toBeVisible();
    expect(user.password).toBe('brand-new-pass');
  });
});
