import { absorbs } from "@/lib/access/grants";
import type { Grant } from "@/types/domain";

import {
  cartItemToGrant,
  containsSku,
  createCartItem,
} from "@/lib/cart/cart-item";
import type { CartItem, CartItemInput } from "@/lib/cart/types";

/**
 * Ajoute un produit au panier.
 *
 * Un produit déjà présent laisse le panier inchangé,e t on renvoie la même référence de tableau.
 *
 * @param items - Lignes actuelles du panier.
 * @param input - Produit à ajouter, référence et coordonnées d'accès.
 * @param addedAt - Horodatage de l'ajout, en millisecondes.
 * @returns Les lignes du panier après ajout.
 */
export function addToCart(
  items: readonly CartItem[],
  input: CartItemInput,
  addedAt: number,
): CartItem[] {
  if (containsSku(items, input.sku)) {
    return items as CartItem[];
  }
  return [...items, createCartItem(input, addedAt)];
}

/**
 * Retire un produit du panier.
 *
 * Une référence absente laisse le panier inchangé, et on renvoie la même référence de tableau.
 *
 * @param items - Lignes actuelles du panier.
 * @param sku - Référence du produit à retirer.
 * @returns Les lignes du panier après retrait.
 */
export function removeFromCart(
  items: readonly CartItem[],
  sku: string,
): CartItem[] {
  if (!containsSku(items, sku)) {
    return items as CartItem[];
  }
  return items.filter((item) => item.sku !== sku);
}

/**
 * Vide le panier.
 *
 * @returns Un panier sans aucune ligne.
 */
export function clearCart(): CartItem[] {
  return [];
}

/**
 * Liste les articles du panier qu'un produit couvrirait entièrement.
 *
 * @param items - Lignes actuelles du panier.
 * @param input - Produit envisagé à l'ajout.
 * @returns Les lignes que ce produit rendrait redondantes.
 */
export function findCoveredItems(
  items: readonly CartItem[],
  input: CartItemInput,
): CartItem[] {
  const candidate = cartItemToGrant(input);
  return items.filter(
    (item) =>
      item.sku !== input.sku && absorbs(candidate, cartItemToGrant(item)),
  );
}

/**
 * Remplace les articles couverts par le produit qui les couvre.
 *
 * @param items - Lignes actuelles du panier.
 * @param input - Produit à ajouter, référence et coordonnées d'accès.
 * @param addedAt - Horodatage de l'ajout, en millisecondes.
 * @returns Les lignes du panier après remplacement.
 */
export function replaceInCart(
  items: readonly CartItem[],
  input: CartItemInput,
  addedAt: number,
): CartItem[] {
  if (containsSku(items, input.sku)) {
    return items as CartItem[];
  }

  const coveredSkus = new Set(
    findCoveredItems(items, input).map((item) => item.sku),
  );
  return [
    ...items.filter((item) => !coveredSkus.has(item.sku)),
    createCartItem(input, addedAt),
  ];
}

/**
 * Liste les lignes correspondant à un produit que l'utilisateur possède déjà.
 *
 * @param items - Lignes du panier.
 * @param grants - Droits actuels de l'utilisateur.
 * @returns Les lignes couvertes par au moins un droit.
 */
export function findOwnedItems(
  items: readonly CartItem[],
  grants: readonly Grant[],
): CartItem[] {
  return items.filter((item) => {
    const candidate = cartItemToGrant(item);
    return grants.some((grant) => absorbs(grant, candidate));
  });
}

/**
 * Retire du panier les produits que l'utilisateur possède déjà.
 *
 * @param items - Lignes du panier.
 * @param grants - Droits actuels de l'utilisateur.
 * @returns Les lignes restantes.
 */
export function removeOwnedItems(
  items: readonly CartItem[],
  grants: readonly Grant[],
): CartItem[] {
  const owned = findOwnedItems(items, grants);
  if (owned.length === 0) {
    return items as CartItem[];
  }
  const ownedSkus = new Set(owned.map((item) => item.sku));
  return items.filter((item) => !ownedSkus.has(item.sku));
}
