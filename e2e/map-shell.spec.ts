import { test, expect } from '@playwright/test'

// Map-richness smoke test (outbound-p1-fe-02b). Complements
// e2e/map-mount.spec.ts (fe-02a, viewport-fill only). Runs on both the
// desktop-chrome and mobile-chrome Playwright projects (playwright.config.ts).

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

test('shows the empty-state hero before any selection', async ({ page }) => {
  await page.goto('/')

  const hero = page.getByTestId('empty-state-hero')
  const heading = page.getByRole('heading', { name: 'Where to next?' })
  await expect(hero).toBeVisible()
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
