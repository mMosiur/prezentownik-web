# prezentownik-web

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

## Deployment to GitHub Pages

The site is automatically built and deployed to GitHub Pages by the
[`deploy.yml`](.github/workflows/deploy.yml) workflow whenever changes are
pushed to `main` (it can also be triggered manually from the Actions tab).

One-time repository setup:

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. In **Settings → Secrets and variables → Actions → Variables**, add a
   repository variable `VITE_API_BASE_URL` pointing to the publicly
   reachable URL of the deployed backend API (e.g.
   `https://api.example.com/api`). Without it, the app falls back to the
   relative `/api` path, which does not exist on GitHub Pages.
3. Make sure the backend:
   - allows CORS requests from the Pages origin
     (`https://<user>.github.io`) with credentials enabled, and
   - issues its auth cookies with `SameSite=None; Secure`, since the
     frontend and backend are served from different origins once deployed.

The build sets `base: /prezentownik-web/` (see `vite.config.ts`) so assets
and routes resolve correctly under the project's Pages URL
(`https://<user>.github.io/prezentownik-web/`). Deep links (e.g. shared list
URLs) work thanks to the `public/404.html` redirect combined with the
restore script in `index.html`, which together emulate SPA history-mode
routing on GitHub Pages' static hosting.

If the repository is ever renamed, update the `base` path in
`vite.config.ts` and `pathSegmentsToKeep` in `public/404.html` accordingly.
