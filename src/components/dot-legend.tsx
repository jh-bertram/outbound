/**
 * Slot: the day-dot legend (drive-day rust vs. stay-day dusk color key,
 * DESIGN.md § Day-Marker Dots). Owner: outbound-p1-fe-06.
 *
 * Created here as a no-op placeholder by the composition root
 * (outbound-p1-fe-02a). Rendered as a child of `<Map>` in
 * `src/components/map-canvas.tsx` so fe-06 has direct MapContext access
 * to implement this file in isolation, without ever touching App.tsx /
 * map-canvas.tsx again (anti-conflict composition-root pattern — PM amend
 * routing_notes B3).
 */
export function DotLegend() {
  return null
}
