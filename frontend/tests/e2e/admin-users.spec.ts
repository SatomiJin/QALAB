import { expect, test, type Page } from '@playwright/test';
import { openNav, PASSWORD, signedIn } from './support/mock-api.ts';

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  const dropdown = page.locator(
    '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  );
  await dropdown.getByTitle(option, { exact: true }).click();
  await expect(dropdown).toHaveCount(0);
}

const userIds = (page: Page) =>
  page
    .getByTestId('admin-user')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-user-id')));

// No popup animations: an option clicked mid-animation can be missed.
test.use({ reducedMotion: 'reduce' });

test.describe('Admin users', () => {
  test('lists users with search and filters in the URL', async ({ page }) => {
    const { api, user: admin } = await signedIn(page, { role: 'admin' });
    const ana = api.addUser({
      email: 'ana@example.com',
      displayName: 'Ana Pham',
      createdAt: '2026-09-20T08:00:00.000Z',
    });
    const bob = api.addUser({
      email: 'bob@example.com',
      displayName: 'Bob Le',
      verified: false,
      createdAt: '2026-09-10T08:00:00.000Z',
    });

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Users');
    await expect(page.getByTestId('admin-user')).toHaveCount(3);
    await expect(
      page.locator(`[data-user-id="${bob.id}"] [data-account-status]`),
    ).toHaveAttribute('data-account-status', 'unverified');

    await page.getByRole('searchbox', { name: 'Search users' }).fill('ANA');
    await page.getByRole('searchbox', { name: 'Search users' }).press('Enter');
    await expect(page).toHaveURL(/\?q=ANA$/);
    expect(await userIds(page)).toEqual([ana.id]);

    await page.getByRole('searchbox', { name: 'Search users' }).fill('');
    await page.getByRole('searchbox', { name: 'Search users' }).press('Enter');
    await expect(page).toHaveURL(/\/admin\/users$/);
    await choose(page, 'Filter by role', 'Admin');
    expect(await userIds(page)).toEqual([admin.id]);

    await choose(page, 'Filter by role', 'All roles');
    await choose(page, 'Filter by status', 'Disabled');
    await expect(page.getByTestId('users-empty')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByTestId('admin-user')).toHaveCount(3);

    // The nav marks Users.
    await openNav(page);
    await expect(
      page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Users', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('promotes a learner to admin after confirming, with history', async ({
    page,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana' });

    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'Ana', exact: true }).click();
    await expect(page).toHaveURL(`/admin/users/${ana.id}`);
    await expect(page.getByTestId('audit-empty')).toBeVisible();
    await expect(page.getByTestId('attempts-empty')).toBeVisible();

    await expect(page.getByTestId('change-role')).toBeDisabled();
    await choose(page, 'Role', 'Admin');
    await page.getByTestId('change-role').click();
    await expect(page.getByRole('dialog')).toContainText('Make Ana an admin?');
    await page.getByTestId('confirm-role').click();

    await expect(page.getByTestId('user-status')).toContainText('Admin');
    await expect(page.getByTestId('audit-entry')).toHaveText(
      /Role changed from Learner to Admin/,
    );
    expect(ana.role).toBe('admin');
    // An admin cannot be disabled: demote first.
    await expect(page.getByTestId('disable-user')).toBeDisabled();
  });

  test('disables and enables an account; a disabled user cannot sign in', async ({
    page,
    browser,
  }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana' });

    await page.goto(`/admin/users/${ana.id}`);
    await page.getByTestId('disable-user').click();
    await expect(page.getByRole('dialog')).toContainText('Disable Ana?');
    await page.getByTestId('confirm-disable').click();

    await expect(
      page.getByTestId('user-status').locator('[data-account-status]'),
    ).toHaveAttribute('data-account-status', 'disabled');
    expect(ana.disabled).toBe(true);
    // A disabled account cannot be made an admin.
    await page.getByRole('combobox', { name: 'Role', exact: true }).click();
    await expect(
      page.locator('.ant-select-item-option[title="Admin"]'),
    ).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');

    // Signing in as Ana now fails like a wrong password.
    const other = await browser.newPage();
    await api.install(other);
    await other.goto('/auth/login');
    await other.getByLabel('Email').fill('ana@example.com');
    await other.getByLabel('Password').fill(PASSWORD);
    await other.getByRole('button', { name: 'Sign in' }).click();
    await expect(other.getByTestId('login-error')).toBeVisible();
    await other.close();

    await page.getByTestId('enable-user').click();
    await expect(
      page.getByTestId('user-status').locator('[data-account-status]'),
    ).toHaveAttribute('data-account-status', 'active');
    await expect(page.getByTestId('audit-entry')).toHaveCount(2);
    await expect(page.getByTestId('audit-entry').first()).toHaveAttribute(
      'data-action',
      'enabled',
    );
  });

  test('offers no actions on your own account', async ({ page }) => {
    const { user } = await signedIn(page, { role: 'admin' });
    await page.goto(`/admin/users/${user.id}`);
    await expect(page.getByTestId('manage-self')).toBeVisible();
    await expect(page.getByTestId('role-select')).toHaveCount(0);
    await expect(page.getByTestId('disable-user')).toHaveCount(0);
  });

  test('shows a server refusal and keeps the old role', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    const ana = api.addUser({ email: 'ana@example.com', displayName: 'Ana' });
    await page.goto(`/admin/users/${ana.id}`);
    await expect(page.getByTestId('change-role')).toBeVisible();

    // Another admin disabled Ana meanwhile: the API refuses the promotion.
    ana.disabled = true;
    await choose(page, 'Role', 'Admin');
    await page.getByTestId('change-role').click();
    await page.getByTestId('confirm-role').click();
    await expect(
      page.getByText('Enable the account before making it an admin'),
    ).toBeVisible();
    expect(ana.role).toBe('learner');
    await expect(page.getByTestId('change-role')).toBeDisabled();
  });

  test('error, not found and no access', async ({ page }) => {
    const { api } = await signedIn(page, { role: 'admin' });
    await page.goto('/admin/users');
    await expect(page.getByTestId('admin-user')).toHaveCount(1);
    api.accounts.failing = true;
    await page.reload();
    await expect(page.locator('[data-state="error"]')).toBeVisible({
      timeout: 15_000,
    });
    api.accounts.failing = false;

    await page.goto('/admin/users/user-unknown');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });

  test('a learner gets the no-access page', async ({ page }) => {
    await signedIn(page);
    await page.goto('/admin/users');
    await expect(page.getByTestId('bug-report')).toBeVisible();
  });
});
