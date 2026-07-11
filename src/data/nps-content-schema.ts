import { z } from "zod";

/**
 * Zod schema for NPS Data API content, keyed by `parkCode` (the NPS join field —
 * NOT the destination `id`; Sequoia (`id: seki`) and Kings Canyon (`id: seki-kica`)
 * both join to the single `seki` record here).
 *
 * Field shapes were derived from a LIVE snapshot of `/parks?parkCode=romo` and
 * `/campgrounds?parkCode=romo`, saved at `scripts/nps-snapshot/romo-parks.json` /
 * `scripts/nps-snapshot/romo-campgrounds.json` (fetched 2026-07-11T19:41:10Z),
 * BEFORE this schema was authored — see scripts/fetch-nps-content.ts header comment.
 *
 * Kept in its own module (no JSON import) so it can be imported from BOTH the
 * `bundler`-resolution app code (src/data/nps-content.ts) and the `nodenext`-
 * resolution build script (scripts/fetch-nps-content.ts) without either program
 * pulling nps-content.json across the module-mode boundary.
 */
const NpsImageSchema = z.object({
  url: z.string(),
  altText: z.string(),
  caption: z.string(),
  title: z.string(),
  credit: z.string(),
});

const NpsActivitySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const NpsEntranceFeeSchema = z.object({
  cost: z.string(),
  description: z.string(),
  title: z.string(),
});

/** Link-out only (BRIEF §2 non-goal: no booking flow) — url (NPS page) + reservationUrl (recreation.gov). */
const NpsCampgroundSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  reservationUrl: z.string(),
  description: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});

export const NpsParkContentSchema = z.object({
  parkCode: z.string().min(1),
  fullName: z.string(),
  description: z.string(),
  url: z.string(),
  designation: z.string(),
  images: z.array(NpsImageSchema).default([]),
  activities: z.array(NpsActivitySchema).default([]),
  entranceFees: z.array(NpsEntranceFeeSchema).default([]),
  campgrounds: z.array(NpsCampgroundSchema).default([]),
});

export type NpsParkContent = z.infer<typeof NpsParkContentSchema>;

/** Top-level content map: parkCode -> content. 62 distinct parkCodes (be-02 dataset). */
export const NpsContentSchema = z.record(z.string(), NpsParkContentSchema);

export type NpsContent = z.infer<typeof NpsContentSchema>;
