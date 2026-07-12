import { useEffect, useState } from 'react'
import { Marker, Source, Layer } from '@vis.gl/react-maplibre'
import { animate, cubicBezier, useReducedMotion } from 'motion/react'
import { Dot, DayDotCluster } from './day-dot-cluster'
import { parks, type Park } from '@/data/parks'
import { driveMatrix } from '@/data/drive-matrix'
import { FORT_COLLINS } from '@/data/constants'
import { driveDays, FOCO_ID } from '@/lib/trip-math'
import { useOutboundStore } from '@/lib/store'
import { buildLineGradient, driveDayDotPositions, shouldCollapseToPill } from '@/lib/route-geometry'

/**
 * Slot: the selected destination's animated route line + day-marker dots
 * (BRIEF §3.5/§7.3) — the app's SIGNATURE visual. Owner: outbound-p1-fe-06.
 *
 * Rendered as a child of `<Map>` in `src/components/map-canvas.tsx`
 * (fe-02a composition root, never edited here) so this file has direct
 * MapContext access (`<Source>`/`<Layer>`/`<Marker>`).
 *
 * Consumes the ONE shared day-dot primitive (`Dot` / `DayDotCluster` from
 * `src/components/day-dot-cluster.tsx`, fe-01, W3) for every dot rendered
 * here — this file owns ROUTE GEOMETRY + POSITIONING + the animated reveal,
 * never dot appearance/stagger/pill styling itself.
 *
 * Scope (per this task's packet): the single selected destination's route +
 * stay, not multi-park trip chaining (fe-07/08 extend to chains).
 */

const ROUTE_SOURCE_ID = 'selected-route'
const ROUTE_LAYER_ID = 'selected-route-line'

// motion/react's imperative `animate()` takes numeric seconds + an
// array-form cubic-bezier, and MapLibre's `line-gradient` paint expression
// needs literal color strings — neither accepts a CSS var() string. Same
// documented one-directional token mirror already established in this
// codebase by day-dot-cluster.tsx (fe-01), map-canvas.tsx (fe-02b), and
// park-detail-panel.tsx (fe-05): no runtime getComputedStyle() read, values
// kept in sync by hand against src/styles/tokens.css.
const ROUTE_TRACE_DURATION_S = 0.9 // --motion-route-trace-duration: 900ms
const ROUTE_TRACE_EASE = cubicBezier(0.4, 0, 0.2, 1) // --motion-route-trace-curve

// No DESIGN.md route-line-width token exists (Map & Marker Tokens covers
// markers + dots only). A documented judgment call, same treatment as
// SELECTED_PARK_FLYTO_ZOOM in park-detail-panel.tsx / GLOBE_INTRO_ZOOM in
// map-canvas.tsx: thin enough not to visually compete with
// --marker-size-selected (24px) or --dot-size-md (10px) dots layered on it.
const ROUTE_LINE_WIDTH = 3

// Vertical pixel offset lifting the stay-day dot cluster clear of the
// selected marker (--marker-size-selected 24px diameter + a small margin) —
// DESIGN.md Park Markers "Selected" state: "stay-day dots animate in above
// the marker."
const STAY_DOT_CLUSTER_OFFSET: [number, number] = [0, -28]

// Nudges the paired "N driving days" text label away from the along-route
// dot it sits beside so it never overlaps the dot itself.
const DRIVE_DAY_LABEL_OFFSET: [number, number] = [0, -16]

const PARKS_BY_ID = new Map<string, Park>(parks.map((park) => [park.id, park]))

/** Animates the route reveal from 0 → 1 on mount (the caller keys its subtree by `parkId`,
 * so a new selection remounts this fresh). Reduced motion collapses straight to the final
 * state — route/dot meaning must never depend on the animation actually playing (DESIGN.md
 * Constitution) — computed at render time rather than via a synchronous `setState` inside the
 * effect (React "you might not need an effect" guidance / `react-hooks/set-state-in-effect`).
 * Sets `document.body.dataset['routeTraceSettled']` once settled, the same deterministic
 * e2e-settle-signal convention GlobeIntro / useParkDetailFlyTo already use. */
function useRouteTraceProgress(parkId: string): number {
  const prefersReducedMotion = useReducedMotion() ?? false
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) {
      document.body.dataset['routeTraceSettled'] = parkId
      return
    }

    // No explicit `setAnimatedProgress(0)` reset needed: the caller
    // (`RouteAndDotsLayer`) keys the whole `SelectedRoute` subtree by
    // `park.id`, so a new selection remounts this hook fresh — the
    // `useState(0)` initializer already starts the animation from 0.
    const controls = animate(0, 1, {
      duration: ROUTE_TRACE_DURATION_S,
      ease: ROUTE_TRACE_EASE,
      onUpdate: setAnimatedProgress,
      onComplete: () => {
        document.body.dataset['routeTraceSettled'] = parkId
      },
    })
    return () => controls.stop()
  }, [parkId, prefersReducedMotion])

  return prefersReducedMotion ? 1 : animatedProgress
}

/** GeoJSON `Source` (`lineMetrics`) + `line-gradient` `Layer` tracing FORT_COLLINS →
 * `park.routingCoord` (RA finding 11 baseline technique). */
function RouteLine({ park }: { park: Park }) {
  const progress = useRouteTraceProgress(park.id)

  const geojson = {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [FORT_COLLINS.lng, FORT_COLLINS.lat],
        [park.routingCoord.lng, park.routingCoord.lat],
      ],
    },
  }

  return (
    <Source id={ROUTE_SOURCE_ID} type="geojson" data={geojson} lineMetrics>
      <Layer
        id={ROUTE_LAYER_ID}
        type="line"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-width': ROUTE_LINE_WIDTH,
          'line-gradient': buildLineGradient(progress),
        }}
      />
    </Source>
  )
}

/** One `Dot` (fe-01 `drive` variant) per drive day, positioned along the route, paired with a
 * visible "N driving days" text label. Above the inline-count ceiling, collapses to the fe-01
 * pill instead (defensive — unreachable with the current committed matrix, see
 * `shouldCollapseToPill`'s doc comment in `src/lib/route-geometry.ts` + its test file). */
function DriveDayDots({ park, hours }: { park: Park; hours: number }) {
  const days = driveDays(hours)

  if (shouldCollapseToPill(days)) {
    const midpoint = driveDayDotPositions(FORT_COLLINS, park.routingCoord, 1)[0]
    if (!midpoint) return null
    return (
      <Marker longitude={midpoint.lng} latitude={midpoint.lat}>
        <div data-testid="route-drive-pill">
          <DayDotCluster count={days} variant="drive" size="md" />
        </div>
      </Marker>
    )
  }

  const positions = driveDayDotPositions(FORT_COLLINS, park.routingCoord, days)
  const lastPosition = positions[positions.length - 1]

  return (
    <>
      {positions.map((pos, i) => (
        <Marker key={i} longitude={pos.lng} latitude={pos.lat}>
          <span data-testid="route-drive-dot">
            <Dot variant="drive" size="md" index={i} />
          </span>
        </Marker>
      ))}
      {lastPosition && (
        <Marker longitude={lastPosition.lng} latitude={lastPosition.lat} offset={DRIVE_DAY_LABEL_OFFSET}>
          <span
            data-testid="route-drive-day-count"
            className="pointer-events-none rounded-[var(--radius-full)] bg-[var(--color-surface-elevated)] px-[var(--space-2)] py-[var(--space-1)] font-mono text-xs font-medium whitespace-nowrap text-[var(--color-text)] shadow-[var(--elevation-1)]"
          >
            {days} {days === 1 ? 'driving day' : 'driving days'}
          </span>
        </Marker>
      )}
    </>
  )
}

/** Stay-day cluster (fe-01 `stay` variant) floated above the selected marker. */
function StayDayDots({ park }: { park: Park }) {
  return (
    <Marker
      longitude={park.routingCoord.lng}
      latitude={park.routingCoord.lat}
      anchor="bottom"
      offset={STAY_DOT_CLUSTER_OFFSET}
    >
      <div data-testid="route-stay-dots" className="pointer-events-none">
        <DayDotCluster count={park.recommendedStayDays} variant="stay" size="sm" />
      </div>
    </Marker>
  )
}

function SelectedRoute({ park, hours }: { park: Park; hours: number }) {
  return (
    <>
      <RouteLine park={park} />
      <DriveDayDots park={park} hours={hours} />
      <StayDayDots park={park} />
    </>
  )
}

export function RouteAndDotsLayer() {
  const selectedId = useOutboundStore((state) => state.selectedId)
  const park = selectedId ? PARKS_BY_ID.get(selectedId) : undefined

  // Not-drivable destinations are excluded from routing (same rule fe-04's
  // markers apply to "add to trip") — info-only selection shows no route.
  if (!park || !park.drivable) return null

  const hours = driveMatrix.hours[FOCO_ID]?.[park.id]
  // Defensive empty state: every drivable destination is routed by be-04,
  // but the UI must still degrade gracefully rather than throw.
  if (hours === undefined) return null

  return <SelectedRoute key={park.id} park={park} hours={hours} />
}
