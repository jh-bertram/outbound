import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
// base: '/outbound/' — required for GitHub Pages PROJECT-path hosting
// (https://<user>.github.io/outbound/); leading+trailing slash so all
// asset URLs resolve under the subpath instead of 404ing at the domain root.
export default defineConfig({
  base: '/outbound/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
