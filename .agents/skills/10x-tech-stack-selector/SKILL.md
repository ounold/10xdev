```
---
name: 10x-tech-stack-selector
description: >
  Wybierz starter i stos technologiczny dla nowego projektu po napisaniu PRD.
  Odczytuje context/foundation/prd.md, otwiera się z rozwidleniem ścieżki Q0 (zalecana
  domyślna dla komórki (product_type, language_family) vs zaprojektuj-własny),
  przeprowadza pozostały wywiad na niestandardowej ścieżce, rozumuje na podstawie
  rejestru starterów uwzględniającego język z czterema przyjaznymi dla agenta
  bramkami jakości i zapisuje plik context/foundation/tech-stack.md, który
  /10x-bootstrapper konsumuje. Użyj, gdy użytkownik zapyta "jakiego stosu powinienem użyć",
  powie "wybierz stos", "wybierz framework", "co wybrać do projektu" lub ma PRD na dysku
  i jest gotowy do scaffoldingu. Użyj PO /10x-prd, PRZED /10x-bootstrapper.
---
```

# Selektor Stosu Technologicznego: Od PRD do Startera

Ta umiejętność jest trzecim ogniwem w łańcuchu bootstrap (`/10x-shape → /10x-prd → 10x-tech-stack-selector → /10x-bootstrapper`). Jej jedyne zadanie: przekształcić napisany PRD w zalecany starter i mały, czytelny dla maszyny plik `context/foundation/tech-stack.md`, który `/10x-bootstrapper` może odczytać do scaffoldingu projektu.

Umiejętność ta jest **ułatwiaczem decyzji w oparciu o wyselekcjonowany rejestr**, a nie generatorem rekomendacji od podstaw. Odczytuje priorytetowe informacje z PRD, zadaje maksymalnie ~6 dodatkowych pytań na ścieżce niestandardowej (lub skraca do sprawdzonej rekomendacji na ścieżce standardowej), rozumuje na podstawie kart starterów uwzględniających język w `references/starter-registry.yaml` i stosuje cztery bramki jakości z twardym filtrem. Bogate uzasadnienie pozostaje w rozmowie; przekazanie pliku jest minimalne.

Rejestr starterów w `references/starter-registry.yaml` jest **jedynym źródłem prawdy** dla dostępnych starterów. `/10x-bootstrapper` go odczytuje; walidator CI (`scripts/validate-starter-registry-sync.mjs`) zapobiega odwoływaniu się bootstrapperowi do `starter_id`, który tutaj nie istnieje.

## Kiedy używać, kiedy pomijać

**Użyj, gdy**: `context/foundation/prd.md` istnieje, a użytkownik jest gotowy do wyboru stosu. Frazy wyzwalające: "jakiego stosu powinienem użyć", "wybierz starter", "wybierz framework", "co wybrać", "w czym powinienem to zbudować", "czy możesz polecić stos". Użyj również, gdy użytkownik prosi o porównanie ("React vs Vue vs Svelte") z PRD na dysku — umiejętność wymusza ścieżkę niestandardową i przechodzi przez warianty frameworków.

**Pomiń, gdy**: `context/foundation/prd.md` jest nieobecny — umiejętność odmawia i przekierowuje do `/10x-shape` + `/10x-prd`. Pomiń również, gdy użytkownik jest w trakcie implementacji istniejącej bazy kodu i pyta o dodanie biblioteki lub zastąpienie pojedynczej zależności — to jest obszar `/10x-frame`, a nie wybór stosu.

## Relacja z innymi umiejętnościami

- `/10x-shape` — tworzy `shape-notes.md`, prekursora PRD. Dwa poziomy wyżej w łańcuchu niż ta umiejętność.
- `/10x-prd` — tworzy `context/foundation/prd.md`, kanoniczne wejście. Zawsze wyżej w łańcuchu.
- `/10x-bootstrapper` — konsument w dół łańcucha. Odczytuje frontmatter `context/foundation/tech-stack.md` i rejestr; scaffoldinguje projekt.

## Wymagane dane wejściowe

1. Plik PRD — istnieje, jest czytelny, zgodny ze schematem PRD (`/skills/10x-shape/references/prd-schema.md`). Domyślna lokalizacja: `context/foundation/prd.md`. Użytkownik MOŻE podać inną ścieżkę jako argument (patrz "Początkowa odpowiedź" poniżej). Umiejętność odczytuje **frontmatter** jako priorytety (`product_type`, `target_scale`, `timeline_budget`, `project`) i może odczytywać sekcje treści (`## Functional Requirements`, `## Non-Goals`) do audytu funkcji i wykrywania momentów sokratycznych, w których FR-y PRD ujawniają funkcję, której zalecany starter nie zawiera.
2. `references/starter-registry.yaml` — dołączony do umiejętności. Ładowany w momencie decyzji.
3. `references/residual-interview.md` — dołączony. Ładowany w momencie wywiadu.
4. `references/handoff-schema.md` — dołączony. Ładowany w momencie zapisu.
5. `references/agent-friendly-criteria.md` — dołączony. Ładowany w momencie filtrowania.
6. `references/decision-flow.md` — dołączony. Ładowany w momencie decyzji.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli podano argument ścieżki** (np. `/10x-tech-stack-selector @context/foundation/prd-v2.md` lub `/10x-tech-stack-selector path/to/prd.md`), usuń początkowe `@`, jeśli występuje, i użyj ścieżki dosłownie jako lokalizacji PRD dla tego uruchomienia.
2. **Jeśli nie podano argumentu**, domyślnie ustaw ścieżkę PRD na `context/foundation/prd.md`.

Przenieś rozwiązaną ścieżkę przez Krok 0; reszta przepływu pracy działa na niej jako `<prd-path>`.

## Przepływ pracy

### Krok 0 — Warunek wstępny PRD

Sprawdź warunek wstępny PRD względem rozwiązanej ścieżki:

```bash
test -f "<prd-path>"
```

Jeśli plik jest **nieobecny**, wykonaj dokładnie to i ZATRZYMAJ — bez wywiadu awaryjnego, bez wbudowanego mini-PRD, bez odczytywania historii rozmów w celu zastąpienia priorytetów:

```bash
echo -n "/10x-shape" | pbcopy 2>/dev/null || echo -n "/10x-shape" | clip.exe 2>/dev/null || echo -n "/10x-shape" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-shape"
```

Wydrukuj dosłownie (zastąp rozwiązaną ścieżkę; jeśli domyślna, to `context/foundation/prd.md`):

```
Selektor stosu technologicznego wymaga PRD w `<prd-path>`. Najpierw uruchom `/10x-shape`, a następnie ponownie wywołaj.
```

Następnie ZATRZYMAJ. Kontekst rozmowy **nie** jest awaryjny — nawet jeśli treść PRD była wcześniej omawiana na czacie, umiejętność wymaga pliku na dysku.

Jeśli plik jest **obecny**, odczytaj go W CAŁOŚCI (bez `limit`/`offset`) i przejdź do Kroku 1.

### Krok 1 — Załaduj priorytety PRD

Przeanalizuj frontmatter PRD. Wyodrębnij:

- `project` → zasila `project_name` w pliku przekazania (przekształć na kebab-case dla pliku przekazania, jeśli jeszcze nie jest w kebab-case).
- `product_type` → steruje wyszukiwaniem rozwidlenia ścieżki Q0.
- `target_scale.users` → wagi priorytetów (mały/średni/duży/korporacyjny).
- `timeline_budget.mvp_weeks` → wagi priorytetów (krótkie terminy sprzyjają sprawdzonym + popularnym starterom).

Przeczytaj treść PRD w celu uzyskania kontekstu audytu funkcji: przeskanuj `## Functional Requirements` w poszukiwaniu funkcji wymuszających technologię (uwierzytelnianie, płatności, czas rzeczywisty, AI/LLM, zadania w tle, przechowywanie plików, i18n). Przedstaw je jako listę kontrolną później w Q1.

Powtórz priorytety użytkownikowi:

```
Priorytety PRD:
  Projekt:       <project>
  Typ produktu:  <product_type>
  Skala:         <target_scale.users>
  Oś czasu:      <timeline_budget.mvp_weeks> tygodni
                 (po godzinach: <timeline_budget.after_hours_only>)

  Wykryte sygnały funkcji z FR:
    - <feature> (FR-NNN)
    - ...
```

Zadaj jedno potwierdzenie:

Zapytaj użytkownika:
- pytanie: "Czy te priorytety są poprawne, czy chcesz coś poprawić, zanim przejdziemy dalej?"
  header: "Priorytety"
  options:
  - label: "Poprawne — kontynuuj (Zalecane)"
    description: "Kontynuuj z tymi priorytetami."
  - label: "Popraw wartość"
    description: "Zapytam, które pole poprawić, a następnie zaktualizuję nadpisanie w pamięci (PRD na dysku pozostaje niezmieniony)."
  - label: "Zatrzymaj — najpierw napraw PRD"
    description: "Wyjdź. Uruchom ponownie /10x-prd, aby naprawić priorytety, a następnie ponownie wywołaj /10x-tech-stack-selector."
  multiSelect: false

Jeśli "Popraw wartość": zapytaj, które pole, przechwyć nadpisanie, kontynuuj z nadpisaniem zastosowanym tylko dla tej sesji.

### Krok 2 — Rozwidlenie ścieżki Q0 + wywiad uzupełniający

Załaduj `references/residual-interview.md` i postępuj zgodnie z opisanym tam przepływem Q.

Wywiad ma dwie ścieżki:

- **Ścieżka standardowa** (domyślnie zalecana w Q0): użytkownik akceptuje sprawdzoną rekomendację dla swojej komórki `(product_type, language_family)`. Q1–Q3 i Q6 są pomijane. Q4 (wdrożenie), Q5 (CI/CD) i potwierdzenie nazwy projektu nadal działają; autotest Q8 jest pomijany (zalecana ścieżka jest sama w sobie bezpieczniejszym wyborem).
- **Ścieżka niestandardowa** (użytkownik decyduje się na własny projekt): pełny przebieg Q1–Q6 plus warunkowe Q7 (runner testowy) plus autotest Q8 przed przekazaniem.

Q0 wyprowadza `language_family` z jawnej treści PRD, jeśli jest obecna, w przeciwnym razie pyta raz w Q0 (frontmatter PRD nie zawiera `tech_preferences`). Mapa zalecanych domyślnych wartości na początku `references/starter-registry.yaml` rozwiązuje `(product_type, language_family) → starter_id`. Jeśli komórka ma sprawdzoną wartość domyślną, przedstaw ją po nazwie z jednowierszowym dopasowaniem i wartością `bootstrapper_confidence` startera. Jeśli komórka nie ma wartości domyślnej (mapa pokazuje `<none>`), wymuś ścieżkę niestandardową z jednosentencyjną notatką ("Brak sprawdzonej zalecanej wartości domyślnej dla `<product_type, language_family>`; przeprowadzimy pełny wywiad uzupełniający.").

Domyślna wartość Q0 jest **redakcyjna, a nie cicha**: nazwij zalecany starter z góry i poproś o wyraźne potwierdzenie. Użytkownik musi świadomie zaakceptować lub rozgałęzić — nigdy nie akceptuj domyślnie bez pytania.

### Krok 3 — Decyzja

Załaduj `references/decision-flow.md` i `references/agent-friendly-criteria.md`. Załaduj `references/starter-registry.yaml` i odczytaj tylko karty istotne dla ograniczonego zestawu kandydatów (filtrowane według `language_family` i `product_type` zgodnie z krokiem A przepływu decyzji) — nie wszystkie 25 wpisów, aby obniżyć koszt promptu.

Wykonaj przepływ decyzji:

- **Ścieżka standardowa** — wybór `recommended_defaults` jest już wiodący; przejdź do Kroku E (wyświetl `bootstrapper_confidence`) i pomiń filtrowanie/punktację.
- **Ścieżka niestandardowa** — wykonaj Krok A (filtruj według `language_family` + `product_type` + funkcji must-have + kompatybilności wdrożenia), Krok B (usuń wpisy niespełniające żadnego kryterium `agent_friendly.*`, z zastrzeżeniem dla poszczególnych rodzin językowych), Krok C (rozumuj na podstawie pozostałych kart, ważąc `team_profile` + `tech_preferences` + `timeline_budget`), Krok D (wiodący + 1–2 alternatywy z `alternatives_to_consider`), Krok E (wyświetl `bootstrapper_confidence`).

Wyświetl wyzwania sokratyczne tam, gdzie przepływ decyzji to nakazuje: wariant frameworka Q6 na ścieżce niestandardowej, `tech_preferences` nazywa starter, który nie spełnia ≥1 bramki jakości, zalecany domyślny starter nie zawiera funkcji, którą użytkownik nazwał w FR-ach PRD, lub wybrany starter ma `bootstrapper_confidence: best-effort` ORAZ użytkownik jest sam (dodatkowe ostrzeżenie).

Kształt wyjścia rozmowy:

```
Rekomendacja: <starter_id> — <name>
Pewność:     <verified | first-class | best-effort>

<jednopardgrafowe uzasadnienie łączące priorytety PRD i odpowiedzi użytkownika z wiodącą kartą>

Alternatywy warte uwagi:
  - <starter_id_a> — <jednowierszowy kompromis>
  - <starter_id_b> — <jednowierszowy kompromis>

<jeśli podczas wywiadu podniesiono flagę (preferencja vs jakość, brakująca
 funkcja, ostrzeżenie o tarciu podczas scaffoldingu): jednowierszowe podsumowanie tego, co się pojawiło,
 jak użytkownik to rozwiązał i czy kontynuuje z znanym tarciem
 stosu>
```

### Krok 4 — Zapisz plik przekazania

Załaduj `references/handoff-schema.md`. Najpierw zbuduj zawartość pliku przekazania w pamięci.

Rozwiąż `package_manager` z `toolchain.package_manager` wybranej karty. Pole jest otwartym ciągiem znaków (cokolwiek karta przepisuje — `npm`, `uv`, `poetry`, `bundle`, `gradle`, `cargo`, `go-modules`, `composer`, `dotnet` itp.); dla ekosystemów bez zewnętrznego wyboru (np. Go), karta może pominąć pole, w takim przypadku pomiń je również z frontmatteru pliku przekazania.

Rozwiąż `hints.deployment_target` z Q4. Jeśli użytkownik wybrał "Nie wiem jeszcze — wybierz dla mnie zalecaną wartość domyślną", użyj pierwszej wartości `deployment_default` karty (NIE dosłownego ciągu `unspecified`).

Wypełnij `hints.path_taken`: `standard` lub `custom`. Wypełnij `hints.self_check_answers` 5 wartościami logicznymi z Q8, jeśli uruchomiono ścieżkę niestandardową; emituj `null`, jeśli wybrano ścieżkę standardową.

Sprawdź kolizję:

```bash
test -f context/foundation/tech-stack.md
```

Jeśli plik nie istnieje, zapisz `context/foundation/tech-stack.md` z zatwierdzoną zawartością.

Jeśli plik istnieje, zapytaj:

Zapytaj użytkownika:
- pytanie: "context/foundation/tech-stack.md już istnieje. Jak chcesz postąpić?"
  header: "Kolizja"
  options:
  - label: "Nadpisz (Zalecane)"
    description: "Zastąp istniejący plik tech-stack.md nowym wyborem. Poprzednia wersja zostanie utracona, chyba że zostanie zatwierdzona."
  - label: "Zapisz jako tech-stack-v2.md"
    description: "Zachowaj historię. Nowy wybór zostanie zapisany w następnym dostępnym miejscu tech-stack-vN.md."
  - label: "Przerwij"
    description: "Wyjdź bez zapisu. Uzasadnienie rozmowy zostanie zachowane tylko na czacie."
  multiSelect: false

Zalecaną wartością domyślną jest tutaj "Nadpisz", ponieważ selektor stosu technologicznego jest jednorazową decyzją dla projektu; wiele wersji jest zazwyczaj oznaką, że użytkownik ponownie rozważa, w którym to przypadku utrata poprzedniego wyboru jest zamierzona. Zapis wersji jest wyjściem awaryjnym.

Po zapisaniu pliku skopiuj polecenie następnego kroku i ogłoś:

```bash
echo -n "/10x-bootstrapper" | pbcopy 2>/dev/null || echo -n "/10x-bootstrapper" | clip.exe 2>/dev/null || echo -n "/10x-bootstrapper" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-bootstrapper"
```

Wydrukuj:

```
═══════════════════════════════════════════════════════════
  STOS TECHNOLOGICZNY WYBRANY
═══════════════════════════════════════════════════════════

  Starter:        <starter_id>
  Wybrana ścieżka:     <standard | custom>
  Pewność:     <verified | first-class | best-effort>

  ► Przekazanie:  context/foundation/tech-stack.md
  ► Następny:      /10x-bootstrapper  (✓ skopiowano do schowka)
═══════════════════════════════════════════════════════════
```

ZATRZYMAJ. Nie łącz automatycznie z `/10x-bootstrapper` — użytkownik uruchamia go, gdy jest gotowy.

## Wynik

Zapisany pojedynczy plik: `context/foundation/tech-stack.md` (lub `tech-stack-vN.md`, jeśli wybrano zapis wersji).

Frontmatter kluczowany na schemacie w `references/handoff-schema.md`:

```yaml
---
starter_id: <key from registry>
package_manager: <card-prescribed string; may be omitted for some ecosystems>
project_name: <kebab-case>
hints:
  language_family: js | python | ruby | java | go | rust | php | dotnet | dart | multi
  team_size: solo | small | mixed
  deployment_target: <starter-prescribed string>
  ci_provider: github-actions | gitlab-ci | circleci | cloudflare-builds
  ci_default_flow: auto-deploy-on-merge | manual-promotion
  bootstrapper_confidence: verified | first-class | best-effort
  path_taken: standard | custom
  quality_override: <bool>
  self_check_answers: <object | null>
  has_auth: <bool>
  has_payments: <bool>
  has_realtime: <bool>
  has_ai: <bool>
  has_background_jobs: <bool>
---

## Dlaczego ten stos

<jeden akapit, ≤ 200 słów>
```

## Referencje

- `references/starter-registry.yaml` — kanoniczne karty starterów + mapa `recommended_defaults`.
- `references/residual-interview.md` — rozwidlenie ścieżki Q0 + przebieg Q1–Q8.
- `references/handoff-schema.md` — kontrakt frontmatter `tech-stack.md`.
- `references/agent-friendly-criteria.md` — cztery bramki jakości + zastrzeżenie dla poszczególnych rodzin językowych.
- `references/decision-flow.md` — Kroki A–E dla obu ścieżek.

## Krytyczne zabezpieczenia

1. **PRD jest warunkiem wstępnym, a nie awaryjnym.** Brak wbudowanego mini-PRD, brak odczytywania rozmowy w celu zastąpienia priorytetów. Plik na dysku jest umową.

2. **Domyślna wartość Q0 jest redakcyjna.** Nazwij rekomendację z góry; wymagaj wyraźnego potwierdzenia. Nigdy nie akceptuj domyślnie w ciszy.

3. **Ścieżka standardowa vs niestandardowa jest wiążąca.** Standardowa skraca do rekomendacji + Q4/Q5/nazwy projektu. Niestandardowa uruchamia pełny przebieg plus autotest Q8. Nie mieszaj ich — ścieżka wybrana przez użytkownika w Q0 jest tym, co rejestruje `hints.path_taken`.

4. **`bootstrapper_confidence` ma charakter informacyjny, nigdy blokujący.** Pewność `best-effort` NIE wyklucza startera z rekomendacji; pojawia się w rozmowie jako ostrzeżenie i ląduje w `hints.bootstrapper_confidence`, aby bootstrapper mógł się dostosować.

5. **Walidator jednokierunkowy.** Bootstrapper nie może odwoływać się do `starter_id` nieobecnego w rejestrze tej umiejętności; selektor stosu technologicznego może zawierać startery, których bootstrapper jeszcze nie podłączył (te startery mają `bootstrapper_confidence: best-effort`, dopóki nie zostaną zweryfikowane end-to-end).

6. **Tylko język uniwersalny.** Brak prywatnych ścieżek skarbca lub brandingu specyficznego dla organizacji w dostarczanej treści. `pnpm validate:no-vault-paths` wymusza to w CI. Rejestr zalecanych domyślnych wartości jest z założenia wielojęzyczny; żaden pojedynczy starter nie jest "tą" zalecaną ścieżką.

7. **Etykiety wewnętrzne umiejętności pozostają wewnętrzne.** Rozmawiając z użytkownikiem, nigdy nie odwołuj się do numerów Q (`Q0`, `Q3`, `Q6`), liter kroków (`Step A`, `Step B`, …, `Step E`) ani fraz autorskich, takich jak "path-fork", "residual interview", "Socratic moment", "decision flow". Te etykiety organizują dokumentację referencyjną do nawigacji w czasie wykonywania; użytkownik nie ma możliwości ich mapowania na cokolwiek widocznego. Przetłumacz na prosty język przed wydrukowaniem — "ten wybór" zamiast "rozgałęzienie ścieżki", "pytanie o framework" zamiast "Q6", "alternatywa warta uwagi" zamiast "moment sokratyczny", "pominę pytania o audyt funkcji, profil zespołu i preferencje technologiczne" zamiast "pominę Q1–Q3". To samo dotyczy wewnętrznych ścieżek pól w rozmowie: `hints.deployment_target` / `agent_friendly.typed` / `bootstrapper_confidence` to nazwy pól w pliku przekazania / rejestrze, a nie frazy do powiedzenia użytkownikowi — "twój cel wdrożenia", "czy stos używa jawnych typów", "jak płynny będzie scaffolding" to tłumaczenia skierowane do użytkownika.