import { test, expect } from '@playwright/test'

// Map-richness smoke test (outbound-p1-fe-02b). Complements
// e2e/map-mount.spec.ts (fe-02a, viewport-fill only). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects (playwright.config.ts).
//
// outbound-p1-hero-morph (post-close human amendment, R-011): added the
// hero-morph assertion block below (big pre-settle -> compact top bar
// post-settle/early-interaction, center-map clickability restored,
// reduced-motion compact-direct, deselection-returns-compact). Empirically
// verified against a real preview-server run before being written here
// (see this task's ui_packet § Receipts for the probe transcripts) — every
// assertion below mirrors a behavior already confirmed live, not a guess.

const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const TERRARIUM_TILE_PATTERN = /elevation-tiles-prod\/terrarium\/\d+\/\d+\/\d+\.png/

test('requests the Liberty style + Terrarium hillshade tiles with no console errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  page.on('pageerror', (err) => errors.push(err.message))

  // Set up BEFORE navigation: proves the app actually requests the exact
  // RA-verified URLs, not just that the map renders something. A JS throw
  // inside the globe-intro's style.load handler (RA finding 12: calling
  // setProjection before load throws) would also surface via 'pageerror'.
  const styleRequest = page.waitForRequest(LIBERTY_STYLE_URL)
  const terrainRequest = page.waitForRequest((req) => TERRARIUM_TILE_PATTERN.test(req.url()))

  await page.goto('/')
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()

  await styleRequest
  await terrainRequest
  expect(errors).toEqual([])
})

test('shows the empty-state hero (BIG state) before any selection', async ({ page }) => {
  await page.goto('/')

  const hero = page.getByTestId('empty-state-hero')
  const heading = page.getByRole('heading', { name: 'Where to next?' })
  await expect(hero).toBeVisible()
  await expect(hero).toHaveAttribute('data-morph-state', 'big')
  await expect(heading).toBeVisible()
  await expect(page.getByText('Click any pine-green marker to start planning.')).toBeVisible()

  // Rendered-but-invisible guard: confirm the headline is actually legible
  // against its own card surface, not just present in the DOM.
  const styles = await heading.evaluate((el) => {
    const cs = getComputedStyle(el)
    return { color: cs.color, fontFamily: cs.fontFamily }
  })
  expect(styles.fontFamily).toContain('Fraunces')
  expect(styles.color).not.toBe('rgba(0, 0, 0, 0)')
})

test('captures a full-viewport screenshot of the map shell', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByTestId('empty-state-hero')).toBeVisible()
  // Deterministic settle signal set by map-canvas.tsx's GlobeIntro on the
  // real MapLibre `moveend` event — avoids a flaky fixed-timeout race
  // against real network-fetched style/tiles under parallel worker load.
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
  await page.screenshot({
    path: testInfo.outputPath(`map-shell-${testInfo.project.name}.png`),
    fullPage: false,
  })
})

/**
 * outbound-p1-hero-morph: the human's R-011 finding — the big hero blocks
 * the map's exact center, where a user's first click naturally lands. This
 * test proves the block existed pre-morph and is gone post-morph, at the
 * SAME literal viewport-center coordinate, then confirms the map is
 * genuinely clickable there afterwards (a marker near center receives the
 * click) — not a side-effect-only proxy.
 */
test('the hero morphs to a compact top bar once the fly-in settles, unblocking the map center', async ({
  page,
}) => {
  await page.goto('/')
  const hero = page.getByTestId('empty-state-hero')
  await expect(hero).toBeVisible()
  await expect(hero).toHaveAttribute('data-morph-state', 'big')

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('viewport size unavailable')
  const center = { x: viewport.width / 2, y: viewport.height / 2 }

  const blockedPreSettle = await page.evaluate((pt) => {
    const el = document.elementFromPoint(pt.x, pt.y)
    const heroEl = document.querySelector('[data-testid="empty-state-hero"]')
    return !!(heroEl && el && heroEl.contains(el))
  }, center)
  expect(blockedPreSettle).toBe(true)

  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
  await expect(hero).toHaveAttribute('data-morph-state', 'compact')

  // Wait out the morph transition (--motion-card-enter-duration, 320ms)
  // before reading final geometry — `expect.poll` retries rather than a
  // fixed sleep, consistent with map-mount.spec.ts's own resize-settle
  // check. Generous 10s poll ceiling (vs. the 5s default): observed flaky
  // under full-suite `--workers=1` sequential load in this sandbox even
  // though the underlying data-morph-state flip and CSS transition are
  // both well under 1s in isolation — real network-fetched style/tiles
  // plus accumulated per-test browser-context churn can slow instrumented
  // reads, not the app logic itself.
  await expect.poll(async () => (await hero.boundingBox())?.y, { timeout: 10000 }).toBeLessThan(60)
  const box = await hero.boundingBox()
  expect(box).not.toBeNull()
  if (box) expect(box.height).toBeLessThan(80) // a compact rectangle, not the ~280px+ big card

  const blockedPostMorph = await page.evaluate((pt) => {
    const el = document.elementFromPoint(pt.x, pt.y)
    const heroEl = document.querySelector('[data-testid="empty-state-hero"]')
    return !!(heroEl && el && heroEl.contains(el))
  }, center)
  expect(blockedPostMorph).toBe(false)

  // Behavior-level proof, not just DOM-presence: the nearest on-screen,
  // unoccluded marker to that formerly-blocked center point now receives a
  // real click. Same in-browser evaluate() + dispatchEvent('click') R4
  // pattern e2e/markers.spec.ts established (continuous WebGL repaint
  // stalls Playwright's own locator actionability pipeline in this sandbox).
  const nearestId = await page.evaluate((pt) => {
    const markers = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="park-marker"]'))
    let best: { id: string; dist: number } | null = null
    for (const marker of markers) {
      const rect = marker.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const cx = rect.x + rect.width / 2
      const cy = rect.y + rect.height / 2
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
      const top = document.elementFromPoint(cx, cy)
      if (!top || (top !== marker && !marker.contains(top))) continue
      const dist = Math.hypot(cx - pt.x, cy - pt.y)
      if (!best || dist < best.dist) best = { id: marker.getAttribute('data-park-id') ?? '', dist }
    }
    return best?.id ?? null
  }, center)
  expect(nearestId).not.toBeNull()

  const nearestMarker = page.locator(`[data-testid="park-marker"][data-park-id="${nearestId}"]`)
  await nearestMarker.dispatchEvent('click')
  await expect(nearestMarker).toHaveAttribute('aria-current', 'true')
})

test('a pointerdown on the map canvas morphs the hero early, before the fly-in settles', async ({
  page,
}) => {
  await page.goto('/')
  const hero = page.getByTestId('empty-state-hero')
  await expect(hero).toBeVisible()
  await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  await expect(hero).toHaveAttribute('data-morph-state', 'big')

  // Dispatched directly on the real production listener target
  // (`FirstMapInteractionListener` binds to `map.getCanvas()`, not
  // window/document) — same evaluate()+dispatchEvent R4 technique as
  // above, since a genuine pointer gesture mid fly-in is not reliably
  // actionable via Playwright's own locator-click pipeline here.
  await page.evaluate(() => {
    document
      .querySelector('.maplibregl-canvas')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }))
  })

  await expect(hero).toHaveAttribute('data-morph-state', 'compact')
  // Proves this fired from the interaction, not a coincidental early
  // settle: the fly-in's own settle flag has not been set yet.
  expect(await page.evaluate(() => document.body.dataset['flytoSettled'])).toBeUndefined()
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('renders the compact top bar directly, with no slide, independent of flytoSettled', async ({
    page,
  }) => {
    await page.goto('/')
    const hero = page.getByTestId('empty-state-hero')
    await expect(hero).toBeVisible()
    // The known sandbox quirk (outbound-p1-fe-06's packet): flytoSettled
    // never resolves under Playwright's reducedMotion emulation here, so
    // this assertion deliberately never waits on it — it checks the
    // compact render lands immediately on first paint instead.
    await expect(hero).toHaveAttribute('data-morph-state', 'compact')
    const box = await hero.boundingBox()
    expect(box).not.toBeNull()
    if (box) expect(box.y).toBeLessThan(60)
  })
})

test('deselecting a park after the morph shows the compact bar again — never the big card', async ({
  page,
}, testInfo) => {
  // The only reachable deselect affordance in the shipped app today is the
  // mobile detail-sheet's drag-to-dismiss (ParkDetailPanel, out of this
  // task's file scope — map-canvas.tsx + this spec only). Desktop has no
  // close action yet; a PRE-EXISTING gap, flagged in this task's ui_packet
  // for UI Designer/PM awareness, not one this task fixes.
  test.skip(
    testInfo.project.name !== 'mobile-chrome',
    'desktop has no reachable deselect affordance yet (pre-existing gap, out of scope) — only mobile-chrome exercises the real drag-to-dismiss path',
  )

  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset['flytoSettled'] === 'true')
  const hero = page.getByTestId('empty-state-hero')
  await expect(hero).toHaveAttribute('data-morph-state', 'compact')

  const onScreenId = await page.evaluate(() => {
    const markers = Array.from(
      document.querySelectorAll<HTMLElement>('[data-testid="park-marker"][data-drivable="true"]'),
    )
    for (const marker of markers) {
      const rect = marker.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      const cx = rect.x + rect.width / 2
      const cy = rect.y + rect.height / 2
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue
      const top = document.elementFromPoint(cx, cy)
      if (top && (top === marker || marker.contains(top))) return marker.getAttribute('data-park-id')
    }
    return null
  })
  const target = onScreenId
    ? page.locator(`[data-testid="park-marker"][data-park-id="${onScreenId}"]`)
    : page.locator('[data-testid="park-marker"][data-drivable="true"]').first()
  await target.dispatchEvent('click')

  await expect(hero).toHaveCount(0)
  const sheet = page.getByTestId('detail-sheet')
  await expect(sheet).toBeVisible()

  // Real production deselect: drag the sheet down past vaul's close
  // threshold (ParkDetailPanel's onOpenChange -> setSelected(null), unmodified
  // by this task). Empirically verified against a live preview-server run
  // (see this task's ui_packet § Receipts) before being encoded here.
  const box = await sheet.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    const x = box.x + box.width / 2
    const startY = box.y + 20
    await page.mouse.move(x, startY)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(x, startY + i * 60, { steps: 2 })
    }
    await page.mouse.up()
  }

  await expect(sheet).toBeHidden()
  await expect(hero).toBeVisible()
  await expect(hero).toHaveAttribute('data-morph-state', 'compact')
})
