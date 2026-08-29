/**
 * Validation de la destination de retour après connexion.
 */

/**
 * Détermine si une destination de retour peut être suivie sans danger
 *
 * @param target - Valeur brute du paramètre de retour.
 * @returns Vrai si la destination désigne bien une page du site.
 */
export function isSafeRedirectTarget(target: string | undefined | null): boolean {
  if (!target) return false;
  if (!target.startsWith("/")) return false; // doit commencer par une barre oblique
  if (target.startsWith("//")) return false; // URL sans protocole
  if (target.startsWith("/\\")) return false; // antislash interprété comme barre oblique par plusieurs navigateurs
  return true;
}

/**
 * Ramène une destination de retour à une valeur sûre.
 *
 * @param target - Valeur brute du paramètre de retour.
 * @returns La destination si elle est sûre, sinon la racine du site.
 */
export function safeRedirectTarget(target: string | undefined | null): string {
  return isSafeRedirectTarget(target) ? (target as string) : "/";
}
