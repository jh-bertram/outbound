## [STAGE 1] RECEIVED
- **From:** ORC (acting as PM — direct routing, post-close human amendment)
- **At:** 2026-07-12T01:52:44Z
- **Task ID:** outbound-p1-hero-morph
- **Message received:**
  > You are FE#10 executing task `outbound-p1-hero-morph` (post-close human amendment to sprint
  > outbound-p1-mvp, from the human's R-011 viewing pass of the live app). Read
  > `.claude/tasks/outbound-p1-hero-morph.md` — it is the task packet and single source of truth
  > (human design words are canonical; the ORC trigger interpretation is refinable with
  > documented rationale). Summary: the "Where to next?" empty-state hero in
  > `src/components/map-canvas.tsx` (lines ~167-190) currently blocks the map center on initial
  > exploration. Make it: big at first is fine → then SLIDE to the top of the screen and
  > TRANSFORM into a smaller rectangle (compact, legible, token-driven bar), triggered by the
  > existing `flytoSettled` signal or the first user map interaction (pointerdown/wheel),
  > whichever comes first. Reduced-motion: compact top state without the slide. Park selected →
  > hidden (as today); after deselection → compact bar, never the big card again. …[truncated]

## [STAGE 2] PLAN
- **At:** 2026-07-12T01:58:00Z
- **Components to build:**
  - `src/components/map-canvas.tsx` — modify `EmptyStateHero` (morph logic + two visual
    states), add new local `FirstMapInteractionListener` component, add `onSettle` prop to
    existing `GlobeIntro`, lift `morphed` boolean state into `MapCanvas`.
  - `e2e/map-shell.spec.ts` — extend with morph-state assertions (big pre-settle, compact
    post-settle, early-trigger via pointerdown, center-map clickability post-morph,
    reduced-motion compact-direct, deselection-returns-compact).
- **State design:** New local `useState<boolean>` (`morphed`) in `MapCanvas`, set once via a
  stable `useCallback` (`triggerMorph`) passed to both `GlobeIntro` (`onSettle`) and the new
  `FirstMapInteractionListener` (`onInteract`); `EmptyStateHero` also self-triggers `triggerMorph`
  on any truthy `selectedId` (any real selection is itself decisive interaction — closes the
  "fast select→deselect before either trigger" gap so the big card can never resurface). No
  store.ts changes (`selectedId` continues to be the ONLY store field read here, read-only, per
  existing convention) — task scope is map-canvas.tsx + map-shell.spec.ts only.
- **tRPC wiring:** N/A (no backend in this project; static park dataset only, unrelated to this
  task).
- **A11Y plan:** No new interactive elements (hero/bar remains a passive, non-clickable
  informational card — no `onClick`, so the Click-Handler Keyboard-Equivalent Audit does not
  apply). Contrast: compact bar keeps the same `--color-text` on `--color-surface` (Card)
  pairing already verified AAA (13.87:1) at the big state — only font-size/family changes.
  Reduced-motion path renders the compact (already-final) state directly with `transition`
  duration 0, per DESIGN.md Constitution's reduced-motion rule.

### Checkpoint — 02:05:00
- Wrote `src/components/map-canvas.tsx` (336 lines, was 211). Constant audit: pending (run after
  e2e spec). typecheck/lint/vitest/build all green: `tsc -b` clean, `eslint .` clean, vitest
  21/21 passed, `vite build` succeeded (entry `index-*.js` 666.40 kB gzip 208.30 kB — non-maplibre
  chunk stays well under the 1 MB R3 gate; maplibre-gl chunk 1,027.75 kB is its own separate
  chunk, exempted by name per R3). Next: investigate the real, in-scope deselection path (no
  desktop close affordance exists in park-detail-panel.tsx today; mobile Drawer's only dismiss is
  drag-to-close, `modal={false}`, no Escape handler in vaul) before writing the deselection e2e
  assertion, then extend e2e/map-shell.spec.ts for all 4 new receipts.

### Checkpoint — 02:08:00
- Empirically probed (throwaway scripts in scratchpad + project root, all removed before
  finalizing, never committed) against a real `npm run preview` server: (1) mobile-chrome
  drag-to-dismiss on the vaul Drawer genuinely calls `setSelected(null)` — confirmed via a real
  `page.mouse` drag simulation; (2) big-state pre-settle box → compact-state post-settle box
  geometry on both desktop-chrome (box y: 180→24) and mobile-chrome (box y: 166→24); (3)
  viewport-center `elementFromPoint` resolves inside the hero pre-settle and resolves to the raw
  `<canvas>` post-settle, on both projects; (4) the early pointerdown-on-canvas trigger fires the
  morph before `flytoSettled` is set; (5) a `reducedMotion: 'reduce'` context renders compact
  (`data-morph-state="compact"`, box y=24) on first paint. Wrote `e2e/map-shell.spec.ts`
  (260 lines, was 71) encoding all 5 confirmed behaviors alongside the 3 pre-existing tests.
  Constant audit: 0 raw-hex, 0 inline-style conflicts, 0 JSON.parse. Next: run the extended file
  in isolation, then the full suite at `--workers=1` both projects.

### Checkpoint — 02:15:00
- `npx playwright test e2e/map-shell.spec.ts --workers=1`: 1 flaky failure on mobile-chrome (the
  center-unblocking test's `expect.poll` hit its default 5000ms ceiling under full-suite
  sequential load, despite the underlying behavior being deterministic in isolation — confirmed
  via a 20-sample poll probe showing a stable `{x:113,y:24,w:164,h:32}` box for 2s straight).
  Widened that one `expect.poll` call to `{ timeout: 10000 }` (documented inline) rather than
  masking it with a fixed sleep. Re-ran the FULL suite (`npx playwright test --workers=1`, all 7
  spec files, both projects): **68 tests, 59 passed, 9 skipped (all pre-existing
  project-conditional skips plus this task's own mobile-chrome-only deselection test correctly
  skipping on desktop-chrome), 0 failed**, exit code 0, 8.2m total. Killed the manually-started
  preview-server processes used for the empirical probes afterward.

## [STAGE 3] COMPLETE
- **At:** 2026-07-12T02:20:00Z
- **Deliverables:**

  | File | Lines | Notes |
  |---|---|---|
  | `src/components/map-canvas.tsx` | 335 (was 211) | `EmptyStateHero` morph (single `motion.div`, `layout` prop, two className states); new `FirstMapInteractionListener`; `GlobeIntro` gained `onSettle` prop; `morphed` state lifted into `MapCanvas`. |
  | `e2e/map-shell.spec.ts` | 260 (was 71) | 3 pre-existing tests kept/extended (1 renamed for clarity, `data-morph-state="big"` assertion added) + 5 new tests (center-unblocking + click-through, early pointerdown trigger, reduced-motion compact-direct, deselection-returns-compact, all under `test.describe`/`test.skip` as appropriate). |
  | `docs/agent-logs/FE/outbound-p1-hero-morph.md` + `latest.md` | this file | 3-stage journal, mirrored. |
  | `.claude/tasks/outputs/outbound-p1-hero-morph-FE-1783820536.md` | — | `ui_packet` deliverable. |

- **Lint:** exit 0 (`eslint .`, clean on both modified files).
- **Typecheck:** exit 0 (`tsc -b`, clean).
- **Vitest:** 21/21 passed (no regressions; no new unit tests needed — no new pure-logic module
  was extracted, morph state lives entirely in map-canvas.tsx's existing component tree, already
  covered by the e2e layer).
- **Build:** `vite build` succeeded; entry chunk 666.40 kB gzip 208.30 kB (non-maplibre, well
  under the 1 MB R3 gate); maplibre-gl chunk 1,027.75 kB separate, per R3 convention.
- **Playwright full suite (`--workers=1`, both projects):** 68 tests, 59 passed, 9 skipped
  (project-conditional, all pre-existing except this task's own deselection test correctly
  desktop-skipped), **0 failed**.
- **Constant audit:** 0 raw-hex matches, 0 inline-style/Tailwind conflicts, 0 bare `onClick` on
  span/div/li/a, 0 `JSON.parse` calls, in both modified files.
- **Git status scope:** only `src/components/map-canvas.tsx`, `e2e/map-shell.spec.ts`, this
  agent-log pair, and the `ui_packet` output file are attributable to this task — verified via
  `git status --porcelain`; `docs/SESSION-CHECKPOINT.md` / `docs/events/*.jsonl` diffs present in
  the working tree are ORC/hook-owned append-only side effects, not touched by this agent.
