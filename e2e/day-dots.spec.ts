import { test, expect, type Page } from '@playwright/test'

// Day-dot / route smoke test (outbound-p1-fe-06 — the app's signature
// visual, BRIEF §7.3). Runs on both the desktop-chrome and mobile-chrome
// Playwright projects (playwright.config.ts). Mirrors markers.spec.ts /
// park-detail.spec.ts's settle-then-select convention.

async function gotoSettled(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

/**
 * Selects a SPECIFIC destination by id, bypassing Playwright's actionability
 * pipeline (`dispatchEvent`, same production-onClick-exercising technique
 * markers.spec.ts / park-detail.spec.ts already established) — unlike those
 * specs' "first on-screen candidate" search, this task's receipts require
 * asserting an EXACT known drive-day/stay-day count (a genuine 2-day drive:
 * Glacier NP, `glac`, ~14.1h from Fort Collins; the ceiling case: Denali,
 * `dena`, ~47.8h -> 5 days), so the target must be deterministic rather
 * than "whichever marker happens to be on-screen first."
 */
async function selectMarkerById(page: Page, parkId: string): Promise<void> {
  const marker = page.locator(`[data-testid="park-marker"][data-park-id="${parkId}"]`)
  await expect(marker).toHaveCount(1)
  await marker.dispatchEvent('click')
}

async function waitForRouteSettled(page: Page, parkId: string): Promise<void> {
  await page.waitForFunction((id) => document.body.dataset['routeTraceSettled'] === id, parkId)
}

test('selecting a genuine 2-day drive (Glacier) renders exactly ceil(hours/10) drive dots, the correct stay-dot count, and the paired count label', async ({
  page,
}) => {
  await gotoSettled(page)
  await selectMarkerById(page, 'glac')
  await waitForRouteSettled(page, 'glac')

  // Side effect (route trace settle flag, awaited above) PAIRED with
  // DOM-presence assertions on the actual rendered dots — not a
  // side-effect-only proxy.
  await expect(page.locator('[data-testid="route-drive-dot"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="route-stay-dots"] [data-testid="dot"]')).toHaveCount(4)
  await expect(page.getByTestId('route-drive-day-count')).toHaveText('2 driving days')
  // Individual dots, not the pill fallback, at this (well-under-5) count.
  await expect(page.getByTestId('route-drive-pill')).toHaveCount(0)
})

test('the >5-day pill boundary is respected: the longest real FoCo leg (Denali, 5 days) still renders individual dots, never the pill', async ({
  page,
}) => {
  await gotoSettled(page)
  await selectMarkerById(page, 'dena')
  await waitForRouteSettled(page, 'dena')

  // The committed drive-matrix's longest FoCo-anchored leg tops out at
  // exactly 5 days (the >5 ceiling itself) — no real destination can drive
  // the pill branch today. That branch is proven separately with a
  // synthetic value in route-and-dots-layer.test.ts (shouldCollapseToPill).
  await expect(page.locator('[data-testid="route-drive-dot"]')).toHaveCount(5)
  await expect(page.getByTestId('route-drive-pill')).toHaveCount(0)
  await expect(page.getByTestId('route-drive-day-count')).toHaveText('5 driving days')
})

test('selecting a not-drivable destination renders no route or day-dots', async ({ page }) => {
  await gotoSettled(page)
  const notDrivable = page.locator('[data-testid="park-marker"][data-drivable="false"]').first()
  await notDrivable.dispatchEvent('click')

  await expect(page.locator('[data-testid="route-drive-dot"]')).toHaveCount(0)
  await expect(page.locator('[data-testid="route-stay-dots"]')).toHaveCount(0)
  await expect(page.getByTestId('route-drive-pill')).toHaveCount(0)
})

test('reduced motion: dot counts are legible immediately, without waiting for the route-trace animation', async ({
  page,
}) => {
  // Does NOT use `gotoSettled()` here: that helper waits on map-canvas.tsx's
  // (fe-02b, out of this task's scope) `flytoSettled` globe-intro settle
  // flag, which this sandbox's Playwright `reducedMotion: 'reduce'`
  // emulation never actually flips (a pre-existing fe-02b behavior,
  // reproduced in isolation and documented in this task's ui_packet — not
  // fixed here per this task's file boundary). Waiting for the target
  // marker to exist is sufficient and decouples this test from that flag:
  // `selectMarkerById` uses `dispatchEvent`, which does not require the
  // marker to be on-screen/settled.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await selectMarkerById(page, 'glac')

  // No explicit animation-duration wait — DESIGN.md Constitution: counts
  // must never depend on the animation actually playing. Playwright's
  // auto-retrying assertions still apply, but reduced-motion collapses the
  // 900ms trace to ~1ms, so this is effectively an immediate check.
  await expect(page.locator('[data-testid="route-drive-dot"]')).toHaveCount(2)
  await expect(page.locator('[data-testid="route-stay-dots"] [data-testid="dot"]')).toHaveCount(4)
  await waitForRouteSettled(page, 'glac')
})

test.describe('dot legend', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop persistent legend')

  test('persistent legend is visible bottom-left with drive + stay entries', async ({ page }) => {
    await gotoSettled(page)
    const legend = page.getByTestId('dot-legend')
    await expect(legend).toBeVisible()
    await expect(legend.getByTestId('dot-legend-entry-drive')).toBeVisible()
    await expect(legend.getByTestId('dot-legend-entry-stay')).toBeVisible()
  })
})

test.describe('dot legend (mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile tap-to-reveal chip')

  test('collapses to a chip that reveals the legend on tap', async ({ page }) => {
    await gotoSettled(page)
    await expect(page.getByTestId('dot-legend')).toBeHidden()
    const chip = page.getByTestId('dot-legend-chip')
    await expect(chip).toBeVisible()
    await expect(chip).toHaveAttribute('aria-expanded', 'false')

    await chip.click()
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
    const panel = page.getByTestId('dot-legend-mobile-panel')
    await expect(panel.getByTestId('dot-legend-entry-drive')).toBeVisible()
    await expect(panel.getByTestId('dot-legend-entry-stay')).toBeVisible()
  })
})
