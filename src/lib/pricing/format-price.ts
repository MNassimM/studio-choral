/**
 * Convertit un montant en centimes vers son unité principale.
 *
 * @param cents - Montant en centimes.
 * @returns Le montant exprimé dans l'unité de la devise.
 */
export function toMajorUnits(cents: number): number {
  return cents / 100;
}
