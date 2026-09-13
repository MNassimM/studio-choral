/**
 * Le badge affiché sur une carte d'oeuvre.
 *
 * @remarks
 * Module neutre, testable sous node --test.
 */

/** Nombre d'oeuvres portant le badge « le plus populaire ». */
export const MOST_POPULAR_COUNT = 3;

/**
 * Durée pendant laquelle une oeuvre reste une nouveauté, en jours.
 *
 * @remarks
 * Comptée depuis sa MISE EN VENTE et non depuis sa saisie : une oeuvre
 * préparée en mars et publiée en juin est une nouveauté en juin. Voir
 * src/features/work/domain/publication.ts pour ce que fait une republication.
 */
export const NEW_WORK_DAYS = 14;

/** Les badges possibles. « Best seller » viendra avec les achats. */
export type WorkBadge = "MOST_POPULAR" | "NEW";

/**
 * Dit si une oeuvre vient d'être mise en vente.
 *
 * @param publishedAt - Date de mise en vente, nulle si jamais publiée.
 * @param now - Instant de référence.
 * @returns Vrai si la mise en vente a moins de NEW_WORK_DAYS jours.
 */
export function isNewWork(publishedAt: Date | null, now: Date): boolean {
  if (publishedAt === null) return false;
  const age = now.getTime() - publishedAt.getTime();
  return age >= 0 && age < NEW_WORK_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Choisit le badge d'une oeuvre.
 *
 * @remarks
 * Un seul badge à la fois. La popularité passe devant la nouveauté : une
 * oeuvre récente ET très vue mérite qu'on le dise, l'inverse se devine.
 *
 * @param params - Popularité, date de mise en vente et instant de référence.
 * @returns Le badge, ou null si l'oeuvre n'en mérite aucun.
 */
export function resolveWorkBadge({
  mostPopular,
  publishedAt,
  now,
}: {
  mostPopular: boolean;
  publishedAt: Date | null;
  now: Date;
}): WorkBadge | null {
  if (mostPopular) return "MOST_POPULAR";
  if (isNewWork(publishedAt, now)) return "NEW";
  return null;
}
