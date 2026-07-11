# Outbound — Product Brief

**Project:** Outbound — national-park road-trip explorer
**Author:** Jonathan Bertram (human), transcribed 2026-07-11
**Status:** Canonical build brief. This document is the source of truth for what to build.

---

## 1. One-paragraph pitch

A visually rich, animated map of all US national parks used to explore and plan road
trips from **Fort Collins, Colorado**. We car-camp in a Subaru Outback and drive at most
**10 hours per day**. Selecting a park shows how many days it takes to drive there, park
info, and the minimum recommended stay. Nearby parks can be chained on to extend one trip
into another. Every route and destination communicates its time cost with **day-marker
dots** — two dots on a route means a two-day drive; three dots on Arches means a
recommended three-day stay.

## 2. The user and the trip model

- One user (the human + family), no accounts, no multi-tenancy.
- Home base is fixed: **Fort Collins, CO — 40.5853° N, 105.0844° W**. All trips start
  and end there.
- Travel is by car only (Subaru Outback). Car camping, so campground availability at or
  near each park is relevant info, not a booking feature — **link out** to campground
  pages (NPS campground pages / recreation.gov), don't build reservations.
- **10-hour max driving day** is the fundamental unit:
  - A park 14 driving hours away is a **2-day drive** (e.g. 10 h + 4 h).
  - Day count for a leg = `ceil(drive_hours / 10)`.
  - Drive hours should be realistic road-time estimates, not straight-line distance.
- A **trip** = ordered chain: Fort Collins → Park A → Park B → … → Fort Collins.
  Total trip length in days = sum of all drive-leg days + sum of stay days at each park.
  The return leg to Fort Collins is always counted and shown.

## 3. Core interactions (the spec, in the human's own structure)

1. **Map of all national parks.** All 63 US national parks plotted on an interactive
   map. Parks unreachable by road from Colorado (Hawaii, American Samoa, Virgin Islands,
   most Alaska parks) still appear but are visually distinguished as not-drivable and
   excluded from routing.
2. **Select a park →** see:
   - How many **drive days** from Fort Collins (with total drive hours).
   - Park information: name, description, standout features, photos.
   - **Minimum recommended stay** in days (curated per park — e.g. Arches 3 days,
     Yellowstone 4, Great Sand Dunes 2).
   - Link(s) to campground information.
3. **Extend the trip.** From a selected park, see **nearby parks** with the incremental
   drive (hours → days) to each, and add them to the chain. This is how a Utah "Mighty
   5" style multi-park loop gets built.
4. **Click the first park → travel itinerary.** A day-by-day itinerary for the whole
   chain: Day 1–2 drive to Arches, Day 3–5 at Arches, Day 6 drive to Canyonlands, …,
   final days drive home. Alongside the itinerary, show suggestions for how many days
   other (nearby, not-yet-added) parks would add.
5. **Day-marker dots.** When a route or destination is highlighted:
   - Drive leg → one dot per drive day, rendered along the route (2 dots = 2-day drive).
   - Park stay → one dot per recommended stay day at the park marker (3 dots = 3 days
     at Arches).
   - Dots are the at-a-glance language of the app; they should animate in when a
     route/park is highlighted.
6. **Visually appealing and animated FIRST.** This is a primary requirement:
   - Smooth map fly-to/zoom transitions on selection.
   - Animated route drawing (path traces from origin to destination).
   - Photo + description popups/cards with tasteful motion.
   - The app should feel like a piece of trip-dreaming software, not a data dashboard.

## 4. Data requirements

| Data | Source | Notes |
|---|---|---|
| Park list, coords, designation | Static curated JSON (63 parks) | Small, stable; hand-curate with cited sources |
| Descriptions, photos, activities | **NPS Data API** (`api.nps.gov`, free key) | Public-domain text/imagery; fetch at build time into static JSON to keep the app static-deployable |
| Campgrounds | NPS API `/campgrounds` + recreation.gov links | Link out only |
| Drive times (FoCo→park, park→park) | Precomputed matrix, checked into repo as static JSON | See DATA-NOTES.md for options (OSRM/ORS precompute vs. estimated road-factor model). Must be road-realistic. |
| Recommended stay days | Curated per park (1–5 days) | Judgment call informed by park size/major sights; store rationale per park |

No backend is required if drive times and NPS content are precomputed to static JSON —
a fully static site is the preferred architecture (free hosting, no keys in the client).
A small build-time script (with the NPS key in `.env`) regenerates the data.

## 5. Tech direction (proposed — validate before scaffolding)

- **Vite + React + TypeScript (strict)** — per house standards.
- **Map:** MapLibre GL JS (free, no token, vector tiles, smooth camera animation —
  fits "animated first") with a visually distinctive basemap style. Alternative:
  Leaflet if research finds MapLibre overkill.
- **Animation:** Framer Motion for UI/cards; MapLibre camera + line-gradient/dash
  animation for route tracing.
- **State:** lightweight (Zustand or React context) — trip chain, selection, UI state.
- **Data validation:** Zod schemas for the park/drive-time JSON at load boundary.
- **Deploy:** static (GitHub Pages / Netlify / Vercel) — decide during build.
- Research agent should verify current MapLibre/Framer Motion versions and the NPS API
  shape before implementation (scry-style preflight), not trust training data.

## 6. Explicit non-goals (v1)

- No reservations/booking, no auth/accounts, no mobile app, no offline mode.
- No live traffic — precomputed typical drive times are fine.
- No lodging other than campgrounds; no restaurant/fuel POIs.
- No route optimization/TSP solving — the human chains parks manually; the app just
  accounts the days honestly.

## 7. Success criteria

1. Map renders all 63 parks; drivable vs not-drivable visually distinct.
2. Selecting any drivable park shows drive days (with hours), description, photos,
   recommended stay days, and campground link(s) — with animated fly-to and popup.
3. Highlighted routes/parks show correct day-marker dots (drive dots = `ceil(hours/10)`,
   stay dots = curated recommendation), animated in.
4. A chained multi-park trip produces a correct day-by-day itinerary including the
   return leg, and surfaces nearby-park extension suggestions with their day costs.
5. Drive-time sanity checks pass: e.g. FoCo→Rocky Mountain NP < 2 h (1 drive day),
   FoCo→Arches ≈ 5–6 h (1 day), FoCo→Yosemite ≈ 15–17 h (2 days), FoCo→Acadia ≈ 30+ h
   (3–4 days). Wildly wrong drive times are a FAIL even if the UI is beautiful.
6. The app is animated and visually appealing per §3.6 — audited by actually viewing
   it (Playwright screenshots / human review), not by code inspection alone.
