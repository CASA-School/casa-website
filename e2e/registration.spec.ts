import { expect, test } from '@playwright/test';

/*
 * The course registration's choices (2026-10-05): a whole level, a learning
 * path built from one click on the level ladder, the start as one dropdown, the
 * group assigned by CASA, and an exam booked with the courses. Read from the running
 * catalogue, so it asserts shapes and wording, not dates.
 */
test('the intensive course books a whole level and a learning path from one choice', async ({ page }) => {
  await page.goto('/anmeldung/anmeldeformular');
  await page.locator('label', { has: page.locator('input[name="course-0-type"]') }).filter({ hasText: 'Intensivkurse' }).click();

  // Every start in one dropdown, no morning-or-afternoon switch: CASA assigns the group (2026-10-20).
  await expect(page.locator('input[name="course-0-option-slot"]')).toHaveCount(0);
  await expect(page.locator('#course-0-option')).toContainText('die Gruppe teilen wir dir zu');
  await expect(page.locator('#course-0-option-select')).toContainText(/\d{4}/);

  await page.locator('#course-0-level').click();
  await page.getByRole('option', { name: /^A1 komplett · 8 Wochen$/ }).click();
  const plan = page.locator('[aria-live="polite"]').filter({ hasText: 'Wochen' });
  await expect(plan).toContainText('8 Wochen');

  const ladder = page.locator('label', { has: page.locator('input[name="course-0-path"]') });
  await expect(ladder.first()).toHaveText('Nur A1');
  // B1+ is a rung of its own, between B1 and B2.
  await expect(ladder.filter({ has: page.locator('input[value="B1+"]') })).toHaveText('bis B1+');
  await ladder.filter({ has: page.locator('input[value="B1"]') }).click();

  await expect(plan).toContainText('Dein Lernweg');
  await expect(plan).toContainText('24 Wochen');
  await expect(plan.locator('ol > li')).toHaveCount(3);
  for (const [index, level] of ['A1', 'A2', 'B1'].entries()) {
    await expect(plan.locator('ol > li').nth(index)).toContainText(level);
  }
});

test('the C1 Hochschule page books its preparation course: the form opens on it, under its exam, without a level', async ({ page }) => {
  await page.goto('/pruefungszentrum/telc-deutsch-c1-hochschule');
  const dates = page.locator('section', { has: page.getByRole('heading', { name: 'Termine des Vorbereitungskurses' }) });
  test.skip(!(await dates.count()), 'No C1 Hochschule preparation is open for registration right now.');
  // Each course is said with the exam it leads to.
  await expect(dates.locator('[aria-live="polite"]')).toContainText('Prüfung am');
  await dates.getByRole('link', { name: 'Anmelden' }).click();

  await expect(page).toHaveURL(/\/anmeldung\/anmeldeformular\?courseId=/);
  await expect(page.locator('label', { has: page.locator('input[name="course-0-type"]:checked') })).toContainText('Prüfungsvorbereitung');
  await expect(page.locator('#course-0-option')).toContainText('telc Deutsch C1 Hochschule');
  await expect(page.locator('#course-0-level')).toHaveCount(0);

  // The exam the course leads to is offered with it, and ticked it is that exam on that day.
  const examLabel = page.locator('label[for="exam-enabled"]');
  await expect(examLabel).toContainText('nach deinem Vorbereitungskurs');
  await page.locator('#exam-enabled').click();
  await expect(page.locator('label', { has: page.locator('input[name="exam-type"]:checked') })).toContainText('telc Deutsch C1 Hochschule');
  const day = (await examLabel.innerText()).match(/am (\d+\. \S+ \d{4})/)?.[1];
  expect(day).toBeTruthy();
});

test('the exam form points to the preparation course that leads to the chosen C1 Hochschule day', async ({ page }) => {
  await page.goto('/anmeldung/anmeldung-zur-pruefung');
  await page.locator('label', { has: page.locator('input[name="exam-type"]') }).filter({ hasText: 'C1 Hochschule' }).click();
  const hint = page.getByText('Möchtest du dich vorbereiten?');
  // Some sittings have a course before them, some not (none has been planned, or it has begun): try them in turn.
  const sittings = page.locator('#exam-session-select');
  test.skip(!(await sittings.count()), 'No C1 Hochschule sitting is open for registration right now.');
  await sittings.click();
  const count = await page.getByRole('option').count();
  await page.keyboard.press('Escape');
  let found = await hint.count() > 0;
  for (let index = 0; index < count && !found; index += 1) {
    await sittings.click();
    await page.getByRole('option').nth(index).click();
    found = await hint.count() > 0;
  }
  test.skip(!found, 'No open C1 Hochschule sitting has a preparation course before it right now.');
  await hint.getByRole('link', { name: 'Zum Vorbereitungskurs' }).click();
  await expect(page).toHaveURL(/\/anmeldung\/anmeldeformular\?courseId=/);
  await expect(page.locator('#course-0-option')).toContainText('telc Deutsch C1 Hochschule');
});

test('an exam booked with the courses starts as the full exam on its first date', async ({ page }) => {
  await page.goto('/anmeldung/anmeldeformular');
  const examToggle = page.locator('#exam-enabled');
  test.skip(!(await examToggle.count()), 'No exam session is open for registration right now.');
  await examToggle.click();
  await expect(page.locator('input[name="exam-type"]').first()).toBeChecked();
  await expect(page.locator('#exam-session-select')).toContainText(/\d{4}/);
  await expect(page.locator('input[name="exam-registration-type"][value="full"]')).toBeChecked();
});
