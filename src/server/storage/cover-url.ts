import "server-only";

import { storageEnv } from "@/server/storage/env";
import { coverPublicUrl } from "@/server/storage/keys";

/**
 * L'adresse publique d'une image de couverture.
 *
 * @remarks
 * Module minuscule et volontairement séparé de storage.ts : les pages
 * publiques qui affichent une couverture n'ont besoin que de la racine du
 * bucket, pas du client S3. Passer par storage.ts tirerait tout le SDK AWS
 * dans le rendu du catalogue, pour composer une chaîne de caractères.
 */

/**
 * Compose l'URL publique d'une couverture.
 *
 * @param key - Clé de la couverture, telle qu'elle est en base.
 * @returns L'URL absolue à rendre dans une page.
 */
export function coverUrl(key: string): string {
  return coverPublicUrl(storageEnv.R2_PUBLIC_BASE_URL, key);
}
