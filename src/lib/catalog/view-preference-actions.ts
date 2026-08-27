"use server";

import { cookies } from "next/headers";

import {
  CATALOG_VIEW_COOKIE,
  CATALOG_VIEW_MAX_AGE_SECONDS,
  parseCatalogView,
} from "@/lib/catalog/view-preference";

/**
 * Enregistrement du mode d'affichage choisi dans le catalogue.
 *
 * @remarks
 * L'écriture a lieu sur le serveur plutôt que dans le navigateur, ce qui permet
 * à la bascule d'être un formulaire ordinaire. Un formulaire appelant une
 * action serveur est soumis même lorsque JavaScript n'a pas encore été chargé
 * ou se trouve désactivé, la bascule continue donc de fonctionner dans ces
 * conditions, comme le faisaient les liens qu'elle remplace.
 *
 * Le cookie est inaccessible aux scripts de la page. Plus rien n'a besoin de le
 * lire côté navigateur, et le fermer coûte une ligne.
 */

/**
 * Enregistre le mode d'affichage soumis par la bascule.
 *
 * @remarks
 * La valeur reçue est validée avant d'être écrite. Un formulaire peut être
 * rejoué avec n'importe quel contenu, et une valeur inconnue n'aurait aucun
 * sens dans le cookie. Elle est alors ignorée sans lever, l'utilisateur
 * retrouvant simplement l'affichage qu'il avait déjà.
 *
 * Aucune revalidation explicite n'est demandée. Next rend à nouveau la route
 * courante après une action, et la page relit alors le cookie qui vient d'être
 * posé.
 *
 * @param formData - Données du formulaire, dont le champ view porte le mode
 * correspondant au bouton actionné.
 * @returns Rien.
 */
export async function rememberCatalogView(formData: FormData): Promise<void> {
  const view = parseCatalogView(formData.get("view")?.toString());
  if (!view) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(CATALOG_VIEW_COOKIE, view, {
    path: "/",
    maxAge: CATALOG_VIEW_MAX_AGE_SECONDS,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
}
