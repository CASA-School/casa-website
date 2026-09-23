import { expect, test } from '@playwright/test';

test('homepage reel starts with a lesson, advances, and stops automatic rotation after choosing a photo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const reel = page.getByRole('region', { name: 'Einblicke in CASA' });
  await expect(reel.getByRole('img')).toHaveAttribute('alt', 'Eine Lehrerin hält lachend ein Arbeitsblatt hoch, an der Tafel stehen die Wechselpräpositionen');
  await expect(reel.getByRole('button', { name: /^Bild 2:/ })).toHaveAttribute('aria-current', 'true', { timeout: 12_000 });
  await expect(reel.getByRole('button', { name: /Bildfolge pausieren|Bildfolge abspielen/ })).toHaveCount(0);
  // Let the dissolve finish before selecting a different scene.
  await page.waitForTimeout(1500);
  await reel.getByRole('button', { name: /^Bild 3:/ }).click();
  await page.mouse.move(0, 0);
  await expect(reel).toHaveAttribute('data-playing', 'false');
  await page.waitForTimeout(7000);
  await expect(reel.getByRole('button', { name: /^Bild 3:/ })).toHaveAttribute('aria-current', 'true');
  await reel.focus();
  await page.keyboard.press('Space');
  await expect(reel).toHaveAttribute('data-playing', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(reel.getByRole('button', { name: /^Bild 4:/ })).toHaveAttribute('aria-current', 'true');
  await expect(reel.getByRole('img')).toHaveCount(1);
});

test('mobile reduced-motion reel stays still and supports every image through keyboard controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en');
  const reel = page.getByRole('region', { name: 'A glimpse of CASA' });
  const first = reel.getByRole('button', { name: /^Photo 1:/ });
  await expect(first).toHaveAttribute('aria-current', 'true');
  await expect(reel.getByRole('button', { name: /Play the photo reel|Pause the photo reel/ })).toHaveCount(0);
  await page.waitForTimeout(7000);
  await expect(first).toHaveAttribute('aria-current', 'true');
  const before = await reel.boundingBox();
  await first.focus();
  for (const number of [2, 3, 4, 1]) {
    await page.keyboard.press('ArrowRight');
    await expect(reel.getByRole('button', { name: new RegExp(`^Photo ${number}:`) })).toHaveAttribute('aria-current', 'true');
    await expect(reel.getByRole('img')).toHaveCount(1);
    const height = (await reel.boundingBox())!.height;
    expect(Math.abs(height - before!.height)).toBeLessThan(1);
    await expect(reel.getByRole('img')).toHaveJSProperty('complete', true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
