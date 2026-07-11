import { test, expect, type Page, type Locator } from '@playwright/test'

// Park detail panel smoke test (outbound-p1-fe-05). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects (playwright.config.ts).
// Mirrors markers.spec.ts's settle-then-click convention so selection never
// races the globe-intro fly-in or lands on an occluded marker.

async function gotoSettled(page: Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

/** Selects the first marker matching `drivable`, returning its destination id. Same occlusion
 * hazard markers.spec.ts documents (empty-state hero, clustered hit-areas) — walked
 * defensively rather than assuming any one park id is clear. Two sandbox-specific findings
 * shaped this helper (see this task's ui_packet for the isolation testing that diagnosed
 * both):
 *
 * 1. The on-screen candidate search runs as ONE in-browser `page.evaluate()` (native
 *    `getBoundingClientRect()` / `elementFromPoint()`) rather than N separate Playwright
 *    `boundingBox()` round-trips — under this sandbox's software-rendered WebGL canvas, a
 *    freestanding Playwright geometry call can block on a "stable frame" wait against the
 *    continuously-repainting map for a very long time.
 * 2. Not every destination is within the initial FoCo/US-West camera framing (every
 *    not-drivable park is in Alaska/Hawaii/the Caribbean/American Samoa) — for those, this
 *    falls back to the first DOM candidate regardless of on-screen position.
 * 3. The actual selection uses `dispatchEvent('click')`, not Playwright's `.click()`: even
 *    for a genuinely on-screen, unoccluded marker, Playwright's own actionability pipeline
 *    (hover simulation, scroll-into-view, continuous stability polling) stalled against the
 *    animated map canvas in this sandbox. `dispatchEvent` still exercises the real production
 *    onClick → setSelected wiring (React's synthetic event system picks up a dispatched
 *    native 'click') without that pipeline. Mouse-coordinate/hover/keyboard click fidelity is
 *    markers.spec.ts's dedicated concern, not this task's. */
async function selectFirstMarker(page: Page, drivable: boolean): Promise<string> {
  const selector = `[data-testid="park-marker"][data-drivable="${drivable}"]`

  const onScreenId = await page.evaluate((sel) => {
    const markers = Array.from(document.querySelectorAll<HTMLElement>(sel))
    for (const marker of markers) {
      const rect = marker.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const cx = rect.x + rect.width / 2
      const cy = rect.y + rect.height / 2
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
      const topElement = document.elementFromPoint(cx, cy)
      if (topElement && (topElement === marker || marker.contains(topElement))) {
        return marker.getAttribute('data-park-id')
      }
    }
    return null
  }, selector)

  const target = onScreenId
    ? page.locator(`${selector}[data-park-id="${onScreenId}"]`)
    : page.locator(selector).first()
  const targetId = onScreenId ?? (await target.getAttribute('data-park-id'))
  if (!targetId) {
    throw new Error(`no ${drivable ? 'drivable' : 'not-drivable'} marker exists in the DOM`)
  }

  await target.dispatchEvent('click')
  return targetId
}

async function waitForFlyToSettled(page: Page, parkId: string): Promise<void> {
  await page.waitForFunction((id) => document.body.dataset['parkDetailFlytoSettled'] === id, parkId)
}

/** Locator preserving DOM order so element order can be asserted (photo-first rule). */
function photoAndDescriptionInOrder(page: Page): Locator {
  return page.locator('[data-testid="detail-photo"], [data-testid="detail-description"]')
}

test.describe('desktop right-docked card', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop-only card layout')

  test('selecting a drivable destination flies to it and shows a photo-first card', async ({ page }) => {
    await gotoSettled(page)
    const id = await selectFirstMarker(page, true)
    await waitForFlyToSettled(page, id)

    await expect(page.getByTestId('park-detail-card')).toBeVisible()
    // Photo-first: the photo element must precede the description paragraph in DOM order.
    const ordered = photoAndDescriptionInOrder(page)
    await expect(ordered.first()).toHaveAttribute('data-testid', 'detail-photo')
    const descriptionText = await page.getByTestId('detail-description').textContent()
    expect(descriptionText?.trim().length).toBeGreaterThan(0)

    // Drive stats rendered in mono numerals (DESIGN.md tabular rule), stay dots via the
    // fe-01 primitive, and at least one safe campground link-out.
    await expect(page.getByTestId('detail-drive-stats')).toBeVisible()
    const hoursFont = await page.getByTestId('detail-drive-hours').evaluate((el) => getComputedStyle(el).fontFamily)
    expect(hoursFont).toContain('JetBrains Mono')
    await expect(page.locator('[data-testid="detail-stay-dots"] [data-testid="dot"]').first()).toBeAttached()

    const campgroundLink = page.getByTestId('detail-campground-link').first()
    await expect(campgroundLink).toBeVisible()
    await expect(campgroundLink).toHaveAttribute('target', '_blank')
    await expect(campgroundLink).toHaveAttribute('rel', /noopener/)
  })

  test('rendered drive days are internally consistent with ceil(hours / 10)', async ({ page }) => {
    await gotoSettled(page)
    const id = await selectFirstMarker(page, true)
    await waitForFlyToSettled(page, id)

    const hoursText = await page.getByTestId('detail-drive-hours').textContent()
    const daysText = await page.getByTestId('detail-drive-days').textContent()
    const hours = Number(hoursText)
    const days = Number(daysText)
    expect(Number.isFinite(hours)).toBe(true)
    expect(days).toBe(Math.ceil(hours / 10))
  })

  test('selecting a not-drivable destination shows its reason and no drive stats', async ({ page }) => {
    await gotoSettled(page)
    const id = await selectFirstMarker(page, false)
    await waitForFlyToSettled(page, id)

    const reasonText = await page.getByTestId('detail-not-drivable-reason').textContent()
    expect(reasonText?.trim().length).toBeGreaterThan(0)
    await expect(page.getByTestId('detail-drive-stats')).toHaveCount(0)
  })
})

test.describe('mobile bottom sheet', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only sheet layout')

  test('peek shows name + stay dots; tapping expands to the full photo-first detail', async ({ page }) => {
    await gotoSettled(page)
    const id = await selectFirstMarker(page, true)
    await waitForFlyToSettled(page, id)

    const sheet = page.getByTestId('detail-sheet')
    await expect(sheet).toHaveAttribute('data-expanded', 'false')
    await expect(page.locator('[data-testid="detail-stay-dots"] [data-testid="dot"]').first()).toBeAttached()
    // Peek state: the full body (photo) has not mounted yet.
    await expect(page.getByTestId('detail-photo-wrapper')).toHaveCount(0)

    await page.getByTestId('detail-sheet-expand-toggle').click()
    await expect(sheet).toHaveAttribute('data-expanded', 'true')
    await expect(page.getByTestId('detail-photo-wrapper')).toBeVisible()
    const ordered = photoAndDescriptionInOrder(page)
    await expect(ordered.first()).toHaveAttribute('data-testid', 'detail-photo')
  })
})

test('before any selection, no detail panel or sheet is rendered', async ({ page }) => {
  await gotoSettled(page)
  await expect(page.getByTestId('park-detail-card')).toHaveCount(0)
  await expect(page.getByTestId('detail-sheet')).toHaveCount(0)
})
