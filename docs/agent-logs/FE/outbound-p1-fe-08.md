## [STAGE 1] RECEIVED
- **From:** ORC
- **At:** 2026-07-12T00:37:35Z
- **Task ID:** outbound-p1-fe-08
- **Message received:**
  > You are FE#9 executing task packet `outbound-p1-fe-08` (Wave 6 — the sprint's FINAL implementation packet, blocks GATE-AUDIT) of sprint outbound-p1-mvp.
  >
  > **Working directory:** /home/jhber/projects/outbound
  >
  > ## Task
  > Read `.claude/tasks/outputs/outbound-p1-mvp-amend-PM-1783792028.md` and execute the `<task_packet>` with `<task_id>outbound-p1-fe-08</task_id>` EXACTLY as written — single source of truth. Scope summary: implement `src/components/itinerary-panel.tsx` (fe-02a's last null slot — your file now): the day-by-day itinerary for the current trip chain via fe-03's `buildItinerary` — every drive leg and stay block laid out day by day, INCLUDING the explicit RETURN leg row back to Fort Collins and the grand total via fe-03 (manifest receipt), would-add-N-days suggestions REUSING fe-07's suggestion logic (do not duplicate it — import/extract per the packet), drive legs ≥3 days flagged in a warning color (token), mobile presents as a full-screen overlay opened via a FAB (asserted in the spec), and `e2e/itinerary.spec.ts` green on both projects.
  >
  > ## Environment state (verified by ORC, all committed @ 21ecc6e, pushed, Pages live)
  > - Chain building works (fe-07's trip-panel via store.tripChain). Your panel renders the itinerary for store.tripChain.
  > - Consume: buildItinerary/totalTripDays/driveDays from src/lib/trip-math.ts (the return leg is already IN buildItinerary's output — render it, never recompute); matrix + parks data via the established loading patterns (check fe-05/fe-07); Dot/DayDotCluster from fe-01; tokens (warning color from the token set — check tokens.css for the sanctioned warning/alert token).
  > - fe-07's suggestion logic: check how trip-panel.tsx structures `computeNearbySuggestions` — if it is component-internal, the packet governs how you reuse it (extract to a shared lib module ONLY if the packet authorizes; otherwise import pattern). Do NOT fork-and-drift the logic silently — if extraction is needed and ambiguous, prefer extracting to src/lib/ (trip-math convention, like route-geometry.ts precedent) and document it.
  > - Playwright per R1: desktop-chrome + mobile-chrome; authoritative gate --workers=1; reuse the R4-hardened selection pattern.
  > - Entry chunk 635.06 kB against the 1 MB gate (R3 exempts maplibre only) — quote your chunk table.
  > - Wave 6 runs solo. Do not touch store/trip-math/data/configs/App.tsx or sibling components except the sanctioned fe-07 reuse path.
  > …[truncated]

## [STAGE 2] PLAN
- **At:** 2026-07-12T00:55:00Z
- **Components to build:**
  - `src/lib/nearby-suggestions.ts` (NEW) — extracted `computeNearbySuggestions` + `NearbySuggestion` + `NEARBY_MAX_HOURS`/`NEARBY_SUGGESTION_LIMIT` out of `trip-panel.tsx` (fe-07's private module-scope logic), per the ORC's "sanctioned fe-07 reuse path" carve-out and the route-geometry.ts precedent (fe-06 already split pure lib logic out of a `.tsx` slot for the same reason).
  - `src/components/trip-panel.tsx` (MINIMAL EDIT — the one sanctioned exception to "do not touch sibling components") — replace the local definitions with an import from the new shared module. No behavior change.
  - `src/components/itinerary-panel.tsx` (fe-02a's null slot — this task's primary deliverable) — day-by-day itinerary via `buildItinerary`/`totalTripDays` (fe-03), explicit return-leg row, grand total, ≥3-day warning flag (`--color-warning`), "would add N days" suggestions (reusing `computeNearbySuggestions` + `buildItinerary` diff), desktop docked Card+ScrollArea panel (stacked below trip-panel in the left rail — trip-panel always renders whenever this panel would, since a non-empty `tripChain` guarantees `trip-panel`'s anchor fallback fires), mobile FAB (top-right, unclaimed corner) opening a full-screen Shadcn `Sheet`.
  - `e2e/itinerary.spec.ts` (NEW) — fixture chains verified against the actually-shipped `drive-matrix.json`: `[arch, cany]` (return leg + total=8 + add-days suggestion `blca` +2 days) and `[dena]` (FOCO→dena 47.8h→5 days ≥3 triggers warning on BOTH the outbound and return leg; total=13; add-days suggestions `wrst` +4, `kefj` +3).
- **State design:** No new store fields (fe-03's `tripChain` read-only). All itinerary/suggestion state derived via `useMemo` in a local `useItineraryData()` hook — mirrors `useTripPlanning()`'s pattern in trip-panel.tsx.
- **tRPC wiring:** N/A — static-data app, no backend. Data sourced from `src/data/parks.ts` + `src/data/drive-matrix.ts` (both already statically imported elsewhere without chunk-budget issues; only `nps-content.json` needed the lazy-import remediation, which this panel doesn't touch).
- **A11Y plan:** `<ol>`/`<li>` semantic list for itinerary rows; warning flag uses `role="img"` + `aria-label` (mirrors `DayDotCluster`'s own pattern) plus a visible icon+text (never color alone); mobile FAB has `aria-label`+`aria-expanded`+`aria-haspopup="dialog"`; Sheet is Radix Dialog under the hood (focus trap + `role="dialog"`/`aria-modal` handled by the primitive, no hand-rolled `getFocusableElements` needed — Focus-Trap Pre-Flight N/A). Add-days suggestion badges are informational-only (no click handler), avoiding a duplicate "add to trip" mutation entry point and the keyboard-equivalent audit entirely.


### Checkpoint — 00:58:00
- Wrote `src/lib/nearby-suggestions.ts` (43 lines) — extracted verbatim from trip-panel.tsx. Constant audit: 0 raw literals (NEARBY_MAX_HOURS/NEARBY_SUGGESTION_LIMIT are the named constants). Next: edit trip-panel.tsx to import from it.
- Edited `src/components/trip-panel.tsx` (sanctioned exception) — removed local `computeNearbySuggestions`/`NearbySuggestion`/`NEARBY_MAX_HOURS`/`NEARBY_SUGGESTION_LIMIT`, added import from `@/lib/nearby-suggestions`. No behavior change. Next: write itinerary-panel.tsx.
- Wrote `src/components/itinerary-panel.tsx` (~330 lines) — day-by-day list, explicit return leg, grand total, >=3-day warning flag, add-days suggestions (reusing shared lib), desktop docked panel + mobile FAB->full-screen Sheet. Constant audit: 0 raw hex; WARNING_DRIVE_DAYS_THRESHOLD/MD_BREAKPOINT_QUERY/PANEL_ENTER_DURATION_S/PANEL_CURVE are the named constants (no duplicate inline literals). Next: typecheck/lint/build, then e2e spec.

### Checkpoint — 01:15:00
- `npm run typecheck` / `npm run lint` / `npm run test` (vitest, 21 tests, 3 files) all green.
- `npm run build`: entry `index-*.js` 665.36 kB (up from the 635.06 kB pre-task baseline, +30.3 kB for itinerary-panel.tsx + nearby-suggestions.ts + Sheet/Badge/icon imports); `nps-content-*.js` 579.18 kB (lazy, unaffected); `maplibre-gl-*.js` 1,027.75 kB (R3-exempt); `drawer-*.js` 31.71 kB (lazy). All non-maplibre chunks < 1 MB gate.
- `npx playwright test e2e/itinerary.spec.ts --workers=1`: 8 passed, 2 skipped (per-project mobile/desktop-only tests), 0 failed.
- `npx playwright test --workers=1` (FULL SUITE, all 7 spec files, both projects): 60 tests, 52 passed, 8 skipped, 0 failed.
- Constant/style/JSON.parse/click-handler audits: 0 findings in touched files (see ui_packet for grep evidence).

## [STAGE 3] COMPLETE
- **At:** 2026-07-12T01:16:00Z
- **Deliverables:**
  | File | Lines | Notes |
  |---|---|---|
  | `src/components/itinerary-panel.tsx` | 388 | Primary deliverable — implements fe-02a's null slot |
  | `src/lib/nearby-suggestions.ts` | 45 | NEW — extracted from trip-panel.tsx (sanctioned fe-07 reuse path) |
  | `src/components/trip-panel.tsx` | net -18 (12 ins / 30 del) | Sanctioned single-exception edit — import from shared lib, no behavior change |
  | `e2e/itinerary.spec.ts` | 196 | 5 tests × 2 projects, 2 skipped (mobile/desktop-conditional) |
- **Lint:** exit 0. **Typecheck:** exit 0. **Vitest:** 21/21 passed. **Playwright (full suite, --workers=1):** 52 passed / 8 skipped / 0 failed.
- **Constant audit:** 0 raw-hex/token violations in touched files (one hex literal appears only in an e2e spec comment documenting the expected computed-style value of `--color-warning`, not a source-code token bypass).
