/**
 * Calcul de la remise proportionnelle sur un produit couvrant toutes les voix.
 *
 * @remarks
 * TODO webhook Stripe : le futur webhook de paiement devra appeler cette même
 * fonction côté serveur au moment de calculer le montant à facturer.
 */

/**
 * Part du contenu déjà possédée, exprimée en cellules mouvement fois voix.
 */
export type AllVoicesCoverage = {
  /** Cellules déjà possédées par l'utilisateur. */
  ownedUnits: number;
  /** Cellules que couvre le pack toutes voix. */
  totalUnits: number;
};

/**
 * Résultat du calcul de remise, prêt pour l'affichage.
 */
export type AllVoicesDiscount = {
  ownedUnits: number;
  totalUnits: number;
  /**
   * Pourcentage entier arrondi, à usage d'affichage uniquement la.
   */
  percentOff: number;
  originalCents: number;
  discountedCents: number;
};

/**
 * Calcule la remise sur un prix catalogue à partir de la couverture possédée.
 *
 * @param coverage - Cellules possédées et cellules totales du pack.
 * @param originalCents - Prix catalogue en centimes.
 * @returns Le détail complet de la remise, affichage et montant.
 */
export function computeAllVoicesDiscount(
  coverage: AllVoicesCoverage,
  originalCents: number,
): AllVoicesDiscount {
  const { ownedUnits, totalUnits } = coverage;

  const percentOff = Math.round((ownedUnits / totalUnits) * 100);
  const remainingUnits = totalUnits - ownedUnits;
  const discountedCents = Math.max(
    0,
    Math.round((originalCents * remainingUnits) / totalUnits),
  );

  return {
    ownedUnits,
    totalUnits,
    percentOff,
    originalCents,
    discountedCents,
  };
}

/**
 * Calcule ce qu'on économise en prenant toutes les voix plutôt que chaque pupitre.
 *
 * @param singleVoiceCents - Prix catalogue de chaque pupitre, en centimes.
 * @param allVoicesCents - Prix catalogue du pack toutes voix, en centimes.
 * @returns L'économie en centimes, jamais négative.
 */
export function computeAllVoicesSaving(
  singleVoiceCents: readonly number[],
  allVoicesCents: number,
): number {
  const total = singleVoiceCents.reduce((somme, cents) => somme + cents, 0);
  return Math.max(0, total - allVoicesCents);
}
