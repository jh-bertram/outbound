import { parks, type Park } from '@/data/parks'
import { driveMatrix } from '@/data/drive-matrix'

/**
 * Pure nearby-destination-suggestion logic — the single shared implementation consumed by
 * `src/components/trip-panel.tsx` (outbound-p1-fe-07, original owner) and
 * `src/components/itinerary-panel.tsx` (outbound-p1-fe-08, "would add N days" suggestions).
 *
 * Extracted here (rather than re-forked in itinerary-panel.tsx) per the outbound-p1-fe-08
 * task packet's explicit instruction: "reuse the nearby computation from fe-07 (via
 * store/shared util), do not duplicate the matrix logic." Follows the same "pure logic
 * lives in `src/lib/`, UI consumes it" convention `src/lib/trip-math.ts` (fe-03) and
 * `src/lib/route-geometry.ts` (fe-06) already established for this codebase — this module's
 * function body and constants are moved VERBATIM out of trip-panel.tsx, not re-derived.
 */

// Packet's own example ("filter to a plausible chaining radius (e.g. ≤ 12 h)"): a documented
// judgment call, not a DESIGN.md token — no nearby-suggestion-radius token exists in
// DESIGN.md's tables. Originally fe-07's local constant; moved here unchanged.
export const NEARBY_MAX_HOURS = 12
export const NEARBY_SUGGESTION_LIMIT = 5

export interface NearbySuggestion {
  park: Park
  hours: number
}

/** From `anchorId`, the nearest not-yet-chained DRIVABLE destinations within
 * `NEARBY_MAX_HOURS`, sorted nearest-first. Not-drivable destinations are excluded by the
 * `park.drivable` filter (they are also absent from `driveMatrix` rows entirely, be-04 —
 * excluded twice over, belt and suspenders). */
export function computeNearbySuggestions(anchorId: string, tripChain: string[]): NearbySuggestion[] {
  const row = driveMatrix.hours[anchorId]
  if (!row) return []

  const candidates: NearbySuggestion[] = []
  for (const park of parks) {
    if (!park.drivable || park.id === anchorId || tripChain.includes(park.id)) continue
    const hours = row[park.id]
    if (hours === undefined || hours > NEARBY_MAX_HOURS) continue
    candidates.push({ park, hours })
  }

  return candidates.sort((a, b) => a.hours - b.hours).slice(0, NEARBY_SUGGESTION_LIMIT)
}
