# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Webinfinity fork of the (archived) Kloudless File Picker, used by the 360incentives **FileSync** product. It is a JS library that embeds an iframe-based multi-cloud file browser into a host page, communicates with the host via `postMessage`, and returns selected file metadata.

Originally dual-licensed MIT / AGPL-3.0. In this fork, the AGPL "Computer" upload module (`@kloudless/file-picker-plupload-module`) is intentionally **excluded** — see `config/webpack.base.conf.js` (`null-loader` rule, only active when `BUILD_LICENSE !== 'AGPL'`) and `package.json`'s `build:agpl` / `explain` scripts (which hard-fail with a reference to `em360-3933`). Treat the Dropzone and Computer/local-upload code paths as dead code unless you are deliberately reviving them.

API endpoints point to Webinfinity infrastructure (`apigw.{dev.}webinfinity.com/filesync`) rather than the original `api.kloudless.com`. See `buildspec.yml` (dev) and `buildspec-live.yml` (prod).

## Two-bundle architecture (loader + picker)

This is the single most important thing to understand before editing — most files belong to one of two bundles that ship and run **separately**:

- **Loader** (`src/loader/`) — a small (~150 KB ceiling, enforced via webpack `performance.hints: 'error'`) script that the consumer's web page embeds via `<script>` or NPM import. It exposes `window.Kloudless.filePicker`, builds a modal + iframe, and exchanges `postMessage` events with the picker page running inside. Entry: `src/loader/js/interface.js`. React/Vue wrappers (`src/loader/js/react/`, `src/loader/js/vue/`) are built as separate `commonjs2` exports.

- **Picker** (`src/picker/`) — the actual file-browsing UI that loads inside the iframe. Built from `src/picker/js/app.js`. Stack: **Knockout** (data binding), **jQuery** + jQuery UI + `jquery.finderSelect`, **Sammy.js** (hash-based router), **Less** (styles, also runtime-compiled when `custom_style_vars` is used), **Pug** (`src/picker/templates/index.pug` becomes the picker page). Built assets are deployed to a CDN; the loader points its iframe at `PICKER_URL`.

Cross-cutting constants and `postMessage` event names live at `src/constants.js`. Most picker logic is in `src/picker/js/{app,accounts,files,auth,config,router-helper,storage}.js` plus `src/picker/js/models/{account,filesystem,search}.js`.

Webpack builds **6 separate bundles** from one config (`config/webpack.prod.conf.js`): `commonjs2/{react,vue,loader}.min`, `loader/loader{,.min}`, `picker/`, and a `test/dist/` index for the dist-test harness. Each has its own entry point; do not assume code shared between loader and picker — it is bundled twice.

## Common commands

Build scripts use POSIX shell features (`NODE_ENV=foo` prefix, `rm -rf`, `DIST_FOLDERS=...`). On Windows, run them from **Git Bash, WSL, or the devcontainer** (`.devcontainer/`) — not from PowerShell or `cmd.exe` directly, or they will fail to set env vars.

```bash
yarn install              # installs npm deps via Yarn 4 (PnP disabled, see .yarnrc.yml)
yarn run install-deps     # runs `bower install` for legacy bower deps (cldr-data etc.)

# Dev server — required for any UI work
KLOUDLESS_APP_ID=<id> yarn run dev          # http://localhost:3000, HMR; KLOUDLESS_APP_ID is mandatory
BASE_URL=<url> KLOUDLESS_APP_ID=<id> yarn run dev   # point at a non-default API server

# Quick start against the Webinfinity dev API (what CI bakes into the deployed build):
BASE_URL=https://apigw.dev.webinfinity.com/filesync KLOUDLESS_APP_ID=<id> yarn run dev

# Production build (writes to dist/{commonjs2,loader,picker,explorer} + test/dist)
yarn run build

# Custom build env vars (see babel.config.js `buildEnvVarDefaults`):
BASE_URL=<api> PICKER_URL=<iframe-url> yarn run build

# Lint
yarn run lint             # ESLint (airbnb-base + react, see .eslintrc.js)
yarn run stylelint        # Less / CSS
yarn run stylelint:fix
yarn run test:ts          # ESLint over *.ts + tsc --noEmit on test/ts/

# Smoke-test a production build (serves dist/ at http://localhost:3000)
KLOUDLESS_APP_ID=<id> yarn run dist-test

# Storybooks — each is its own yarn workspace
yarn run storybook:react
yarn run storybook:vue
yarn run storybook:test
```

There is **no Jest in this project root** despite what the monorepo's top-level `CLAUDE.md` quick-reference suggests; the only Jest config lives inside `storybook-test/`. The repo's "tests" at the root are `test:ts` (type-check only) and `dist-test` (manual smoke test). Don't try to add `jest` to the root unless you mean to.

`yarn run build:agpl` and `yarn run build:template` both intentionally fail via the `explain` script (`em360-3933`). The plupload-based Computer/Dropzone path is disabled in this fork.

## Build options (env vars)

Set at build time; some are also settable at runtime via `Kloudless.filePicker.setGlobalOptions({...})`. Defaults are in `babel.config.js` and injected as compile-time constants by `babel-plugin-transform-define`.

| Env var | Runtime option | Default | Purpose |
|---|---|---|---|
| `BASE_URL` | `baseUrl` | `https://api.kloudless.com` | Backend API (overridden to `apigw.*.webinfinity.com/filesync` by CI) |
| `PICKER_URL` | `pickerUrl` | `https://static-cdn.kloudless.com/p/platform/file-picker/v2/index.html` | URL the loader's iframe points to (overridden to `cdn.*.webinfinity.com/filesync/picker/index.html` by CI) |
| `BUILD_LICENSE` | — | `MIT` | Set to `AGPL` to attempt re-enabling plupload. **Currently broken in this fork** — `build:agpl` errors out. |
| `KLOUDLESS_APP_ID` | — | none | Required only by the dev server. |
| `DEBUG` | — | unset | If truthy, picker uses `config.json` (debug) instead of `config_prod.json`. |

## CI / deployment

- **AWS CodeBuild** — `buildspec.yml` deploys to dev (S3 `wi-content-dev`, CloudFront `E10ZRDMO2003HM`); `buildspec-live.yml` deploys to prod (S3 `wi-content`, CloudFront `E1GLMIBN5ABY2K`). Both `yarn install` + `yarn run install-deps` + `yarn run build`, then `aws s3 sync dist` + CloudFront invalidate.
- Outputs are served from `cdn.{dev.}webinfinity.com/filesync/`.
- Branch convention: feature branches only — never push directly to `staging-dev`, `master`, or `production`. The repo has multiple long-lived branches (`master`, `production`, `staging-dev`) that get periodically merged.

## Codebase quirks worth knowing

- **Knockout-based UI** — most picker state lives in observable view-models, not React. Editing `src/picker/js/{app,accounts,files}.js` means writing Knockout bindings and `ko.pureComputed`s.
- **Sammy router + hash-based routing** — `src/picker/js/router-helper.js`. As noted in the README: prefer `data-bind="click: ..."` for buttons that may be clicked repeatedly, because Sammy will skip a consecutive identical hash transition.
- **Refresh = abort-then-fetch** — switching folders sets `current()` then calls `refresh()`, which aborts any in-flight XHRs to prevent race conditions. Be careful not to break that contract when adding new requests.
- **TypeScript surface is narrow** — only `src/loader/js/interface.d.ts` (public API types) is type-checked. If you change the loader public interface, update this file and `test/ts/test.ts`.
- **Bower** — `bower.json` is still used for some legacy deps (e.g. `cldr-data`); `resolvePaths` in `config/common.js` includes `bower_components`.
- **Yarn 4** is pinned via `packageManager` and `.yarn/releases/yarn-4.6.0.cjs`. Don't `npm install`.
