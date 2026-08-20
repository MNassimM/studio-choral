/**
 * Valeurs de tri/filtre du catalogue — données pures, sans "use client" et
 * SANS libellé : les libellés vivent dans messages/*.json ("sortOptions",
 * "periodOptions"), résolus à l'affichage via useTranslations/getTranslations
 * avec `value` comme clé. Importé à la fois par la page serveur (validation
 * des searchParams) et par les composants clients (Select) : un module
 * "use client" ne peut pas être importé pour ses simples valeurs depuis un
 * Server Component (chaque export y devient une référence client, pas la
 * valeur réelle).
 */

export const SORT_OPTIONS = [
  "featured",
  "price-asc",
  "price-desc",
  "title-asc",
  "composer-asc",
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number];

/**
 * Alignées sur l'enum Prisma MusicalPeriod (voir prisma/schema.prisma), dans
 * l'ordre chronologique — utilisé pour trier les cases à cocher du panneau de
 * filtres. Le panneau n'affiche que les valeurs réellement présentes en base
 * (voir /catalogue) : cette liste n'est qu'un ordre canonique, jamais la
 * liste montrée telle quelle à l'utilisateur.
 */
export const PERIOD_OPTIONS = [
  "MEDIEVAL",
  "RENAISSANCE",
  "BAROQUE",
  "CLASSICAL",
  "ROMANTIC",
  "MODERN",
  "CONTEMPORARY",
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number];
