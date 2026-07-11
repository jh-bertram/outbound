/**
 * Slot: park marker DOM overlays for all 63 destinations (drivable +
 * not-drivable, distinct states — BRIEF §7.1). Owner: outbound-p1-fe-04.
 *
 * Created here as a no-op placeholder by the composition root
 * (outbound-p1-fe-02a). Rendered as a child of `<Map>` in
 * `src/components/map-canvas.tsx` so fe-04 has direct MapContext access
 * (`<Marker>`, `useMap()`) to implement this file in isolation, without
 * ever touching App.tsx / map-canvas.tsx again (anti-conflict
 * composition-root pattern — PM amend routing_notes B3).
 */
export function ParkMarkersLayer() {
  return null
}
