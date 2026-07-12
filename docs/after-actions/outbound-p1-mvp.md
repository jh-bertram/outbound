# After-Action: Outbound P1 MVP
**Date:** 2026-07-12
**Project:** `/home/jhber/projects/outbound`
**Duration:** 2026-07-11T17:04Z (RA#1 SPAWN, seq 1) → 2026-07-12T02:37Z (AR#2 COMPLETE, seq 24) — ~9.5 h wall clock, including a ~45 min crash-recovery gap (18:09→18:55Z)
**Final State:** 63-park interactive road-trip explorer shipped live at https://jh-bertram.github.io/outbound/ — 14/14 core packets + 1 post-close amendment audited PASS, committed, pushed; REQVAL 19/19 COVERED; e2e suite 52 passed / 8 skipped / 0 failed.

---

## 1. Original Request

**Human (2026-07-11):** "let's build outbound! instructions in the directory. let's get this deployed on github pages to preview on mobile or on another laptop once built."

**Brief file:** `.claude/tasks/outputs/outbound-p1-mvp-amend-PM-1783792028.md` (14 packets, post-CR#1-BLOCK revision; original plan `.claude/tasks/outputs/outbound-p1-mvp-PM-1783790417.md`)

**Scope at intake:**
- Existed: `docs/BRIEF.md` (product spec, §7 success criteria), `docs/DATA-NOTES.md`, `CLAUDE.md` hard constraints (Fort Collins home base, 10 h/day drive cap, day-dot signature visual, animation-first). Zero code — true greenfield.
- To build: full P1–P3-equivalent MVP — park dataset (63 destinations), drive-time matrix, NPS content pipeline, animated MapLibre map, markers, detail panel, route + day dots, trip builder, itinerary, GitHub Pages deploy.

**Skill invoked:** dispatch-task (full pipeline: scry → generate-design-equivalent UI bootstrap → pm-preflight → PM → Critic (BLOCK→revise→PASS) → capability-preflight → assign-agents → 6 implementation waves → audit-pipeline ×16 → commit-packet → requirements-validate → archivist ×2)

---

## 2. Agent Activity Log

Event logs: `docs/events/agent-events-2026-07-11.jsonl` (seq 1–72) + `docs/events/agent-events-2026-07-12.jsonl` (seq 1–26) — UTC-midnight span, both read. `seq` treated as authoritative ordering per skill caveat.

### Preflight & Planning — (outbound-p1-mvp / -amend)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 1/3 | 17:04–17:12Z | SPAWN/COMPLETE | RA#1 | scry evidence brief: NPS API shapes, MapLibre v5, OSRM demo, stack pins (Bash broken this session — noted in brief) |
| 2/4 | 17:07–17:18Z | SPAWN/COMPLETE | UI#1 | DESIGN.md v1.0.0 bootstrap (direct authorship, not generate-design — flagged by UI#1 itself) |
| 5 | 17:20Z | PM_PREFLIGHT | ORC#0 | 8 agent remits extracted; critic.md + auditor.md lack remit headings (WARNING) |
| 6/7 | 17:20–17:37Z | SPAWN/COMPLETE | PM#0 | 13-packet decomposition |
| 8/9 | 17:38–17:46Z | SPAWN/CRITIQUE_BLOCK | CR#1 | 3 BLOCKERs (seki id collision, package.json clobber, fe-02 overscope) + 5 WARNINGs |
| 10/11 | 17:47–18:03Z | SPAWN/COMPLETE | PM#0 | Revision → 14 packets; all 8 critique items resolved in packet text |
| 12/13 | 18:03–18:06Z | SPAWN/CRITIQUE_PASS | CR#2 | PASS with 3 no-plan-change WARNINGs (recorded in task-registry) |

### Wave 0: Scaffold — (outbound-p1-be-01) — CRASH RECOVERY

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 14 | 18:09Z | SPAWN | BE#1 | Original dispatch — **session crashed mid-task; SPAWN never terminated** |
| 15 | 18:55Z | RESUME | ORC#1 | resume-project rebuilt state from task-registry + event log; **no SESSION-CHECKPOINT existed** (checkpoints only written at close) |
| 16/17 | 18:55–19:05Z | SPAWN/COMPLETE | BE#1 | Re-dispatch with on-disk resume-state addendum; COMPLETE manually backfilled (hook mis-matched amend-PM filename) |
| 18/19 | 19:05–19:08Z | SPAWN/AUDIT_PASS | AUD#1 | Scaffold green: npm ci/build/typecheck/lint; shadcn alias bug found+fixed by BE#1 |

### Wave 1 (parallel ×4) — (fe-01, fe-03, be-02, be-05)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 20–23 | 19:12Z | SPAWN ×4 | FE#1, FE#2, BE#2, BE#3 | Tokens+day-dot primitive; store+trip-math; 63-destination parks.json; deploy.yml |
| 24–27 | 19:30Z | COMPLETE ×4 | (same) | **All 4 manually backfilled — SubagentStop hook mis-keyed on the amend-PM filename embedded in dispatch briefs** |
| 28–35 | 19:31–19:35Z | SPAWN/AUDIT_PASS ×4 | AUD#2–5 | All first-pass PASS. BE#2 flagged ORC brief error: PM file does NOT embed the destination table verbatim (recalled-not-verified claim) |

### Wave 2 (parallel ×3) — (fe-02a, be-03, be-04)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 36–38 | 19:39Z | SPAWN ×3 | FE#3, BE#4, BE#5 | Composition root; NPS fetch script; drive matrix |
| 39–41 | 19:50–19:56Z | COMPLETE ×3 | (same) | Auto-logged (ORC now pre-registering concrete filenames). FE#3 burned effort on WebKit install (~35 missing system libs, no root). BE#5 measured OSRM demo out-of-band (arch 7.88 h, yose 19.06 h) → executed Critic-era pre-sanctioned calibrated fallback, all 4 §7.5 anchors in-band |
| 42 | 19:57Z | ORC_RULING | ORC#0 | **R1** (mobile-chrome emulation, PW_WEBKIT gate) + **R2** (vitest e2e-exclude ratified) |
| 43–48 | 19:57–20:02Z | SPAWN/AUDIT_PASS ×3 | AUD#6–8 | All first-pass PASS; AUD#8 WARNING: FoCo→Grand Canyon coords ~20% under expected (deferred spot-check) |
| 49 | 20:03Z | ORC_RULING | ORC#0 | **R3**: maplibre-gl vendor chunk (1027.74 kB) exempt from 1 MB gate; gate stays for all other chunks |

### Wave 2b–3 — (fe-02b, fe-04)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 50–53 | 20:04–20:30Z | SPAWN→AUDIT_PASS | FE#4, AUD#9 | Live map shell (Liberty + Terrarium, globe fly-in, hero); R1 mobile-chrome project added |
| 54–57 | 20:31–21:07Z | SPAWN→AUDIT_PASS | FE#5, AUD#10 | 63 id-keyed markers, drivability encoded by ring+glyph not color alone; markers.spec green |

### Wave 4a — (fe-05) — THE SPRINT'S ONLY AUDIT FAIL

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 58/59 | 21:08–21:55Z | SPAWN/COMPLETE | FE#6 | Park detail panel; packet claimed 3 foreign markers.spec failures were "pre-existing sandbox constraint, reproduces in complete isolation" |
| 60/61 | 21:55–22:04Z | SPAWN/**AUDIT_FAIL** | AUD#11 | QA FAIL: stash-baseline controlled experiment REFUTED the pre-existing claim — eager import of 723 KB nps-content.json inflated entry chunk 341→1,193 kB (non-exempt >1 MB) and induced the markers.spec regression via page-load bloat |
| 62/64 | 22:05–22:07Z | REMEDIATION_REQUEST + re-SPAWN | FE#6 | **SendMessage resume ran backgrounded → Bash auto-denied → 1-tool-use stall**; fresh foreground re-dispatch per stream-idle protocol |
| 65 | 22:45Z | PUSH_OPTIN | HU | Per-sprint push opt-in granted (feature branch only; Layer-1 guard active) |
| 66/67 | 22:47Z | ORC_RULING + SPAWN | ORC#0, FE#6 | **R4**: dynamic imports fixed the bundle (1193→552 kB) but ~211 kB motion/react residual anchored by frozen files left one markers.spec mobile failure → test-only hardening of the selection helper to evaluate/dispatchEvent authorized; a11y receipts must remain asserted |
| 68/69 | 23:04–23:14Z | SPAWN/AUDIT_PASS | AUD#12 | Full re-audit: all non-maplibre chunks <1 MB; full suite --workers=1 run TWICE, 26/26 green both runs; R4 compliance verified assertion-by-assertion (aria-current is a real store-derived effect, not a dispatchEvent proxy) |

### Waves 4b–6 — (fe-06, fe-07, fe-08)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 70–72, 12/1 | 23:15–00:00Z | SPAWN→AUDIT_PASS | FE#7, AUD#13 | Animated route + drive/stay day dots (signature visual); Tier-3 eyeball mandated |
| 12/2–5 | 00:01–00:35Z | SPAWN→AUDIT_PASS | FE#8, AUD#14 | Trip builder: nearby suggestions + chain add/remove |
| 12/6–9 | 00:36–01:12Z | SPAWN→AUDIT_PASS | FE#9, AUD#15 | Day-by-day itinerary with explicit return leg; bundled trip-panel edit adjudicated against both fe-07/fe-08 SCs |

### Close + Post-Close Amendment — (outbound-p1-mvp, outbound-p1-hero-morph)

| Seq | Timestamp | Event | Agent | Notes |
|-----|-----------|-------|-------|-------|
| 12/10–11 | 01:13–01:31Z | SPAWN/REQVAL_PARTIAL | RV#1 | 18/19 COVERED, 1 PARTIAL (R-011 REQUIRES_HUMAN_VISUAL — aesthetic judgment reserved to human; no code gap). COMPLETE backfilled (hook missed RV terminal) |
| 12/12–13 | 01:31–01:35Z | SPAWN/COMPLETE | AR#1 | project_log.md created; SESSION-CHECKPOINT written (close-of-sprint) |
| 12/16–19 | 01:42–02:27Z | SPAWN→AUDIT_PASS | FE#10, AUD#16 | Human amendment from R-011 viewing pass: hero FLIP-morphs to compact top bar (22158d4); full pipeline honored post-close |
| 12/22 | 02:33Z | REQVAL_COVERED | ORC#0 | Human approved live app ("it looks great") → 19/19 COVERED |
| 12/23–24 | 02:33–02:37Z | SPAWN/COMPLETE | AR#2 | Sprint FORMALLY CLOSED; COMPLETE backfilled |

**Feedback loops:** 1 — fe-05 audit FAIL → one remediation cycle (bundle-split + R4 continuation) → re-audit PASS. Also 1 plan-gate loop: CR#1 BLOCK → PM revision → CR#2 PASS (the gate working as designed, not a failure).

**Root cause of failure(s):** fe-05 — eager static import of a 723 KB JSON into the shared entry chunk; compounded by the implementer misattributing the induced foreign-test regression to a "pre-existing sandbox flake" because its isolation run isolated the *spec file* but not its own *global bundle effect*. AUD#11's stash-baseline A/B was the refutation mechanism.

**Deviation from PM brief:** None unauthorized. Sanctioned deviations: be-04's calibrated fallback (pre-sanctioned W4 path after OSRM measured out-of-band — plan-quality win credited to the CR gate); R1 mobile-chrome substitution (environment-forced); R4 test-only spec hardening (frozen-file constraint); fe-02a's vitest e2e-exclude (R2, corroborated by be-03). All four recorded as ORC rulings in `docs/task-registry.md`, pending human ratification.

**§2h context — sprint-report skip (recorded reason):** `sprint-report` was skipped per reflect A2 justified-skip: attribution is grounded in the complete SPAWN/COMPLETE/verdict trace plus ORC-held per-agent usage figures (subagent output tokens): BE#1 107k; FE#1 169k; FE#2 74.5k; BE#2 103k; BE#3 60k; FE#3 164.5k; BE#4 129k; BE#5 147k; FE#4 225.5k; FE#5 167k; FE#6 344k (initial) + 250k (remediation pt1) + 114k (pt2 R4) = 708k total; FE#7 276.5k; FE#8 241k; FE#9 215k; FE#10 227k; AUD#1–16 range 53k–121k (sum ≈1.52M); RV#1 134k; AR#1 61k; AR#2 53k. Implementer total ≈3.01M; grand post-crash total ≈4.78M output tokens. **Data gap:** pre-crash RA/UI/PM/CR figures unavailable (crashed session; tokens not durably logged on those COMPLETE events).

---

## 3. Post-Delivery: Runtime Bugs (if any)

**None.** No runtime bug has been discovered post-close. The post-close `outbound-p1-hero-morph` task was a human *refinement request* from the R-011 viewing pass ("it can be big at first but it should slide to the top…"), not a defect — and it ran the full pipeline (FE#10 + AUD#16 PASS, commit 22158d4) rather than being quick-patched.

Known non-bug residuals carried forward (disclosed, not latent): (a) dynamic-import chunk-load rejection has no `.catch()` — a stale-tab-after-redeploy edge degrades to a persistent skeleton (AUD#12 advisory, INFO); (b) true-WebKit/Safari verification deferred per R1 to CI/human machine; (c) FoCo→Grand Canyon drive-time ~20% under expected (AUD#8 WARNING, spot-check deferred); (d) no desktop deselect affordance (P4 polish candidate).

---

## 4. QA Gap Analysis

**Current QA protocol:** audit-pipeline v2.0 per packet — SA (standards: tokens-only, DRY, strict TS, scope-diff verification) → QA (functional: vitest + full Playwright e2e at --workers=1 on desktop-chrome + mobile-chrome, bundle gate, Tier-3 visual eyeball on visual-critical packets) → SX (security: secret grep, link-out rel/noopener, injection surface) → typed verdict. 16 audits this sprint; commit only after PASS via commit-packet.

**What this caught:**
- **The fe-05 induced regression + bundle breach (AUD#11, QA).** The stash-baseline controlled experiment (byte-identical spec file, only variable = fe-05's diff; 8/8 green stashed vs 2/8 applied) refuted the implementer's "pre-existing flake" attribution with evidence, not assertion. The single most valuable audit action of the sprint.
- R3 boundary enforcement — a *new* >1 MB non-maplibre chunk was correctly ruled non-exempt rather than waved through by analogy.
- R4 compliance verification at re-audit — assertion-by-assertion diff of markers.spec.ts confirming no receipt was weakened (aria-current verified as a real store-derived effect).
- be-04 §7.5 drive-time bands verified against MEASURED values (and REQVAL independently recomputed them from the shipped matrix).
- be-03 Zod schema cross-checked against the SAVED live NPS snapshot (RA finding 8 discipline).
- seki/seki-kica distinct matrix nodes with distinct hours (CR#2's forecast landmine, explicitly checked by manifest audit_notes).
- Token fidelity (17/17 color tokens exact, zero raw hex) and a11y receipts (focus ring, ≥44 px targets, not-color-alone drivability) at every FE gate.
- 4 independent Tier-3 screenshot eyeballs feeding the §7.6 "actually viewing" arm.

**What this missed:**
- Nothing shipped broken — zero post-delivery bugs. The misses below are *process* misses, caught late or by the wrong layer:
- FE#6's misattribution was caught by the auditor, not prevented at the implementer — FE self-verification had no baseline-control requirement, so an induced regression was confidently labeled pre-existing (cost: one full audit cycle, ~708k tokens on this one task).
- WebKit unrunnability was discovered *mid-task* by fe-02a (burned effort attempting a ~35-library unprivileged install) — no preflight covered browser-engine availability despite a Playwright-heavy plan.
- WebGL parallel-worker contention was discovered empirically; --workers=1 became the authoritative gate mid-sprint rather than being a declared environment convention up front.

**Recommendations:**
- Make baseline-controlled attribution a *precondition* for any "pre-existing failure" claim in FE/BE completion packets (stash A/B receipt required) — see §6 G4.
- Add browser-engine launch preflight to Playwright-heavy sprint setup — see §6 G5.
- Encode --workers=1 + mobile-chrome emulation as declared sandbox conventions, not discovered ones — see §6 G6.
- Keep the bundle-budget line in every FE brief (ORC did this from fe-06 onward; encode it durably) — see §6 G4/§9.

---

## 5. Agent Performance Summary

| Agent | Tasks | First-pass rate | Notes |
|-------|-------|----------------|-------|
| RA#1 | 1 (scry brief) | 1/1 | Citation-grounded stack/API grounding; OSRM fallback contingency it seeded proved load-bearing. Bash broken in its session (worked around) |
| UI#1 | 1 (DESIGN.md) | 1/1 | v1.0.0 origination pass; a11y-driven rust token split; authored directly rather than via generate-design (self-flagged) |
| PM#0 | 2 rounds (13→14 packets) | BLOCK then PASS | CR#1 BLOCK was the gate doing its job; revision resolved all 8 items within a 2-read budget |
| CR#1/CR#2 | 2 critiques | — | 3 BLOCKERs all real (seki collision would have corrupted §7.5 correctness); audit_risk_forecast predicted the commit-size and DRY landmines accurately |
| BE#1–5 | 5 packets | **5/5 (100%)** | be-04's out-of-band OSRM detection + pre-sanctioned calibrated fallback was exemplary halt-vs-ship judgment; BE#2 caught ORC's false "embeds table verbatim" brief claim and proceeded from the actual packet |
| FE#1–10 | 10 packets (9 core + hero-morph) | **9/10 (90%)** | fe-05 the sole FAIL (misattributed induced regression). FE#6 consumed ≈708k output tokens across 3 dispatches — most expensive agent of the sprint by 2.5× |
| AUD#1–16 | 16 audits | 15 PASS / 1 FAIL issued | Zero false PASSes surfaced post-delivery; AUD#11's controlled experiment is the sprint's defining audit action |
| RV#1 | 1 (REQVAL Mode B) | 1/1 | 19 requirements across 4 source tiers; independently recomputed drive-times; live-site fetch verification; correctly reserved R-011 for the human instead of self-certifying aesthetics |
| AR#1–2 | 2 archive passes | 2/2 | project_log created; checkpoint written at close (but see §6 G1 — none existed mid-sprint) |

**Overall implementing first-pass rate: 14/15 (93%)** — above the 75% protocol-gap threshold.

**Most impactful single agent action:** AUD#11's stash-baseline A/B experiment (fe-05). It converted a plausible, confidently-asserted "pre-existing sandbox flake" into a proven induced regression with a mechanism (entry-chunk bloat → page-load slowdown → actionability-margin overrun), and its required_fixes were specific enough that remediation converged in one cycle. Runner-up: CR#1's B1 (seki id collision) — caught pre-execution, it would otherwise have shipped a silently wrong drive time for one of two parks sharing `parkCode: seki` and required editing a frozen store contract mid-sprint.

**Recurring failure pattern:** *Asserted-without-controlled-evidence.* Two instances at different layers: (1) FE#6 claimed a foreign failure pre-existing from an isolation run that didn't isolate its own global side effect; (2) ORC#0 asserted the PM file "embeds the destination table verbatim" from recall, not verification (self-identified; orchestrator.md provenance tags skipped under resume pressure). Same class: a confident claim about artifact/environment state made without a baseline or a read. The countermeasure is the same both times — require the receipt (stash A/B; provenance tag) before the claim ships.

---

## 6. Protocol Gaps Identified

> **Code-not-prompt check:** performed. Gaps G1, G2, and G6 are hook/script/config work — named as such and routed to HR. G3, G4, G5, G7 are agent/skill spec edits.

| Gap | Impact | Suggested fix |
|-----|--------|---------------|
| **G1 — No mid-sprint SESSION-CHECKPOINT.** Checkpoints are only written at sprint close; the 18:09Z crash landed in an uncovered window and resume had to rebuild state from task-registry + event log (succeeded, but only because the registry happened to be complete). | ~45 min recovery gap; recovery depended on non-guaranteed registry completeness | Implement as **script/hook — route to HR**: wave-boundary checkpoint write (deterministic append after each wave's last AUDIT_PASS, e.g. from the backfill-autofire Stop hook or a dispatch-task step), so the max checkpoint staleness is one wave |
| **G2 — SubagentStop hook filename mis-key.** Hook regex latches the FIRST `{task}-{CODE}-{digits}.md` match in the dispatch brief; briefs embedding the amend-PM filename + ORC's `{ts}` placeholder in Output Path caused 5 manual COMPLETE backfills (seq 17, 24–27) until ORC pre-registered concrete filenames — then 100% auto-log | Observability integrity degraded for a full wave; manual backfill toil; risk of silent COMPLETE loss | Implement as **hook edit — route to HR**: prefer the `## Output Path` block (or last match) over first match. Additionally encode the now-proven ORC convention — pre-register concrete output filenames at SPAWN — in dispatch-task/assign-agents |
| **G3 — Background SendMessage-resume for remediation.** Resuming FE#6 via SendMessage ran backgrounded → Bash auto-denied → 1-tool-use stall; ORC re-dispatched fresh foreground per stream-idle protocol | Lost one remediation round-trip (~20 min) | dispatch-task/orchestrator.md: remediation routing defaults to **fresh FOREGROUND spawn** for any Bash-needing agent; SendMessage-resume reserved for read-only continuations |
| **G4 — FE self-verification lacks baseline control.** FE#6 claimed an induced regression pre-existing from a non-controlled "isolation" run; no rule required a stashed-baseline A/B before the claim | One full audit cycle + ≈364k remediation tokens; had AUD been less rigorous, a regression ships | frontend.md (and backend.md): a foreign-file failure may be labeled pre-existing ONLY with a stash/baseline A/B receipt (baseline green + current fail, same command). Also: the bundle-budget line ORC added to every FE brief from fe-06 onward → encode in the FE packet template (see §9) |
| **G5 — Env preflight blind to browser-engine availability.** env-preflight correctly skipped (no live API), but nothing checked Playwright engine launchability; fe-02a burned effort mid-task discovering WebKit needs ~35 root-only system libraries | Mid-task scope burn; R1 ruling forced mid-sprint | Extend env-preflight (or capability-preflight) with a browser-engine launch check (`playwright launch` probe per configured project) for any sprint whose packets ship Playwright specs |
| **G6 — WebGL parallel-worker contention discovered, not declared.** --workers=1 became the authoritative e2e gate mid-sprint; R4 spec hardening traces partly to software-WebGL actionability slowness | Ambiguity about which suite invocation is authoritative until mid-sprint | Implement as **config — route to HR/project conventions**: sandboxed-environment Playwright convention `workers: 1` (+ evaluate/dispatchEvent selection pattern for WebGL-heavy pages) written into project-conventions and the FE packet template |
| **G7 — ORC brief provenance failure.** be-02 dispatch brief claimed the PM file "embeds the destination table verbatim" — false; recalled-not-verified. orchestrator.md already mandates provenance tags; ORC skipped them under resume pressure. BE#2 caught it and proceeded from the actual packet | Implementer had to detect and route around a false premise; under a less careful agent, hand-curated data gets misattributed as PM-specified | Re-affirm provenance tags in orchestrator.md resume path specifically (post-resume dispatches are the pressure point); candidate mechanical check: PreToolUse Agent-spawn hook warns when a brief asserts file contents ("embeds", "contains verbatim") without a provenance tag |
| **G8 — Census scope gap (3rd consecutive reflect pass).** census.py scans gander/studio/broadn only; outbound — now a full delivered sprint with ~98 events — is invisible to the canonical observability instrument | Reflect cadence's census diff structurally under-counts; third consecutive pass carrying this | Implement as **script edit — route to HR**: parameterize census.py's project list (scan `~/projects/*/docs/events/` or accept an explicit roster); see §9 row 4 |

---

## 7. Final Deliverable State

**App/Service:** `/home/jhber/projects/outbound` → live at https://jh-bertram.github.io/outbound/ (GitHub Pages, fully static, HTTP 200 verified by RV#1 and by the human)
**Build:** green — `npm run build` exit 0; all non-maplibre chunks <1 MB (entry 552.26 kB; nps-content 579 kB async; drawer 62 kB async; maplibre-gl 1,027.75 kB R3-exempt); typecheck/lint clean
**Runtime:** confirmed working — Playwright 52 passed / 8 skipped (project-gated) / 0 failed at --workers=1 on desktop-chrome + mobile-chrome; vitest 12/12; human visual approval on the live site ("it looks great")

**Features delivered:**
- 63-destination park dataset (unique `id` incl. seki/seki-kica split; 12 not-drivable with cited reasons; curated 1–5 stay days + rationale), Zod-validated at every load boundary
- 52-node drive-time matrix from Fort Collins + park-to-park (calibrated model after OSRM demo measured out-of-band; all four BRIEF §7.5 anchors in-band, machine-recorded in drive-matrix-checks.json)
- NPS content pipeline (build-time fetch, key in .env only, snapshot-first schema; 62 parkCode entries covering all 63 destinations)
- Animated MapLibre map (Liberty style + Terrarium hillshade, globe intro, FoCo fly-in), empty-state Fraunces hero with post-close FLIP-morph to compact top bar
- 63 a11y-encoded markers (ring+glyph drivability, not color alone; ≥44 px targets; focus rings)
- Photo-first park detail panel (desktop card + mobile bottom sheet, lazy-loaded content + drawer chunks, campground link-outs)
- Signature day-dot visual: animated line-gradient route, drive dots = ceil(hours/10), stay dots = curated days, >5-day pill, legend, reduced-motion paths
- Trip builder (nearby suggestions with incremental day costs, chain add/remove) + day-by-day itinerary with explicit return leg and ≥3-day warning flags
- GitHub Pages deploy workflow (pinned actions, no pipeline push to main; guarded-push honored — 26 commits on feature branch `outbound-p1-mvp`, human opt-in on record at seq 65)

**Key contracts:** (what the next engineer needs)
- Destination key = `id` (NOT `parkCode`); `parkCode` is only the NPS-content join field (seki + seki-kica share `parkCode: "seki"`)
- `FORT_COLLINS` constant single-sourced in `src/data/constants.ts` — never duplicate the literal
- `driveDays(hours) = Math.ceil(hours/10)` lives in `src/lib/trip-math.ts` (pure DI) — no inline recompute anywhere
- Day-dot rendering single-sourced in `src/components/day-dot-cluster.tsx` (fe-01) — never fork
- Drive matrix: `nodes: id[]` (FOCO + 51 drivable only — not-drivable ids never appear), `hours: {[from]:{[to]}}`
- Bundle gate: 1 MB per chunk; ONLY the maplibre-gl vendor chunk is exempt (R3)
- E2e: authoritative invocation is `--workers=1`; mobile receipts = `mobile-chrome` emulation project (R1); `mobile-safari` gated behind `PW_WEBKIT=1` for CI/human machines
- `vite.config.ts` `base: '/outbound/'` is load-bearing for Pages

---

## 7b. Progression Ledger Entry (AA-§7)

**sprint_id:** `outbound-p1-mvp`

**xp_gained:**
- surface: Skills | delta: resume-project validated checkpoint-less crash recovery (state rebuilt from task-registry + event log)
- surface: Hooks | delta: SubagentStop filename mis-key root-caused; pre-registered concrete output filenames restored 100% auto-log
- surface: Agents | delta: auditor stash-baseline controlled-experiment pattern proved decisive against a misattributed induced regression
- surface: Connectivity | delta: census scope gap (outbound invisible to census.py) confirmed for the 3rd consecutive reflect pass

**levels_advanced:**
- First full-pipeline greenfield delivery outside gander: 14 packets + 1 post-close amendment, 1 remediation cycle, live Pages deploy, REQVAL 19/19
- Crash-resume without a SESSION-CHECKPOINT proven viable (registry + event log sufficed) — while exposing that it should never have been necessary (G1)
- In-sprint ORC ruling discipline (R1–R4) exercised at scale: environment constraint, additive fix ratification, gate exemption, and test-only hardening all recorded with evidence and held for ratification

**new_capabilities:**
- None this sprint (conventions proven in practice — pre-registered filenames, --workers=1 — are proposed for encoding in §6/§9, not yet deterministic artifacts)

```jsonl
{"sprint_id":"outbound-p1-mvp","xp_gained":[{"surface":"Skills","delta":"resume-project validated checkpoint-less crash recovery from registry + event log"},{"surface":"Hooks","delta":"SubagentStop filename mis-key root-caused; pre-registered concrete filenames restored 100% auto-log"},{"surface":"Agents","delta":"auditor stash-baseline controlled-experiment pattern proved decisive against misattributed induced regression"},{"surface":"Connectivity","delta":"census scope gap (outbound invisible to census.py) confirmed 3rd consecutive pass"}],"levels_advanced":["First full-pipeline greenfield delivery outside gander (14 packets + amendment, 1 remediation cycle, live Pages deploy, REQVAL 19/19)","Crash-resume without SESSION-CHECKPOINT proven viable","In-sprint ORC ruling discipline (R1-R4) exercised with evidence and held for ratification"],"new_capabilities":["None this sprint (proven conventions proposed for encoding, not yet deterministic artifacts)"]}
```

---

## 8. Skill-Use Analysis

> This section is hone's primary input. Run `hone` after this post-mortem — tables below have rows.

### 8a. Skill Invocation Log

| Skill | Invocations | Outcome | Owner | Last reviewed | Notes |
|-------|-------------|---------|-------|---------------|-------|
| dispatch-task | 1 | VALUABLE | ORC | unknown | Full pipeline executed end-to-end incl. crash interruption; every gate held |
| scry | 1 | VALUABLE | ORC→RA | unknown | Evidence brief's OSRM-fallback contingency + NPS API literals were load-bearing (be-04, be-03) |
| pm-preflight | 1 | VALUABLE | ORC | unknown | recurring_patterns:[] across 3 control-plane post-mortems; remit extraction surfaced critic/auditor spec gaps |
| convention-detect | 1 | VALUABLE | ORC | unknown | docs/project-conventions.md produced pre-decomposition (greenfield grounding) |
| assign-agents | 1 | VALUABLE | ORC | unknown | Expectation manifest with per-packet receipt_checks + audit_notes relay; receipt checks caught nothing missing at return time |
| capability-preflight | 1 | VALUABLE | ORC | unknown | 14/14 PROCEED pre-dispatch |
| jidoka | 0 | NOT_TRIGGERED | ORC | unknown | Correct skip (skip condition: greenfield, net-new files, nothing to pre-read). Not a miss — fe-05's failure was a runtime bundle effect no plan-only pass reads |
| env-preflight | 0 | NOT_TRIGGERED | ORC | unknown | Correct per scope (no live API — static site). But the *adjacent* preflight need (browser-engine availability) went uncovered → §6 G5 / 8d |
| generate-design | 0 | NOT_TRIGGERED | ORC/UI | unknown | DESIGN.md authored directly by UI#1 per explicit task instruction; UI#1 itself flagged the process question → 8e |
| log-event | ~35+ | VALUABLE | ORC | unknown | SPAWN/ruling/backfill events; flock races handled; seq integrity held across 2 UTC files and a crash |
| audit-pipeline | 16 | VALUABLE | ORC→AUD | unknown | v2.0 typed verdicts; 1 true FAIL caught with controlled evidence; zero false PASSes surfaced post-delivery |
| commit-packet | 15 records (2 formal + sanctioned same-session inline gates) | VALUABLE | ORC | unknown | Strict scope staging, secret grep, out-of-packet classification on every durability commit; guarded-push honored |
| subagent-complete-backfill (auto-fire hook path) | 5 scans / 2 backfills | VALUABLE | ORC/hook | unknown | Caught RV#1 and AR#2 missed terminals mechanically; the 5 wave-1-era mis-keys predate the scan and were hand-backfilled |
| requirements-validate | 1 (Mode B) | VALUABLE | ORC→RV | unknown | 19 requirements, 4 source tiers, independent recomputation + live-site fetch; R-011 human-reserve discipline exemplary |
| resume-project | 1 | PARTIAL_VALUE | ORC | unknown | Recovery succeeded but the skill's primary input (SESSION-CHECKPOINT) did not exist mid-sprint; state rebuilt from registry + event log instead → 8c |
| sprint-report | 0 | NOT_TRIGGERED | ORC | unknown | Justified skip (reflect A2) with recorded reason + ORC-held usage figures in §2h; pre-crash figures remain a data gap |
| after-action | 1 | VALUABLE | AA | unknown | This document |

### 8b. Obsolescence Candidates

| Skill | Consecutive non-value sprints | Evidence | Recommended action |
|-------|------------------------------|----------|--------------------|
| None | — | No skill has 2+ consecutive LOW_VALUE/NOT_TRIGGERED-when-needed sprints on this project (first outbound sprint). generate-design's NOT_TRIGGERED is a 1st instance — watch, do not act | — |

### 8c. Content-Quality Candidates

| Skill | Deviation observed | Suspected cause | Recommended action |
|-------|--------------------|----------------|--------------------|
| resume-project | Skill presumes a SESSION-CHECKPOINT to read; none existed mid-sprint, so ORC rebuilt state from task-registry + event log (an improvised but successful path) | AMBIGUOUS_STEP (no defined no-checkpoint branch; no mid-sprint checkpoint cadence exists to feed it) | CLARIFY — document the registry+event-log fallback as a first-class recovery path AND add the wave-boundary checkpoint write (§6 G1) so the fallback is rarely needed |
| dispatch-task / assign-agents | ORC's Output Path blocks used a `{ts}` placeholder; the SubagentStop hook needs a concrete filename to key on → 5 manual backfills until ORC improvised pre-registration of concrete filenames | STALE_EXAMPLE / AMBIGUOUS_STEP (Output Path block format never specified placeholder-vs-concrete) | CLARIFY — mandate concrete pre-registered filenames in the Output Path block; pairs with the hook-side fix (§6 G2) |
| commit-packet | 13 of 15 commit gates ran as sanctioned same-session inline invocations rather than formal skill dispatches (wave tempo) | OVER_SPECIFIED for high-frequency waves (full ceremony per commit is heavy at 6-wave tempo) | CLARIFY — bless the inline same-session mode explicitly with its minimum receipt set (scope check + secret grep + shas), which is what ORC actually preserved |

### 8d. New Skill Candidates

| Pattern observed | Frequency in sprint | Effort to encode as skill | Suggested skill name |
|-----------------|---------------------|--------------------------|---------------------|
| Browser-engine launch preflight before Playwright-heavy waves (probe each configured project's engine; declare substitutions like mobile-chrome up front instead of mid-task discovery) | 1 costly miss (fe-02a WebKit burn → R1) | LOW (extend env-preflight or capability-preflight) | browser-engine-preflight |
| Stash-baseline A/B attribution of a foreign-file test failure (stash candidate diff → rebuild → rerun → compare; claim pre-existing only on baseline-fail) | 2 uses by AUD#11/FE#6-remediation; 1 miss by FE#6-initial | LOW–MEDIUM (deterministic git-stash + test-run script) | baseline-bisect |
| ORC pre-registration of concrete output filenames at SPAWN (generate ts, embed in brief + expected_output, hook keys on it) | 30+ times after wave 1 (100% auto-log once adopted) | LOW (fold into log-event/assign-agents, not a separate skill) | (fold into log-event / assign-agents) |

### 8e. Skill Drift Candidates

| Skill | Drift observed | Suggested fix |
|-------|---------------|---------------|
| log-event / SubagentStop hook contract | Hook's first-match `{task}-{CODE}-{digits}.md` regex is silently coupled to dispatch-brief prose; any brief that *mentions* another artifact filename earlier than the Output Path block mis-keys the COMPLETE | One-sentence edit + hook change: key on the `## Output Path` block (or last match); document the coupling in log-event's SKILL.md |
| generate-design | Practice has drifted to direct UI authorship for greenfield bootstraps (UI#1 authored DESIGN.md v1.0.0 directly, per task instruction, and flagged it); skill description still claims bootstrap ("Bootstrap or update a DESIGN.md") as its trigger | Decide the boundary: either add an explicit init-mode (UI-direct) path to generate-design's SKILL.md, or narrow its description to update/refresh passes |
| env-preflight | Description scopes it to live-API dev-server checks; this sprint's actual preflight need was engine availability for a fully static app — the skill's trigger vocabulary has no entry for Playwright-engine readiness | Extend when_to_use + checks (or spawn browser-engine-preflight per 8d) so static-site Playwright sprints aren't a preflight dead zone |

### Hand-off to hone

> "Post-mortem Section 8 complete. 17 skills logged. 0 obsolescence candidates, 3 content-quality candidates, 3 new skill candidates, 3 drift candidates. Run the `hone` skill to act on these findings."

---

## 9. Rule / Ref / CLAUDE.md Delta Proposals

> Cross-reference: rule proposals targeting standards.md feed the quarterly HR review per .claude/rules/standards.md ## Rule-Improvement Loop. CLAUDE.md proposals require human ratification before HR applies them.

| Target file | Proposed change | Priority | Rationale |
|-------------|----------------|----------|-----------|
| `docs/task-registry.md` (outbound) | Human ratification of standing ORC rulings **R1** (mobile-chrome emulation + PW_WEBKIT gate), **R2** (vitest e2e-exclude), **R3** (maplibre 1 MB-gate exemption), **R4** (markers.spec test-only hardening) — all pending report-time review | HIGH | All four shaped shipped code/tests; REQVAL note 2 explicitly conditions mobile coverage on R1 standing ("if the human rejects R1, re-open R-015/R-011") |
| `~/.claude/rules/standards.md` | Add a frontend performance rule: per-chunk bundle budget (1 MB default) with vendor-exemption requiring an explicit recorded ruling; a task that adds >X kB to the shared entry chunk must code-split or justify | MEDIUM | The sprint's only audit FAIL was exactly this class; the gate existed only as a per-sprint ORC construction (R3) — generalize it. Human ratification required (affects shipping code) |
| `~/.claude/rules/standards.md` (or frontend.md/backend.md via agent-improvement) | Evidence rule: a "pre-existing failure" claim in any completion packet requires a baseline-controlled receipt (stash A/B: baseline green + current fail, same command) | MEDIUM | FE#6's misattribution cost one audit cycle; AUD#11's method is the proven countermeasure — make it the claim's precondition, not the audit's discovery |
| `~/.claude/skills/census/` (census.py args/SKILL.md) | Parameterize the scanned project roster (glob `~/projects/*/docs/events/` or explicit list) so outbound (and future projects) feed the census | MEDIUM | 3rd consecutive reflect pass with outbound invisible to the canonical instrument; the sprint just added ~98 events it cannot see |
| `~/.claude/CLAUDE.md` § Observability | Amend the Output Path convention: ORC pre-registers CONCRETE output filenames (no `{ts}` placeholders) in every spawn brief; note the SubagentStop hook keys on them | MEDIUM | Placeholder filenames caused 5 missed auto-logs; concrete pre-registration achieved 100% auto-log for the remaining ~30 spawns. Human ratification per CLAUDE.md delta process |
| `docs/project-conventions.md` (outbound) | Record as durable project conventions: e2e authoritative invocation `--workers=1`; mobile receipts = mobile-chrome emulation (R1); evaluate/dispatchEvent selection pattern for WebGL-heavy interactions; `base: '/outbound/'` load-bearing | LOW | Discovered-not-declared this sprint (G6); next sprint should inherit them as givens |

---

## 10. Eval Gap Proposals

| Agent / Skill | Gap description | Suggested eval | Priority |
|---------------|----------------|----------------|----------|
| SubagentStop hook (subagent-autocomplete.sh) | No eval covers filename-matching against realistic dispatch briefs; the first-match regex mis-keyed on an embedded foreign filename 5 times before detection | Fixture briefs containing (a) a foreign `{task}-{CODE}-{digits}.md` mention before the Output Path block, (b) a `{ts}` placeholder, (c) a concrete pre-registered path — assert the hook keys on the Output Path block in all three | HIGH |
| frontend-engineer | No eval exercises regression-attribution judgment: agent observes a foreign test failing after its change and must baseline-control before labeling it pre-existing | Scenario eval: induced foreign failure via a global side effect (bundle weight); PASS = agent produces a stash A/B receipt or does not claim pre-existing; FAIL = confident pre-existing claim from a non-controlled isolation run | MEDIUM |
| resume-project | The no-checkpoint recovery branch (rebuild from registry + event log) worked once, unrehearsed, under pressure — no eval pins it | Fixture: mid-sprint crash state (unterminated SPAWN, complete registry, no SESSION-CHECKPOINT); assert correct gap-window classification (re-dispatch vs backfill) and state reconstruction | MEDIUM |
| code-auditor | AUD#11's stash-baseline controlled experiment is the sprint's decisive audit behavior but exists only as precedent, not as evaluated behavior | Eval: packet claims "pre-existing flake" for a foreign failure; PASS requires the auditor to run (or demand) a baseline-controlled comparison before accepting/refuting | LOW–MEDIUM |

---

## 11. Connectivity Findings

**Analyzer run this sprint:** No — manual observations only.

- **Undeclared hook↔prompt coupling (root cause of G2):** the SubagentStop auto-COMPLETE hook is coupled to the *prose formatting* of ORC dispatch briefs via its first-match filename regex — an edge that exists in no spec. Any brief mentioning another `{task}-{CODE}-{digits}.md` upstream of the Output Path block silently breaks COMPLETE attribution. Route the hook-edge fix to HR per the Hook-Improvement Loop.
- **Census orphan node:** `~/projects/outbound` (this sprint: ~98 events, 60+ artifacts, a project_log) has no inbound edge from census.py's hardcoded gander/studio/broadn roster — the canonical observability instrument cannot see a completed production sprint. 3rd consecutive reflect pass carrying this; §9 row 4.
- **Missing remit surfaces:** `critic.md` and `auditor.md` lack explicit remit/constraint headings — the agent_remits auto-extraction emitted WARNINGs for both (docs/task-registry.md § Agent Remits). Dead expectation edge between the extraction tooling and those two specs; already deferred to the gander improvement inbox at extraction time.
- **Dual-location outputs glob (transition window):** read-side tooling still globs both `.claude/tasks/outputs/` and the frozen legacy `.claude/agents/tasks/outputs/`; outbound used only the new location — no conflict observed, but the transition edge remains open in tooling.
- No dead refs observed in sprint artifacts: every evidence path cited in REQVAL, AR entries, and the task registry resolved on disk during this after-action's sweep.
