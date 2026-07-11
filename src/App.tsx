import { MapCanvas } from './components/map-canvas'

/**
 * Composition root (outbound-p1-fe-02a — PM amend routing_notes B3: sole
 * creator of App.tsx / map-canvas.tsx / the six null slot files).
 *
 * Mounts the full-viewport map canvas per DESIGN.md Constitution ("the map
 * is the permanent full-viewport canvas ... never an opaque header/sidebar
 * that boxes the map in"). All later feature UI (markers, panels,
 * itinerary) attaches inside MapCanvas's six slot components — this file
 * is frozen after fe-02b's second/last write to map-canvas.tsx; fe-04..08
 * each own exactly ONE disjoint slot file and must never edit App.tsx.
 */
function App() {
  return (
    <main data-testid="map-canvas-root" className="fixed inset-0 overflow-hidden">
      <MapCanvas />
    </main>
  )
}

export default App
