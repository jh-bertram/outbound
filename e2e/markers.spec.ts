import { test, expect } from '@playwright/test'

// Park marker smoke test (outbound-p1-fe-04). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects
// (playwright.config.ts). Waits for the same deterministic settle signal
// map-shell.spec.ts uses, so markers aren't mid fly-in when asserted.

async function gotoSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

test('renders all 63 destination markers, id-keyed (seki + seki-kica both present)', async ({
  page,
}) => {
  await gotoSettled(page)
  await expect(page.locator('[data-testid="park-marker"]')).toHaveCount(63)
  await expect(page.locator('[data-testid="park-marker"][data-park-id="seki"]')).toBeVisible()
  await expect(
    page.locator('[data-testid="park-marker"][data-park-id="seki-kica"]'),
  ).toBeVisible()
})

test('drivable vs not-drivable markers are distinguished by ring + glyph, not color alone', async ({
  page,
}) => {
  await gotoSettled(page)

  const notDrivable = page.locator('[data-testid="park-marker"][data-drivable="false"]').first()
  await expect(notDrivable).toBeVisible()
  await expect(notDrivable.locator('[data-testid="marker-not-drivable-glyph"]')).toBeAttached()
  const notDrivableStyles = await notDrivable
    .locator('[data-testid="marker-dot"]')
    .evaluate((el) => getComputedStyle(el).boxShadow)
  expect(notDrivableStyles).not.toBe('none')

  const drivable = page.locator('[data-testid="park-marker"][data-drivable="true"]').first()
  await expect(drivable).toBeVisible()
  await expect(drivable.locator('[data-testid="marker-not-drivable-glyph"]')).toHaveCount(0)
})

test('clicking a drivable marker selects it; keyboard focus shows a visible focus ring', async ({
  page,
}) => {
  await gotoSettled(page)

  // Two geometry hazards can make a specific park id unreliable to target
  // directly: (1) the pre-selection empty-state hero (fe-02b, out of this
  // task's scope) floats centered above the map and can occlude a marker
  // that renders near its card (e.g. a park close to Fort Collins on
  // screen); (2) geographically clustered parks (e.g. Utah's "Mighty 5")
  // can render overlapping 44px hit-areas at this zoom, so one marker's
  // hit-area can occlude a neighbor's. Rather than assume any single
  // park id is always clear of both, walk the drivable markers in order
  // and click the first one that is on-screen, outside the hero, AND
  // actually receives the click (not occluded by a sibling marker).
  const heroBox = await page.getByTestId('empty-state-hero').boundingBox()
  const viewport = page.viewportSize()
  const drivableMarkers = page.locator('[data-testid="park-marker"][data-drivable="true"]')
  const markerCount = await drivableMarkers.count()

  let marker: ReturnType<typeof drivableMarkers.nth> | null = null
  for (let i = 0; i < markerCount; i++) {
    const candidate = drivableMarkers.nth(i)
    const box = await candidate.boundingBox()
    if (!box) continue
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const insideHero =
      heroBox !== null &&
      cx >= heroBox.x &&
      cx <= heroBox.x + heroBox.width &&
      cy >= heroBox.y &&
      cy <= heroBox.y + heroBox.height
    const insideViewport =
      viewport !== null && cx >= 0 && cx <= viewport.width && cy >= 0 && cy <= viewport.height
    if (!insideViewport || insideHero) continue

    try {
      await candidate.click({ timeout: 2000 })
      marker = candidate
      break
    } catch {
      continue
    }
  }

  expect(marker).not.toBeNull()
  await expect(marker!).toHaveAttribute('aria-current', 'true')

  await marker!.focus()
  const outline = await marker!.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { style: cs.outlineStyle, color: cs.outlineColor }
  })
  expect(outline.style).not.toBe('none')
  expect(outline.color).not.toBe('rgba(0, 0, 0, 0)')
})

test('marker hit-area meets the 44px minimum touch target', async ({ page }) => {
  await gotoSettled(page)
  const box = await page.locator('[data-testid="park-marker"]').first().boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
})
