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

export const YEAR_OPTIONS = [
  { value: "all", label: "Toutes les périodes" },
  { value: "renaissance", label: "Renaissance — date non précisée" },
  { value: "18e", label: "XVIIIe siècle (1700–1799)" },
  { value: "19e", label: "XIXe siècle (1800–1899)" },
  { value: "20e", label: "XXe siècle et après (1900+)" },
] as const;

export type YearValue = (typeof YEAR_OPTIONS)[number]["value"];
