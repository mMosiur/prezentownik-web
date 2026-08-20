import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  // When building for GitHub Pages, the site is served from
  // https://<user>.github.io/prezentownik-web/, so assets and routes
  // need to be resolved relative to that subpath instead of the domain root.
  base: process.env.GITHUB_PAGES ? '/prezentownik-web/' : '/',
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
