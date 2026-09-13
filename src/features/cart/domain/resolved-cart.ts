/**
 * Formes échangées entre la résolution serveur du panier et les composants qui
 * l'affichent. Aucun prix ne transite dans l'autre sens.
 */

/**
 * Remise appliquée à une ligne, telle qu'elle est affichée.
 */
export type ResolvedCartDiscount = {
  /** Pourcentage entier, à usage d'affichage. */
  percentOff: number;
  /** Prix catalogue avant remise, en centimes. */
  originalCents: number;
  /** Prix après remise, en centimes. */
  discountedCents: number;
};

/**
 * Une ligne du panier une fois résolue par le serveur.
 */
export type ResolvedCartLine = {
  sku: string;
  /** Nul lorsque le produit est indisponible. */
  name: string | null;
  workId: string;
  workTitle: string | null;
  /** Compositeur de l'oeuvre, pour l'en tête de sa carte. */
  workComposer: string | null;
  /**
   * URL publique de la pochette, déjà composée, ou null.
   *
   * @remarks
   * L'URL et non la clé : l'affichage du panier est client, et composer
   * l'adresse demande la racine du bucket, qui ne quitte pas le serveur.
   */
  workCoverUrl: string | null;
  /** Libellé du pupitre, ou la mention toutes voix. */
  voiceLabel: string | null;
  movementId: string | null;
  movementTitle: string | null;
  /** Nombre de mouvements de l'oeuvre, pour savoir s'il faut les distinguer. */
  workMovementCount: number;
  priceCents: number | null;
  currency: string | null;
  discount: ResolvedCartDiscount | null;
  /** Montant compté dans le total, en centimes. */
  payableCents: number;
  unavailable: boolean;
};

/**
 * Le panier entier, résolu et tarifé.
 */
export type ResolvedCart = {
  lines: ResolvedCartLine[];
  totalCents: number;
  currency: string | null;
  unavailableCount: number;
};

/**
 * Panier résolu vide, utilisé tant que la résolution n'a pas répondu.
 */
export const EMPTY_RESOLVED_CART: ResolvedCart = {
  lines: [],
  totalCents: 0,
  currency: null,
  unavailableCount: 0,
};
