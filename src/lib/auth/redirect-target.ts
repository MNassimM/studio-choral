/**
 * Validation de la destination de retour après connexion.
 *
 * @remarks
 * Module pur, sans import de React, Next ou Prisma, donc testable seul.
 *
 * Un paramètre de retour est une valeur fournie par l'extérieur, et un
 * attaquant peut fabriquer un lien qui la contient. Sans contrôle, elle
 * devient une redirection ouverte permettant d'envoyer un utilisateur sur un
 * domaine tiers depuis une URL qui semble appartenir au site.
 */

/**
 * Détermine si une destination de retour peut être suivie sans danger.
 *
 * @remarks
 * Seul un chemin interne est accepté, c'est à dire une valeur commençant par
 * une barre oblique unique. Tout le reste est refusé.
 *
 * Les deux formes dangereuses écartées ici méritent d'être nommées. Une
 * valeur commençant par deux barres obliques est une URL dite sans protocole,
 * que le navigateur résout vers un domaine externe alors qu'elle ressemble à
 * un chemin. Une valeur commençant par une barre oblique suivie d'un
 * antislash est interprétée de la même façon par plusieurs navigateurs, qui
 * normalisent l'antislash en barre oblique.
 *
 * Le contrôle porte volontairement sur la forme brute plutôt que sur un
 * objet URL analysé, parce que l'analyse tolère justement les variantes que
 * l'on cherche à écarter.
 *
 * @param target - Valeur brute du paramètre de retour.
 * @returns Vrai si la destination désigne bien une page du site.
 */
export function isSafeRedirectTarget(target: string | undefined | null): boolean {
  if (!target) return false;
  if (!target.startsWith("/")) return false;
  if (target.startsWith("//")) return false;
  if (target.startsWith("/\\")) return false;
  return true;
}

/**
 * Ramène une destination de retour à une valeur sûre.
 *
 * @remarks
 * Une destination refusée retombe silencieusement sur la racine plutôt que de
 * lever. Un lien malformé ou malveillant ne doit pas empêcher l'utilisateur
 * de se connecter, il doit simplement perdre son effet.
 *
 * @param target - Valeur brute du paramètre de retour.
 * @returns La destination si elle est sûre, sinon la racine du site.
 */
export function safeRedirectTarget(target: string | undefined | null): string {
  return isSafeRedirectTarget(target) ? (target as string) : "/";
}
