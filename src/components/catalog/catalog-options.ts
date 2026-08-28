/**
 * Valeurs de tri et de filtre du catalogue.
 *
 * @remarks
 * Le module reste sans directive client pour pouvoir être importé aussi bien
 * par la page serveur, qui valide les paramètres d'URL, que par les
 * composants clients.
 */

/**
 * Tris proposés dans le catalogue.
 */
export const SORT_OPTIONS = [
  "featured",
  "price-asc",
  "price-desc",
  "title-asc",
  "composer-asc",
] as const;

/**
 * Valeur de tri acceptée par le catalogue.
 */
export type SortValue = (typeof SORT_OPTIONS)[number];

/**
 * Périodes musicales, dans l'ordre chronologique.
 *
 * @remarks
 * Alignées sur l'enum Prisma MusicalPeriod. Cette liste ne sert que d'ordenancement,
 * le panneau de filtres n'affichant que les périodes réellement présentes en base.
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

/**
 * Période acceptée comme filtre du catalogue.
 */
export type PeriodValue = (typeof PERIOD_OPTIONS)[number];
