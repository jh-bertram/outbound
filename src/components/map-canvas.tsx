import { Map, MapProvider, type StyleSpecification } from '@vis.gl/react-maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ParkMarkersLayer } from './park-markers-layer'
import { RouteAndDotsLayer } from './route-and-dots-layer'
import { ParkDetailPanel } from './park-detail-panel'
import { TripPanel } from './trip-panel'
import { ItineraryPanel } from './itinerary-panel'
import { DotLegend } from './dot-legend'

/**
 * Full-viewport MapLibre canvas — the app's permanent base layer
 * (DESIGN.md Constitution: "the map is the permanent full-viewport
 * canvas"). outbound-p1-fe-02a mounts the canvas with a MINIMAL
 * placeholder style (no sources/layers) purely so `<Map>`'s children get a
 * working MapContext to attach to (`useMap()`, `<Marker>`, `<Source>`,
 * `<Layer>`). The real Liberty basemap + Terrarium hillshade + globe intro
 * + Fort Collins fly-in land in outbound-p1-fe-02b — the PM-approved
 * SECOND and LAST writer of this file (PM amend routing_notes B3:
 * "map-canvas.tsx [fe-02a creates -> fe-02b enriches]"). Do not add
 * basemap/aesthetic decisions here.
 *
 * The six sibling slot components are mounted as children of `<Map>`
 * (not as page-level siblings) so each has direct MapContext access for
 * its own future `<Marker>`/`<Source>`/`<Layer>` work, and so fe-04..08
 * each touch exactly ONE disjoint file without ever re-opening this
 * composition root.
 *
 * Resize: maplibre-gl's own internal ResizeObserver (see
 * `@vis.gl/react-maplibre`'s `maplibre/maplibre.js`) watches the map
 * container and calls `map.resize()` automatically whenever it changes
 * size — the full-viewport CSS on the container (`src/App.tsx`) is the
 * only resize wiring this task needs to provide.
 */

// Matches the packet's literal placeholder spec. This also happens to
// equal @vis.gl/react-maplibre's own internal DEFAULT_STYLE, but is
// declared explicitly (rather than omitted) so the placeholder reads as a
// documented, traceable decision instead of an implicit library default.
const PLACEHOLDER_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
}

export function MapCanvas() {
  return (
    <MapProvider>
      <Map id="outbound-map" mapStyle={PLACEHOLDER_STYLE}>
        <ParkMarkersLayer />
        <RouteAndDotsLayer />
        <ParkDetailPanel />
        <TripPanel />
        <ItineraryPanel />
        <DotLegend />
      </Map>
    </MapProvider>
  )
}
