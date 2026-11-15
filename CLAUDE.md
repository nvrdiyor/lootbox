# LOOTBOX brand site: notes for agents

Showcase site for the owner's Uzum Market shops: LOOTBOX (`/`, dark, gaming and desk accessories) and
LOOTBOX FIT (`/fit`, light, clothes), plus an admin panel at `/admin`. Owner-facing guide: `README.md` (Uzbek).
Reply to the owner in Uzbek; give times in Tashkent time.

## Run and verify

- `npm run dev` → http://localhost:3210 (`node --watch`; pages reload themselves in dev).
- `npm run check` → regression suites on temporary databases (storefront, admin API, behind-nginx mode). Run it after every change; add a check for every bug you fix.
- `npm run shots` → real-time headless Chrome screenshots of the animated storefront in `data/shots/`. Use it to judge motion and layout; see "Traps".

## Conventions

- Plain ES modules, no build step, no TypeScript. Two runtime dependencies (`hono`, `@hono/node-server`); do not add native modules.
- All HTML goes through the auto-escaping `html` tag in `server/lib/html.js`. `raw()` only for constants. Page data for scripts: `<script type="application/json">` + `jsonScript()`. The CSP is `script-src 'self'`: no inline scripts or handlers.
- Data access only through `server/db/repo.js`; schema changes are appended to `MIGRATIONS` in `server/db/schema.js`, never edited in place.
- Storefront strings live in `server/i18n/uz.js`. Uzbek Latin with ‘ for o‘/g‘ and ’ for the tutuq belgisi, formal "siz". `*_ru` columns and the i18n layer are ready for Russian.
- Every link an admin can enter is validated in `server/admin/validate.js` with the parsers in `server/lib/links.js`; the storefront re-validates at render.
- Uploaded images are resized in the browser (`public/admin/js/uploader.js`) and type-checked by bytes on the server (`server/lib/images.js`).

## Traps

- The admin password is in `.env` (`ADMIN_PASSWORD`, gitignored). Never print it or put it in a commit, note or message.
- The owner's Windows has animation effects turned off, so every browser on this machine reports `prefers-reduced-motion: reduce`. The site therefore animates by default (setting `motion = full`, admin toggle for `auto`). Do not gate new motion on the media query alone; use the `.calm` class that `public/site/js/boot.js` sets.
- A minimized or covered browser window draws no frames: screenshots time out and `requestAnimationFrame`, IntersectionObserver and the `<dialog>` `close` event never fire. Use `npm run shots`, or drive the page through DOM events and `fetch`.
- Chrome's CLI `--screenshot --virtual-time-budget` hangs on the dev server (open live-reload stream) and freezes main-thread animations. Always give headless Chrome its own `--user-data-dir`.
- The Write/Edit tools turn a single-backslash `\u` escape into the raw character. Build invisible characters with `String.fromCharCode(...)` and re-read any regex after writing it.
- `npm run seed` while the server runs changes settings behind its cache: restart the server afterwards.
- Not deployed. Ask before touching any server.
