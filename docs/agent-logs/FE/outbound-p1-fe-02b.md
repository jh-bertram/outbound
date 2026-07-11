## [STAGE 1] RECEIVED
- **From:** ORC
- **At:** 2026-07-11T20:05:13Z
- **Task ID:** outbound-p1-fe-02b
- **Message received:**
  > Read `.claude/tasks/outputs/outbound-p1-mvp-amend-PM-1783792028.md` and execute the `<task_packet>` with `<task_id>outbound-p1-fe-02b</task_id>` EXACTLY as written — single source of truth. This is the SECOND (planned, CR#2-approved) write of `src/components/map-canvas.tsx`: replace fe-02a's placeholder style with the real map shell. The style/tile URLs MUST match the RA evidence-brief literals exactly (RA brief: `.claude/tasks/outputs/outbound-p1-mvp-RA-1783789452.md` — Liberty style + Terrarium hillshade sections). Globe projection + fly-in animation wired INSIDE the style.load event (manifest receipt). Empty-state hero overlay in Fraunces (DESIGN.md tokens via the fe-01 layer — no raw hex), and `e2e/map-shell.spec.ts` with desktop AND mobile screenshots.
  >
  > ORC RULING R1 — additional authorized scope: amend `playwright.config.ts` additively to add a `mobile-chrome` project (chromium engine, iPhone-14-class viewport) and gate `mobile-safari` behind `PW_WEBKIT=1`.
  >
  > Environment: fe-02a (fbe9da4) committed placeholder map-canvas.tsx + six null slots + map-mount.spec.ts (3/3 desktop). fe-01 tokens (3e571a2), fe-03 store (8656e78), be-02 parks (9b07724), be-03 nps-content (6026c08), be-04 drive-matrix (44e60a6) all committed. Wave-2b runs SOLO.
  >
  > Constraints: NO git operations. Do not touch package.json, store, trip-math, data files, deploy.yml, App.tsx. Surface = map-canvas.tsx + spec + R1 config amendment + packet-named files. …[truncated]

## [STAGE 2] PLAN
- **At:** 2026-07-11T20:18:00Z
- **Components to build:**
  - `src/components/map-canvas.tsx` (rewrite, second/last writer) — Liberty style + Terrarium
    hillshade (dynamic `beforeId` = first symbol layer so labels stay legible) + globe
    projection/fly-in registered inside a raw `style.load` handler + empty-state hero (Shadcn
    `Card`, Fraunces 5xl, `map-pin-off` icon, tokens only). Six frozen slots + `App.tsx` untouched.
  - `playwright.config.ts` (additive amend, R1) — new `mobile-chrome` project (Desktop-engine
    chromium + iPhone-14 viewport/device descriptor), `mobile-safari` gated behind
    `process.env.PW_WEBKIT === '1'`.
  - `e2e/map-shell.spec.ts` (new) — Liberty style + Terrarium tile network-request receipts,
    no-console-error load check, empty-state hero DOM + computed-style visibility check,
    desktop+mobile screenshot capture. Runs on `desktop-chrome` + `mobile-chrome` projects.
- **State design:** No new store state. Reads existing `useOutboundStore((s) => s.selectedId)`
  (fe-03, frozen) to gate the empty-state hero. No local component state beyond a
  `useState<string | undefined>` for the resolved hillshade `beforeId` (re-render-driven
  `<Layer beforeId>` move, handled internally by `@vis.gl/react-maplibre`'s `Layer` component).
- **tRPC wiring:** N/A (no backend RPC layer in this project — static build-time data only).
- **A11Y plan:** Empty-state hero: semantic `<h1>` heading (first page heading), `MapPinOff`
  icon `aria-hidden="true"` (decorative, paired with text per DESIGN.md), outer wrapper
  `pointer-events-none` / card `pointer-events-auto` so the hero never blocks map/marker
  interaction underneath it. No new click handlers, no new keyboard traps in this task (map
  markers/panels are later tasks) — nothing new required for the click-handler keyboard-audit.

### Checkpoint — 20:32:00
- Wrote `src/components/map-canvas.tsx` (210 lines, rewrite). Constant audit: 0 raw-hex matches,
  0 JSON.parse, 0 inline `style="..."` string attrs, 0 unguarded `onClick`. Liberty/Terrarium URL
  literals verified character-for-character against RA findings 14/15 (grep evidence below). Next:
  amend playwright.config.ts per R1.
- Wrote `playwright.config.ts` (additive amend — new `mobile-chrome` project + `PW_WEBKIT=1` gate
  on `mobile-safari`; `desktop-chrome` project untouched). Next: write map-shell.spec.ts.
- Wrote `e2e/map-shell.spec.ts` (62 lines, new). First run: 12/12 pass, but desktop-chrome
  screenshot showed a mid-flight globe-curvature artifact (fixed 2s timeout raced real
  network-fetched tiles under 2-worker parallel contention). Next: replace fixed timeout with a
  deterministic settle signal.
- Fix: added a `data-flyto-settled` DOM signal to `GlobeIntro`, driven by a zoom-tolerance-checked
  `moveend` listener (not a bare `.once`, since `setProjection`'s own camera nudge fires an
  earlier `moveend` before the real `flyTo` completes) — spec now awaits that signal instead of a
  fixed wait. Re-ran `npx playwright test` twice (12/12 both times) and visually confirmed both
  desktop + mobile screenshots show the settled Fort Collins / US-West framing with legible
  labels over the hillshade. Next: full audit pass (typecheck/lint/build/test/e2e) + write packet.

## [STAGE 3] COMPLETE
- **At:** 2026-07-11T20:35:00Z
- **Deliverables:**

  | File | Lines | Notes |
  |---|---|---|
  | `src/components/map-canvas.tsx` | 210 | Rewrite (2nd/last writer). Liberty style + Terrarium hillshade (dynamic beforeId) + globe/fly-in inside style.load + empty-state hero. |
  | `playwright.config.ts` | 48 (+19 diff) | R1 additive amend: `mobile-chrome` project + `PW_WEBKIT=1` gate on `mobile-safari`. |
  | `e2e/map-shell.spec.ts` | 62 | New. 3 tests: RA-literal network-request receipt, empty-state hero + computed-style check, desktop+mobile screenshot capture. |
  | `docs/agent-logs/FE/outbound-p1-fe-02b.md` | this file | 3-stage journal. |

- **Lint:** exit 0 (`npm run lint`).
- **Typecheck:** exit 0 (`npm run typecheck`, `tsc -b`).
- **Build:** exit 0 (`npm run build`); maplibre-gl vendor chunk 1027.74 kB raw / 272.98 kB gzip —
  pre-existing R3 exemption (task-registry.md), not introduced by this task.
- **Unit tests:** 12/12 passed (`npm run test`, unchanged — this task touched no vitest-covered code).
- **E2E:** 12/12 passed (`npx playwright test`) — `map-mount.spec.ts` 3/3 × 2 projects (no
  regression from fe-02a) + `map-shell.spec.ts` 3/3 × 2 projects (new), across `desktop-chrome`
  AND `mobile-chrome`. Re-ran twice for stability after the settle-signal fix; both green.
- **Constant audit:** 0 raw-hex matches, 0 JSON.parse, 0 inline `style="..."` string attrs, 0
  unguarded `onClick` on span/div/li/a, in both files created/modified. Liberty/Terrarium URL
  literals verified character-for-character against RA findings 14/15.
- **Six frozen slots + App.tsx:** untouched (`git status` shows only `map-canvas.tsx`,
  `playwright.config.ts`, `e2e/map-shell.spec.ts`, and this log as new/modified by this task).
