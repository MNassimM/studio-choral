import { parseCart, serializeCart } from "@/lib/cart/cart-serialization";
import type { CartItem } from "@/lib/cart/types";

/**
 * Seul fichier du module à toucher le stockage du navigateur.
 */

/**
 * Clé sous laquelle le panier est conservé.
 */
export const CART_STORAGE_KEY = "bsc-cart";

/**
 * Indique si un stockage local utilisable est disponible.
 *
 * @returns Vrai lorsque le code s'exécute dans un navigateur exposant localStorage.
 */
function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Lit le panier conservé.
 *
 * @returns Les lignes conservées.
 */
export function readStoredCart(): CartItem[] {
  if (!hasLocalStorage()) return [];

  try {
    return parseCart(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

/**
 * Rentre le panier dans le stockage.
 *
 * @param items - Lignes à conserver.
 * @returns Vrai lorsque l'écriture a reussi.
 */
export function writeStoredCart(items: readonly CartItem[]): boolean {
  if (!hasLocalStorage()) return false;

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
    return true;
  } catch {
    return false;
  }
}

/**
 * Efface le panier conservé.
 *
 * @returns Rien.
 */
export function clearStoredCart(): void {
  if (!hasLocalStorage()) return;

  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {}
}
