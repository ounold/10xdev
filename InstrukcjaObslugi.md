# Instrukcja obsługi aplikacji

## 1. Czym jest ta aplikacja

`post-meeting-notes` to aplikacja do prowadzenia współpracy profesora ze studentem po spotkaniach. Pozwala:

- tworzyć studentów w rosterze profesora,
- prowadzić dla każdego studenta osobny wątek,
- zapisywać notatki po spotkaniu,
- rozróżniać wpisy typu `info` i `task`,
- wspólnie edytować notatki,
- oznaczać zadania jako wykonane lub ponownie otwarte,
- archiwizować zakończone relacje profesor-student.

## 2. Role w systemie

W aplikacji są obecnie dwie role:

- `Profesor` – zarządza studentami, notatkami, zadaniami i archiwum.
- `Student` – ma dostęp tylko do własnego aktywnego wątku.

## 3. Logowanie i wejście do aplikacji

### Profesor

1. Wejdź na stronę logowania.
2. Zaloguj się adresem e-mail i hasłem.
3. Po poprawnym logowaniu przejdziesz do `Dashboard`.

### Student

1. Wejdź na stronę logowania lub rejestracji.
2. Użyj tego samego adresu e-mail, który profesor przypisał do Twojego rekordu studenta.
3. Po zalogowaniu aplikacja sprawdzi, czy istnieje aktywny rekord studenta pasujący do tego e-maila.
4. Jeśli rekord jest gotowy do podpięcia, student przejdzie przez ekran `Access pending`, a następnie uzyska dostęp do swojego wątku.

## 4. Główne kroki pracy profesora

### 4.1. Pierwsze wejście profesora

1. Zaloguj się na konto profesora.
2. Otwórz `Dashboard`.
3. Jeśli konto jest skonfigurowane jako konto bootstrap profesora, aplikacja przypisze dostęp profesorski.

Uwaga: obecnie system wspiera jeden główny bootstrap konta profesora.

### 4.2. Dodanie nowego studenta

1. W `Dashboard` użyj formularza `Add a student`.
2. Wpisz:
   - `Full name` – wymagane,
   - `Email` – opcjonalne, ale potrzebne do późniejszego podpięcia konta studenta.
3. Kliknij `Create student`.
4. Student pojawi się na aktywnej liście.

Jeśli chcesz, aby student mógł zalogować się do swojego wątku, warto od razu podać jego docelowy adres e-mail.

### 4.3. Otwarcie wątku studenta

1. Na liście studentów kliknij wybranego studenta.
2. Otworzy się jego wątek z historią notatek i zadań.

### 4.4. Dodanie notatki po spotkaniu

1. Wejdź do wątku studenta.
2. Kliknij `Add info` lub `Add task`.
3. Uzupełnij treść wpisu.
4. Jeśli trzeba, ustaw odpowiedni typ wpisu.
5. Zapisz zmiany przyciskiem `Save note changes`.
6. Jeśli rezygnujesz z tworzenia, użyj opcji odrzucenia szkicu.

### 4.5. Edycja istniejącej notatki

1. Wybierz istniejącą notatkę we wątku.
2. Kliknij opcję edycji.
3. Zmień treść wpisu lub typ elementu.
4. Kliknij `Save note changes`, aby zapisać.
5. Jeśli nie chcesz zachować zmian, użyj opcji odrzucenia zmian.

### 4.6. Oznaczanie zadania jako wykonane

1. Otwórz wątek studenta.
2. Znajdź element typu `task`.
3. Oznacz zadanie jako ukończone.
4. Aplikacja zapisze stan ukończenia oraz metadane, kto i kiedy wykonał zmianę.

Jeśli zadanie trzeba przywrócić do pracy, można je ponownie otworzyć.

### 4.7. Archiwizacja studenta

1. Otwórz aktywny wątek studenta.
2. Wybierz akcję archiwizacji studenta.
3. Potwierdź operację.

Efekt:

- student znika z aktywnej listy,
- trafia do archiwum,
- jego stary wątek staje się historyczny,
- student natychmiast traci dostęp do starego aktywnego wątku.

### 4.8. Przegląd archiwum

1. Otwórz sekcję archiwum studentów.
2. Wybierz zarchiwizowanego studenta.
3. Przeglądaj historyczny wątek w trybie tylko do odczytu.

Archiwum jest widoczne tylko dla profesora.

### 4.9. Ponowne przygotowanie tego samego studenta po archiwizacji

Jeśli student ma wrócić do współpracy:

1. Dodaj nowy aktywny rekord studenta z tym samym adresem e-mail.
2. Student loguje się na swoje konto.
3. Aplikacja podłączy go do nowego aktywnego rekordu.

Ważne:

- nowy dostęp nie przywraca starego archiwalnego wątku,
- wcześniejsza historia pozostaje tylko w archiwum profesora.

## 5. Główne kroki pracy studenta

### 5.1. Pierwsze powiązanie konta z rekordem studenta

1. Upewnij się, że profesor dodał Twój rekord i wpisał poprawny adres e-mail.
2. Zarejestruj konto lub zaloguj się tym samym e-mailem.
3. Jeśli rekord aktywnego studenta istnieje i jest gotowy do podpięcia, aplikacja połączy konto z właściwym wątkiem.

Jeśli rekord nie istnieje albo nie jest jednoznaczny, pojawi się ekran `Access pending`.

### 5.2. Praca w swoim wątku

Po uzyskaniu dostępu student może:

- przeglądać swoje notatki,
- przeglądać zadania,
- edytować współdzielone notatki w dozwolonym zakresie,
- oznaczać zadania jako wykonane,
- ponownie otwierać zadania, jeśli trzeba wrócić do pracy.

### 5.3. Co oznacza ekran `Access pending`

Ten ekran pojawia się, gdy konto istnieje, ale nie ma aktywnego dostępu do produktu. Najczęstsze przyczyny:

- profesor nie przygotował jeszcze rekordu studenta,
- e-mail w koncie nie zgadza się z e-mailem w rekordzie studenta,
- istnieje więcej niż jeden pasujący rekord aktywnego studenta,
- poprzedni rekord został zarchiwizowany i nie ma jeszcze nowego aktywnego wpisu.

## 6. Reset hasła

### Jak zresetować hasło

1. Na ekranie logowania przejdź do `Reset password`.
2. Wpisz adres e-mail konta.
3. Otwórz link z wiadomości e-mail.
4. Przejdź przez ekran potwierdzenia odzyskiwania.
5. Ustaw nowe hasło.

### Ważna reguła

Nowe hasło musi być inne niż aktualne. Jeśli wpiszesz to samo hasło, aplikacja pokaże komunikat o konieczności ustawienia innego hasła.

## 7. Obecne ograniczenia aplikacji

### Ograniczenia organizacyjne

- Obecny model zakłada jednego profesora w danym workspace.
- Nie ma pełnego UI do zarządzania wieloma profesorami ani do nadawania roli profesora kolejnym użytkownikom.
- Pierwszy dostęp profesora opiera się na osobnym flow bootstrap.

### Ograniczenia archiwizacji

- Archiwizacja jest `soft-delete`, a nie trwałym usunięciem.
- Nie ma funkcji cofnięcia archiwizacji z poziomu produktu.
- Nie ma funkcji przywracania starego wątku jako aktywnego.
- Po archiwizacji student traci dostęp natychmiast.
- Po ponownej rejestracji student dostaje nowy aktywny rekord, bez dostępu do starego archiwum.

### Ograniczenia rekordów studentów

- Powiązanie konta studenta zależy od dokładnego dopasowania adresu e-mail.
- Jeśli istnieje więcej niż jeden aktywny rekord z tym samym e-mailem, aplikacja nie wybierze jednego automatycznie.
- Student bez przygotowanego aktywnego rekordu nie uzyska dostępu do dashboardu.

### Ograniczenia funkcjonalne

- Brak twardego usuwania studenta i jego wątku z poziomu produktu.
- Brak kategorii powodów archiwizacji.
- Brak zaawansowanych operacji administracyjnych, takich jak scalanie rekordów studentów.
- Historyczny wątek zarchiwizowanego studenta jest tylko do odczytu dla profesora.

## 8. Najkrótszy zalecany scenariusz użycia

1. Profesor loguje się i dodaje studenta.
2. Profesor wpisuje poprawny e-mail studenta.
3. Student zakłada konto lub loguje się tym samym e-mailem.
4. Student uzyskuje dostęp do swojego wątku.
5. Profesor i student pracują na wspólnych notatkach i zadaniach.
6. Po zakończeniu współpracy profesor archiwizuje studenta.
7. Jeśli student wraca w przyszłości, profesor tworzy nowy aktywny rekord.
