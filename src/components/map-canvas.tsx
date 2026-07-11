import { useEffect, useState } from 'react'
import { Map, MapProvider, Source, Layer, useMap } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cubicBezier } from 'motion/react'
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
 */
function GlobeIntro() {
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
        map.off('moveend', handleMoveEnd)
      }
      map.on('moveend', handleMoveEnd)
    }

    map.on('style.load', startGlobeIntro)
    return () => {
      map.off('style.load', startGlobeIntro)
    }
  }, [current])

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
 */
function EmptyStateHero() {
  const selectedId = useOutboundStore((state) => state.selectedId)
  if (selectedId) return null

  return (
    <div
      data-testid="empty-state-hero"
      className="pointer-events-none absolute inset-x-0 top-1/4 z-10 flex justify-center px-[var(--space-6)]"
    >
      <Card className="pointer-events-auto mx-auto flex max-w-md flex-col items-center gap-[var(--space-4)] px-[var(--space-8)] py-[var(--space-8)] text-center shadow-[var(--elevation-2)]">
        <MapPinOff aria-hidden="true" className="size-[var(--space-8)] text-muted-foreground" />
        <h1 className="font-display text-5xl leading-[var(--line-height-heading)] text-foreground">
          Where to next?
        </h1>
        <p className="text-base text-muted-foreground">
          Click any pine-green marker to start planning.
        </p>
      </Card>
    </div>
  )
}

export function MapCanvas() {
  return (
    <MapProvider>
      <Map id="outbound-map" mapStyle={LIBERTY_STYLE_URL} initialViewState={INITIAL_VIEW_STATE}>
        <HillshadeOverlay />
        <GlobeIntro />
        <ParkMarkersLayer />
        <RouteAndDotsLayer />
        <ParkDetailPanel />
        <TripPanel />
        <ItineraryPanel />
        <DotLegend />
      </Map>
      <EmptyStateHero />
    </MapProvider>
  )
}
