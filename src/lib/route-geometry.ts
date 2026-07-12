import type { LineLayerSpecification } from '@vis.gl/react-maplibre'

/**
 * Pure route-geometry helpers for `src/components/route-and-dots-layer.tsx`
 * (outbound-p1-fe-06). Split out of that component file — not because
 * another task owns it, but because ESLint's `react-refresh/only-export
 * -components` rule forbids a `.tsx` file exporting both a component and
 * plain functions/constants (breaks Fast Refresh). Same "pure logic lives
 * in `src/lib/`, UI consumes it" convention `src/lib/trip-math.ts` (fe-03)
 * already established for this codebase — this module is exclusively
 * consumed by route-and-dots-layer.tsx and its accompanying test.
 */

/** MapLibre's `line-gradient` expression type, derived by indexing the paint spec (avoids
 * naming `ExpressionSpecification` directly, which `@vis.gl/react-maplibre` doesn't re-export
 * at its package root). */
export type LineGradientExpression = NonNullable<
  NonNullable<LineLayerSpecification['paint']>['line-gradient']
>

// --dot-color-drive (--color-accent-rust, #C1502E) — the route line borrows
// the drive-dot hue so the line and the dots it carries read as one visual
// system, distinct from the pine-green markers/basemap. MapLibre's
// `line-gradient` paint expression needs literal color strings (no CSS
// var() support) — same documented one-directional token mirror already
// established by day-dot-cluster.tsx (fe-01), map-canvas.tsx (fe-02b), and
// park-detail-panel.tsx (fe-05). #C1502E == rgb(193, 80, 46).
export const ROUTE_LINE_COLOR = '#c1502e'
export const ROUTE_LINE_TRANSPARENT = 'rgba(193, 80, 46, 0)'

// --dot-max-inline-count (DESIGN.md § Day-Marker Dots, also present as a
// CSS custom property in tokens.css). Mirrors the private constant of the
// same name in day-dot-cluster.tsx: this module needs a plain number to
// decide "individual dots vs. pill" BEFORE handing off to the fe-01
// primitive, and fe-01's own constant is unexported (pure/presentational,
// no reason to export an implementation detail) — see this task's
// ui_packet for why re-exporting it was rejected in favor of this
// documented, precedented mirror.
export const DOT_MAX_INLINE_COUNT = 5

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Above the DESIGN.md inline-count ceiling, collapse to the fe-01 pill instead of
 * rendering individual along-route dots (prevents an implausibly long leg from becoming
 * visual clutter — DESIGN.md § Day-Marker Dots). The committed drive-matrix's longest
 * FoCo-anchored leg (Denali, ~47.8h → 5 days) never exceeds this threshold, so the branch is
 * proven with a synthetic value in this module's test file instead. */
export function shouldCollapseToPill(dayCount: number): boolean {
  return dayCount > DOT_MAX_INLINE_COUNT
}

/** Evenly-spaced points along the straight FoCo→destination line, one per drive day, each
 * placed at that day's segment MIDPOINT (never exactly on FoCo or the destination marker,
 * both of which already carry their own meaning). Linear lng/lat interpolation matches the
 * same 2-vertex straight geometry drawn by the GeoJSON route line (cosmetic positioning, not
 * a routing calculation — real road geometry is out of scope). */
export function driveDayDotPositions(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  count: number,
): { lat: number; lng: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count
    return {
      lng: lerp(origin.lng, destination.lng, t),
      lat: lerp(origin.lat, destination.lat, t),
    }
  })
}

/**
 * Builds a `line-gradient` expression that reveals the route by animating where the
 * color-to-transparent cutoff sits along `line-progress` (RA finding 11: "reveals the line
 * by animating the gradient stop, no per-frame geometry mutation"). Stops are kept strictly
 * increasing (MapLibre's `interpolate` requirement) via a clamped epsilon gap, with dedicated
 * fully-solid / fully-transparent shortcuts at the 0/1 boundaries.
 */
export function buildLineGradient(progress: number): LineGradientExpression {
  const p = Math.min(Math.max(progress, 0), 1)

  if (p <= 0) {
    return ['interpolate', ['linear'], ['line-progress'], 0, ROUTE_LINE_TRANSPARENT, 1, ROUTE_LINE_TRANSPARENT]
  }
  if (p >= 1) {
    return ['interpolate', ['linear'], ['line-progress'], 0, ROUTE_LINE_COLOR, 1, ROUTE_LINE_COLOR]
  }

  const epsilon = Math.min(0.001, (1 - p) / 2, p / 2)
  return [
    'interpolate',
    ['linear'],
    ['line-progress'],
    0,
    ROUTE_LINE_COLOR,
    p - epsilon,
    ROUTE_LINE_COLOR,
    p + epsilon,
    ROUTE_LINE_TRANSPARENT,
    1,
    ROUTE_LINE_TRANSPARENT,
  ]
}
