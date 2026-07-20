# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`: React UI in `components/`, hooks in `hooks/`, Zustand stores in `store/`, business logic in `services/`, external clients in `lib/`, and shared types/utilities in `types/` and `utils/`. Keep feature UI grouped under directories such as `components/pokegrid/`, `components/teams/`, or `components/battle-game/`. Netlify functions live in `netlify/functions/`; Supabase files belong in `supabase/`. Static files go in `public/`, and maintenance tasks in `scripts/`.

Tests are colocated in `src/**/__tests__/` or `*.test.ts(x)` files. Broader backend and integration coverage lives under `tests/`.

## Build, Test, and Development Commands

- `npm ci`: install the lockfile-pinned dependencies (Node 20 is used in CI).
- `npm run dev`: start Vite on `http://localhost:64444`.
- `npm run build`: type-check with `tsc`, then create the production bundle in `dist/`.
- `npm run preview`: serve the built bundle locally on port 4173.
- `npm run lint`: check all JavaScript and TypeScript with ESLint.
- `npm test`: run all Jest projects; use `npm run test:watch` while developing.
- `npm run test:coverage`: generate coverage reports.

## Coding Style & Naming Conventions

Use strict TypeScript and functional React components. Follow two-space indentation, single quotes, semicolons, and trailing commas. Use PascalCase for components (`PokemonCard.tsx`), camelCase for values, `useX` for hooks, and established kebab-case utility/service filenames. Use the `@/` alias for clear `src` imports. Styling is primarily Tailwind CSS. There is no Prettier configuration; follow ESLint and nearby code. Avoid `any` unless an external API requires it.

## Testing Guidelines

Jest runs jsdom frontend and Node backend/integration projects. Use React Testing Library for behavior-focused component tests. Name tests `*.test.ts`, `*.test.tsx`, or `*.test.js`, mirror the feature location, and mock network or storage boundaries. Run a focused suite while developing (`npm run test:components`, `npm run test:utils`, or `npm run test:unit`) and `npm run test:ci` before a PR. No coverage threshold is configured; cover changed logic.

## Battle Run & Pokémon Showdown Integration

Battle Run (`src/components/battle-game/`) runs the Pokémon simulator in-browser (`@pkmn/sim` in a worker — no server) and renders it with Pokémon Showdown's real client (`battle.js` / `BattleScene`) loaded at runtime by `showdown-client.ts`. Non-obvious constraints, learned the hard way:

- **Asset proxy is load-bearing.** Showdown's client resolves every sprite/fx/backdrop/icon from `Config.routes.client`, which is repointed to a same-origin `/ps` path. Dev serves it via the Vite proxy in `vite.config.ts` (`/ps` → `play.pokemonshowdown.com`); prod serves it via the Netlify redirect in `netlify.toml` (`/ps/*` → `play.pokemonshowdown.com`). **Never remove either** — without them the CDN 503s cross-origin hotlinks and the CSP (`'self'` only) blocks the assets, breaking the whole scene.
- **`Config.routes.client` must be set before `battledata.js`/`graphics.js` load.** Those scripts bake `Dex.resourcePrefix`/`Dex.fxPrefix` and every `BattleEffects[*].url` at load time; set the route too late and fx URLs bake against the CDN and get CSP-blocked. `showdown-client.ts` applies it the instant `config.js` resolves.
- **Drive the scene live, not via replay.** Create one un-paused `Battle` and feed every protocol line through `battle.add()` (it self-resumes playback). The store replays the buffered opening on subscribe so a fresh Battle never misses the start. Do not reintroduce `isReplay`/`paused`/buffer heuristics — they race the async sprite preload and leave a grey field.

## Tailwind cascade gotcha

In this build, the base `hidden` utility is emitted **after** responsive display variants, so `hidden sm:block` / `hidden xl:flex` stay `display:none` even above the breakpoint (the later `hidden` wins). When an element must be hidden at one breakpoint and shown at another, control `display` in a dedicated CSS class (see `.showdown-log-col` in `showdown-stage.css`) or use `max-*` variants — don't rely on `hidden <bp>:block`.

## Commit & Pull Request Guidelines

Prefer Conventional Commit subjects such as `feat: add route preview` or `fix: prevent trapped switch deadlock`; semantic-release recognizes `feat`, `fix`, `perf`, and breaking changes. Keep commits focused and imperative. PRs should explain user-visible behavior, link relevant issues, list verification commands, and include screenshots or recordings for UI changes. Ensure lint, tests, and the production build pass, and never commit `.env` credentials.
