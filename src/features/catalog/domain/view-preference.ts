/**
 * Stockage du mode d'affichage choisi dans le catalogue.
 */

/**
 * Modes d'affichage proposés par le catalogue.
 */
export type CatalogView = "grid" | "list";

/**
 * Nom du cookie de l'affichage.
 */
export const CATALOG_VIEW_COOKIE = "bsc-catalog-view";

/**
 * Durée de conservation du cookie
 */
export const CATALOG_VIEW_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Mode d'afficahge par defaut.
 */
export const DEFAULT_CATALOG_VIEW: CatalogView = "grid";

/**
 * Valide une valeur venant d'un cookie ou d'un formulaire.
 *
 * @param value - Valeur à valider.
 * @returns Le mode reconnu, ou null si la valeur n'en désigne aucun.
 */
export function parseCatalogView(
  value: string | string[] | undefined | null,
): CatalogView | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "grid" || candidate === "list") {
    return candidate;
  }
  return null;
}
