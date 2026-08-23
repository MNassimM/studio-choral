/**
 * Calcul PUR de la remise proportionnelle sur le produit ALL_VOICES (scope
 * WORK) d'une œuvre. Aucun import de React, next-intl, next/*, ni Prisma ici
 * - reçoit une couverture déjà résolue (nombre de cellules mouvement × voix
 * possédées / totales) et un prix catalogue en centimes, rend un résultat
 * sérialisable. C'est ce qui la rend testable sans runtime React ni base de
 * données (même approche que src/lib/access/rules.ts).
 *
 * Règle métier : si l'utilisateur possède déjà une fraction du contenu que
 * couvre le pack « toutes les voix », le pack est remisé de cette même
 * fraction (possède la moitié -> -50%).
 *
 * TODO(webhook Stripe) : le futur webhook de paiement devra appeler cette
 * même fonction côté serveur au moment de calculer le montant à facturer -
 * la remise affichée ici n'a aucune valeur contraignante tant que ce n'est
 * pas fait.
 */

export type AllVoicesCoverage = {
  /** Cellules (mouvement × voix) déjà possédées par l'utilisateur. */
  ownedUnits: number;
  /** Cellules (mouvement × voix) que couvre le pack « toutes les voix ». */
  totalUnits: number;
};

export type AllVoicesDiscount = {
  ownedUnits: number;
  totalUnits: number;
  /**
   * Entier arrondi, à usage d'affichage UNIQUEMENT (pastille "-X %") - ne
   * sert jamais au calcul de discountedCents, qui part du ratio exact.
   */
  percentOff: number;
  originalCents: number;
  discountedCents: number;
};

/**
 * Calcule la remise sur le prix catalogue à partir de la couverture déjà
 * possédée. `ownedUnits = 0` rend un résultat "sans remise" (percentOff: 0,
 * discountedCents === originalCents), jamais null.
 */
export function computeAllVoicesDiscount(
  coverage: AllVoicesCoverage,
  originalCents: number,
): AllVoicesDiscount {
  const { ownedUnits, totalUnits } = coverage;

  const percentOff = Math.round((ownedUnits / totalUnits) * 100);
  // Ratio exact (pas le percentOff arrondi) : évite l'erreur d'arrondi
  // composée qui viendrait d'appliquer un pourcentage déjà arrondi au prix.
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
