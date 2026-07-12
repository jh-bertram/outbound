import { test, expect, type Page } from '@playwright/test'

// Itinerary-panel smoke test (outbound-p1-fe-08 — BRIEF §3.4/§4/§7.4). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects (playwright.config.ts). Mirrors
// trip-builder.spec.ts / day-dots.spec.ts's settle-then-select convention and its exact-id
// `dispatchEvent` selection helper (each existing spec keeps its own local copy rather than
// sharing a utils module — followed here too).
//
// Fixture chains, values read from the actually-committed src/data/drive-matrix.json +
// src/data/parks.json (not asserted values — measured from the shipped matrix, same
// discipline be-04's own §7.5 checks and trip-builder.spec.ts's fixtures use):
//   [arch, cany] (reuses trip-builder.spec.ts's own fixture, already proven to total 8 days):
//     FOCO->arch 5.48h->1d, arch stay 2d, arch->cany 0.99h->1d, cany stay 3d,
//     cany->FOCO 5.89h->1d. Total = 1+2+1+3+1 = 8 days. Nearest not-yet-chained park to cany
//     is Black Canyon (`blca`, 2.27h) -> appending it would add 2 days.
//   [dena] (the ONLY real FoCo-anchored leg >=3 days in the shipped matrix, RA/be-04 §7.5
//   ceiling case): FOCO->dena 47.81h->5d (>=3, warning), dena stay 3d, dena->FOCO 47.81h->5d
//   (>=3, warning — proves the flag applies to the return leg too). Total = 5+3+5 = 13 days.
//   Nearest not-yet-chained parks to dena are Wrangell-St. Elias (`wrst`, 3.35h, +4 days) and
//   Kenai Fjords (`kefj`, 5.04h, +3 days).

async function gotoSettled(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

/** Selects a SPECIFIC destination by id via `dispatchEvent` (bypasses Playwright's
 * actionability pipeline against the continuously-repainting map canvas — the same
 * production-onClick-exercising technique day-dots.spec.ts / trip-builder.spec.ts already
 * established), since this task's receipts require exact known drive-matrix figures. */
async function selectMarkerById(page: Page, parkId: string): Promise<void> {
  const marker = page.locator(`[data-testid="park-marker"][data-park-id="${parkId}"]`)
  await expect(marker).toHaveCount(1)
  await marker.dispatchEvent('click')
}

/** On mobile the trip panel starts collapsed to a tap-to-reveal chip (fe-07); on desktop
 * it's already docked and visible. No-op on desktop. */
async function openTripPanelIfMobile(page: Page, isMobile: boolean): Promise<void> {
  if (!isMobile) return
  const chip = page.getByTestId('trip-panel-mobile-chip')
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page.getByTestId('trip-panel-mobile-panel')).toBeVisible()
}

/** Builds the [arch, cany] chain via the real trip-panel UI (never the store directly). */
async function buildArchCanyChain(page: Page, isMobile: boolean): Promise<void> {
  await gotoSettled(page)
  await selectMarkerById(page, 'arch')
  await openTripPanelIfMobile(page, isMobile)
  await page.getByTestId('trip-panel-add-selected').click()
  await page.locator('[data-testid="trip-panel-suggestion"][data-park-id="cany"]').click()
}

/** Builds the single-destination [dena] chain (the >=3-day-leg warning fixture). */
async function buildDenaChain(page: Page, isMobile: boolean): Promise<void> {
  await gotoSettled(page)
  await selectMarkerById(page, 'dena')
  await openTripPanelIfMobile(page, isMobile)
  await page.getByTestId('trip-panel-add-selected').click()
}

/** Reveals the itinerary panel: on mobile it's a full-screen Sheet behind the FAB; on desktop
 * it's already a persistent docked panel. Returns the locator scoping subsequent assertions. */
async function openItinerary(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByTestId('itinerary-fab').click()
    const overlay = page.getByTestId('itinerary-mobile-overlay')
    await expect(overlay).toBeVisible()
    return overlay
  }
  const panel = page.getByTestId('itinerary-panel')
  await expect(panel).toBeVisible()
  return panel
}

test('a 2-destination chain lists every drive+stay day INCLUDING the explicit return leg to Fort Collins, with a correct grand total and an add-days suggestion', async ({
  page,
  isMobile,
}) => {
  await buildArchCanyChain(page, isMobile)
  const itinerary = await openItinerary(page, isMobile)

  await expect(itinerary.getByTestId('itinerary-total')).toHaveText('8 days total')

  const archDrive = itinerary.locator('[data-testid="itinerary-row"][data-row-type="drive"][data-to-id="arch"]')
  await expect(archDrive).toContainText('Drive to Arches National Park')
  await expect(archDrive).toContainText('(5.5 h)')

  const archStay = itinerary.locator('[data-testid="itinerary-row"][data-row-type="stay"][data-to-id="arch"]')
  await expect(archStay).toContainText('2 recommended days')

  const canyDrive = itinerary.locator('[data-testid="itinerary-row"][data-row-type="drive"][data-to-id="cany"]')
  await expect(canyDrive).toContainText('Drive to Canyonlands National Park')

  const canyStay = itinerary.locator('[data-testid="itinerary-row"][data-row-type="stay"][data-to-id="cany"]')
  await expect(canyStay).toContainText('3 recommended days')

  // The explicit RETURN leg row (receipt #1) — the itinerary must never stop at the last park.
  const returnLeg = itinerary.locator('[data-testid="itinerary-row"][data-to-id="FOCO"]')
  await expect(returnLeg).toHaveAttribute('data-is-return', 'true')
  await expect(returnLeg).toContainText('Return drive to Fort Collins')

  // Neither leg here is >=3 days — no warning flag anywhere in this chain.
  await expect(itinerary.getByTestId('itinerary-warning-flag')).toHaveCount(0)

  // "Would add N days" suggestion, reusing fe-07's nearby computation (receipt #2).
  const blcaSuggestion = itinerary.locator('[data-testid="itinerary-add-days-suggestion"][data-park-id="blca"]')
  await expect(blcaSuggestion).toBeVisible()
  await expect(blcaSuggestion).toContainText('+2 days')

  // Rendered-but-invisible guard (Shadcn primitive + custom palette collision class of bug):
  // confirm the total figure is actually legible, not just present in the DOM.
  const totalStyles = await itinerary.getByTestId('itinerary-total').evaluate((el) => {
    const cs = getComputedStyle(el)
    const bg = getComputedStyle(el.closest('[data-slot="card"], [data-slot="sheet-content"]') ?? el).backgroundColor
    return { color: cs.color, bg }
  })
  expect(totalStyles.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(totalStyles.color).not.toBe(totalStyles.bg)
})

test('a >=3-day drive leg is flagged with the warning token on BOTH the outbound and return legs, and the grand total accounts for it', async ({
  page,
  isMobile,
}) => {
  await buildDenaChain(page, isMobile)
  const itinerary = await openItinerary(page, isMobile)

  await expect(itinerary.getByTestId('itinerary-total')).toHaveText('13 days total')

  const outboundLeg = itinerary.locator('[data-testid="itinerary-row"][data-row-type="drive"][data-to-id="dena"]')
  await expect(outboundLeg.getByTestId('itinerary-warning-flag')).toBeVisible()

  const returnLeg = itinerary.locator('[data-testid="itinerary-row"][data-to-id="FOCO"]')
  await expect(returnLeg).toHaveAttribute('data-is-return', 'true')
  await expect(returnLeg.getByTestId('itinerary-warning-flag')).toBeVisible()

  // Warning color actually applied (token, not just an icon) — computed style check per the
  // house Chart.js/rendered-but-invisible discipline extended to any color-conveys-meaning UI.
  const warningColor = await outboundLeg.getByTestId('itinerary-warning-flag').evaluate((el) => getComputedStyle(el).color)
  expect(warningColor).toBe('rgb(143, 90, 15)') // --color-warning: #8f5a0f

  // Two nearby "would add N days" suggestions from the shared fe-07 computation.
  await expect(
    itinerary.locator('[data-testid="itinerary-add-days-suggestion"][data-park-id="wrst"]'),
  ).toContainText('+4 days')
  await expect(
    itinerary.locator('[data-testid="itinerary-add-days-suggestion"][data-park-id="kefj"]'),
  ).toContainText('+3 days')
})

test.describe('mobile full-screen overlay', () => {
  test.skip(({ isMobile }) => !isMobile, 'desktop uses a persistent docked panel instead')

  test('the itinerary opens as a full-screen overlay via the FAB, not a small popover', async ({ page }) => {
    await buildArchCanyChain(page, true)
    const overlay = await openItinerary(page, true)

    const viewport = page.viewportSize()
    const box = await overlay.boundingBox()
    expect(viewport).not.toBeNull()
    expect(box).not.toBeNull()
    if (viewport && box) {
      expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1)
      expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1)
    }
  })
})

test.describe('desktop docked panel', () => {
  test.skip(({ isMobile }) => isMobile, 'mobile uses the FAB + full-screen overlay instead')

  test('the itinerary is a persistent side panel, not a full-viewport overlay', async ({ page }) => {
    await buildArchCanyChain(page, false)
    const panel = await openItinerary(page, false)

    const viewport = page.viewportSize()
    const box = await panel.boundingBox()
    expect(viewport).not.toBeNull()
    expect(box).not.toBeNull()
    if (viewport && box) {
      expect(box.width).toBeLessThan(viewport.width / 2)
    }
  })
})

test('captures a screenshot of the itinerary with an active chain', async ({ page, isMobile }, testInfo) => {
  await buildArchCanyChain(page, isMobile)
  await openItinerary(page, isMobile)
  await page.screenshot({
    path: testInfo.outputPath(`itinerary-${testInfo.project.name}.png`),
    fullPage: false,
  })
})
