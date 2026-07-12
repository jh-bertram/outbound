# Project Conventions — outbound

Originally detected by convention-detect at 2026-07-11T17:06Z (greenfield stamp). Refreshed
post-sprint at 2026-07-12 after outbound-p1-mvp close; sprint-proven conventions below were
**ratified by the human 2026-07-12** ("ratify all", reflect-2026-07-12-1 §5 item 6).

<project_conventions>
  <package_manager>npm (package-lock.json committed)</package_manager>
  <language>TypeScript</language>
  <typescript_strict>true (+ noImplicitAny, noUncheckedIndexedAccess)</typescript_strict>
  <test_runner>vitest (unit) + @playwright/test (e2e)</test_runner>
  <test_command>npm run test</test_command>
  <lint_command>npm run lint</lint_command>
  <typecheck_command>npm run typecheck</typecheck_command>
  <build_command>npm run build</build_command>
  <dev_command>npm run dev (preview: npm run preview, base '/outbound/')</dev_command>
  <build_system>vite 8 (@tailwindcss/vite, base '/outbound/')</build_system>
  <monorepo>false</monorepo>
  <key_directories>
    <dir>src/components/ (PascalCase components in kebab-case files)</dir>
    <dir>src/lib/ (pure modules: store, trip-math, route-geometry, nearby-suggestions)</dir>
    <dir>src/data/ (datasets + zod loaders; FORT_COLLINS single-source in constants.ts)</dir>
    <dir>scripts/ (data pipelines: fetch-nps-content, build-drive-matrix)</dir>
    <dir>e2e/ (playwright specs)</dir>
    <dir>docs/ (events/, agent-logs/, after-actions/, reflect-reports/)</dir>
  </key_directories>
  <all_scripts>dev, build, preview, lint, format, typecheck, test, test:e2e, fetch-data</all_scripts>
  <note>Stack as shipped: Vite + React 19 + TS strict, maplibre-gl 5 + @vis.gl/react-maplibre,
  motion 12 (import from 'motion/react', NEVER framer-motion), zustand 5, zod 4, tailwind 4,
  shadcn/ui. DESIGN.md tokens are the sole styling source (no raw hex outside tokens.css; the
  WebGL-paint mirror in route-geometry.ts is the sanctioned exception).</note>
</project_conventions>

## Sprint-Proven Conventions (RATIFIED 2026-07-12)

1. **Authoritative e2e gate:** `npx playwright test --workers=1` — parallel-worker runs flake
   under this sandbox's software WebGL and are advisory only. (Provenance: AA §6 G6.)
2. **Mobile receipts = `mobile-chrome` project** (chromium engine, iPhone-14-class emulation).
   WebKit `mobile-safari` stays defined behind `PW_WEBKIT=1`; true-Safari verification happens
   at CI or on the human's machine. (Ruling R1, ratified.)
3. **Bundle budget:** every non-maplibre chunk < 1 MB raw. The `maplibre-gl` vendor chunk
   (~1,028 kB) is the sole exemption. Heavy data (JSON ≥ ~100 kB) ships via dynamic import or
   static-asset fetch, never eagerly in the entry chunk. (Ruling R3 + fe-05 remediation, ratified.)
4. **Spawn-brief output paths are pre-registered concrete filenames** — `{task}-{CODE}-{unixts}.md`
   computed at dispatch time, never `{ts}` placeholders; keeps SubagentStop auto-COMPLETE
   attribution at 100%. (AA §6 G2 field proof.)
5. **Baseline-controlled attribution:** any "pre-existing failure" claim requires a controlled
   baseline receipt (git-stash A/B with rebuild, or equivalent) — an isolation run that leaves
   your diff in the tree does not qualify. (AA §6 G4; AUD#11 precedent.)
6. **Test-only spec hardening for WebGL actionability:** marker selection in specs uses the
   in-browser evaluate/dispatchEvent pattern with a real post-click effect assertion.
   (Ruling R4, ratified.)
7. **Rulings R2 (vitest e2e exclude) ratified** as permanent config posture.
