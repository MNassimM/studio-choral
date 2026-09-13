import type { Grant } from "@/domain/types";

import type { CartItem, CartItemInput } from "@/features/cart/domain/types";

/**
 * Traduit une ligne de panier en droit du domaine.
 *
 * @param item - Ligne de panier ou entrée d'ajout.
 * @returns Le droit que ce produit accorderait.
 */
export function cartItemToGrant(item: CartItemInput): Grant {
  return {
    workId: item.workId,
    movementId: item.movementId,
    voiceCode: item.voiceCode,
    scope: item.scope,
    coverage: item.coverage,
  };
}

/**
 * Construit une ligne de panier à partir d'une entrée d'ajout.
 *
 * @param input - Produit à ajouter, référence et coordonnées d'accès.
 * @param addedAt - Horodatage de l'ajout, en millisecondes.
 * @returns La ligne prête à être conservée.
 */
export function createCartItem(
  input: CartItemInput,
  addedAt: number,
): CartItem {
  return {
    sku: input.sku,
    workId: input.workId,
    movementId: input.movementId,
    voiceCode: input.voiceCode,
    scope: input.scope,
    coverage: input.coverage,
    addedAt,
  };
}

/**
 * Indique si une référence figure déjà dans une liste de lignes.
 *
 * @param items - Lignes du panier.
 * @param sku - Référence recherchée.
 * @returns Vrai lorsque la référence est présente.
 */
export function containsSku(items: readonly CartItem[], sku: string): boolean {
  return items.some((item) => item.sku === sku);
}
