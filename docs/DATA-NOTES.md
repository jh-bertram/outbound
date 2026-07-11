# Outbound — Data Sourcing Notes

Working notes for the data-foundation phase (P1). The build brief (`BRIEF.md` §4) is
canonical; this file expands the how.

## NPS Data API

- Docs: https://www.nps.gov/subjects/developer/api-documentation.htm
- Free API key via instant signup; **human obtains the key** and puts it in `.env`
  as `NPS_API_KEY`. Never committed, never shipped to the client.
- Relevant endpoints: `/parks` (descriptions, images, coordinates, designation,
  activities, entrance fees), `/campgrounds` (per-park campground details + URLs).
- Filter to designation "National Park" (the 63) — the API returns all ~470 NPS units,
  so filter by park code list, not by string matching alone.
- Usage pattern: a build-time fetch script writes `src/data/parks.json` (or similar)
  so the deployed site is fully static. Re-run the script to refresh content.

## Drive-time matrix

Two viable approaches — the pipeline should pick one after a quick research pass:

1. **Precompute with a real router (preferred).** OSRM demo server or OpenRouteService
   (free key, 2 500 req/day) — one-time matrix job: Fort Collins → each drivable park,
   plus park→park for pairs within a plausible chaining radius (say < 12 h). Store as
   static JSON with a generation timestamp. ~50 drivable parks → matrix is small.
   Use each park's main visitor-center or entrance coordinates as the routing target,
   not the geographic centroid (centroids of big parks land off-road).
2. **Estimated model (fallback).** Haversine distance × road-circuity factor (~1.2–1.3)
   ÷ average speed (~55–60 mph interstate-weighted). Cheaper but must still pass the
   sanity checks in BRIEF §7.5.

Either way: `drive_days = ceil(hours / 10)`, and store raw hours so the UI can show
"14 h — 2 driving days".

## Not-drivable parks

Mark explicitly in the dataset (`drivable: false`): all Hawaii parks, American Samoa,
Virgin Islands, and Alaska parks not on the road system (Gates of the Arctic, Lake Clark,
Katmai, Kobuk Valley, Glacier Bay). Denali and Wrangell–St. Elias are technically road-
reachable but ~50+ hours — include them as drivable with honest day counts.

## Recommended stay days

Curated field, one integer (1–5) per park, with a one-line rationale kept in the dataset
(e.g. Yellowstone: 4 — "geyser basins, canyon, Lamar wildlife each half-day-plus").
Seed from park size + number of major districts; the human can tune values later, so
keep them in an easily editable JSON/TS file, not scattered through code.
