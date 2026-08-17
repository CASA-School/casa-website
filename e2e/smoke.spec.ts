import { expect, test } from '@playwright/test';

test('home renders Hero A and no top announcement bar', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('section[data-hero-archetype="A"]')).toBeVisible();

  // The h1 is CASA's Leitbild — "Miteinander reden - aufeinander zugehen" —
  // rendered in English here because e2e runs the default EN locale. Matching a
  // fragment rather than the full sentence, so a copy tweak does not fail the
  // test while a MISSING h1 still does.
  await expect(page.getByRole('heading', { level: 1, name: /move toward one another/i })).toBeVisible();
  await expect(page.getByText('Summer intensive courses are now open')).toHaveCount(0);
});

test('homepage decision cards guide visitors to in-page sections', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const decisionSection = page.locator('section[data-track-section="persona-pathways"]');
  await decisionSection
    .locator('[data-casa-persona="new-learners"]')
    .getByRole('link', { name: /choose this path/i })
    .click();
  await expect(page).toHaveURL(/\/placement-test\?persona=new-learners$/);

  const inPageChecks = [
    { persona: 'working-professionals', hash: '#course-evening-german', target: '#course-evening-german' },
    { persona: 'exam-candidates', hash: '#exam-preparation', target: '#exam-preparation' },
    { persona: 'housing-onboarding', hash: '#accommodation-support', target: '#accommodation-support' },
  ];

  for (const check of inPageChecks) {
    await page.goto('/');
    const card = decisionSection.locator(`[data-casa-persona="${check.persona}"]`);
    await card.getByRole('link', { name: /choose this path/i }).click();
    await expect(page).toHaveURL(new RegExp(`${check.hash}$`));

    const targetTop = await page.locator(check.target).evaluate((element) => Math.round(element.getBoundingClientRect().top));
    expect(targetTop).toBeGreaterThanOrEqual(70);
    expect(targetTop).toBeLessThan(844);
  }
});

test('desktop navbar dropdown is dynamic and courses panel stays inside project container', async ({ page }) => {
  await page.goto('/');

  const coursesTrigger = page.getByTestId('nav-trigger-courses');
  const accommodationTrigger = page.getByTestId('nav-trigger-accommodation');
  const examsTrigger = page.getByTestId('nav-trigger-exams');

  await expect(coursesTrigger).toBeVisible();
  await expect(accommodationTrigger).toBeVisible();
  await expect(examsTrigger).toBeVisible();

  await coursesTrigger.hover();
  const coursesPanel = page.getByTestId('nav-panel-courses');
  await expect(coursesPanel).toBeVisible();
  await expect(coursesPanel.getByText('Intensive German')).toBeVisible();

  // The nav row is the site frame itself. Selected by its data attribute rather
  // than by a utility class: width and centring live in the [data-casa-site-frame]
  // rule now, so `.mx-auto` is no longer in the class list.
  const navBounds = await page.locator('header > [data-casa-site-frame]').boundingBox();
  const panelBounds = await coursesPanel.boundingBox();
  expect(navBounds).not.toBeNull();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.x).toBeGreaterThanOrEqual(navBounds!.x);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(navBounds!.x + navBounds!.width);

  await examsTrigger.hover();
  await expect(page.getByTestId('nav-panel-exams').getByText('telc Deutsch B2')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(coursesPanel).not.toBeVisible();
  await expect(page.getByTestId('nav-panel-exams')).not.toBeVisible();
});

test('mobile nav language menu opens independently from the close control', async ({ page }) => {
  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const sheet = page.locator('[data-slot="sheet-content"]');
  await expect(sheet).toBeVisible();

  const localeTrigger = page.getByTestId('mobile-locale-trigger');
  await expect(localeTrigger).toBeVisible();
  await expect(page.getByTestId('mobile-locale-option-de')).toHaveCount(0);

  await localeTrigger.click();
  await expect(page.getByTestId('mobile-locale-option-de')).toBeVisible();
  await expect(sheet).toBeVisible();

  await page.getByTestId('mobile-locale-option-de').click();

  // Reopen mobile nav menu if it closed automatically during refresh/hydration
  if (await sheet.isHidden()) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(sheet).toBeVisible();
  }

  await expect(localeTrigger).toContainText(/de/i);
  await expect(page.getByTestId('mobile-locale-option-de')).toHaveCount(0);

  await page.getByLabel('Navigation schließen').click();
  await expect(sheet).not.toBeVisible();
});

test('hero archetypes map correctly across key public routes', async ({ page }) => {
  const expectations = [
    { route: '/', archetype: 'A' },
    { route: '/about', archetype: 'B' },
    { route: '/courses', archetype: 'B' },
    { route: '/courses/intensive-german', archetype: 'C' },
    { route: '/exams', archetype: 'C' },
    { route: '/exams/b2', archetype: 'C' },
    { route: '/accommodation', archetype: 'D' },
    { route: '/accommodation/flat', archetype: 'C' },
    { route: '/contact', archetype: 'E' },
    { route: '/imprint', archetype: 'E' },
  ];

  for (const item of expectations) {
    await page.goto(item.route);
    await expect(page.locator(`section[data-hero-archetype="${item.archetype}"]`).first()).toBeVisible();
  }
});

test('course quick chooser builds filtered URL params', async ({ page }) => {
  await page.goto('/courses');

  const chooser = page.getByTestId('course-finder-filter');
  await expect(chooser).toBeVisible();

  await chooser.getByRole('radio', { name: 'B2' }).click();
  await chooser.getByRole('radio', { name: 'Evening' }).click();
  await chooser.getByRole('radio', { name: 'Exam prep' }).click();

  await chooser.getByRole('link', { name: 'Filter courses' }).click();
  await expect(page).toHaveURL(/level=B2/);
  await expect(page).toHaveURL(/schedule=evening/);
  await expect(page).toHaveURL(/goal=exam/);
});

test('exam and accommodation detail routes render signature modules', async ({ page }) => {
  await page.goto('/exams/b2');
  await expect(page.getByTestId('exam-timeline')).toBeVisible();
  await expect(page.getByTestId('exam-what-to-bring')).toBeVisible();

  await page.goto('/accommodation/flat');
  await expect(page.getByRole('heading', { name: /neighborhood \+ arrival checklist/i })).toBeVisible();
});

test('legacy hash anchors still resolve on exams and accommodation indexes', async ({ page }) => {
  const targets = [
    { path: '/exams#b2', selector: '#b2' },
    { path: '/exams#c1', selector: '#c1' },
    { path: '/accommodation#flat', selector: '#flat' },
    { path: '/accommodation#host', selector: '#host' },
  ];

  for (const target of targets) {
    await page.goto(target.path);
    const section = page.locator(target.selector);
    await expect(section).toHaveCount(1);
    const top = await section.evaluate((element) => Math.abs(Math.round(element.getBoundingClientRect().top)));
    expect(top).toBeLessThan(260);
  }
});

test('legal and utility pages include breadcrumbs and professional shells', async ({ page }) => {
  const routes = ['/imprint', '/privacy', '/terms', '/contact', '/faq', '/placement-test'];

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('nav[aria-label="Breadcrumb"]').first()).toBeVisible();
    await expect(page.locator('section[data-hero-archetype="E"]').first()).toBeVisible();
  }
});

test('registration pages render main navbar without register CTA button', async ({ page }) => {
  const routes = ['/registration/course', '/registration/exam'];

  for (const route of routes) {
    await page.goto(route);
    // Main header/navbar should be visible. Scoped to the header that holds the
    // site nav — these pages also render a page-title <header> for their h1.
    await expect(page.locator('header:has(nav[aria-label="Main navigation"])')).toBeVisible();
    // The Register Now CTA button should not be present
    await expect(page.locator('a:has-text("Register Now"), a:has-text("Jetzt anmelden"), a:has-text("Register for Exam"), a:has-text("Zur Prüfung anmelden")')).toHaveCount(0);
    // The regular footer should not be present
    await expect(page.locator('footer')).toHaveCount(0);
  }
});
