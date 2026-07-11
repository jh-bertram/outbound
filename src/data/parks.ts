import { z } from "zod";
import rawParks from "./parks.json";

/**
 * Zod schema for a single national-park destination record. See src/data/parks.json
 * for the curated 63-destination dataset this validates.
 *
 * `id` is the UNIQUE destination key used everywhere downstream (store selection,
 * matrix nodes, markers). `parkCode` is the NPS API join field and is NOT unique —
 * Sequoia (`id: "seki"`) and Kings Canyon (`id: "seki-kica"`) share `parkCode: "seki"`.
 */
export const ParkSchema = z
  .object({
    id: z.string().min(1),
    parkCode: z.string().min(1),
    fullName: z.string().min(1),
    states: z.array(z.string().min(1)).min(1),
    routingCoord: z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
    coordSource: z.string().min(1),
    drivable: z.boolean(),
    notDrivableReason: z.string().min(1).optional(),
    recommendedStayDays: z.number().int().min(1).max(5),
    stayRationale: z.string().min(1),
  })
  .refine((park) => park.drivable || Boolean(park.notDrivableReason), {
    message: "notDrivableReason is required when drivable is false",
    path: ["notDrivableReason"],
  });

export type Park = z.infer<typeof ParkSchema>;

/** Top-level dataset schema: exactly 63 destinations, every `id` unique. */
export const ParksSchema = z
  .array(ParkSchema)
  .length(63) // VERIFIED: 2026-07-11 — the 63 official US National Park units (parkCode allow-list); update after any NPS park-designation change (new park added/redesignated)
  .refine((list) => new Set(list.map((park) => park.id)).size === list.length, {
    message: "every destination id must be unique",
  });

/**
 * Parsed + validated destination dataset. Throws at module load if parks.json
 * violates the schema (shape, id uniqueness, or the 63-record count).
 */
export const parks: Park[] = ParksSchema.parse(rawParks);
