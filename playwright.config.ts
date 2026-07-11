import { defineConfig, devices } from '@playwright/test'

// Preview server serves the production build under the '/outbound/' base
// path (vite.config.ts), matching the GitHub Pages deploy target.
const PORT = 4173
const BASE_PATH = '/outbound/'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    // R1 (outbound-p1-fe-02b, ORC ruling 2026-07-11): fe-02a proved WebKit
    // cannot launch in this sandbox (~35 missing system libraries, no
    // root). `mobile-chrome` — the iPhone 14 device descriptor's
    // viewport/UA/touch emulation on the chromium engine — is the
    // in-sandbox mobile receipt for fe-02b..fe-08. `mobile-safari` (true
    // WebKit) is retained for CI/human machines and gated behind
    // PW_WEBKIT=1 so a default in-sandbox `npm run test:e2e` stays green.
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 14'], defaultBrowserType: 'chromium' },
    },
    ...(process.env['PW_WEBKIT'] === '1'
      ? [
          {
            name: 'mobile-safari',
            use: { ...devices['iPhone 14'] },
          },
        ]
      : []),
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env['CI'],
  },
})
