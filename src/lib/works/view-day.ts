/**
 * Découpe des vues en jours.
 *
 * @remarks
 * Module neutre, ni server-only ni use client : il ne touche à rien de
 * sensible, et ses tests tournent sous node --test.
 */

/**
 * Ramène un instant au début de son jour UTC.
 *
 * @param at - Instant à ramener.
 * @returns Minuit UTC du même jour.
 */
export function startOfUtcDay(at: Date): Date {
  return new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()),
  );
}
