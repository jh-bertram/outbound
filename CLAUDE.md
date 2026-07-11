# CLAUDE.md — Outbound

## What this project is

**Outbound** is a national-park road-trip explorer web app. An interactive map of all
US national parks, used to visually explore and plan car-camping road trips that start
and end in **Fort Collins, Colorado**. The product spec lives in `docs/BRIEF.md` — read
it in full before any planning or implementation work.

Status: **greenfield**. No code exists yet. The stack is proposed in the brief
(§ Tech Direction) but final stack selection should be validated by research before
scaffolding.

## Hard product constraints (from the human — do not relax)

- Home base: Fort Collins, CO (40.5853° N, 105.0844° W). Every trip starts and ends there.
- Vehicle: Subaru Outback, car camping. No flights, no ferries-only destinations
  (parks unreachable by road — e.g. Hawaii, American Samoa, some Alaska parks — are shown
  on the map but marked not-drivable, never routed).
- **Max 10 hours of driving per day.** Drive legs longer than 10 h split into multi-day
  drives. This is the core unit of the whole UI.
- Day markers are the signature visual: a highlighted route shows one dot per drive day
  (2 dots = 2-day drive); a highlighted park shows one dot per recommended stay day
  (3 dots = 3 recommended days at Arches).
- Visual appeal and animation are **first-class requirements**, not polish. Photos,
  descriptions, and campground links pop up on interaction.

## Working conventions

- This project inherits the gander agent-team conventions (`~/.claude/CLAUDE.md`):
  event logging to `docs/events/`, agent outputs to `.claude/tasks/outputs/`,
  code standards from `~/.claude/rules/standards.md` (TypeScript strict, Zod at API
  boundaries, kebab-case files, Conventional Commits).
- Claude commits; the human pushes (guarded-push policy applies here as everywhere).
- Data licensing matters: use NPS-provided imagery/text (public domain) via the official
  NPS Data API rather than scraping third-party photos.

## Build phasing (suggested, PM may re-cut)

1. **P1 — Data foundation:** park dataset (63 parks: coords, drivability, recommended
   stay days), drive-time model from Fort Collins + park-to-park matrix, NPS API
   integration for descriptions/photos/campgrounds.
2. **P2 — Map MVP:** full-screen animated map, park markers, select park → drive-day
   dots + stay-day dots + info popup.
3. **P3 — Trip builder:** chain nearby parks, itinerary panel with day-by-day breakdown,
   return-leg accounting, campground links.
4. **P4 — Polish:** animation pass, photo popups, shareable/persistable trips.

## Key references

- `docs/BRIEF.md` — full product spec (canonical; on conflict with this file, BRIEF wins)
- `docs/DATA-NOTES.md` — data sourcing plan: NPS API, drive-time computation options
- NPS Data API: https://www.nps.gov/subjects/developer/api-documentation.htm
  (free API key required — human obtains it; never commit the key, use `.env`)
