# Repository Guidelines

This repository is an Astro 6 server-rendered web app with React 19 islands, Supabase auth, Tailwind 4, and Cloudflare deployment. Use this file as the quick-start contract for coding agents; defer deeper product context to @context/foundation/prd.md and stack rationale to @context/foundation/tech-stack.md.

## Hard Rules

- Preserve everything under `context/`; bootstrap and workflow artifacts there are project records, not scaffold noise.
- Keep auth and server secrets server-side only. Read `SUPABASE_URL` and `SUPABASE_KEY` through the existing server-side setup in @src/lib/supabase.ts and the env schema in @astro.config.mjs.
- Do not introduce Next.js-only patterns such as `"use client"`. This project uses Astro pages/layouts plus React islands where interactivity is needed.
- Reuse `cn()` from @src/lib/utils.ts for conditional class names instead of hand-merging Tailwind strings.

## Project Layout

- App code lives in @src with pages in `src/pages/`, layouts in `src/layouts/`, shared helpers in `src/lib/`, and interactive auth/UI components in `src/components/`.
- Auth routes and pages already exist in @src/pages/api/auth and @src/pages/auth; route protection is centralized in @src/middleware.ts.
- Static assets live in `public/`; Cloudflare runtime config lives in @wrangler.jsonc; Supabase local project files live in `supabase/`.

## Build, Test, and Dev Commands

- `npm run dev` — start the local Astro/Cloudflare dev server.
- `npm run build` — production build; this is part of the CI gate.
- `npm run preview` — preview the production build locally.
- `npm run lint` — required ESLint pass with type-aware rules.
- `npm run lint:fix` — apply safe lint autofixes.
- `npm run format` — run Prettier across the repo.

## Coding Conventions

- Use the @/* path alias from @tsconfig.json for imports into src/
- Prefer Astro components for static structure and React `.tsx` components only for interactive UI.
- Follow the existing naming pattern: `PascalCase` for components, lowercase route filenames in `src/pages/`, and small utility modules in `src/lib/`.
- ESLint is strict about unused variables and React hooks; check @eslint.config.js before adding exceptions.

## Testing and CI

- There is no dedicated test runner yet; the current gate is lint + build in @.github/workflows/ci.yml.
- Before handing work off, run `npm run lint` and `npm run build`.
- On this Windows setup, if `astro build` or Wrangler fails with `EPERM` under `%APPDATA%`, set `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` to workspace-local temp directories before running build commands.
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit — Moduł 2, Lekcja 2

Przekształć jeden element planu działania w pierwszy cykl implementacji za pomocą **łańcucha planowania zmian**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review` i `/10x-implement` to główne tematy lekcji. `/10x-frame` i `/10x-research` nie są tutaj wymaganymi rytuałami; są to ścieżki eskalacji wprowadzone w następnej lekcji.

### Router zadań — Od czego zacząć

| Umiejętność | Użyj, gdy |
| --- | --- |
| **Konfiguracja zmiany (główny temat lekcji)** | |
| `/10x-new <change-id>` | Wybrałeś element planu działania i potrzebujesz stabilnego folderu zmian. Tworzy `context/changes/<change-id>/change.md`, dzięki czemu planowanie, implementacja, postęp, commity i późniejsza recenzja mają jedną tożsamość. Użyj PO wyborze planu działania, PRZED `/10x-plan`. |
| **Planowanie (główny temat lekcji)** | |
| `/10x-plan <change-id>` | Masz folder zmian i potrzebujesz planu implementacji do recenzji. Odczytuje kontekst planu działania, dokumenty podstawowe, dowody z bazy kodu i wszelkie istniejące notatki o zmianach; zapisuje `plan.md` i `plan-brief.md` z fazami, kontraktami plików, kryteriami sukcesu i `## Progress`. |
| **Gotowość planu (główny temat lekcji)** | |
| `/10x-plan-review <change-id>` | Masz `plan.md` i potrzebujesz lekkiej kontroli gotowości przed kodowaniem. Użyj jej, aby wychwycić brakujący stan końcowy, słabe kontrakty, źle sformułowany postęp, dryf zakresu lub martwe punkty, zanim rozpoczną się zmiany w kodzie. |
| **Implementacja (główny temat lekcji)** | |
| `/10x-implement <change-id> phase <n>` | Masz zatwierdzony plan i chcesz wykonać jedną fazę z weryfikacją, ręczną bramką, rytuałem commitowania i zapisem SHA do `## Progress`. |
| **Zamknięcie cyklu życia** | |
| `/10x-archive <change-id>` | Zmiana została scalona lub celowo zamknięta. Przenieś ją z aktywnego `context/changes/` do stanu archiwum. |

### Jak działa przekazywanie w łańcuchu

- `/10x-new` tworzy trwałą tożsamość zmiany.
- `/10x-plan` przekształca tę tożsamość w kontrakt implementacji.
- `/10x-plan-review` sprawdza plan, zanim agent zmodyfikuje kod.
- `/10x-implement` wykonuje jedną zaplanowaną fazę, weryfikuje, prosi o ręczne potwierdzenie, gdy jest to potrzebne, commituje i rejestruje postęp.

### Granice lekcji

- Plan jest domyślnym routerem po wyborze planu działania. Zacznij od `/10x-plan`, chyba że problem jest niejasny lub zewnętrzne dowody blokują.
- Nie uruchamiaj `/10x-frame + /10x-research` jako ceremonii dla każdej zmiany.
- Nie przekształcaj tej lekcji w pełną, kompleksową budowę produktu. Punkt kontrolny z zaplanowanym i częściowo lub w pełni zaimplementowanym strumieniem jest ważny.
- Przegląd kodu zaimplementowanego diffa należy do Lekcji 3 za pośrednictwem `/10x-impl-review`.
- Zamknięcie cyklu życia za pośrednictwem `/10x-archive` po scaleniu lub celowym zamknięciu zmiany.

### Ścieżki używane w tej lekcji

- `context/foundation/roadmap.md` - plan działania nadrzędny
- `context/changes/<change-id>/change.md` - tożsamość zmiany
- `context/changes/<change-id>/plan.md` - kontrakt implementacji
- `context/changes/<change-id>/plan-brief.md` - skompresowane przekazanie
- `context/foundation/lessons.md` - powtarzające się zasady i pułapki
- `docs/reference/contract-surfaces.md` - rejestr nazw nośnych

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
