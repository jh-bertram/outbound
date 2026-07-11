/**
 * Build-time NPS Data API content fetch. Wired into `npm run fetch-data` by be-01
 * (this script does NOT modify package.json). Enriches the curated destination
 * dataset (src/data/parks.ts) with public-domain descriptions, photos,
 * activities, entrance fees, and campground link-outs (url + reservationUrl —
 * link-out only, no booking flow per BRIEF §2), writing the committed static
 * content JSON at src/data/nps-content.json, keyed by `parkCode` (NOT
 * destination `id` — `seki` is fetched ONCE and joins both the `seki` and
 * `seki-kica` destinations downstream).
 *
 * SEQUENCE (load-bearing): a LIVE `/parks?parkCode=romo&fields=images,activities,
 * entranceFees` + `/campgrounds?parkCode=romo` snapshot was fetched and saved to
 * `scripts/nps-snapshot/romo-{parks,campgrounds}.json` BEFORE `src/data/nps-content.ts`
 * (the Zod schema) was written — the schema is derived from those observed shapes,
 * never from an assumed/trained API shape (RA finding 8). Re-fetching this script
 * does not repeat that snapshot step; the snapshot files stay committed as the
 * audit trail of what the schema was validated against.
 *
 * Auth: `X-Api-Key` HTTP header (keeps the key out of logged URLs — RA finding 2).
 * Base URL: https://developer.nps.gov/api/v1 (RA finding 1). Batching: the API
 * accepts comma-separated `parkCode` lists on both /parks and /campgrounds
 * (confirmed live), so all 62 distinct parkCodes are fetched in small batches
 * rather than 124 sequential single-park calls (politeness; 1000 req/hr limit
 * is a non-issue either way — RA finding 3).
 *
 * Re-run via `npm run fetch-data` to refresh content.
 */
import { writeFileSync } from "node:fs";
import rawParks from "../src/data/parks.json" with { type: "json" };
import { NpsContentSchema, type NpsParkContent } from "../src/data/nps-content-schema.ts";

// Read directly from the committed JSON (rather than importing src/data/parks.ts)
// to avoid pulling a `bundler`-resolution module into this script's `nodenext`
// program (TS requires a JSON import attribute under nodenext; parks.ts is
// be-02's file and is not edited here). Only the `parkCode` field is needed —
// the full curated/validated `Park` shape is be-02's concern, not re-derived here.
const parks = rawParks as { parkCode: string }[];

const NPS_API_BASE = "https://developer.nps.gov/api/v1";
const BATCH_SIZE = 15; // polite chunk size; keeps URLs short and responses small
const CONTENT_OUTPUT_PATH = new URL("../src/data/nps-content.json", import.meta.url);

/** Raw shapes as observed in the live romo snapshot (scripts/nps-snapshot/). */
interface RawNpsImage {
  url: string;
  altText: string;
  caption: string;
  title: string;
  credit: string;
}
interface RawNpsActivity {
  id: string;
  name: string;
}
interface RawNpsEntranceFee {
  cost: string;
  description: string;
  title: string;
}
interface RawNpsPark {
  parkCode: string;
  fullName: string;
  description: string;
  url: string;
  designation: string;
  images?: RawNpsImage[];
  activities?: RawNpsActivity[];
  entranceFees?: RawNpsEntranceFee[];
}
interface RawNpsCampground {
  id: string;
  name: string;
  url: string;
  reservationUrl: string;
  description: string;
  latitude?: string;
  longitude?: string;
}
interface NpsListEnvelope<T> {
  total: string | number;
  limit: string | number;
  start: string | number;
  data: T[];
}

/** Fails fast with a clear message if the key is absent (RA note). Never logged/returned. */
function requireApiKey(): string {
  process.loadEnvFile(new URL("../.env", import.meta.url));
  const key = process.env.NPS_API_KEY;
  if (!key) {
    throw new Error(
      "NPS_API_KEY is missing. Set it in .env (see docs/DATA-NOTES.md) before running `npm run fetch-data`.",
    );
  }
  return key;
}

/** Splits an array into fixed-size chunks (shared by both endpoint batchers below — DRY). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Parses an NPS numeric-string coordinate field to a number, or null if absent/unparseable. */
function parseCoord(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function fetchJson<T>(path: string, apiKey: string): Promise<T> {
  const res = await fetch(`${NPS_API_BASE}${path}`, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`NPS API request failed: ${path} -> HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchParksBatch(codes: string[], apiKey: string): Promise<RawNpsPark[]> {
  const envelope = await fetchJson<NpsListEnvelope<RawNpsPark>>(
    `/parks?parkCode=${codes.join(",")}&fields=images,activities,entranceFees&limit=${codes.length}`,
    apiKey,
  );
  return envelope.data;
}

async function fetchCampgroundsBatch(
  codes: string[],
  apiKey: string,
): Promise<RawNpsCampground[]> {
  const envelope = await fetchJson<NpsListEnvelope<RawNpsCampground & { parkCode: string }>>(
    `/campgrounds?parkCode=${codes.join(",")}&limit=500`,
    apiKey,
  );
  return envelope.data;
}

async function main(): Promise<void> {
  const apiKey = requireApiKey();

  const distinctParkCodes = [...new Set(parks.map((p) => p.parkCode))].sort();
  console.log(`Fetching NPS content for ${distinctParkCodes.length} distinct parkCodes...`);

  const batches = chunk(distinctParkCodes, BATCH_SIZE);

  const rawParks: RawNpsPark[] = [];
  for (const batch of batches) {
    rawParks.push(...(await fetchParksBatch(batch, apiKey)));
  }

  const campgroundsByCode = new Map<string, RawNpsCampground[]>();
  for (const batch of batches) {
    const raw = await fetchCampgroundsBatch(batch, apiKey);
    for (const cg of raw as (RawNpsCampground & { parkCode: string })[]) {
      const list = campgroundsByCode.get(cg.parkCode) ?? [];
      list.push(cg);
      campgroundsByCode.set(cg.parkCode, list);
    }
  }

  const content: Record<string, NpsParkContent> = {};
  for (const park of rawParks) {
    const campgrounds = (campgroundsByCode.get(park.parkCode) ?? []).map((cg) => ({
      id: cg.id,
      name: cg.name,
      url: cg.url,
      reservationUrl: cg.reservationUrl,
      description: cg.description,
      lat: parseCoord(cg.latitude),
      lng: parseCoord(cg.longitude),
    }));
    content[park.parkCode] = {
      parkCode: park.parkCode,
      fullName: park.fullName,
      description: park.description,
      url: park.url,
      designation: park.designation,
      images: park.images ?? [],
      activities: park.activities ?? [],
      entranceFees: park.entranceFees ?? [],
      campgrounds,
    };
  }

  const missing = distinctParkCodes.filter((code) => !(code in content));
  if (missing.length > 0) {
    throw new Error(`NPS API did not return data for parkCode(s): ${missing.join(", ")}`);
  }

  // Validate against the schema derived from the live romo snapshot before writing.
  const validated = NpsContentSchema.parse(content);
  writeFileSync(CONTENT_OUTPUT_PATH, JSON.stringify(validated, null, 2) + "\n");
  console.log(
    `Wrote src/data/nps-content.json with ${Object.keys(validated).length} parkCode entries.`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
