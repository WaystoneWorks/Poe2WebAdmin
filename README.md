# Poe2WebAdmin

The web admin site of the **Path of Exile 2 client 0.5.5e.hotfix1 private server**: a single-page app in **Svelte 5 + Vite + TypeScript** that talks to the server's web API (`crates/poe-web-api` of [Poe2Server](https://github.com/WaystoneWorks/Poe2Server), which serves and packages it; see [web-api.md](https://github.com/WaystoneWorks/Poe2ModdingProject/blob/main/docs/architecture/web-api.md)). In the hub [Poe2ModdingProject](https://github.com/WaystoneWorks/Poe2ModdingProject) it is the submodule `modules/web-admin`.

## Pages

| Page | What it does |
|---|---|
| Login | `POST /api/v1/login` with `kind: "web"` (12 hour token). Only admin accounts get in |
| `#/token-login?t=<token>` | One-time sign-in link (the launcher's "Open web admin"): removes the token from the address bar and history, redeems it once with `POST /api/v1/web-token/redeem`. Expired, used or malformed links land on the login page with a notice |
| Dashboard | **Server control** (Restart and Stop behind a confirmation dialog with an optional message and a countdown in seconds; Cancel), server info, players online, instances, busiest instances; refreshes every 5 s. **Activity charts** (players, instances, frame time, memory, CPU; 15 min / 1 h / 6 h / 24 h; SVG) and the **message of the day** card |
| Live logs | WebSocket log stream: level, target prefix and text filters (applied by the server), pause, autoscroll, at most 3000 lines in the DOM, reconnect with backoff |
| Players (`#/players`, `#/sessions` still works) | **Online**: class and level, account, area, instance, connected for, IP address (admins only), filter and sort; kick, mute (minutes, or until unmuted), unmute, transfer (to an instance id, or a new area, seed, topology, orientation), ban. **Bans**: list with expiry and history, new ban (account or address), lift |
| Instances | List, close, create (area, seed, topology, orientation) |
| Accounts | List, change role, disable and enable, ban |
| Characters | List (filter by account), detail view |
| Leagues | League families with banners, HC/SSF variants, state and character counts; new, edit, hide/show, end into a permanent league (per-variant mapping, typed confirmation), delete; the "needs a league" popup and Dashboard card while none is active |
| Schedule | Scheduled tasks (restart with countdown and message) by day, weekdays, interval or cron in the server's time zone; next-run preview, on/off, edit, delete, history |
| Config | The server's config file: form for common keys, raw TOML with syntax check (line and column), diff, Save or Save and restart, backups |
| Announce | Button at the foot of the sidebar: a chat line to everyone |
| Inventory, Passive tree | Stubs, shown only when `VITE_FEATURE_INVENTORY` / `VITE_FEATURE_PASSIVES` is `true` at build time |

Every page shows a banner while a stop or restart is pending, while the server restarts, when it has stopped and when it cannot be reached. The page polls `GET /api/v1/server` and `GET /api/v1/admin/server/shutdown` (every 5 s, every 1.5 s during an outage or countdown); when the server answers again it checks the session (`GET /api/v1/me`; web sessions survive a restart), says so in a toast and reloads the dashboard.

Close, kick, unmute, ban, lift, disable, delete, role changes, stop and restart ask for confirmation. The token is kept in `sessionStorage`; any `401` returns to the login.

## Design

The look is the launcher's: `src/tokens.css` and `src/lib/motion.ts` are identical copies of the launcher's ("Ash & Blood"; Cinzel over Inter from `@fontsource-variable`, SIL OFL; change both repos together). Dark by default, `data-theme="light"` for parchment (`main.ts` sets it from the saved choice or system preference; the sun/moon button toggles it and saves to `localStorage`). The logo (`public/logo.png`, `public/favicon.svg`) is the launcher's *rune seal*. Grouped sidebar (Dashboard; People; World; Advanced, folded by default; an icon rail below 900 px, a bottom tab bar below 640 px). The small components in `src/lib/ui/` are copies of the launcher's, so there is no dependency on it. Motion is fade and slide with one easing curve (CSS `--dur-fast` 150 ms to `--dur-page` 350 ms; Svelte `DUR`, `ease`, `ms()`); everything is 0 under `prefers-reduced-motion`.

## Develop

Needs Node 22 and npm.

```sh
npm ci
npm run dev        # http://localhost:5173, /api (and the log WebSocket) proxied to http://127.0.0.1:8080
```

The proxy target is the server's `[web] bind` (`config/server.toml`); change it with `POE_API_TARGET=http://host:port npm run dev`. Start the server with `cargo run -p poe-server` in Poe2Server (or `cargo xtask server run` in the hub) and create an admin first:

```sh
cargo run -p poe-server -- account create alice "a long password"
cargo run -p poe-server -- account role alice admin
```

Feature flags for the stub panels: `VITE_FEATURE_INVENTORY=true VITE_FEATURE_PASSIVES=true npm run dev` (or in `.env.local`).

| Script | |
|---|---|
| `npm run dev` | Vite dev server with the API proxy |
| `npm run build` | production build into `dist/`; also writes `dist/build.json` (name, version, build time, commit), which the server logs at start and the hub's `cargo xtask server` uses to decide whether to rebuild |
| `npm run check` | `svelte-check` plus `tsc` |
| `npm test` | vitest unit tests |
| `npm run gen:api` | regenerate the API types, see below |

## Build and serve with poe-server

```sh
npm run build
```

Then, in the server's `config/server.toml`:

```toml
[web]
static_dir = "modules/web-admin/dist"
```

`poe-server` serves the files at `/` on the `[web] bind` address (default `http://127.0.0.1:8080`) and answers any other non-API path with `index.html`. The app uses hash routes (`#/accounts`) and relative asset URLs and calls the API on its own origin at `/api/v1/...`, so it must be served from the root of the server's origin. CI uploads the built `dist/` as an artifact. To call the API from the Vite origin instead of the proxy, list `http://localhost:5173` in `[web] cors_origins`.

## API types

`src/lib/api/schema.d.ts` is generated by [`openapi-typescript`](https://openapi-ts.dev) from the OpenAPI document of `poe-web-api` (`cargo xtask openapi` in Poe2Server writes `docs/openapi.json`) and is committed.

```sh
npm run gen:api                                   # reads docs/openapi.json of Poe2Server (../../docs/openapi.json here, ../server/docs/openapi.json inside the hub)
npm run gen:api -- path/to/openapi.json           # any file
npm run gen:api -- http://127.0.0.1:8080/api/v1/openapi.json   # a running server
```

Regenerate after API changes, fix what `npm run check` reports, and commit. The typed client is `src/lib/api/client.ts` ([`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/)); the token store `src/lib/api/token.ts`.

## Layout

```
src/
  main.ts, App.svelte, app.css      shell (sidebar, banner), announce dialog, the one stylesheet
  tokens.css                        design tokens (copy of the launcher's)
  pages/                            one component per page
  lib/api/                          schema.d.ts (generated), client.ts, token.ts
  lib/logs/                         log filter + ring buffer (ring.ts), reconnecting WebSocket (socket.ts)
  lib/*.svelte.ts                   auth, router, theme, polling Resource, toasts, confirmations, the server link (Svelte runes)
  lib/serverLink.ts, shutdown.ts    reconnect state machine, countdown limits
  lib/ui/                           shared components (Icon, Chip, Modal, ServerControl, ShutdownBanner, LineChart.svelte, ActivityCharts, MotdCard, BanDialog, DiffView, ...)
  lib/chart.ts, duration.ts         chart scaling; "7d" and "1h30m" parsing for bans
  lib/leagues.ts                     variant ids, end mapping, date inputs, popup rule
  lib/schedule.ts, configForm.ts    task and config forms and their checks
  lib/diff.ts, players.ts, motd.ts  config line diff; player filters and ban wording; message limits
scripts/gen-api.mjs                 the gen:api script
```

## Security notes

Passwords are sent in request bodies. The server listens on loopback by default; put a TLS reverse proxy in front before exposing it. The log WebSocket does not take the session token in its URL: the page asks `POST /api/v1/admin/logs/ws-ticket` for a single-use ticket before every connection attempt, so a proxy's access log never holds a usable credential. The server sends a content security policy (own scripts, styles and connections only). Report vulnerabilities as in [SECURITY.md](SECURITY.md).

## Disclaimer

This is an unofficial, fan-made project for personal and educational use. It is **not affiliated with, endorsed by or connected to Grinding Gear Games**; "Path of Exile" is their trademark. **No game files are distributed** in this repository (no assets, bundles, tables or executables): you need your own legal copy of the game. Use is at your own risk. This site only administers the private server of Poe2ModdingProject.

Contributing: [CONTRIBUTING.md](https://github.com/WaystoneWorks/Poe2ModdingProject/blob/main/CONTRIBUTING.md) in the main repository (checks here: `npm run check`, `npm test`, `npm run build`).

## License

MIT: [LICENSE](LICENSE). Copyright (c) 2026 WaystoneWorks and contributors.
