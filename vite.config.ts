import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json' with { type: 'json' }

const commitHash = process.env.VITE_COMMIT_SHA
  || process.env.GITHUB_SHA
  || (() => {
    try {
      return execSync('git rev-parse HEAD').toString().trim()
    } catch {
      return 'unknown'
    }
  })()

// https://vite.dev/config/
export default defineConfig({
  // When building for GitHub Pages, the site is served from
  // https://<user>.github.io/prezentownik-web/, so assets and routes
  // need to be resolved relative to that subpath instead of the domain root.
  base: process.env.GITHUB_PAGES ? '/prezentownik-web/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
