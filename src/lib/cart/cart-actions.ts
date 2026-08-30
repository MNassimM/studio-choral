"use server";

import { getLocale } from "next-intl/server";

import { resolveCart } from "@/lib/catalog/cart-resolution";
import type { ResolvedCart } from "@/lib/cart/resolved-cart";

/**
 * Résout le panier du navigateur en noms, prix, remises et total.
 *
 * @param skus - Références des articles présents dans le panier.
 * @returns Le panier résolu par le serveur.
 */
export async function resolveCartAction(skus: string[]): Promise<ResolvedCart> {
  const locale = await getLocale();
  return resolveCart(skus, locale);
}
