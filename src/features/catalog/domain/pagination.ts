/**
 * Calcul des pages du catalogue.
 *
 * @remarks
 * Fonctions pures. Le catalogue n'a jamais zéro page : sans résultat, il en a
 * une, vide, celle qui porte le message d'état vide.
 */

/**
 * Nombre d'œuvres par page.
 *
 * @remarks
 * La grille compte 1, 2, 3 ou 4 colonnes selon la largeur, et 24 se divise
 * par les quatre : une page pleine ne finit jamais sur une ligne entamée.
 */
export const CATALOG_PAGE_SIZE = 24;

/** Un élément de la navigation : un numéro de page, ou une ellipse. */
export type PageWindowItem = number | "ellipsis";

/**
 * Calcule le nombre de pages.
 *
 * @param total - Nombre total de résultats.
 * @param pageSize - Taille d'une page.
 * @returns Le nombre de pages, au moins 1.
 */
export function pageCount(
  total: number,
  pageSize: number = CATALOG_PAGE_SIZE,
): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * Ramène un numéro de page dans les bornes.
 *
 * @param page - Page demandée.
 * @param total - Nombre total de résultats.
 * @param pageSize - Taille d'une page.
 * @returns La page la plus proche qui existe.
 */
export function clampPage(
  page: number,
  total: number,
  pageSize: number = CATALOG_PAGE_SIZE,
): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

/**
 * Choisit les numéros à afficher dans la navigation.
 *
 * @param current - Page courante.
 * @param count - Nombre de pages.
 * @param siblings - Voisines affichées de part et d'autre de la courante.
 * @returns Les numéros et ellipses, dans l'ordre.
 */
export function pageWindow(
  current: number,
  count: number,
  siblings = 1,
): PageWindowItem[] {
  const retenues = new Set<number>([1, count]);
  for (let page = current - siblings; page <= current + siblings; page += 1) {
    if (page >= 1 && page <= count) retenues.add(page);
  }

  const items: PageWindowItem[] = [];
  let precedente = 0;
  for (const page of [...retenues].sort((a, b) => a - b)) {
    if (page - precedente === 2) items.push(precedente + 1);
    else if (page - precedente > 2) items.push("ellipsis");
    items.push(page);
    precedente = page;
  }
  return items;
}
