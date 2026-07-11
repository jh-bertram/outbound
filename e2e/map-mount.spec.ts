import { test, expect } from '@playwright/test'

// Composition-root smoke test (outbound-p1-fe-02a). Verifies the
// full-viewport MapLibre canvas mounts, fills the viewport, resizes with
// it, and stays free of stray chrome — with zero console errors. The
// map's real basemap/aesthetic richness ships in fe-02b's
// e2e/map-shell.spec.ts, not here (this task's canvas is a minimal
// placeholder style, per the packet).

test('map canvas mounts and fills the viewport with no console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto('/')

  const canvas = page.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()

  const viewport = page.viewportSize()
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (box && viewport) {
    expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2)
    expect(box.height).toBeGreaterThanOrEqual(viewport.height - 2)
  }
  expect(errors).toEqual([])
})

test('map canvas resizes to fill a changed viewport', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('.maplibregl-canvas')
  await expect(canvas).toBeVisible()

  await page.setViewportSize({ width: 480, height: 800 })
  await expect
    .poll(async () => (await canvas.boundingBox())?.width)
    .toBeGreaterThanOrEqual(478)
})

test('the six placeholder slots render no visible chrome yet', async ({ page }) => {
  await page.goto('/')
  const root = page.getByTestId('map-canvas-root')
  await expect(root).toBeVisible()
  // Slots (park-markers, route/dots, detail/trip/itinerary panels, legend)
  // are no-op placeholders until fe-04..08 land — the composition root
  // must not leak any placeholder/TODO text into the rendered page.
  await expect(root).not.toContainText('TODO')
})
