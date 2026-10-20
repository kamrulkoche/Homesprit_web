# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Homesprit's website and dashboard. Modelled on `../../HGS/hgs-frontend`; read
its CLAUDE.md for the long-form reasoning behind the patterns below.
Deviations: `../docs/ARCHITECTURE.md` §4.

## Commands

```bash
npm run dev          # :3002
npm run build        # includes the type check
npm run lint         # eslint . (flat config)
npm run typecheck    # tsc --noEmit
npm test             # Jest + Testing Library (from sp-company-ltd-ui)
```

Env: `.env.local` with `HOMESPRIT_BACKEND_URL` (server-only). Next 16: read
`node_modules/next/dist/docs/` before using an unfamiliar API.

## Structure

- `src/app/**/page.tsx` are thin: metadata, params, `dynamic`, data fetching.
  `(marketing)` and `(admin)` route groups own their chrome.
- UI lives in `src/communities/{website,admin}-community/components/<feature>/`,
  exported through `'use client'` barrels. **Plain data (`*.data.ts`, helpers,
  labels) is imported by deep path, never through a barrel.**
- Server readers: `services/property.service.ts`, `services/admin.service.ts`
  (both swallow errors → `null`). Browser transport: `services/api/*` over
  `httpRequest` (axios → `/api/public`). Base URL only from `config/apiConfig.ts`
  (ESLint-enforced).
- Redux: one domain, `state/features/properties/` — five files, registered in
  `rootReducer` AND `rootSaga`. `/properties` seeds the store server-side
  (`asyncLoaded`) and the container never fetches on mount; filter changes
  dispatch and `history.replaceState` the URL. Saga import rule:
  `debounce`/`takeLatest` from `redux-saga/effects`, `call`/`put`/`all` from
  `typed-redux-saga`.
- `helpers/properties/search-params.ts` is the ONE URL ↔ search translation,
  used by the server page and the client container.
- Dashboard: every page runs the three-state session check
  (`authenticated` / `unauthenticated` → login / `unreachable` →
  `BackendUnavailablePage`) and wraps itself in `AdminShell`. Screens are built
  from the kit in `admin-community/components/ui/` (`DataTable`, `FormPanel`,
  `ConfirmDialog`, `useAdminResource`, `adminApi`…); a hand-rolled table or
  dialog is a defect. First pages arrive as `initialRows`.
- Listing photos render through `shared/components/ListingImage`, which
  optimises only `images.unsplash.com` and serves other hosts `unoptimized`.
- No `(marketing)/loading.tsx`: it would turn `notFound()` 404s into 200s.
- Saved homes: `helpers/properties/saved-homes.ts` owns the cookie format;
  `shared/hooks/useSavedHomes` is the one browser store (navbar badge, every
  heart, `/saved`). `/saved` reads the cookie server-side — no client fetches.
- FAQ and legal copy live in `faq.data.ts` / `legal.data.ts` and describe real
  behaviour; change them when the behaviour changes.
