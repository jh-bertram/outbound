/**
 * Pure, dependency-injected trip math (§7.3/§7.4 load-bearing logic).
 *
 * This module imports NOTHING from `src/data/` — the drive matrix and stay
 * days are always supplied by the caller via the `getHoursBetween` /
 * `getStayDays` injected functions, keyed by destination `id` (the same
 * opaque id used by the store, the park dataset, and the drive matrix).
 */

/** Sentinel id representing the Fort Collins home base, matching the
 * `"FOCO"` node id convention used by the generated drive-matrix (be-04). */
export const FOCO_ID = "FOCO";

/** A single drive leg between two destination ids (or the FoCo sentinel). */
export interface DriveLeg {
  type: "drive";
  fromId: string;
  toId: string;
  hours: number;
  days: number;
}

/** A stay segment at a single destination id. */
export interface StaySegment {
  type: "stay";
  id: string;
  days: number;
}

export type ItineraryItem = DriveLeg | StaySegment;

/**
 * Convert raw drive hours into whole drive-days per the 10-hour/day rule
 * (BRIEF §2): `ceil(drive_hours / 10)`.
 */
export function driveDays(hours: number): number {
  return Math.ceil(hours / 10);
}

/**
 * Build the ordered day-by-day itinerary for a trip chain, INCLUDING the
 * return leg to Fort Collins: FoCo → chain[0] → … → chain[n] → FoCo.
 *
 * @param chain Ordered destination ids (does NOT include Fort Collins;
 *   the FoCo legs at both ends are added here).
 * @param getHoursBetween Injected lookup returning raw drive hours between
 *   two ids (either may be `FOCO_ID`). Callers typically back this with the
 *   generated drive-matrix.
 * @param getStayDays Injected lookup returning the recommended stay days
 *   for a destination id. Callers typically back this with the curated
 *   park dataset.
 */
export function buildItinerary(
  chain: string[],
  getHoursBetween: (fromId: string, toId: string) => number,
  getStayDays: (id: string) => number,
): ItineraryItem[] {
  const itinerary: ItineraryItem[] = [];
  const fullChain = [FOCO_ID, ...chain, FOCO_ID];

  for (let i = 0; i < fullChain.length - 1; i++) {
    const fromId = fullChain[i];
    const toId = fullChain[i + 1];
    if (fromId === undefined || toId === undefined) {
      // Unreachable: loop bounds (i < fullChain.length - 1) guarantee both
      // fullChain[i] and fullChain[i + 1] are in range. Guard exists only
      // to satisfy noUncheckedIndexedAccess.
      continue;
    }

    const hours = getHoursBetween(fromId, toId);
    itinerary.push({
      type: "drive",
      fromId,
      toId,
      hours,
      days: driveDays(hours),
    });

    // Add a stay segment after arriving at a real destination — but not
    // after the final return-leg arrival back at Fort Collins.
    if (toId !== FOCO_ID) {
      itinerary.push({
        type: "stay",
        id: toId,
        days: getStayDays(toId),
      });
    }
  }

  return itinerary;
}

/**
 * Total trip length in days: sum of all drive-leg days (including the
 * return leg) plus sum of all stay days.
 */
export function totalTripDays(itinerary: ItineraryItem[]): number {
  return itinerary.reduce((sum, item) => sum + item.days, 0);
}
