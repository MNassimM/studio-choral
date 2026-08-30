"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { resolveCartAction } from "@/lib/cart/cart-actions";
import {
  EMPTY_RESOLVED_CART,
  type ResolvedCart,
  type ResolvedCartLine,
} from "@/lib/cart/resolved-cart";

import { absorbs } from "@/lib/access/grants";
import { cartItemToGrant, containsSku } from "@/lib/cart/cart-item";
import {
  addToCart,
  clearCart,
  removeFromCart,
  resolveCartLines,
} from "@/lib/cart/cart-rules";
import { parseCart } from "@/lib/cart/cart-serialization";
import {
  CART_STORAGE_KEY,
  readStoredCart,
  writeStoredCart,
} from "@/lib/cart/cart-storage";
import type { CartItem, CartItemInput, CartLine } from "@/lib/cart/types";

/**
 * Snapshot du panier partagé par tous les listeners.
 */
type CartSnapshot = {
  items: CartItem[];
  hydrated: boolean;
};

/**
 * Snapshot rendu pendant le rendu serveur et au premier rendu client.
 */
const SERVER_SNAPSHOT: CartSnapshot = { items: [], hydrated: false };

let snapshot: CartSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

/**
 * Remplace le snapshot actuel et prévient les listeners.
 *
 * @param items - Nouvelles lignes du panier.
 * @returns Rien.
 */
function publish(items: CartItem[]): void {
  snapshot = { items, hydrated: true };
  for (const listener of listeners) listener();
}

/**
 * Recopie le panier écrit par un autre onglet.
 *
 * @param event - Évènement de modification du stockage.
 * @returns Rien.
 */
function handleStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  publish(event.key === null ? [] : parseCart(event.newValue));
}

/**
 * Abonne un composant aux changements du panier.
 *
 * Le premier abonné déclenche la relecture du panier conservé et l'écoute des
 * autres onglets, le dernier départ coupe cette écoute.
 *
 * @param listener - Fonction à rappeler à chaque changement.
 * @returns La fonction de désabonnement.
 */
function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", handleStorage);
    snapshot = { items: readStoredCart(), hydrated: true };
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

/**
 * Rend le snapshot actuel.
 *
 * @returns Le snapshot du panier côté navigateur.
 */
function getSnapshot(): CartSnapshot {
  return snapshot;
}

/**
 * Rend le snapshot utilisé pendant le rendu serveur.
 *
 * @returns Le snapshot.
 */
function getServerSnapshot(): CartSnapshot {
  return SERVER_SNAPSHOT;
}

/**
 * Applique une transformation au panier, puis la conserve et la diffuse.
 *
 * @param transform - Fonction produisant les nouvelles lignes.
 * @returns Rien.
 */
function mutate(transform: (items: CartItem[]) => CartItem[]): void {
  const next = transform(snapshot.items);
  if (next === snapshot.items) return;
  writeStoredCart(next);
  publish(next);
}

/**
 * Libellés des articles ajoutés pendant la session.
 */
const labels = new Map<string, string>();

/**
 * Ce que le fournisseur met à disposition des composants.
 */
export type CartContextValue = {
  /** Lignes du panier, dans leur ordre d'ajout. */
  items: CartItem[];
  /** Les mêmes lignes, chacune accompagnée de son état d'absorption. */
  lines: CartLine[];
  /** Nombre de lignes du panier, absorbées comprises. */
  count: number;
  /** Faux tant que le panier conservé n'a pas été relu. */
  isHydrated: boolean;
  /** Ajoute un produit au panier, puis ouvre le tiroir. */
  add: (input: CartItemInput, label?: string) => void;
  /** Retire un produit du panier. */
  remove: (sku: string) => void;
  /** Vide le panier. */
  clear: () => void;
  /** Indique si une référence figure déjà dans le panier. */
  has: (sku: string) => boolean;
  /** Indique si un article du panier couvre déjà ce produit. */
  isCovered: (input: CartItemInput) => boolean;
  /** Rend le libellé connu d'une référence, ou null. */
  labelOf: (sku: string) => string | null;
  /** Panier résolu par le serveur, noms et prix compris. */
  resolved: ResolvedCart;
  /** Vrai tant que la résolution serveur n'a pas répondu. */
  isResolving: boolean;
  /** Rend la ligne résolue d'une référence, ou null. */
  lineOf: (sku: string) => ResolvedCartLine | null;
  /** Lignes résolues indexées par référence. */
  resolvedBySku: Map<string, ResolvedCartLine>;
  /** Référence du dernier article ajouté, ou null. */
  lastAddedSku: string | null;
  /** Vrai lorsque le tiroir est ouvert. */
  isDrawerOpen: boolean;
  /** Ouvre ou ferme le tiroir. */
  setDrawerOpen: (open: boolean) => void;
  /** Vrai lorsque l'aperçu au survol est ouvert. */
  isPreviewOpen: boolean;
  /** Demande l'ouverture ou la fermeture de l'aperçu au survol. */
  setPreviewOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Rend le panier lisible et modifiable par les composants clients.
 *
 * Le fournisseur orchestre, toutes les règles vivant dans lib/cart.
 *
 * @param children - Arbre ayant accès au panier.
 * @returns Le fournisseur rendu.
 */
function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const [lastAddedSku, setLastAddedSku] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isPreviewRequested, setPreviewOpen] = useState(false);
  const [resolution, setResolution] = useState<{
    key: string;
    cart: ResolvedCart;
  } | null>(null);

  const skuKey = items.map((item) => item.sku).join("\u0000");
  const requestRef = useRef(0);

  useEffect(() => {
    if (!hydrated || skuKey.length === 0) return;

    requestRef.current += 1;
    const requestId = requestRef.current;

    resolveCartAction(skuKey.split("\u0000"))
      .then((cart) => {
        if (requestRef.current === requestId)
          setResolution({ key: skuKey, cart });
      })
      .catch(() => {
        if (requestRef.current === requestId) {
          setResolution({ key: skuKey, cart: EMPTY_RESOLVED_CART });
        }
      });
  }, [hydrated, skuKey]);

  // Tant que la résolution en cours ne porte pas sur le panier courant, on
  // n'expose aucun prix plutôt qu'un prix périmé.
  const resolved =
    resolution && resolution.key === skuKey
      ? resolution.cart
      : EMPTY_RESOLVED_CART;
  const isResolving = skuKey.length > 0 && resolution?.key !== skuKey;

  const add = useCallback((input: CartItemInput, label?: string) => {
    if (label) labels.set(input.sku, label);
    mutate((current) => addToCart(current, input, Date.now()));
    setLastAddedSku(input.sku);
    setPreviewOpen(false);
    setDrawerOpen(true);
  }, []);

  const remove = useCallback((sku: string) => {
    mutate((current) => removeFromCart(current, sku));
  }, []);

  const clear = useCallback(() => {
    mutate((current) => (current.length === 0 ? current : clearCart()));
  }, []);

  const resolvedBySku = useMemo(
    () => new Map(resolved.lines.map((line) => [line.sku, line])),
    [resolved],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      lines: resolveCartLines(items),
      count: items.length,
      isHydrated: hydrated,
      add,
      remove,
      clear,
      has: (sku: string) => containsSku(items, sku),
      isCovered: (input: CartItemInput) => {
        const candidate = cartItemToGrant(input);
        return items.some(
          (item) =>
            item.sku !== input.sku && absorbs(cartItemToGrant(item), candidate),
        );
      },
      labelOf: (sku: string) =>
        resolvedBySku.get(sku)?.name ?? labels.get(sku) ?? null,
      resolved,
      isResolving,
      lineOf: (sku: string) => resolvedBySku.get(sku) ?? null,
      resolvedBySku,
      lastAddedSku,
      isDrawerOpen,
      setDrawerOpen,
      isPreviewOpen: isPreviewRequested && !isDrawerOpen && items.length > 0,
      setPreviewOpen,
    }),
    [
      items,
      hydrated,
      add,
      remove,
      clear,
      lastAddedSku,
      isDrawerOpen,
      isPreviewRequested,
      resolved,
      resolvedBySku,
      isResolving,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Donne accès au panier depuis un composant client.
 *
 * @returns Le contenu du panier et ses opérations.
 * @throws {Error} Lorsque le composant appelant n'est pas sous le fournisseur.
 */
function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error("useCart doit être appelé sous un CartProvider.");
  }
  return value;
}

export { CartProvider, useCart };
