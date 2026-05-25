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
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.

<!-- BEGIN @przeprogramowani/10x-cli -->

---
name: 10xDevs AI Toolkit - Module 2, Lesson 1
description: Move from sprint-zero setup to project orchestration with the roadmap chain.
license: CC BY-NC-ND 4.0
metadata:
  module: 2
  lesson: 1
  author: 10xDevs
---

## 10xDevs AI Toolkit - Moduł 2, Lekcja 1

Przejdź od konfiguracji sprint-zero do orkiestracji projektu za pomocą **łańcucha mapy drogowej**:

```
(dokumenty podstawowe Modułu 1) -> /10x-roadmap -> elementy mapy drogowej gotowe do backlogu
```

`/10x-roadmap` to główny temat lekcji. `/10x-new` jest celowo wprowadzony w Module 2, Lekcji 2, gdy wybrany element mapy drogowej staje się folderem zmian implementacyjnych.

### Router zadań - Od czego zacząć

| Umiejętność | Użyj, gdy |
| --- | --- |
| **Mapa drogowa (główny temat lekcji)** | |
| `/10x-roadmap` | Masz `context/foundation/prd.md` i podstawę projektu, i potrzebujesz mapy drogowej MVP z podejściem vertical-first. Umiejętność odczytuje PRD, sprawdza podstawę kodu, używa dostępnych dokumentów podstawowych, takich jak `tech-stack.md`, `infrastructure.md` i `deploy-plan.md`, a następnie zapisuje `context/foundation/roadmap.md`. Użyj jej PRZED tworzeniem folderów dla poszczególnych zmian lub planów implementacji. |
| **Ponowne uruchomienie upstream w razie potrzeby** | |
| `/10x-shape` / `/10x-prd` / `/10x-tech-stack-selector` / `/10x-bootstrapper` / `/10x-agents-md` / `/10x-infra-research` | Zgrupowane z Modułu 1, aby kontrakty podstawowe mogły zostać naprawione przed sekwencjonowaniem mapy drogowej. Jeśli generowanie mapy drogowej ujawni lukę w PRD, napraw PRD, zanim udasz, że backlog jest gotowy. |

### Jak działa przekazywanie w łańcuchu

- `/10x-roadmap` łączy produkt z implementacją. Nie wybiera frameworków, nie projektuje schematów ani nie pisze planu implementacji dla każdej zmiany.
- Wynikiem jest `context/foundation/roadmap.md`: uporządkowane kamienie milowe, pionowe wycinki, ograniczone podstawy, zależności, niewiadome, ryzyko i pola przekazania do backlogu.
- Elementy mapy drogowej powinny otrzymywać stabilne, czytelne dla człowieka identyfikatory w narzędziach backlogu. Rzeczywisty folder `context/changes/<change-id>/` jest tworzony w Lekcji 2 za pomocą `/10x-new`.

### Granice mapy drogowej

- Domyślnie pionowe wycinki: widoczne dla użytkownika rezultaty, które obejmują interfejs użytkownika, dane, logikę biznesową i integracje.
- Praca horyzontalna jest dozwolona tylko jako ograniczony element umożliwiający, który nazywa docelowy pionowy kamień milowy, który odblokowuje.
- Unikaj osieroconej pracy horyzontalnej, takiej jak "zbuduj całą bazę danych", "zbuduj wszystkie punkty końcowe API" lub "zaprojektuj cały interfejs użytkownika" przed pierwszym widocznym dla użytkownika przepływem.
- Mapa drogowa nie jest szacunkiem kalendarzowym. Nie wymyślaj dat, punktów historii ani prędkości sprintu, chyba że użytkownik wyraźnie poprosi o oddzielny artefakt planistyczny.

### Ścieżki podstawowe używane w tej lekcji

- `context/foundation/prd.md` - wejście
- `context/foundation/tech-stack.md` - opcjonalne wejście
- `context/foundation/infrastructure.md` - opcjonalne wejście
- `context/deployment/deploy-plan.md` - opcjonalne wejście
- `context/foundation/roadmap.md` - wyjście
- `context/foundation/lessons.md` - powtarzające się zasady i pułapki
- `docs/reference/contract-surfaces.md` - rejestr nazw nośnych

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`."

<!-- END @przeprogramowani/10x-cli -->
