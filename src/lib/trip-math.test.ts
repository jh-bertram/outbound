import { describe, expect, it } from "vitest";
import { FOCO_ID, buildItinerary, driveDays, totalTripDays } from "./trip-math";

describe("driveDays", () => {
  it("ceils 14 hours to 2 drive days", () => {
    expect(driveDays(14)).toBe(2);
  });

  it("ceils exactly 10 hours to 1 drive day", () => {
    expect(driveDays(10)).toBe(1);
  });

  it("ceils a fractional 0.5 hours up to 1 drive day", () => {
    expect(driveDays(0.5)).toBe(1);
  });
});

describe("buildItinerary", () => {
  // Fixture drive-hours table keyed by "fromId->toId", standing in for the
  // injected drive matrix. FoCo -> A = 14h (2 days), A -> B = 6h (1 day),
  // B -> FoCo (return leg) = 20h (2 days).
  const hoursTable: Record<string, number> = {
    [`${FOCO_ID}->A`]: 14,
    [`A->${FOCO_ID}`]: 14,
    [`${FOCO_ID}->B`]: 18,
    [`B->${FOCO_ID}`]: 20,
    "A->B": 6,
    "B->A": 6,
  };
  const getHoursBetween = (fromId: string, toId: string): number => {
    const hours = hoursTable[`${fromId}->${toId}`];
    if (hours === undefined) {
      throw new Error(`no fixture hours for ${fromId}->${toId}`);
    }
    return hours;
  };
  const stayDaysTable: Record<string, number> = { A: 3, B: 2 };
  const getStayDays = (id: string): number => stayDaysTable[id] ?? 0;

  it("includes an explicit return leg as the final item, targeting Fort Collins", () => {
    const itinerary = buildItinerary(["A", "B"], getHoursBetween, getStayDays);
    expect(itinerary.length).toBeGreaterThan(0);
    const last = itinerary.at(-1);
    expect(last).toBeDefined();
    expect(last).toMatchObject({ type: "drive", fromId: "B", toId: FOCO_ID });
  });

  it("produces correct per-leg drive days and per-destination stay days", () => {
    const itinerary = buildItinerary(["A", "B"], getHoursBetween, getStayDays);
    expect(itinerary).toEqual([
      { type: "drive", fromId: FOCO_ID, toId: "A", hours: 14, days: 2 },
      { type: "stay", id: "A", days: 3 },
      { type: "drive", fromId: "A", toId: "B", hours: 6, days: 1 },
      { type: "stay", id: "B", days: 2 },
      { type: "drive", fromId: "B", toId: FOCO_ID, hours: 20, days: 2 },
    ]);
  });

  it("computes totalTripDays as the sum of all drive-leg days (incl. return) plus all stay days", () => {
    const itinerary = buildItinerary(["A", "B"], getHoursBetween, getStayDays);
    // drive days: 2 (FoCo->A) + 1 (A->B) + 2 (B->FoCo) = 5
    // stay days: 3 (A) + 2 (B) = 5
    // total: 10
    expect(totalTripDays(itinerary)).toBe(10);
  });
});
