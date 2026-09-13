/**
 * Règle de datation de la mise en vente d'une oeuvre.
 *
 * @remarks
 * Module neutre, testable sous node --test.
 */

/**
 * Faut-il redater une oeuvre republiée ?
 *
 * @remarks
 * Faux : `publishedAt` marque la PREMIÈRE mise en vente, et dépublier pour
 * corriger une coquille ne doit pas rendre l'oeuvre « nouvelle » une seconde
 * fois. Passer ce drapeau à vrai suffit à adopter le comportement inverse,
 * où chaque republication remet le compteur à zéro.
 */
export const REFRESH_PUBLISHED_AT_ON_REPUBLISH = false;

/**
 * Donne la date de mise en vente à écrire lors d'une publication.
 *
 * @param current - Date déjà enregistrée, nulle si jamais publiée.
 * @param now - Instant de la publication.
 * @returns La date à écrire.
 */
export function nextPublishedAt(current: Date | null, now: Date): Date {
  if (current === null) return now;
  return REFRESH_PUBLISHED_AT_ON_REPUBLISH ? now : current;
}
