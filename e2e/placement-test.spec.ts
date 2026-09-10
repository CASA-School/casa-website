import { expect, test, type Page } from '@playwright/test';

/**
 * The placement test, end to end through the browser.
 *
 * Deliberately does NOT assert which band a learner is placed in. Cut scores are
 * pilot hypotheses that will move (see src/config/placement/policy.ts), and a
 * spec that pinned a band would fail on every calibration change while proving
 * nothing about the flow. What is asserted is what must never break: a learner
 * can get from the landing page to a result, one item at a time, without ever
 * being asked to name their own level — and no answer key reaches the page.
 *
 * Targets `data-casa-placement` hooks rather than utility classes, so a styling
 * change cannot fail the suite and a structural change does.
 *
 * The choice controls are visually-hidden native inputs inside styled labels
 * (deliberate — see placement-ui.ts), so every interaction here clicks the
 * *label*, which is what a person does.
 *
 * Runs in whichever runtime mode the dev server is in. Nothing depends on a
 * database being reachable: the attempt works in fallback mode too, which is the
 * parity CLAUDE.md requires.
 */

async function startAttempt(page: Page, priorLearning = 'some_courses') {
  await page.goto('/en/placement-test/test');

  const pick = (question: string, value: string) =>
    page
      .locator(
        `[data-casa-placement="intake-option"][data-casa-intake-question="${question}"][data-casa-option-key="${value}"]`
      )
      .click();

  await pick('priorLearning', priorLearning);
  await pick('goal', 'work');
  await pick('lastContact', 'recent');

  await page.getByRole('button', { name: /start the test|see my result/i }).click();
}

/**
 * Answers whatever item is on screen, then clicks Next.
 *
 * Every response type is handled because which one comes up is adaptive — a spec
 * that only knew how to click radio buttons would pass or fail depending on
 * where the router happened to land.
 */
/**
 * Waits until the runner has settled on one of its three real states.
 *
 * "Settled" for an item means *interactive*, not merely present. While an answer
 * saves, the runner keeps the answered item on screen with its controls disabled
 * so a double tap cannot post twice — and a poll that accepted a present-but-
 * disabled item would hand back an item that is about to be replaced, then wait
 * forever for it to become clickable. That was a real flake, not a hypothetical:
 * it fired on the last item of the final module, every time.
 */
async function waitForSettledState(page: Page): Promise<'item' | 'writing' | 'result'> {
  let settled: 'item' | 'writing' | 'result' | 'transition' = 'transition';

  await expect
    .poll(
      async () => {
        if (page.url().includes('/result/')) {
          settled = 'result';
        } else if (await page.getByText(/one short piece of writing/i).count()) {
          settled = 'writing';
        } else {
          const control = page
            .locator('[data-casa-placement="item"]')
            .locator('input, [data-slot="select-trigger"], button')
            .first();
          settled = (await control.count()) && (await control.isEnabled()) ? 'item' : 'transition';
        }
        return settled;
      },
      // Generous: this runs against `next dev`, where the first hit on an API
      // route pays for compiling it.
      { timeout: 30_000 }
    )
    .not.toBe('transition');

  return settled as 'item' | 'writing' | 'result';
}

/** Answers the item on screen. Call `waitForSettledState` first. */
async function answerCurrentItem(page: Page) {
  const article = page.locator('[data-casa-placement="item"]');
  const type = await article.getAttribute('data-casa-item-type');

  switch (type) {
    case 'order_tokens': {
      // Place chunks in whatever order they are shown; correctness is the
      // engine's business, not this spec's.
      const tokens = page.locator('[data-casa-placement="token"]');
      for (let guard = 0; guard < 8; guard += 1) {
        if ((await tokens.count()) === 0) break;
        await tokens.first().click();
      }
      break;
    }

    case 'inline_cloze':
    case 'matching': {
      const selects = page.locator('[data-slot="select-trigger"]');
      const count = await selects.count();
      for (let index = 0; index < count; index += 1) {
        await selects.nth(index).click();
        await page.getByRole('option').first().click();
      }
      break;
    }

    case 'short_text':
      await page.locator('[data-casa-placement="typed-answer"]').fill('lernen');
      break;

    case 'multiple_choice': {
      // These items key exactly two options, and the UI enforces it.
      const options = page.locator('[data-casa-placement="option"]');
      await options.nth(0).click();
      await options.nth(1).click();
      break;
    }

    default:
      await page.locator('[data-casa-placement="option"]').first().click();
  }

  const next = page.getByRole('button', { name: /^Next/ });
  await expect(next).toBeEnabled();
  await next.click();
}

test('the landing page offers one way in and no level self-diagnosis', async ({ page }) => {
  await page.goto('/en/placement-test');

  await expect(page.getByRole('link', { name: /start the (placement )?test/i }).first()).toBeVisible();
  await expect(page.getByText(/about 15–30 minutes/i).first()).toBeVisible();

  // The retired Klett link panel must not come back: it asked the learner to
  // pick a level in order to discover their level.
  await expect(page.getByText(/klett placement tests/i)).toHaveCount(0);
  await expect(page.locator('a[href*="einstufungstests.klett-sprachen.de"]')).toHaveCount(0);
});

test('a true beginner is placed without sitting a single item', async ({ page }) => {
  await startAttempt(page, 'none');

  await expect(page).toHaveURL(/\/placement-test\/result\//, { timeout: 20_000 });
  await expect(page.getByText('A1.1').first()).toBeVisible();

  // Never a certificate, never pass/fail — v1 policy, not a copy preference.
  await expect(page.getByText(/not a certificate/i)).toBeVisible();
  await expect(page.getByText(/\byou (passed|failed)\b/i)).toHaveCount(0);
});

test('the test runs one item at a time and names the phase, not a total', async ({ page }) => {
  await startAttempt(page);

  const counter = page.getByText(/question \d+ of \d+/i);
  await expect(counter).toBeVisible({ timeout: 20_000 });

  // Exactly one item on screen.
  await expect(page.locator('[data-casa-placement="item"]')).toHaveCount(1);

  // The rail names the CURRENT phase and counts within it. It must not claim an
  // overall total, because the attempt length is not knowable until routing
  // resolves — and it deliberately does not list the other phase names as text
  // either: on a 375px phone that wrapped to two lines and cost ~150px of a
  // 667px viewport. The remaining phases are segments of the progress bar.
  await expect(page.getByText(/first impression/i)).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText(/\d+ (questions?|of)/i).first()).toBeVisible();

  // The running test is an app surface: no site navbar, no footer, and the
  // answer button is pinned rather than in the scrolling content.
  await expect(page.locator('nav[aria-label="Main navigation"]')).toHaveCount(0);
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('[data-casa-placement="action-bar"]')).toBeVisible();

  // Only the shell's content region scrolls; the document itself does not.
  const documentScrolls = await page.evaluate(
    () => document.documentElement.scrollHeight > document.documentElement.clientHeight + 1
  );
  expect(documentScrolls).toBe(false);

  const first = await counter.innerText();
  expect(await waitForSettledState(page)).toBe('item');
  await answerCurrentItem(page);
  await expect(counter).not.toHaveText(first, { timeout: 15_000 });

  // Forward only, by design: revising an earlier answer after seeing later items
  // would break what the router routed on.
  await expect(page.getByRole('button', { name: /^(back|previous)$/i })).toHaveCount(0);
});

test('the private attempt link resumes at the next unanswered question', async ({ page }) => {
  await startAttempt(page);
  expect(await waitForSettledState(page)).toBe('item');
  await expect(page).toHaveURL(/\/placement-test\/test\?attempt=[a-f0-9]{40}$/);

  await answerCurrentItem(page);
  expect(await waitForSettledState(page)).toBe('item');
  const counter = page.getByText(/question \d+ of \d+/i);
  const beforeReload = await counter.innerText();

  await page.reload();
  expect(await waitForSettledState(page)).toBe('item');
  await expect(counter).toHaveText(beforeReload);
  await expect(page.getByRole('heading', { name: /three quick questions/i })).toHaveCount(0);
});

test('a keyboard user gets a visible focus indicator on the answer options', async ({ page }) => {
  await startAttempt(page);
  expect(await waitForSettledState(page)).toBe('item');

  /*
    Regression guard for a real accessibility bug.

    The answer options are visually-hidden native inputs inside styled labels, so
    the focus indicator sits on the label. It was invisible: the card carried
    `transition-all`, `outline-width` is animatable, and so the outline eased in
    over 200ms — long enough that a keyboard user tabbing at speed never saw it.

    The fix scoped the transition to colour and shadow. This asserts the outline
    is present, non-zero, and not transparent at the moment focus lands.
  */
  // Seek rather than assume a Tab count: focus starts on the item's
  // screen-reader heading, and a radio group is a single tab stop, so the number
  // of presses depends on the item type.
  const read = () =>
    page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      const label = active?.closest('[data-casa-placement="option"]') as HTMLElement | null;
      if (!label) return null;
      const style = getComputedStyle(label);
      return {
        focusVisible: active?.matches(':focus-visible') ?? false,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
      };
    });

  let focus = await read();
  for (let press = 0; press < 6 && focus === null; press += 1) {
    await page.keyboard.press('Tab');
    focus = await read();
  }

  const seen = JSON.stringify(focus);
  expect(focus?.focusVisible, seen).toBe(true);
  expect(focus?.outlineStyle, seen).not.toBe('none');
  // A transparent or zero-width outline is the failure mode this test exists for.
  expect(focus?.outlineWidth, seen).not.toBe('0px');
  expect(focus?.outlineColor, seen).not.toMatch(/\/\s*0\)|rgba\([^)]*,\s*0\)/);
});

test('no answer key or transcript reaches the page', async ({ page }) => {
  await startAttempt(page);
  await expect(page.getByText(/question \d+ of \d+/i)).toBeVisible({ timeout: 20_000 });

  // The sanitiser is unit-tested; this proves the assembled page agrees with it.
  for (let index = 0; index < 4; index += 1) {
    expect(await waitForSettledState(page)).toBe('item');

    const html = await page.content();
    for (const forbidden of ['optionKey', 'recordingDirection', 'transcript']) {
      expect(html, `page leaked "${forbidden}" on item ${index + 1}`).not.toContain(forbidden);
    }
    await answerCurrentItem(page);
  }
});

test('a completed attempt reaches a result that a teacher still confirms', async ({ page }) => {
  test.slow();
  await startAttempt(page);
  await expect(page.getByText(/question \d+ of \d+/i)).toBeVisible({ timeout: 20_000 });

  // 16–28 objective items while listening is gated off; the cap is generous so a
  // change to module composition does not fail this test.
  for (let index = 0; index < 40; index += 1) {
    const state = await waitForSettledState(page);
    if (state !== 'item') break;
    await answerCurrentItem(page);
  }

  // Writing is optional by design, and skipping is itself a path worth covering.
  const skip = page.getByRole('button', { name: /skip writing/i });
  if (await skip.count()) await skip.click();

  await expect(page).toHaveURL(/\/placement-test\/result\//, { timeout: 25_000 });

  await expect(page.getByText(/not a certificate/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /where this leads/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /register for a course/i })).toBeVisible();

  // The detail is folded away rather than absent.
  const details = page.locator('details');
  await expect(details).toHaveCount(1);
  await details.locator('summary').click();
  await expect(page.getByText(/grammar and structures/i)).toBeVisible();
});

test('an unknown result token is a 404, not a blank page', async ({ page }) => {
  // The token is the only protection on a page that states a language level.
  const response = await page.goto('/en/placement-test/result/0000000000000000000000000000000000000000');
  expect(response?.status()).toBe(404);
});

test('registration links straight to the test instead of naming the navigation', async ({ page }) => {
  await page.goto('/en/registration/course');

  // The level field is conditional on the selected course type, so this only
  // asserts the link when the field is on screen.
  const hint = page.getByRole('link', { name: /take the placement test/i });
  if (await hint.count()) {
    await expect(hint).toHaveAttribute('href', '/en/placement-test/test');
  }
});
