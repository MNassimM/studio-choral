/**
 * Formate un montant en centimes (`priceCents`, jamais un float) en une
 * chaîne monétaire lisible, ex. `formatPriceCents(890)` → "8,90 €".
 */
export function formatPriceCents(
  priceCents: number,
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}
