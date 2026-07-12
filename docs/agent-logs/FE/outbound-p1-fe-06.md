## [STAGE 1] RECEIVED
- **From:** ORC (via task packet dispatch)
- **At:** 2026-07-11T23:16:30Z
- **Task ID:** outbound-p1-fe-06
- **Message received:**
  > You are FE#7 executing task packet `outbound-p1-fe-06` (Wave 4b) of sprint outbound-p1-mvp. Read `.claude/tasks/outputs/outbound-p1-mvp-amend-PM-1783792028.md` and execute the `<task_packet>` with `<task_id>outbound-p1-fe-06</task_id>` EXACTLY as written — single source of truth. Scope summary: implement `src/components/route-and-dots-layer.tsx` (fe-02a's null slot — your file now): the SIGNATURE VISUAL of the product — on park select, an animated line-gradient route from Fort Collins to the park (lineMetrics-based gradient animation), one dot per DRIVE day along the route (= fe-03 `driveDays(hours)` from be-04's matrix), stay-day dots at the park (= recommendedStayDays via fe-01's dot primitive — never fork it), the >5-day count pill, a legend (`src/components/dot-legend.tsx` is also your slot if the packet says so — follow the packet), reduced-motion collapses animation to final state, and `e2e/day-dots.spec.ts` green on both projects. Environment state (verified by ORC): fe-05's detail panel now fly-tos and shows drive/stay stats; consume FORT_COLLINS, drive-matrix, driveDays, Dot/DayDotCluster, tokens.css. Playwright per R1 desktop-chrome+mobile-chrome, AUTHORITATIVE gate --workers=1. BUNDLE DISCIPLINE hard constraint (entry chunk 552.26kB vs 1MB gate, only maplibre-gl exempt). Wave 4b runs solo — do not touch other components/store/trip-math/data/configs/App.tsx. …[truncated]

## [STAGE 2] PLAN
- **At:** 2026-07-11T23:30:00Z
- **Components to build:**
  - `src/components/route-and-dots-layer.tsx` (fe-02a slot, currently null) — animated FoCo→destination route (GeoJSON `Source lineMetrics` + `line-gradient` Layer, progress driven by `motion/react`'s imperative `animate()`), drive-day dots positioned along the straight line via the fe-01 `Dot` primitive (`drive` variant), a paired numeric "N driving days" label, a `>5`-day pill fallback (delegates to fe-01 `DayDotCluster`, unreachable with today's committed matrix — max FoCo leg is Denali at 5 days — but implemented defensively + unit-proven), and a stay-day `DayDotCluster` (`stay` variant) positioned above the selected marker.
  - `src/components/dot-legend.tsx` (fe-02a slot, currently null) — persistent bottom-left legend at `>=sm` (640px), tap-to-reveal info chip below `sm`, shadcn `<Tooltip>` (locally wrapped in its own `<TooltipProvider>`, no global provider exists yet) for drive/stay dot-meaning text.
  - `src/components/route-and-dots-layer.test.ts` — vitest unit tests for the pure, exported geometry/threshold helpers (`shouldCollapseToPill`, `driveDayDotPositions`, `buildLineGradient`), including a synthetic 6-day case proving the `>5` pill threshold that no real destination can currently trigger.
  - `e2e/day-dots.spec.ts` — Playwright spec (reuses the `page.evaluate` + `dispatchEvent('click')` marker-selection helper pattern from `markers.spec.ts`/`park-detail.spec.ts`, duplicated per that established precedent).
- **State design:** No store edits. Reads `selectedId` only (existing fe-03 `useOutboundStore` selector). No new local component state beyond route-trace animation progress and the mobile legend chip's open/closed boolean.
- **tRPC wiring:** N/A (static-data app). Data wiring: `parks`/`Park` (`@/data/parks`), `driveMatrix` (`@/data/drive-matrix`, already statically imported elsewhere at ~91 KB — fine, unlike the 723 KB nps-content.json fe-05 had to lazy-load), `FORT_COLLINS` (`@/data/constants`), `driveDays`/`FOCO_ID` (`@/lib/trip-math`), `useOutboundStore` (`@/lib/store`), `Dot`/`DayDotCluster` (`./day-dot-cluster`, fe-01 primitive — consumed, never forked).
- **A11Y plan:** Along-route dots stay `aria-hidden` (per the fe-01 `Dot` primitive's own convention) with a paired *visible* "N driving days" text label (DESIGN.md Constitution "dots read first, the number confirms"). Stay-day cluster reuses `DayDotCluster`'s own `role="img"` + `aria-label`. Legend: mobile chip is a real `<button aria-expanded aria-label>` (native keyboard support, no span+onClick pattern); desktop swatches use Radix `<Tooltip>` triggers (hover AND focus-operable by default, no manual keydown wiring needed). No raw `<span onClick>`/`<div onClick>` planned — will grep after writing to confirm.

### Checkpoint — 23:34:00
- Wrote `src/components/route-and-dots-layer.tsx` (289 lines). Constant audit: pending (run after all files written). Next: `src/components/dot-legend.tsx`.

### Checkpoint — 23:41:00
- Wrote `src/components/dot-legend.tsx` (104 lines). Constant audit: pending. Next: vitest unit test for the pure geometry/threshold helpers, then e2e/day-dots.spec.ts, then typecheck/build/lint/test.

### Checkpoint — 23:48:00
- Wrote `src/components/route-and-dots-layer.test.ts` (78 lines) and `e2e/day-dots.spec.ts` (109 lines). Constant audit: pending. Next: typecheck/build/lint/test/e2e.

### Checkpoint — 23:58:00
- `npm run lint` initially FAILed on `route-and-dots-layer.tsx`: (1) `react-refresh/only-export-components` — the file exported pure helpers alongside the `RouteAndDotsLayer` component, breaking Fast Refresh; (2) `react-hooks/set-state-in-effect` — a synchronous `setProgress()` call in the route-trace effect. Fixed by extracting the pure helpers (`shouldCollapseToPill`, `driveDayDotPositions`, `buildLineGradient`) into a new `src/lib/route-geometry.ts` module (mirrors the existing `src/lib/trip-math.ts` "pure logic in src/lib/" convention — a necessary micro-addition beyond the two named slot files, flagged in the ui_packet) and its test moved to `src/lib/route-geometry.test.ts`; and by deriving the reduced-motion `progress` value at render time (`prefersReducedMotion ? 1 : animatedProgress`) instead of calling `setState` synchronously inside the effect. `npm run typecheck` + `npm run lint` now both clean (0 errors). `npm run test -- --run`: 3 files, 21 tests, all passed. `npm run build`: entry chunk 610.25 kB (was 552.26 kB pre-task, +58 kB for the new route/dots/legend/tooltip code — still well under the 1 MB non-maplibre gate); maplibre-gl chunk 1,027.75 kB (R3-exempt); nps-content 579.18 kB (unchanged, still lazy); drawer 52.05 kB (unchanged, still lazy). Next: e2e/day-dots.spec.ts + full e2e suite at --workers=1.

### Checkpoint — 00:10:00
- e2e/day-dots.spec.ts full run at `--workers=1`: 10 passed / 2 correctly skipped (desktop-only + mobile-only describe blocks), both projects — but the FIRST run surfaced a genuine pre-existing issue: `gotoSettled()`'s wait on `document.body.dataset['flytoSettled']` (set by fe-02b's `map-canvas.tsx` GlobeIntro) never resolves under Playwright's `reducedMotion: 'reduce'` emulation in this sandbox (confirmed in isolation with a throwaway debug script, `flytoSettled` stays `undefined` after 10s; not a flake — reproducible). Root-caused to fe-02b's `map-canvas.tsx` (out of this task's file boundary — NOT edited). Worked around entirely within my own spec: the reduced-motion test no longer calls `gotoSettled()`; it waits directly for the target marker via `selectMarkerById`'s own `toHaveCount(1)` poll (markers render independently of the globe-intro fly-to settling) instead. My OWN `routeTraceSettled` flag was verified to fire correctly under the same reduced-motion emulation (confirmed via the same debug script). Flagging the `flytoSettled`/reduced-motion interaction as a pre-existing fe-02b issue in the ui_packet, not fixed here.
- FULL e2e suite (all 5 spec files) at `--workers=1`: 36 passed / 6 skipped, 0 failed, both projects (`~3.4m`).
- `npm run build`: entry chunk 610.25 kB (< 1 MB gate); maplibre-gl 1,027.75 kB (R3-exempt); nps-content 579.18 kB (lazy, unchanged); drawer 52.05 kB (lazy, unchanged). Chunk table quoted in ui_packet.

### Checkpoint — 00:20:00
- Ran the full constant/DRY audit (raw hex grep, click-handler keyboard audit, inline-style/Tailwind conflict grep, function-body dedup grep, JSON.parse grep) across all touched files. Findings: one raw hex literal (`ROUTE_LINE_COLOR = '#c1502e'` in `src/lib/route-geometry.ts`, mirroring `--dot-color-drive`/`--color-accent-rust`) — documented, single-definition, follows the codebase's precedented MapLibre/motion token-mirror pattern (paint expressions and motion/react's imperative API cannot consume CSS `var()`). No span/div/li/a with onClick (only a real `<button>` in dot-legend.tsx). No inline `style="..."` attributes. No repeated inline handler bodies. No `JSON.parse` in any touched file. `git status` confirms only the two slot files + the new `src/lib/route-geometry.{ts,test.ts}` (ESLint-forced extraction, documented) + `e2e/day-dots.spec.ts` + this log changed — no edits to App.tsx/map-canvas.tsx/store.ts/trip-math.ts/markers/detail-card/data files/configs.

## [STAGE 3] COMPLETE
- **At:** 2026-07-12T00:22:00Z
- **Deliverables:**
  | File | Lines | Notes |
  |---|---|---|
  | `src/components/route-and-dots-layer.tsx` | 213 | fe-02a slot, implemented: animated route + drive/stay dots |
  | `src/components/dot-legend.tsx` | 101 | fe-02a slot, implemented: persistent/collapsible legend |
  | `src/lib/route-geometry.ts` | 104 | new — pure geometry/threshold helpers (ESLint fast-refresh extraction) |
  | `src/lib/route-geometry.test.ts` | 76 | new — vitest unit tests for the above |
  | `e2e/day-dots.spec.ts` | 129 | new — Playwright spec, 6 tests × 2 projects |
- **Lint:** exit 0 (clean, after fixing 2 initial errors — see checkpoints above).
- **Constant audit:** 1 documented hex mirror (`ROUTE_LINE_COLOR`, precedented pattern), 0 unresolved DRY violations.

