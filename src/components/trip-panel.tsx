/**
 * Slot: the trip-chain builder panel — add/remove/reorder destinations and
 * nearby-park suggestions with day costs (BRIEF §7.4). Owner:
 * outbound-p1-fe-07.
 *
 * Created here as a no-op placeholder by the composition root
 * (outbound-p1-fe-02a). Rendered as a child of `<Map>` in
 * `src/components/map-canvas.tsx` so fe-07 has direct MapContext access
 * (`useMap()`) to implement this file in isolation, without ever touching
 * App.tsx / map-canvas.tsx again (anti-conflict composition-root pattern —
 * PM amend routing_notes B3).
 */
export function TripPanel() {
  return null
}
