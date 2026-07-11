import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'playwright-report',
      'test-results',
      'src/components/ui/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // House standard: no `any` without an inline justification comment.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Node-context files (build configs, data/build scripts) run outside the browser.
    files: ['*.config.ts', 'scripts/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
)
