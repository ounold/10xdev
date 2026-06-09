---
date: 2026-05-29T20:46:34.5845567+02:00
researcher: codex
git_commit: f7c097936a60646d7360bced3678acf7462aea78
branch: main
repository: 10xdev
topic: "professor-student-roster"
tags: [research, codebase, dashboard, supervision, students, roster]
status: complete
last_updated: 2026-05-29
last_updated_by: codex
---

# Badanie: professor-student-roster

**Data**: 2026-05-29T20:46:34.5845567+02:00  
**Badacz**: codex  
**Git Commit**: `f7c097936a60646d7360bced3678acf7462aea78`  
**Gałąź**: `main`  
**Repozytorium**: `10xdev`

## Pytanie badawcze

Czy baza kodu jest gotowa na wdrożenie zmiany `professor-student-roster`, jaki powinien być dokładny zakres tej zmiany po ukończeniu `S-02`, oraz gdzie znajdują się punkty integracji i ryzyka architektoniczne?

## Podsumowanie

Tak, baza kodu jest gotowa na `professor-student-roster`, ale ta zmiana powinna być traktowana jako rozszerzenie istniejącego dashboardu profesora, a nie jako nowy niezależny moduł. Najważniejsze jest to, że `S-02` już przekształciło dashboard w cienki entry shell oparty bezpośrednio na tabeli `students`, więc `S-01` nie zaczyna od zera: musi dołożyć tworzenie rekordów studentów i roster behavior, nie psując istniejącego wejścia do threadów.

Najmocniejsze dowody:

- model danych `students` już istnieje i jest wystarczający dla MVP rosteru: `professor_profile_id`, opcjonalny `student_profile_id`, `full_name`, `email` ([create_supervision_domain.sql#L24-L38](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526213000_create_supervision_domain.sql#L24-L38))
- RLS już dopuszcza select/insert/update/delete rekordów studenta przez profesora właściciela ([enable_supervision_rls.sql#L92-L127](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526215500_enable_supervision_rls.sql#L92-L127))
- dashboard profesora już ładuje listę studentów z helpera i renderuje ją jako listę threadów ([dashboard.astro#L3-L8](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/pages/dashboard.astro#L3-L8), [dashboard.astro#L39-L84](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/pages/dashboard.astro#L39-L84))
- helper `listProfessorStudents()` już daje roster-like read model z `note_count` i `last_meeting_date` ([supervision.ts#L47-L91](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/lib/supervision.ts#L47-L91))

W praktyce oznacza to, że `S-01` powinno najpewniej:

1. rozbudować dashboard o możliwość tworzenia studenta,
2. zachować listę studentów jako główny roster view,
3. utrzymać istniejące linkowanie do thread route z `S-02`,
4. nie wchodzić jeszcze w student self-sign-up linking ani student-facing access.

## Szczegółowe ustalenia

### Dashboard profesora nie jest już placeholderem, tylko zalążkiem rosteru

- Obecny dashboard renderuje listę rekordów `students` oraz statystyki per student, więc od strony UX `S-01` nie tworzy całkowicie nowej powierzchni, tylko rozszerza już istniejący roster-like ekran ([dashboard.astro#L39-L84](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/pages/dashboard.astro#L39-L84)).
- Kopia na stronie wprost mówi, że student creation jest poza zakresem obecnego slice’a, co jest silnym sygnałem, że właśnie to ma wejść w `S-01` ([dashboard.astro#L43-L46](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/pages/dashboard.astro#L43-L46)).
- Sekcja boczna podkreśla, że ekran jest „thin by design” i nie jest jeszcze docelowym roster-management surface, więc roadmap intent pozostaje spójny: `S-01` ma poszerzyć ten ekran, a nie go zastąpić ([dashboard.astro#L87-L104](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/pages/dashboard.astro#L87-L104)).

### Model danych dla rosteru jest gotowy

- Tabela `students` ma już wszystkie minimalne pola potrzebne do rosteru MVP: właściciel-profesor, opcjonalne powiązanie ze student profile, imię/nazwę i email ([create_supervision_domain.sql#L24-L38](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526213000_create_supervision_domain.sql#L24-L38)).
- Constraint `students_email_present_if_linked` i `students_professor_differs_from_student` pokazują, że model już przewiduje późniejsze linkowanie student accountów, ale nie wymusza go dla niezlinkowanych rekordów, co dobrze pasuje do MVP create-roster-first ([create_supervision_domain.sql#L32-L37](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526213000_create_supervision_domain.sql#L32-L37)).
- Typy aplikacyjne odzwierciedlają ten model wprost i nie wymagają nowej warstwy kontraktów do samego tworzenia studentów ([database.ts#L12-L20](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/lib/database.ts#L12-L20)).

### Warstwa dostępu do danych jest częściowo gotowa, ale tylko dla odczytu

- `listProfessorStudents()` już dostarcza read model dobry dla roster view: sortowanie po nazwie, agregacja liczby notatek i daty ostatniego spotkania ([supervision.ts#L47-L91](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/lib/supervision.ts#L47-L91)).
- `getStudentHistory()` pokazuje, że thread view już zależy bezpośrednio od `students.id`, więc `S-01` musi zachować ten identyfikator i nie wprowadzać alternatywnego entry modelu ([supervision.ts#L93-L140](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/src/lib/supervision.ts#L93-L140)).
- Nie istnieje jeszcze helper do `insert`/`update` studentów, więc naturalnym punktem implementacji `S-01` jest rozszerzenie `src/lib/supervision.ts` o create-student path, zamiast rozrzucania query bezpośrednio po page/API route.

### RLS i auth już wspierają profesor-owned roster

- Policy `students_select_accessible` i funkcja `can_access_student()` pozwalają profesorowi widzieć wszystkie własne rekordy studentów oraz studentowi widzieć tylko własny linked record ([enable_supervision_rls.sql#L16-L35](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526215500_enable_supervision_rls.sql#L16-L35), [enable_supervision_rls.sql#L92-L96](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526215500_enable_supervision_rls.sql#L92-L96)).
- Policy `students_insert_professor_owned` już zezwala profesorowi tworzyć studenta przez zwykłą authenticated session, o ile `professor_profile_id = auth.uid()` ([enable_supervision_rls.sql#L98-L105](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/supabase/migrations/20260526215500_enable_supervision_rls.sql#L98-L105)).
- To znaczy, że w przeciwieństwie do hosted notes write workaround z `S-02`, roster create path najpewniej może i powinien działać przez zwykły session client, bez admin-client adaptation.

### Najważniejsze ryzyko: scope overlap z ukończonym `S-02`

- Roadmap opisuje `S-01` jako „create and browse a student roster”, ale po `S-02` browse już częściowo istnieje w dashboardzie profesora ([roadmap.md#L74-L88](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/context/foundation/roadmap.md#L74-L88)).
- W praktyce `S-01` nie powinno próbować „odtworzyć” dashboardu od nowa. Powinno raczej:
  - dodać create student flow,
  - ewentualnie dodać lżejsze roster affordances (empty state CTA, create form, maybe simple editless list polish),
  - zachować istniejące thread links.
- Jeśli plan `S-01` będzie ślepo ufał starszemu opisowi roadmapy, może dojść do błędnego scope’u: duplikacji UI albo regresji w `S-02`.

## Odniesienia do kodu

- `src/pages/dashboard.astro:3` - dashboard używa `listProfessorStudents()` jako głównego źródła danych dla roster entry
- `src/pages/dashboard.astro:43` - copy wprost mówi, że student creation jest poza bieżącym slice’em
- `src/pages/dashboard.astro:63` - każdy student linkuje bezpośrednio do thread route
- `src/lib/supervision.ts:47` - agregowany odczyt listy studentów profesora
- `src/lib/supervision.ts:93` - thread route oparty bezpośrednio o `students.id`
- `src/lib/database.ts:12` - kanoniczny app contract dla `StudentRow`
- `supabase/migrations/20260526213000_create_supervision_domain.sql:24` - definicja tabeli `students`
- `supabase/migrations/20260526215500_enable_supervision_rls.sql:98` - insert policy dla profesora właściciela
- `src/pages/dashboard/students/[studentId].astro:19` - powrót do dashboardu potwierdza, że dashboard jest parent IA dla roster + thread

## Wnioski architektoniczne

- `S-01` powinno być planowane jako **ewolucja istniejącego dashboardu profesora**, nie jako osobny ekran od zera.
- Najlepszy kształt implementacyjny to:
  - rozszerzyć `src/lib/supervision.ts` o create-student helper,
  - dodać mały professor-only create route lub action,
  - rozszerzyć `src/pages/dashboard.astro` o formularz/CTA tworzenia studenta,
  - utrzymać `students` list jako wspólne entry point dla `S-01` i `S-02`.
- `student_profile_id` powinno pozostać opcjonalne w `S-01`; linking student accountów należy do późniejszego odblokowania `S-03`, nie do roster MVP.
- `S-01` ma naturalny związek z `S-02`, ale nie powinno przejmować odpowiedzialności za note history ani note writes.

## Kontekst historyczny (z poprzednich zmian)

- `S-02` zostało już wdrożone jako north-star slice i świadomie uczyniło dashboard profesora „thin entry shell”, a nie pełny roster manager ([roadmap.md#L90-L109](https://github.com/ounold/10xdev/blob/f7c097936a60646d7360bced3678acf7462aea78/context/foundation/roadmap.md#L90-L109)).
- Zmiana `professor-note-history` zostawiła wyraźny ślad w `change.md`: dashboard i thread routing są już gotowe i mają pozostać zachowane ([context/changes/professor-note-history/change.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\change.md)).
- Review Phase 1 odnotował, że dashboard jest świadomie „thin by design”, co wzmacnia interpretację, że `S-01` ma go rozszerzyć zamiast zastępować ([context/changes/professor-note-history/reviews/impl-review-phase-1.md](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\reviews\impl-review-phase-1.md)).

## Powiązane badania

- [Professor note history change](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\change.md)
- [Phase 1 implementation review](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\reviews\impl-review-phase-1.md)
- [Phase 2 implementation review](C:\Users\olguno5421\Documents\GitHub\10xdev\context\changes\professor-note-history\reviews\impl-review-phase-2.md)

## Otwarte pytania

- Czy `S-01` ma obejmować tylko tworzenie studentów, czy także lekką edycję istniejącego rekordu (`full_name`, `email`)?
- Czy roster MVP powinien mieć osobny route `/dashboard/students`, czy dashboard ma pozostać kanonicznym roster screen?
- Czy w planie `S-01` trzeba już zapisać follow-up do `S-03`, np. linkowanie istniejącego student record do auth profile, czy zostawić to całkowicie poza zakresem?
