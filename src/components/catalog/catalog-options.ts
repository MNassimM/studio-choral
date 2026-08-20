/**
 * Options de tri/filtre du catalogue — données pures, sans "use client".
 * Importées à la fois par la page serveur (validation des searchParams) et
 * par les composants clients (Select) : un module "use client" ne peut pas
 * être importé pour ses simples valeurs depuis un Server Component (chaque
 * export y devient une référence client, pas la valeur réelle).
 */

export const SORT_OPTIONS = [
  { value: "featured", label: "-----------" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "title-asc", label: "Titre A-Z" },
  { value: "composer-asc", label: "Compositeur A-Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/**
 * Valeurs alignées sur l'enum Prisma MusicalPeriod (voir prisma/schema.prisma),
 * dans l'ordre chronologique — utilisé pour trier les cases à cocher du
 * panneau de filtres et pour les libellés français (badges, pastilles). Le
 * panneau de filtres n'affiche que les valeurs réellement présentes en base
 * (voir /catalogue) : cette liste n'est qu'une table de correspondance
 * valeur → libellé, jamais la liste montrée telle quelle à l'utilisateur.
 */
export const PERIOD_OPTIONS = [
  { value: "MEDIEVAL", label: "Médiéval" },
  { value: "RENAISSANCE", label: "Renaissance" },
  { value: "BAROQUE", label: "Baroque" },
  { value: "CLASSICAL", label: "Classique" },
  { value: "ROMANTIC", label: "Romantique" },
  { value: "MODERN", label: "Moderne" },
  { value: "CONTEMPORARY", label: "Contemporain" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];
