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

## Deployment to Azure Static Web Apps

The app is deployed to
[Azure Static Web Apps](https://azure.microsoft.com/products/app-service/static)
by the workflow under `.github/workflows/azure-static-web-apps.yml`. That
file was generated automatically by Azure when the Static Web App resource
was created through the Portal with GitHub as the deployment source, and is
triggered on pushes to `main` and on pull requests (which also get their own
preview environment).

Unlike GitHub Pages, Azure Static Web Apps serves the site from the domain
root (e.g. `https://<app-name>.azurestaticapps.net/`), so no `base` subpath
is needed - the default `base: '/'` in `vite.config.ts` already applies
(the `GITHUB_PAGES`-only override is simply not set here).

### Configuring the backend API URL

The `api_location` field in the workflow (currently `""`) is **not** for
this - it only applies if you attach a co-located Azure Functions app as a
managed API to the Static Web App. This project instead calls an external
backend over HTTP via the `VITE_API_BASE_URL` build-time variable, which
Vite bakes into the bundle while building (see `src/api/client.ts`). Since
the actual `npm run build` happens inside the "Build And Deploy" step of the
GitHub Actions workflow (via Azure's Oryx builder), the variable must be
supplied there, on the **GitHub** side, not in Azure Portal's app
configuration/settings (those are only visible to a deployed Functions API
at runtime, not to the build step that already ran on GitHub's runner).

Concretely:

1. In **Settings → Secrets and variables → Actions → Variables**, add a
   repository variable `VITE_API_BASE_URL` pointing at the publicly
   reachable backend API URL (e.g. `https://api.example.com/api`).
2. The workflow's "Build And Deploy" step passes it through as an
   environment variable (`env: VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}`)
   so it's visible to the Oryx build that runs `npm install`/`npm run build`
   under the hood.

Also make sure the backend:

- allows CORS requests (with credentials) from the production origin
  (`https://<app-name>.azurestaticapps.net`, or your custom domain), and
- issues its auth cookies with `SameSite=None; Secure`, since the frontend
  and backend are served from different origins.
- If you also want login to work in PR preview environments, note that each
  one gets its own generated origin
  (`https://<app-name>-<random>.<region>.azurestaticapps.net`), so the
  backend would need to allow that pattern too, or you can restrict CORS to
  production only and accept that previews can't authenticate.

Client-side routes (e.g. shared list URLs) are handled by the
`navigationFallback` rule in [`public/staticwebapp.config.json`](public/staticwebapp.config.json),
which tells Azure to serve `index.html` for any request that isn't a static
asset.
