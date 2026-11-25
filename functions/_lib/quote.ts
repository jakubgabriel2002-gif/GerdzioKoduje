/**
 * Indywidualna wycena — dozwolone wartości dodatkowych pól.
 * UWAGA: te same listy są w src/config.ts (`quote`) — zmieniaj w obu miejscach.
 */
export const QUOTE_PACKAGE = 'Indywidualna wycena';
export const PROJECT_TYPES = [
  'Sklep internetowy',
  'Rezerwacje / zapisy online',
  'Aplikacja PWA',
  'Integracje (kalendarz, płatności, CRM)',
  'Rozbudowana strona',
  'Coś innego',
] as const;
export const BUDGETS = ['Nie wiem jeszcze', 'do 2000 zł', '2000–5000 zł', '5000–10 000 zł', 'powyżej 10 000 zł'] as const;
export const DEADLINES = ['Jak najszybciej', 'W ciągu miesiąca', 'W ciągu 2–3 miesięcy', 'Bez pośpiechu'] as const;
