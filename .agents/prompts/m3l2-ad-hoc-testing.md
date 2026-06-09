---
name: Write unit tests
description: Write unit tests for a given file based on tech stack and PRD.
license: CC BY-NC-ND 4.0
metadata:
  technologies:
    - python
    - java
    - javascript
    - typescript
    - go
    - csharp
    - php
    - ruby
    - rust
    - swift
    - kotlin
    - scala
    - cplusplus
    - c
    - haskell
    - clojure
    - elixir
    - erlang
    - fsharp
    - groovy
    - perl
    - r
    - dart
    - vue
    - react
    - angular
    - svelte
    - nextjs
    - nuxtjs
    - gatsby
    - nestjs
    - express
    - spring
    - django
    - rails
    - laravel
    - aspnet
    - flask
    - fastapi
    - .net
  ai_models:
    - gpt-4
    - gpt-3.5-turbo
    - claude-3-opus
    - claude-3-sonnet
    - claude-3-haiku
    - gemini-pro
  task_type:
    - unit_test
  domain:
    - software_development
---

Napisz testy jednostkowe dla @PLIK bazując na @TECH_STACK oraz wymaganiach z @PRD.

Przejdź przez trzy etapy:

1. Ustal oczekiwane zachowanie ze źródeł, a nie z samej implementacji: przeczytaj TECH_STACK
   oraz PRD i na tej podstawie zdecyduj, które zachowania tego pliku są istotne dla
   użytkownika i dla biznesu. Wypisz je przed wdrożeniem testów. Nie zakładaj, że to, co
   kod aktualnie robi, jest tym, co robić powinien - jeśli z PRD lub tech-stacku nie
   wynika jednoznacznie poprawne zachowanie (problem wyroczni), ZATRZYMAJ się i
   zadaj mi pytania, zamiast zgadywać i kopiować wynik z implementacji.

2. Dla każdego istotnego zachowania napisz test behawioralny: asercja ma
   sprawdzać obserwowalny wynik scenariusza, a nie wewnętrzne wywołania, prywatne
   szczegóły czy wynik policzony tą samą logiką co testowany kod. Dołóż przynajmniej
   przypadki brzegowe wynikające z ryzyka (np. `null`, puste dane, błąd zależności,
   nieprawidłowe wejście). Pilnuj optymalnej liczby testów - bez kilku niemal
   identycznych kopii sprawdzających to samo; każdy test ma łapać inną regresję.

3. Napisz podsumowanie zmian - opisz w formie tabeli, jaką regresję łapie każdy test i jaką
   zmianę w kodzie by wykrył. Jeśli dla jakiegoś fragmentu nie umiesz tego nazwać,
   oznacz go jako niepewny i dopytaj mnie o dodatkowy kontekst lub wymagania.
