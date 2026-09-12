"use server";

import { getLocale } from "next-intl/server";

import { getUserGrants } from "@/lib/catalog/access-grants";
import { parseCart } from "@/lib/cart/cart-serialization";
import { readUserCart, writeUserCart } from "@/lib/cart/cart-store";
import { removeOwnedItems, replaceInCart } from "@/lib/cart/cart-rules";
import type { CartItem } from "@/lib/cart/types";
import { getCurrentUser } from "@/lib/auth/current-user";
import { resolveCart } from "@/lib/catalog/cart-resolution";
import type { ResolvedCart } from "@/lib/cart/resolved-cart";

/**
 * Les actions du panier.
 *
 * @remarks
 * Le panier d'un utilisateur connecté vit en base ; celui d'un visiteur reste
 * dans son navigateur, faute de compte où le rattacher. Ces actions ne
 * concernent donc que le premier cas.
 *
 * Chacune reçoit le panier SÉRIALISÉ et le relit par parseCart, la même
 * fonction que le navigateur : une seule validation défensive, partagée, au
 * lieu d'une seconde à tenir à jour en parallèle.
 */

/** Ce que rend une écriture du panier. */
export type CartSaveResult = {
  /** Le panier retenu, tel qu'il est désormais en base. */
  items: CartItem[];
  /** Nombre d'articles écartés parce que déjà possédés. */
  removedOwned: number;
};

const VIDE: CartSaveResult = { items: [], removedOwned: 0 };

/**
 * Relit un panier reçu du navigateur.
 *
 * @param raw - Panier sérialisé.
 * @returns Les articles reconnus, vide si l'entrée n'est pas exploitable.
 */
function relire(raw: unknown): CartItem[] {
  return typeof raw === "string" ? parseCart(raw) : [];
}

/**
 * Écarte les articles que l'utilisateur possède déjà, puis enregistre.
 *
 * @param userId - Utilisateur concerné.
 * @param items - Articles candidats.
 * @returns Le panier retenu et le nombre d'articles écartés.
 */
async function enregistrer(
  userId: string,
  items: CartItem[],
): Promise<CartSaveResult> {
  const grants = await getUserGrants(userId);
  const retenus = removeOwnedItems(items, grants);
  await writeUserCart(userId, retenus);
  return { items: retenus, removedOwned: items.length - retenus.length };
}

/**
 * Résout le panier en noms, prix, remises et total.
 *
 * @param skus - Références des articles présents dans le panier.
 * @returns Le panier résolu par le serveur.
 */
export async function resolveCartAction(skus: string[]): Promise<ResolvedCart> {
  const locale = await getLocale();
  return resolveCart(skus, locale);
}

/**
 * Rend le panier enregistré de l'utilisateur connecté.
 *
 * @returns Ses articles, ou un panier vide s'il n'est pas connecté.
 */
export async function loadUserCartAction(): Promise<CartItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return readUserCart(user.id);
}

/**
 * Enregistre le panier de l'utilisateur connecté.
 *
 * @param raw - Panier sérialisé par le navigateur.
 * @returns Le panier retenu, débarrassé de ce qui est déjà possédé.
 */
export async function saveUserCartAction(
  raw: unknown,
): Promise<CartSaveResult> {
  const user = await getCurrentUser();
  if (!user) return VIDE;
  return enregistrer(user.id, relire(raw));
}

/**
 * Verse le panier d'invité dans celui de l'utilisateur qui vient d'entrer.
 *
 * @remarks
 * Union et non remplacement : ce que la personne avait mis de côté avant de
 * se connecter rejoint ce qu'elle avait déjà. Les règles d'absorption
 * s'appliquent, si bien qu'une offre large déposée en invité remplace les
 * offres étroites déjà présentes. Ce qu'elle possède déjà est écarté.
 *
 * @param raw - Panier d'invité, sérialisé.
 * @returns Le panier résultant.
 */
export async function mergeGuestCartAction(
  raw: unknown,
): Promise<CartSaveResult> {
  const user = await getCurrentUser();
  if (!user) return VIDE;

  const invite = relire(raw);
  const existant = await readUserCart(user.id);
  const fusion = invite.reduce(
    (items, item) => replaceInCart(items, item, item.addedAt),
    existant,
  );

  return enregistrer(user.id, fusion);
}
