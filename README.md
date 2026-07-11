# Outbound

A visually rich, animated map of all US national parks for exploring and planning
car-camping road trips from Fort Collins, Colorado — max 10 driving hours per day,
day-marker dots for drive legs and park stays, chainable multi-park itineraries.

- Product spec: [`docs/BRIEF.md`](docs/BRIEF.md)
- Data sourcing plan: [`docs/DATA-NOTES.md`](docs/DATA-NOTES.md)
- Agent/session conventions: [`CLAUDE.md`](CLAUDE.md)

Status: greenfield — brief written, build not yet started.

## Build & run

Requires Node 20+. All scripts are defined in `package.json`.

```sh
npm ci              # install exact locked dependency versions
npm run dev         # start the Vite dev server
npm run build       # typecheck (tsc -b) + production build to dist/
npm run preview     # serve the production build locally
npm run lint        # eslint over the whole project
npm run typecheck   # tsc -b, no emit
npm run test        # vitest unit tests
npm run test:e2e    # Playwright end-to-end specs (run `npx playwright install chromium` first)
npm run fetch-data  # build-time data pipeline: NPS content fetch + drive-time matrix build
                     # (requires NPS_API_KEY in .env — see docs/DATA-NOTES.md)
```

## Deploy

The app is a fully static site (Vite build output in `dist/`), built with
`base: '/outbound/'` so asset URLs resolve under the GitHub Pages project path
(`https://jh-bertram.github.io/outbound/`). `.github/workflows/deploy.yml`
builds with `npm ci && npm run build` and deploys `dist/` via the GitHub
Actions Pages pipeline (`actions/upload-pages-artifact` +
`actions/deploy-pages`) on every push to `main` or `outbound-p1-mvp`, or via
manual `workflow_dispatch`.

**One-time repo setup (must be done once, by a repo admin, before the first
run):**

1. Enable Pages with the "workflow" build source:
   ```sh
   gh api -X POST repos/jh-bertram/outbound/pages -f build_type=workflow
   ```
2. Add the `outbound-p1-mvp` feature branch to the `github-pages`
   environment's deployment-branch allowlist: **Settings → Environments →
   github-pages → Deployment branches and tags → add branch
   `outbound-p1-mvp`.** The auto-created `github-pages` environment protects
   only the default branch, so the first feature-branch deploy fails without
   this step.
