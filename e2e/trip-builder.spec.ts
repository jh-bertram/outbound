import { test, expect, type Page } from '@playwright/test'

// Trip-builder smoke test (outbound-p1-fe-07 — BRIEF §3.3/§7.4). Runs on
// both the desktop-chrome and mobile-chrome Playwright projects
// (playwright.config.ts). Mirrors day-dots.spec.ts / park-detail.spec.ts's
// settle-then-select convention and its exact-id `dispatchEvent` selection
// helper (each existing spec keeps its own local copy rather than sharing
// a utils module — followed here too).
//
// Fixture destinations, values read from the actually-committed
// src/data/drive-matrix.json + src/data/parks.json (not asserted values —
// measured from the shipped matrix, same discipline be-04's own §7.5
// checks use): Arches (`arch`) and its nearest drivable neighbor
// Canyonlands (`cany`), ~0.99 h apart (well inside the panel's 12 h nearby
// radius) — deterministic enough to assert exact day/hour figures on.
//   FOCO->arch  5.479 h -> 1 drive day, arch stay 2 days
//   arch->cany  0.994 h -> 1 drive day, cany stay 3 days
//   cany->FOCO  5.886 h -> 1 drive day
//   total (arch + cany chain, incl. return leg) = 1+2+1+3+1 = 8 days
//   total (arch only, incl. return leg)         = 1+2+1     = 4 days

async function gotoSettled(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

/** Selects a SPECIFIC destination by id via `dispatchEvent` (bypasses Playwright's
 * actionability pipeline against the continuously-repainting map canvas — the same
 * production-onClick-exercising technique day-dots.spec.ts / park-detail.spec.ts already
 * established), since this task's receipts require exact known drive-matrix figures rather
 * than "whichever marker happens to be on-screen first." */
async function selectMarkerById(page: Page, parkId: string): Promise<void> {
  const marker = page.locator(`[data-testid="park-marker"][data-park-id="${parkId}"]`)
  await expect(marker).toHaveCount(1)
  await marker.dispatchEvent('click')
}

/** On mobile the panel starts collapsed to a tap-to-reveal chip (mirrors dot-legend's own
 * mobile convention); on desktop it's already docked and visible. No-op on desktop. */
async function openTripPanelIfMobile(page: Page, isMobile: boolean): Promise<void> {
  if (!isMobile) return
  const chip = page.getByTestId('trip-panel-mobile-chip')
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(page.getByTestId('trip-panel-mobile-panel')).toBeVisible()
}

test('nearby suggestions show the correct incremental hours->days; adding the selection and a suggestion builds a chain with per-leg costs and a return-leg-inclusive running total', async ({
  page,
  isMobile,
}) => {
  await gotoSettled(page)
  await selectMarkerById(page, 'arch')
  await openTripPanelIfMobile(page, isMobile)

  // Nearby suggestion: matrix cell (arch->cany, 0.99h) -> driveDays() -> "1 day".
  const suggestion = page.locator('[data-testid="trip-panel-suggestion"][data-park-id="cany"]')
  await expect(suggestion).toBeVisible()
  await expect(suggestion).toContainText('Canyonlands')
  await expect(suggestion).toContainText('1.0 h')
  await expect(suggestion).toContainText('1 day')

  // Add the selected anchor (arch) itself first — a round trip to just
  // Arches (incl. return leg) totals 4 days by the shipped matrix.
  await page.getByTestId('trip-panel-add-selected').click()
  await expect(page.getByTestId('trip-panel-total')).toHaveText('4 days total')
  await expect(page.getByTestId('trip-panel-add-selected')).toHaveCount(0)

  // Add the nearby suggestion — chain becomes arch -> cany (+ return leg).
  await suggestion.click()
  await expect(page.getByTestId('trip-panel-total')).toHaveText('8 days total')

  const legs = page.getByTestId('trip-panel-chain-leg')
  await expect(legs).toHaveCount(3)
  await expect(page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="arch"]')).toBeVisible()
  await expect(page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="cany"]')).toBeVisible()
  await expect(page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="FOCO"]')).toBeVisible()

  // arch->cany leg: exactly 1 drive-day dot, paired with the visible hour figure.
  const canyLeg = page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="cany"]')
  await expect(canyLeg.locator('[data-testid="dot"][data-variant="drive"]')).toHaveCount(1)
  await expect(canyLeg).toContainText('1.0 h')

  // Rendered-but-invisible guard (Shadcn primitive + custom palette
  // collision class of bug): confirm the total figure is actually legible
  // against the card surface, not just present in the DOM.
  const totalStyles = await page.getByTestId('trip-panel-total').evaluate((el) => {
    const cs = getComputedStyle(el)
    const bg = getComputedStyle(el.closest('[data-slot="card"]') ?? el).backgroundColor
    return { color: cs.color, bg }
  })
  expect(totalStyles.color).not.toBe('rgba(0, 0, 0, 0)')
  expect(totalStyles.color).not.toBe(totalStyles.bg)
})

test('removing a chained destination requires an explicit confirm step before the chain and running total update', async ({
  page,
  isMobile,
}) => {
  await gotoSettled(page)
  await selectMarkerById(page, 'arch')
  await openTripPanelIfMobile(page, isMobile)
  await page.getByTestId('trip-panel-add-selected').click()
  await page.locator('[data-testid="trip-panel-suggestion"][data-park-id="cany"]').click()
  await expect(page.getByTestId('trip-panel-total')).toHaveText('8 days total')

  const removeButton = page.locator('[data-testid="trip-panel-remove"][data-park-id="cany"]')
  await removeButton.click()

  // Confirm step: the destructive action does not fire on the first click.
  const confirmButton = page.locator('[data-testid="trip-panel-remove-confirm"][data-park-id="cany"]')
  await expect(confirmButton).toBeVisible()
  await expect(removeButton).toHaveCount(0)
  await expect(page.getByTestId('trip-panel-total')).toHaveText('8 days total')

  // Cancel leaves the chain untouched.
  await page.getByTestId('trip-panel-remove-cancel').click()
  await expect(removeButton).toBeVisible()
  await expect(page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="cany"]')).toBeVisible()

  // Remove -> confirm actually mutates the chain (via the store's
  // removePark action) and the total recomputes to the arch-only figure.
  await removeButton.click()
  await page.locator('[data-testid="trip-panel-remove-confirm"][data-park-id="cany"]').click()
  await expect(page.locator('[data-testid="trip-panel-chain-leg"][data-to-id="cany"]')).toHaveCount(0)
  await expect(page.getByTestId('trip-panel-total')).toHaveText('4 days total')
})

test('a not-drivable destination never anchors the trip panel (no suggestions, no add affordance)', async ({
  page,
}) => {
  await gotoSettled(page)
  const notDrivable = page.locator('[data-testid="park-marker"][data-drivable="false"]').first()
  await notDrivable.dispatchEvent('click')

  // Nothing to show: no drivable anchor, no existing chain to fall back to.
  await expect(page.getByTestId('trip-panel')).toHaveCount(0)
  await expect(page.getByTestId('trip-panel-mobile-chip')).toHaveCount(0)
  await expect(page.getByTestId('trip-panel-suggestion')).toHaveCount(0)
})

test('captures a screenshot of the trip panel with an active chain', async ({ page, isMobile }, testInfo) => {
  await gotoSettled(page)
  await selectMarkerById(page, 'arch')
  await openTripPanelIfMobile(page, isMobile)
  await page.getByTestId('trip-panel-add-selected').click()
  await page.screenshot({
    path: testInfo.outputPath(`trip-panel-${testInfo.project.name}.png`),
    fullPage: false,
  })
})
