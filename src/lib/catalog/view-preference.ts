/**
 * Mémorisation du mode d'affichage choisi dans le catalogue.
 *
 * @remarks
 * Le choix est conservé dans un cookie plutôt que dans l'adresse de la page.
 * Une préférence d'affichage appartient à la personne, pas au document : deux
 * visiteurs ouvrant le même lien doivent voir le catalogue chacun comme il a
 * l'habitude de le voir.
 *
 * Le cookie est également préféré au stockage local du navigateur parce que la
 * page est rendue sur le serveur. Un cookie accompagne la requête, la vue est
 * donc connue avant le rendu et la page arrive directement dans le bon mode.
 * Une valeur lue côté navigateur n'aurait pu être appliquée qu'après
 * hydratation, en faisant sauter l'affichage sous les yeux de l'utilisateur.
 *
 * Ce module reste sans dépendance à Next pour pouvoir être relu et vérifié
 * seul. Il ne manipule qu'une préférence d'affichage, sans aucune portée sur
 * les droits ni sur les données.
 */

/**
 * Modes d'affichage proposés par le catalogue.
 */
export type CatalogView = "grid" | "list";

/**
 * Nom du cookie portant la préférence.
 */
export const CATALOG_VIEW_COOKIE = "bsc-catalog-view";

/**
 * Durée de conservation de la préférence, en secondes.
 *
 * @remarks
 * Un an, parce qu'une habitude d'affichage n'a pas de raison d'expirer plus
 * tôt. Le cookie ne sert qu'à l'ergonomie et ne contient rien de personnel.
 */
export const CATALOG_VIEW_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Mode retenu lorsque rien n'a encore été choisi.
 */
export const DEFAULT_CATALOG_VIEW: CatalogView = "grid";

/**
 * Valide une valeur brute venant d'un cookie ou d'un formulaire.
 *
 * @remarks
 * Un cookie est modifiable par l'utilisateur et un formulaire peut être
 * rejoué avec n'importe quelle valeur. Toute valeur inattendue est donc
 * ramenée à null, à charge pour l'appelant de décider du repli, plutôt que
 * d'être propagée telle quelle dans le rendu.
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
