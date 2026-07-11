import { configDefaults, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      css: true,
      // e2e/ holds Playwright specs (separate `test()` global, run via
      // `npm run test:e2e`) — exclude it here so vitest's unit-test runner
      // never tries to execute them (surfaced by outbound-p1-fe-02a, the
      // first task to add a real file to e2e/; previously empty).
      exclude: [...configDefaults.exclude, 'e2e/**'],
    },
  }),
)
