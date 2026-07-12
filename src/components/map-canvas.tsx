import { useCallback, useEffect, useState } from 'react'
import { Map, MapProvider, Source, Layer, useMap } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import { MapPinOff } from 'lucide-react'
import { Card } from './ui/card'
import { ParkMarkersLayer } from './park-markers-layer'
import { RouteAndDotsLayer } from './route-and-dots-layer'
import { ParkDetailPanel } from './park-detail-panel'
import { TripPanel } from './trip-panel'
import { ItineraryPanel } from './itinerary-panel'
import { DotLegend } from './dot-legend'
import { FORT_COLLINS } from '@/data/constants'
import { useOutboundStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Full-viewport MapLibre canvas — the app's permanent base layer
 * (DESIGN.md Constitution: "the map is the permanent full-viewport
 * canvas"). outbound-p1-fe-02a mounted this file with a MINIMAL placeholder
 * style; this is outbound-p1-fe-02b, the PM-approved SECOND and LAST writer
 * (PM amend routing_notes B3), replacing the placeholder with the real
 * Liberty basemap + Terrarium hillshade + globe intro + Fort Collins fly-in
 * + the pre-selection empty-state hero.
 *
 * The six sibling slot components (fe-04..08, created null by fe-02a) stay
 * mounted as children of `<Map>` exactly as fe-02a wired them — untouched
 * by this task, same reasoning as before: direct MapContext access, and no
 * later task ever needs to reopen this composition root.
 */

// RA finding 14 (verbatim): OpenFreeMap "Liberty" — key-free,
// registration-free, production-grade vector style (MapHub since Jun 2024).
const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// RA finding 15 (verbatim): AWS open-data Terrarium terrain tiles — static
// S3, no auth. Drives the hillshade layer for the outdoorsy/park aesthetic
// DESIGN.md assumes ("Tokens assume a light, warm basemap").
const TERRARIUM_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const HILLSHADE_SOURCE_ID = 'terrain-dem'
const HILLSHADE_LAYER_ID = 'terrain-hillshade'

// Globe intro flourish (RA finding 12): start zoomed out enough for the
// globe's curvature to read, then fly in to a Fort Collins / US-West
// regional framing once the style has loaded.
const GLOBE_INTRO_ZOOM = 1.4
const FLYTO_TARGET_ZOOM = 5.3
// How close map.getZoom() must land to FLYTO_TARGET_ZOOM to count as
// "settled" for the e2e settle signal (see GlobeIntro's handleMoveEnd).
const FLYTO_SETTLE_ZOOM_TOLERANCE = 0.05

// motion/react's `cubicBezier` takes numeric control points, not a CSS
// `cubic-bezier()` string, and MapLibre's imperative `flyTo` has no
// CSS-token bridge — these mirror tokens.css `--motion-flyto-*` one-
// directionally, same documented pattern as day-dot-cluster.tsx (fe-01):
// no runtime getComputedStyle() read, values kept in sync by hand.
const FLYTO_DURATION_MS = 1400 // --motion-flyto-duration
const FLYTO_EASING = cubicBezier(0.25, 0.1, 0.25, 1) // --motion-flyto-curve
const REDUCED_MOTION_DURATION_MS = 1 // --motion-reduced-motion-override

// outbound-p1-hero-morph: DESIGN.md's Motion Tokens table has no dedicated
// token for a hero slide+shrink morph (it covers flyto/route-trace/dot/card
// only). Reusing --motion-card-enter-duration / --motion-card-curve — the
// same nearest-analogous-card-motion mirror already established by every
// other motion/react consumer in this codebase (trip-panel.tsx's
// PANEL_CURVE, park-detail-panel.tsx's CARD_CURVE, itinerary-panel.tsx's
// PANEL_CURVE all reuse this exact pair) — a documented judgment call, not
// an invented value.
const HERO_MORPH_DURATION_S = 0.32 // --motion-card-enter-duration
const HERO_MORPH_CURVE = cubicBezier(0.16, 1, 0.3, 1) // --motion-card-curve

const INITIAL_VIEW_STATE = {
  longitude: FORT_COLLINS.lng,
  latitude: FORT_COLLINS.lat,
  zoom: GLOBE_INTRO_ZOOM,
}

/**
 * Registers the globe-projection + Fort Collins fly-in intro on the raw
 * maplibre-gl Map instance. Mounted as a child of `<Map>` (not inlined in
 * `MapCanvas`) purely so it can call `useMap()` and reach that instance —
 * same reason the six feature slots are children of `<Map>` rather than
 * page-level siblings.
 *
 * `onSettle` (outbound-p1-hero-morph): fired once, the moment the fly-in
 * actually reaches its target zoom — the same instant the `flytoSettled`
 * DOM signal below is set. Wired to `EmptyStateHero`'s morph trigger via
 * `MapCanvas`'s lifted `morphed` state (see that component) rather than
 * having `EmptyStateHero` poll/observe the DOM dataset flag itself.
 */
function GlobeIntro({ onSettle }: { onSettle: () => void }) {
  const { current } = useMap()

  useEffect(() => {
    if (!current) return
    const map = current.getMap()

    // RA finding 12, quoting the MapLibre globe example verbatim: "if you
    // call setProjection before the style loads, you'll get an error" —
    // so setProjection + the fly-in are registered INSIDE a style.load
    // handler, never called eagerly.
    const startGlobeIntro = () => {
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

      map.setProjection({ type: 'globe' })
      map.flyTo({
        center: [FORT_COLLINS.lng, FORT_COLLINS.lat],
        zoom: FLYTO_TARGET_ZOOM,
        duration: prefersReducedMotion ? REDUCED_MOTION_DURATION_MS : FLYTO_DURATION_MS,
        easing: FLYTO_EASING,
      })
      // Deterministic settle signal for e2e screenshots (map-shell.spec.ts)
      // — a fixed timeout races against real network-fetched tiles under
      // parallel worker contention. `setProjection` can itself emit an
      // earlier 'moveend' (globe-switch camera nudge) before the flyTo's
      // own completion, so `.on` (not `.once`) re-checks zoom on every
      // 'moveend' and only flags settlement once the fly-in has actually
      // reached its target.
      const handleMoveEnd = () => {
        if (Math.abs(map.getZoom() - FLYTO_TARGET_ZOOM) > FLYTO_SETTLE_ZOOM_TOLERANCE) return
        document.body.dataset['flytoSettled'] = 'true'
        onSettle()
        map.off('moveend', handleMoveEnd)
      }
      map.on('moveend', handleMoveEnd)
    }

    map.on('style.load', startGlobeIntro)
    return () => {
      map.off('style.load', startGlobeIntro)
    }
  }, [current, onSettle])

  return null
}

/**
 * outbound-p1-hero-morph: fires `onInteract` once, on the first `pointerdown`
 * or `wheel` event dispatched directly on the live MapLibre WebGL canvas —
 * the ORC-documented early-trigger half of the morph's OR-condition ("the
 * fly-in settle signal OR a first user map interaction, whichever comes
 * first" — task packet § Design intent). Listens on `map.getCanvas()`
 * specifically (not `map.getContainer()`, which also wraps the marker/panel
 * overlay DOM `<Map>`'s other children render into) so clicking chrome —
 * a park marker, the trip panel, the dot legend — never counts as "map
 * interaction" here; only a genuine pan/zoom/click-through gesture on the
 * canvas itself does. Mounted as a child of `<Map>` for `useMap()` access,
 * same reasoning as `GlobeIntro`/`HillshadeOverlay` above.
 */
function FirstMapInteractionListener({ onInteract }: { onInteract: () => void }) {
  const { current } = useMap()

  useEffect(() => {
    if (!current) return
    const canvas = current.getMap().getCanvas()

    const handleInteraction = () => {
      onInteract()
      canvas.removeEventListener('pointerdown', handleInteraction)
      canvas.removeEventListener('wheel', handleInteraction)
    }

    canvas.addEventListener('pointerdown', handleInteraction, { passive: true })
    canvas.addEventListener('wheel', handleInteraction, { passive: true })
    return () => {
      canvas.removeEventListener('pointerdown', handleInteraction)
      canvas.removeEventListener('wheel', handleInteraction)
    }
  }, [current, onInteract])

  return null
}

/**
 * Resolves the id of the Liberty style's first symbol (label) layer once
 * the style has loaded, so the hillshade raster can be inserted BELOW
 * labels (`beforeId`) instead of drawn on top of them and washing out text.
 */
function useFirstSymbolLayerId(): string | undefined {
  const { current } = useMap()
  const [beforeId, setBeforeId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!current) return
    const map = current.getMap()

    const locateSymbolLayer = () => {
      const symbolLayer = (map.getStyle().layers ?? []).find((layer) => layer.type === 'symbol')
      setBeforeId(symbolLayer?.id)
    }

    if (map.isStyleLoaded()) {
      locateSymbolLayer()
    } else {
      map.once('style.load', locateSymbolLayer)
    }
  }, [current])

  return beforeId
}

/** Terrarium raster-dem source driving a hillshade layer, tucked below labels. */
function HillshadeOverlay() {
  const beforeId = useFirstSymbolLayerId()

  return (
    <Source
      id={HILLSHADE_SOURCE_ID}
      type="raster-dem"
      tiles={[TERRARIUM_TILE_URL]}
      tileSize={256}
      encoding="terrarium"
    >
      <Layer id={HILLSHADE_LAYER_ID} type="hillshade" beforeId={beforeId} />
    </Source>
  )
}

/**
 * Pre-selection empty state (DESIGN.md § Component Inventory "Empty state"
 * + Constitution's Fraunces-rationing rule: hero headline is one of the
 * three narrow uses of the display font). Hidden once a destination is
 * selected (fe-03 `selectedId`, read-only here).
 *
 * outbound-p1-hero-morph (post-close human amendment, R-011 viewing pass):
 * the human's finding was that this big centered card blocks the map on
 * initial exploration even though it doesn't stay forever. Rather than
 * unmount/remount a second "compact" element (which would flash), this is
 * ONE `motion.div` that MORPHS in place — Framer's `layout` prop drives the
 * slide-to-top + shrink-to-a-rectangle via its FLIP animation as the
 * conditional Tailwind classes below change the wrapper's margin-top
 * (position) and the Card's own padding/gap/radius (shape). Trigger: the
 * fly-in settle signal OR the first pointerdown/wheel on the live map
 * canvas, whichever comes first (`morphed`, lifted to `MapCanvas` below) —
 * OR any real park selection (see the effect below), which is itself
 * decisive map interaction and closes the "fast select→deselect before
 * either trigger fires" gap so the BIG card can never resurface on
 * deselection (task packet: "never the big card again").
 */
function EmptyStateHero({ morphed, triggerMorph }: { morphed: boolean; triggerMorph: () => void }) {
  const selectedId = useOutboundStore((state) => state.selectedId)
  const prefersReducedMotion = useReducedMotion() ?? false

  useEffect(() => {
    if (selectedId) triggerMorph()
  }, [selectedId, triggerMorph])

  if (selectedId) return null

  // Reduced motion renders the compact state directly, with no slide, and
  // never depends on `morphed`/`flytoSettled` at all — sidesteps the known
  // quirk (outbound-p1-fe-06's packet) that `flytoSettled` never resolves
  // under Playwright's `reducedMotion: 'reduce'` emulation in this sandbox.
  const compact = prefersReducedMotion || morphed

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-[var(--space-6)]">
      <motion.div
        data-testid="empty-state-hero"
        data-morph-state={compact ? 'compact' : 'big'}
        layout
        transition={{ duration: prefersReducedMotion ? 0 : HERO_MORPH_DURATION_S, ease: HERO_MORPH_CURVE }}
        className={cn('pointer-events-auto w-fit', compact ? 'mt-[var(--space-6)]' : 'mt-[25vh]')}
      >
        <Card
          className={cn(
            'flex items-center text-center shadow-[var(--elevation-2)]',
            compact
              ? 'w-fit flex-row gap-[var(--space-2)] rounded-[var(--radius-full)] px-[var(--space-4)] py-[var(--space-2)]'
              : 'mx-auto max-w-md flex-col gap-[var(--space-4)] px-[var(--space-8)] py-[var(--space-8)]',
          )}
        >
          <MapPinOff
            aria-hidden="true"
            className={cn('shrink-0 text-muted-foreground', compact ? 'size-4' : 'size-[var(--space-8)]')}
          />
          <h1
            className={cn(
              'text-foreground',
              // DESIGN.md's derived type scale (§ Typography) assigns
              // Fraunces only at the 3xl-5xl steps; the compact bar's text
              // must fit a small top rectangle, well below that floor, so
              // it drops to Inter (the table's own prescribed font below
              // 3xl) rather than shrinking Fraunces past its documented
              // range. This is still the one empty-state-hero headline the
              // Constitution's Fraunces-rationing rule permits — not a
              // second, new Fraunces use — just rendered at an Inter step
              // once compact.
              compact
                ? 'text-sm leading-none font-semibold whitespace-nowrap'
                : 'font-display text-5xl leading-[var(--line-height-heading)]',
            )}
          >
            Where to next?
          </h1>
          {!compact && (
            <p className="text-base text-muted-foreground">
              Click any pine-green marker to start planning.
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  )
}

export function MapCanvas() {
  // outbound-p1-hero-morph: lifted above `<Map>` so the same stable
  // callback can be handed to both in-map trigger sources (GlobeIntro's
  // settle signal, FirstMapInteractionListener's early-interaction signal)
  // without EmptyStateHero (a sibling of `<Map>`, not a child) needing to
  // observe the `flytoSettled` DOM dataset flag itself.
  const [morphed, setMorphed] = useState(false)
  const triggerMorph = useCallback(() => setMorphed(true), [])

  return (
    <MapProvider>
      <Map id="outbound-map" mapStyle={LIBERTY_STYLE_URL} initialViewState={INITIAL_VIEW_STATE}>
        <HillshadeOverlay />
        <GlobeIntro onSettle={triggerMorph} />
        <FirstMapInteractionListener onInteract={triggerMorph} />
        <ParkMarkersLayer />
        <RouteAndDotsLayer />
        <ParkDetailPanel />
        <TripPanel />
        <ItineraryPanel />
        <DotLegend />
      </Map>
      <EmptyStateHero morphed={morphed} triggerMorph={triggerMorph} />
    </MapProvider>
  )
}
