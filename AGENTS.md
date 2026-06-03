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
- This repo also uses Stryker mutation testing as an additional quality gate. Treat `npm run test:mutation` as a test-strength signal, not as ordinary coverage reporting; a high line/branch coverage number does **not** mean the mutation gate is satisfied.
- On this Windows setup, if `astro build` or Wrangler fails with `EPERM` under `%APPDATA%`, set `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` to workspace-local temp directories before running build commands.
- CI on `master` requires `SUPABASE_URL` and `SUPABASE_KEY` secrets for the build step.

## Security and Config

- Copy @.env.example into `.env` or `.dev.vars` locally; never commit filled secret files.
- Local Supabase and auth setup: @README.md.
- Professor bootstrap depends on `SUPABASE_SERVICE_ROLE_KEY` plus `BOOTSTRAP_PROFESSOR_EMAIL`; the first-professor claim is a dedicated server-side flow, not a middleware side effect.
- If you add database tables later, keep migrations in `supabase/migrations/` and enable RLS explicitly.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 3, Lekcja 1

Rozpocznij Moduł 3, tworząc **trwałą umowę jakościową opartą na ryzyku** przed napisaniem jakiegokolwiek testu — a następnie przeprowadzaj każdą fazę wdrożenia przez standardowy łańcuch zmian.

```
PRD + roadmap + archive
        │
        ▼
   /10x-test-plan  ──►  context/foundation/test-plan.md  (strategia §1–§5 zamrożona + cookbook §6 rośnie)
        │
        ▼  (jedna faza wdrożenia na raz, /clear między przekazaniami)
   /10x-new ──► /10x-research ──► /10x-plan ──► /10x-implement
```

`/10x-test-plan` to **stanowy orkiestrator**, a nie jednorazowy generator. Przy pierwszym uruchomieniu zapisuje fazowe wdrożenie do `context/foundation/test-plan.md`. Przy każdym kolejnym uruchomieniu ponownie wyprowadza stan z artefaktów na dysku i przedstawia następne przekazanie. Lekcja koncentruje się na **strategii i sekwencjonowaniu wdrożenia, a nie na konfiguracji**. Hooki, serwery MCP i CI YAML są konfigurowane w późniejszych lekcjach tego modułu.

### Router zadań - Od czego zacząć

| Umiejętność | Kiedy jej użyć |
| --- | --- |
| **Strategia jakości jako plik reguł (fokus lekcji)** | |
| `/10x-test-plan` | Masz PRD (i idealnie roadmapę oraz kilka zarchiwizowanych wycinków) i zamierzasz napisać pierwsze testy projektu, lub zauważyłeś, że testy generowane przez AI lądują na helperach, podczas gdy krytyczne przepływy pozostają niepokryte. Pierwsze wywołanie uruchamia odkrywanie (PRD + roadmap + archive + skan gorących punktów), 5-pytaniowy wywiad z użytkownikiem i pas syntezy z obowiązkową kontrolą challengera, a następnie zapisuje `test-plan.md` w `context/foundation/` z mapą ryzyka (5–7 scenariuszy awarii), tabelą fazowego wdrożenia, tabelą stosu, tabelą bramek jakości, sekcją cookbook (`§6`, wypełnia się w miarę realizacji faz) i sekcją przestrzeni negatywnej (czego celowo nie testujemy). Kolejne wywołania posuwają wdrożenie o jedno przekazanie na raz. |
| `/10x-test-plan --status` | `test-plan.md` już istnieje i chcesz uzyskać kompaktową migawkę stanu wdrożenia — które fazy są `not started`, `change opened`, `researched`, `planned`, `implementing` lub `complete`, i jakie jest następne działanie. Nie wykonuje żadnej pracy; bezpieczne do uruchomienia w dowolnym momencie. |
| `/10x-test-plan --refresh` | `test-plan.md` już istnieje i jedno z: pojawiło się nowe ryzyko z top-3 z roadmapy lub archiwum, data `checked:` narzędzia jest starsza niż trzy miesiące, zmienił się stos technologiczny projektu, lub §7 przestrzeń negatywna nie odpowiada już temu, w co wierzy zespół. Otwiera nowy folder zmian `test-plan-refresh-<RRRR-MM-DD>` zamiast edytować przewodnik na miejscu. |

### Łańcuch wdrożenia — co dzieje się po napisaniu przewodnika

Tabela §3 *Phased Rollout* przewodnika jest stanem orkiestratora. Dla każdego wiersza innego niż `complete` orkiestrator wybiera następne przekazanie na podstawie tego, które artefakty istnieją w `context/changes/<change-id>/`:

| Stan na dysku | Następne przekazanie | Status zmienia się na |
| --- | --- | --- |
| brak folderu zmian | `/10x-new <change-id>` | `change opened` |
| tylko `change.md` | `/10x-research` (z krótkim opisem ryzyk do zweryfikowania) | `researched` |
| `+ research.md` | `/10x-plan` (z ograniczeniami koszt × sygnał + aktualizacja cookbook) | `planned` |
| `+ plan.md` z oczekującymi elementami `## Progress` | `/10x-implement <change-id> phase <N>` | `implementing` / `complete` |
| `+ plan.md` w pełni `[x]` | Oznacz wiersz §3 jako `complete`; przejdź do następnego oczekującego wiersza | — |

Każde przekazanie to **punkt STOP**. Orkiestrator kopiuje następne polecenie do schowka, prosi użytkownika o `/clear` i uruchomienie go, a następnie kończy działanie. Ponownie wywołaj `/10x-test-plan` (bez argumentów), aby przejść dalej.

### Reguły priorytetyzacji opartej na ryzyku

- Ryzyka to **scenariusze awarii w kategoriach użytkownika / biznesu**, a nie nazwy testów. "Wylogowany użytkownik uzyskuje dostęp do płatnych treści za pomocą nieaktualnego tokena" to ryzyko; "przetestuj formularz logowania" nie jest.
- Od 5 do 7 ryzyk. Mniej jest zbyt ogólne; więcej sprawia, że priorytetyzacja jest bezużyteczna.
- Wpływ i prawdopodobieństwo to oceny użytkownika/biznesu, a nie złożoność techniczna.
- Każde ryzyko ma swoje źródło: sekcja PRD, zarchiwizowany wycinek, wpis w roadmapie, pytanie z wywiadu w Fazie 2, **katalog** gorących punktów z liczbą zmian, lub ograniczenie stosu technologicznego. Brak wymyślonych ryzyk.
- **Sygnał, nie wiedza.** §2 cytuje *dowody, które podniosły ryzyko*, nigdy plik jako "gdzie leży awaria". Kotwice plik:linia, nazwy funkcji, nazwy schematów i nazwy modułów są zabronione w §2 — należą do wyników `/10x-research`, generowanych dla każdej fazy wdrożenia w stosunku do bieżącego kodu. Plan jest specyfikacją QA; nie jest audytem kodu.
- Pokrycie nie jest metryką. **Pokrycie ryzyka** jest metryką.

### Reguły mapowania dwuwarstwowego

- Najpierw warstwa klasyczna: wygrywa najtańszy test, który daje prawdziwy sygnał. Promuj do e2e tylko wtedy, gdy żadna tańsza warstwa nie pokrywa ryzyka.
- Druga warstwa AI-native, i tylko tam, gdzie dodaje sygnał, którego klasyczne testy nie dają tanio.
- Każdy wiersz AI-native ma linię **"Kiedy NIE używać"**. Jeśli nie możesz jej napisać, usuń wiersz.
- Każda nazwa narzędzia zawiera datę `checked: <RRRR-MM-DD>`. Nazwy narzędzi są przykładami kategorii, a nie rekomendacjami.
- Obie warstwy muszą być niepuste w ostatecznym przewodniku, jeśli projekt tego wymaga. Tylko klasyczne to plan z 2020 roku; tylko AI-native to szum. Fazy AI-native nie są obowiązkowe — uwzględnij je tylko wtedy, gdy brief uzasadniał je pod względem koszt × sygnał.

### Reguły bramek jakości

- Wymagane bramki (lint, typecheck, unit+integration, e2e na krytycznych przepływach) muszą mapować się do rzeczywistych kroków CI. Jeśli wymagana bramka nie jest jeszcze podłączona, oznacz ją jako `required after §3 Phase <N>` i pozwól nazwanej fazie wdrożenia ją podłączyć.
- Hook post-edycji jest **zalecany lokalnie**, a nie jako substytut CI.
- Wielomodalny przegląd wizualny jest **selektywny**, stosowany do 1–3 krytycznych ekranów, a nie do każdej strony.
- Awaryjne rozwiązanie oparte na wizji (Anthropic Computer Use lub OpenAI CUA) jest zarezerwowane dla powierzchni niedostępnych przez DOM; drogie na akcję.

### Wzorce Cookbook (§6) — wypełnia się z czasem

`test-plan.md` to zarówno fazowa strategia, jak i **rosnący cookbook**. §6 zaczyna się jako miejsca docelowe (`TBD — zobacz §3 Faza <N>`) i wypełnia się stopniowo — plan każdej fazy wdrożenia kończy się podfazą, która aktualizuje odpowiedni wpis w §6 (lokalizacja, nazewnictwo, test referencyjny, polecenie uruchomienia). Po zakończeniu Modułu 3, §6 staje się kanoniczną odpowiedzią na pytanie "jak dodać test dla X w tym projekcie?" — i to, co `/10x-tdd` czyta w Lekcji 2.

### Granice lekcji

- Nie pisz kodu testowego. To jest Lekcja 2 (`/10x-tdd` i tworzenie testów jednostkowych).
- Nie konfiguruj hooków, cyklu życia hooków ani debugowania hooków. To jest Lekcja 3.
- Nie konfiguruj serwerów MCP, Playwright API, kodu e2e ani kodu scenariuszy wielomodalnych. To jest Lekcja 4.
- Nie uruchamiaj przepływu bug-to-fix-to-regression-test. To jest Lekcja 5.
- Nie twórz potoków CI/CD od podstaw ani nie pisz YAML dla GitHub Actions. Przewodnik nazywa bramki; konfiguracja jest własnością Modułu 1 Lekcji 5 i Modułu 2 Lekcji 5.
- Nie benchmarkuj modeli wielomodalnych. Cytuj kryteria (koszt, opóźnienie, przyjazność dla agenta), nigdy ranking.
- Nie czytaj bazy kodu w celu uzyskania wiedzy (grafy wywołań, schematy, "który plik jest właścicielem tej awarii"). To jest zadanie `/10x-research`, dla każdej fazy wdrożenia.

### Ścieżki używane w tej lekcji

- `context/foundation/test-plan.md` — umowa jakościowa tworzona i utrzymywana przez `/10x-test-plan`
- `context/foundation/prd.md` — główne źródło ryzyka
- `context/foundation/roadmap.md` — ważenie prawdopodobieństwa
- `context/foundation/tech-stack.md` — dane wejściowe stosu (jeśli istnieją)
- `context/archive/<change-id>/plan.md` — zaimplementowana powierzchnia ryzyka
- `context/changes/<change-id>/` — folder zmian dla każdej fazy wdrożenia (jeden na wiersz w §3)

<!-- END @przeprogramowani/10x-cli -->
