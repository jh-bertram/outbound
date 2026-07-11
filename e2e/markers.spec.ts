import { test, expect } from '@playwright/test'

// Park marker smoke test (outbound-p1-fe-04). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects
// (playwright.config.ts). Waits for the same deterministic settle signal
// map-shell.spec.ts uses, so markers aren't mid fly-in when asserted.

async function gotoSettled(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
}

/**
 * Selects the first on-screen, unoccluded marker matching `drivable`,
 * returning its destination id.
 *
 * R4 hardening (ORC ruling, 2026-07-11 — see docs/task-registry.md §
 * "ORC Rulings R4" and
 * .claude/tasks/outputs/outbound-p1-fe-05-FE-1783804117.md §
 * "Remediation (attempt 1)"): the previous implementation walked
 * candidates with N separate Playwright `boundingBox()` round-trips plus
 * a per-candidate `.click({ timeout })`, which proved unreliable on
 * mobile-chrome under this sandbox's software-rendered WebGL canvas —
 * continuous MapLibre repaint stalls Playwright's freestanding
 * geometry/actionability polling. Replaced with the same in-browser
 * `evaluate()` + `dispatchEvent('click')` pattern
 * `e2e/park-detail.spec.ts`'s `selectFirstMarker` already uses
 * successfully on both projects (TEST-ONLY change; no product code
 * touched):
 *
 * 1. The on-screen/unoccluded candidate search runs as ONE
 *    `page.evaluate()` using native `getBoundingClientRect()` +
 *    `elementFromPoint()`. This also subsumes the old explicit
 *    empty-state-hero bounding-box check: a hero-occluded (or
 *    neighbor-marker-occluded) candidate's center point resolves to that
 *    occluding element via `elementFromPoint`, not the marker itself, so
 *    it is skipped automatically — a strict generalization of the old
 *    hero-only check, not a narrowing of it.
 * 2. Falls back to the first DOM candidate if nothing currently sits
 *    within the camera framing (true for every not-drivable park —
 *    Alaska/Hawaii/Caribbean/American Samoa are outside the FoCo/US-West
 *    intro fly-in).
 * 3. Dispatches a native 'click' event directly on the resolved element,
 *    bypassing Playwright's hover/scroll/stability actionability
 *    pipeline (the thing that stalled here) — still exercises the real
 *    production `onClick={() => setSelected(park.id)}` handler in
 *    `park-markers-layer.tsx`, since React's event delegation picks up a
 *    dispatched native click identically to a genuine pointer click.
 *
 * Deliberately duplicated rather than extracted into a shared e2e helper
 * module: R4 authorizes hardening `e2e/markers.spec.ts` only, and adding
 * a second touched file would exceed that scope.
 */
async function selectFirstMarker(
  page: import('@playwright/test').Page,
  drivable: boolean,
): Promise<string> {
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

  const id = await selectFirstMarker(page, true)
  const marker = page.locator(`[data-testid="park-marker"][data-park-id="${id}"]`)

  // Explicit post-click assertion proving the synthetic dispatchEvent
  // click had the same real effect a genuine pointer click would: this is
  // a live DOM read of application state, not a side-effect proxy —
  // `park-markers-layer.tsx` computes `aria-current` directly from the
  // store's `selectedId === park.id`, so this attribute only flips true
  // if `setSelected` actually ran.
  await expect(marker).toHaveAttribute('aria-current', 'true')

  await marker.focus()
  const outline = await marker.evaluate((el) => {
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
