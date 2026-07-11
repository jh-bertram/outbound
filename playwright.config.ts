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
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env['CI'],
  },
})
