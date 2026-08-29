import type { AccessScope, VoiceCoverage } from "@/types/domain";

/**
 * Coordonnées d'accès d'un produit, telles qu'elles servent à determiner les droits
 */
export type CartItemCoordinates = {
  workId: string;
  /** Nul lorsque la portée est WORK. */
  movementId: string | null;
  /** Nul lorsque la couverture est ALL_VOICES. */
  voiceCode: string | null;
  scope: AccessScope;
  coverage: VoiceCoverage;
};

/**
 * Ce que l'appelant fournit pour ajouter un produit au panier.
 */
export type CartItemInput = CartItemCoordinates & {
  sku: string;
};

/**
 * Une ligne de panier telle qu'elle est conservée.
 */
export type CartItem = CartItemInput & {
  addedAt: number;
};

/**
 * Une ligne de panier accompagnée de son état d'absorption.
 */
export type CartLine = CartItem & {
  absorbedBy: string | null;
};

/**
 * Forme du contenu écrit dans le stockage du navigateur.
 */
export type StoredCart = {
  version: number;
  items: CartItem[];
};
