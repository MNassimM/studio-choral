import type { VoiceCoverage } from "@/types/domain";

/**
 * Une offre cochable du tableau.
 */
export type SelectableOffer = {
  sku: string;
  coverage: VoiceCoverage;
};

/**
 * Coche ou décoche une offre, en appliquant les deux règles d'exclusion.
 *
 * @param selected - Références actuellement cochées.
 * @param offer - Offre sur laquelle on vient de cliquer.
 * @param offers - Toutes les offres du tableau.
 * @returns Les références cochées après l'action.
 */
export function toggleOffer(
  selected: readonly string[],
  offer: SelectableOffer,
  offers: readonly SelectableOffer[],
): string[] {
  if (selected.includes(offer.sku)) {
    return selected.filter((sku) => sku !== offer.sku);
  }

  // Toutes les voix vide les pupitres, un pupitre vide toutes les voix.
  const exclus = new Set(
    offers
      .filter((other) =>
        offer.coverage === "ALL_VOICES"
          ? other.coverage === "SINGLE_VOICE"
          : other.coverage === "ALL_VOICES",
      )
      .map((other) => other.sku),
  );

  return [...selected.filter((sku) => !exclus.has(sku)), offer.sku];
}

/**
 * Retire d'une sélection les références qui ne sont plus proposées.
 *
 * @param selected - Références actuellement cochées.
 * @param offers - Offres encore disponibles.
 * @returns Les références cochées restantes.
 */
export function keepSelectable(
  selected: readonly string[],
  offers: readonly SelectableOffer[],
): string[] {
  const disponibles = new Set(offers.map((offer) => offer.sku));
  return selected.filter((sku) => disponibles.has(sku));
}
