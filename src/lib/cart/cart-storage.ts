import { parseCart, serializeCart } from "@/lib/cart/cart-serialization";
import type { CartItem } from "@/lib/cart/types";

/**
 * Seul fichier du module à toucher le stockage du navigateur.
 *
 * @remarks
 * Depuis que le panier d'un utilisateur connecté vit en base, ce stockage ne
 * sert plus qu'aux VISITEURS : eux seuls n'ont pas de compte où le rattacher.
 * D'où une clé qui le dit.
 */

/** Clé sous laquelle le panier d'un visiteur est conservé. */
export const CART_STORAGE_KEY = "bsc-cart:guest";

/**
 * Ancienne clé, commune à tous les comptes d'un même navigateur.
 *
 * @remarks
 * Elle est reprise une fois puis effacée, pour qu'un panier en cours ne
 * disparaisse pas au déploiement.
 */
const LEGACY_CART_STORAGE_KEY = "bsc-cart";

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
    const courant = window.localStorage.getItem(CART_STORAGE_KEY);
    if (courant !== null) return parseCart(courant);

    const ancien = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    if (ancien === null) return [];

    // Reprise unique de l'ancienne clé, puis on ne la relit plus jamais.
    const items = parseCart(ancien);
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(items));
    window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    return items;
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
