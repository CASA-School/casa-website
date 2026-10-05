import { expect, test } from '@playwright/test';

/*
 * The course registration's choices (2026-10-05): a whole level, a learning
 * path built from one click, and an exam booked with the courses. Read from the
 * running catalogue, so it asserts shapes and wording, not dates.
 */
test('the intensive course books a whole level and a learning path from one choice', async ({ page }) => {
  await page.goto('/anmeldung/anmeldeformular');
  await page.locator('label', { has: page.locator('input[name="course-0-type"]') }).filter({ hasText: 'Intensivkurse' }).click();

  await page.locator('#course-0-level').click();
  await page.getByRole('option', { name: /^A1 komplett \(A1\.1 \+ A1\.2\) · 8 Wochen$/ }).click();
  await expect(page.getByText('8 Wochen (komplettes Niveau)')).toBeVisible();

  const pathChoices = page.locator('label', { has: page.locator('input[name="course-0-path"]') });
  await expect(pathChoices.first()).toHaveText('Nur A1');
  await pathChoices.filter({ hasText: 'bis B1' }).click();

  const path = page.getByText('Ihr Lernweg', { exact: false });
  await expect(path).toBeVisible();
  await expect(page.getByText('3 Niveaus · 24 Wochen')).toBeVisible();
  for (const level of ['A1 komplett (A1.1 + A1.2)', 'A2 komplett (A2.1 + A2.2)', 'B1 komplett (B1.1 + B1.2)']) {
    await expect(page.getByText(level, { exact: true })).toBeVisible();
  }
});

test('an exam can be booked with the courses and is then asked for before step 2', async ({ page }) => {
  await page.goto('/anmeldung/anmeldeformular');
  const examToggle = page.locator('#exam-enabled');
  test.skip(!(await examToggle.count()), 'No exam session is open for registration right now.');
  await examToggle.click();
  await expect(page.locator('input[name="exam-type"]').first()).toBeChecked();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expect(page.locator('#exam-registration-type-error')).toHaveText('Bitte wählen Sie eine Anmeldeart aus.');
});
