/**
 * Calcul de la remise proportionnelle sur un produit couvrant toutes les voix.
 *
 * @remarks
 * Module pur : aucun import de React, next-intl, next ou Prisma. Il reçoit
 * une couverture déjà résolue et un prix catalogue, et rend un résultat
 * sérialisable. C'est ce qui le rend testable sans runtime React ni base de
 * données, même approche que src/lib/access/rules.ts.
 *
 * Règle métier : si l'utilisateur possède déjà une fraction du contenu que
 * couvre le pack, le pack est remisé de cette même fraction. Il en possède la
 * moitié, il paie la moitié.
 *
 * TODO webhook Stripe : le futur webhook de paiement devra appeler cette même
 * fonction côté serveur au moment de calculer le montant à facturer. Tant que
 * ce n'est pas fait, la remise affichée ici n'a aucune valeur contraignante.
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
   * Pourcentage entier arrondi, à usage d'affichage UNIQUEMENT.
   *
   * @remarks
   * Ne sert jamais au calcul de discountedCents, qui part du ratio exact.
   * Appliquer un pourcentage déjà arrondi au prix composerait deux erreurs
   * d'arrondi au lieu d'une.
   */
  percentOff: number;
  originalCents: number;
  discountedCents: number;
};

/**
 * Calcule la remise sur un prix catalogue à partir de la couverture possédée.
 *
 * @remarks
 * Tout reste en centimes entiers, il n'y a aucune manipulation de flottant
 * sur les montants au delà de la division finale, arrondie une seule fois.
 *
 * Une couverture nulle rend un résultat sans remise plutôt que null : le
 * pourcentage vaut zéro et le prix remisé égale le prix catalogue. L'appelant
 * n'a donc jamais à traiter un cas d'absence.
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
  // Le montant part du ratio exact des cellules restantes, jamais du
  // pourcentage arrondi ci dessus.
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
