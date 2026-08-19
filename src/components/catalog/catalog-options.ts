/**
 * Options de tri/filtre du catalogue — données pures, sans "use client".
 * Importées à la fois par la page serveur (validation des searchParams) et
 * par les composants clients (Select) : un module "use client" ne peut pas
 * être importé pour ses simples valeurs depuis un Server Component (chaque
 * export y devient une référence client, pas la valeur réelle).
 */

export const SORT_OPTIONS = [
  { value: "featured", label: "Sélection" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "title-asc", label: "Titre A-Z" },
  { value: "composer-asc", label: "Compositeur A-Z" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/**
 * Valeurs alignées sur l'enum Prisma MusicalPeriod (voir prisma/schema.prisma)
 * — le courant musical, saisi à la main sur chaque œuvre, remplace l'ancien
 * filtre par tranche d'années dérivé de composedYear (qui confondait
 * "Renaissance" et "date inconnue").
 */
export const PERIOD_OPTIONS = [
  { value: "all", label: "Toutes les périodes" },
  { value: "MEDIEVAL", label: "Médiéval" },
  { value: "RENAISSANCE", label: "Renaissance" },
  { value: "BAROQUE", label: "Baroque" },
  { value: "CLASSICAL", label: "Classique" },
  { value: "ROMANTIC", label: "Romantique" },
  { value: "MODERN", label: "Moderne" },
  { value: "CONTEMPORARY", label: "Contemporain" },
] as const;

export type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"];
