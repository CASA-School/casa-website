import { expect, test } from '@playwright/test';

/**
 * The staff workspace, seen by someone who is not signed in.
 *
 * These are the assertions that must hold in BOTH runtime modes, because the
 * suite runs with and without `DATABASE_URL`:
 *
 *   - with a database, an anonymous request reaches the sign-in page;
 *   - without one, it reaches the "not connected" notice.
 *
 * Neither may ever be a queue. What is being guarded is not the redirect
 * itself but the consequence of losing it: `/admin/enquiries` renders the name,
 * email address and message of every person who has written to CASA, and
 * `/admin/applications/<id>/cv` streams a job applicant's CV.
 *
 * Verifying the signed-in screens end to end needs a database and a seeded
 * staff account, which CI does not have (`.github/workflows/quality.yml` does
 * not run e2e at all). Setup for that is in docs/ADMIN_WORKSPACE.md.
 */

/** Every path that renders somebody's personal data once you are inside. */
const GUARDED_PATHS = [
  '/admin',
  '/admin/enquiries',
  '/admin/registrations/course',
  '/admin/registrations/exam',
  '/admin/placement',
  '/admin/applications',
  '/admin/catalogue',
  '/admin/activity',
  '/admin/team',
  '/admin/settings',
];

/** Text that only ever appears once a request is authenticated. */
const SIGNED_IN_ONLY = [
  'Back to website',
  'Time-sensitive',
  'Who is dealing with this',
];

test.describe('workspace access', () => {
  for (const path of GUARDED_PATHS) {
    test(`${path} shows nothing to an anonymous visitor`, async ({ page }) => {
      await page.goto(path);

      const body = await page.locator('body').innerText();

      // One of the two legitimate destinations.
      const isSignIn = body.includes('Sign in');
      const isNotConnected = body.includes('The workspace has no database');
      expect(
        isSignIn || isNotConnected,
        `${path} rendered neither the sign-in page nor the not-connected notice`
      ).toBe(true);

      for (const marker of SIGNED_IN_ONLY) {
        expect(body, `${path} leaked "${marker}"`).not.toContain(marker);
      }
    });
  }

  test('the CV download refuses an anonymous request', async ({ request }) => {
    // A route handler is not a child of the workspace layout, so it does not
    // inherit the gate. This is the one endpoint where losing that check would
    // publish a stranger's CV to anyone who can guess a uuid.
    const response = await request.get(
      '/admin/applications/00000000-0000-0000-0000-000000000001/cv',
      { maxRedirects: 0 }
    );

    expect([302, 303, 307, 404]).toContain(response.status());

    if (response.status() !== 404) {
      expect(response.headers()['location']).toContain('/admin/sign-in');
    }

    // Whatever happens, it is not a file.
    expect(response.headers()['content-disposition']).toBeUndefined();
  });

  test('the sign-in page says one thing for every failure', async ({ page }) => {
    await page.goto('/admin/sign-in');

    const body = await page.locator('body').innerText();

    if (body.includes('The workspace has no database')) {
      test.skip(true, 'No DATABASE_URL — sign-in is not reachable in this mode.');
    }

    await page.getByLabel('Email').fill('nobody-here@casa-bremen.de');
    await page.locator('input[name="password"]').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Deliberately identical for an unknown address, a wrong password and a
    // deactivated account: distinguishing them turns this page into a way to
    // find out who works at CASA.
    await expect(
      page.getByText('That email and password do not match an active account.')
    ).toBeVisible();

    // And it must not have let anyone in.
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });

  test('the workspace is not linked from the public site', async ({ page }) => {
    // On admin.casa-bremen.de the workspace has its own hostname; the marketing
    // site must not advertise it. A link in the footer would also be the one
    // place a crawler could find it.
    await page.goto('/');
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
  });
});
