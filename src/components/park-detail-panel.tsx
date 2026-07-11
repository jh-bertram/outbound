/**
 * Slot: floating detail card for the selected destination — description,
 * photos, stay-day dots, campground links, and the animated fly-to
 * (BRIEF §7.2). Owner: outbound-p1-fe-05.
 *
 * Created here as a no-op placeholder by the composition root
 * (outbound-p1-fe-02a). Rendered as a child of `<Map>` in
 * `src/components/map-canvas.tsx` so fe-05 has direct MapContext access
 * (`useMap()` for camera control) to implement this file in isolation,
 * without ever touching App.tsx / map-canvas.tsx again (anti-conflict
 * composition-root pattern — PM amend routing_notes B3).
 */
export function ParkDetailPanel() {
  return null
}
