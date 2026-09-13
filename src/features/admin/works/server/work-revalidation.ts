import { revalidatePath } from "next/cache";

/**
 * Régénération des pages que le catalogue alimente.
 */

/**
 * Force la régénération des pages du catalogue et des oeuvres.
 *
 * @remarks
 * Les chemins sont ceux des FICHIERS de route, pas les URL visibles : l'URL
 * française d'une oeuvre est /oeuvres/[slug], mais son entrée de cache
 * s'appelle /[locale]/works/[slug]. Passer l'URL ne correspondrait à rien et
 * échouerait sans le dire.
 *
 * @returns Rien.
 */
export function revalidateCatalog(): void {
  revalidatePath("/[locale]/admin/works", "page");
  revalidatePath("/[locale]/catalogue", "page");
  revalidatePath("/[locale]/works/[slug]", "page");
}
