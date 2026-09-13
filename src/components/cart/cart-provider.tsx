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

import {
  mergeGuestCartAction,
  resolveCartAction,
  saveUserCartAction,
} from "@/lib/cart/cart-actions";
import {
  EMPTY_RESOLVED_CART,
  type ResolvedCart,
  type ResolvedCartLine,
} from "@/lib/cart/resolved-cart";

import { absorbs } from "@/lib/access/grants";
import { cartItemToGrant, containsSku } from "@/lib/cart/cart-item";
import {
  clearCart,
  findCoveredItems,
  removeFromCart,
  replaceInCart,
} from "@/lib/cart/cart-rules";
import { parseCart, serializeCart } from "@/lib/cart/cart-serialization";
import {
  CART_STORAGE_KEY,
  clearStoredCart,
  readStoredCart,
  writeStoredCart,
} from "@/lib/cart/cart-storage";
import type { CartItem, CartItemInput } from "@/lib/cart/types";

/**
 * Snapshot du panier partagé par tous les listeners.
 */
type CartSnapshot = {
  items: CartItem[];
  hydrated: boolean;
  /** Articles écartés au dernier enregistrement, faute d'être encore à acheter. */
  ownedRemoved: number;
};

/**
 * Snapshot rendu pendant le rendu serveur et au premier rendu client.
 */
const SERVER_SNAPSHOT: CartSnapshot = {
  items: [],
  hydrated: false,
  ownedRemoved: 0,
};

/**
 * Compte auquel appartient le panier affiché, nul pour un visiteur.
 *
 * @remarks
 * C'est lui qui décide où le panier est conservé : en base pour un compte,
 * dans le navigateur pour un visiteur. Au niveau du module, comme le
 * snapshot, parce que les mutations sont déclenchées hors de React.
 */
let owner: string | null = null;

let snapshot: CartSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

/**
 * Remplace le snapshot actuel et prévient les listeners.
 *
 * @param items - Nouvelles lignes du panier.
 * @returns Rien.
 */
function publish(items: CartItem[], ownedRemoved = 0): void {
  snapshot = { items, hydrated: true, ownedRemoved };
  for (const listener of listeners) listener();
}

/**
 * Conserve le panier là où il doit vivre.
 *
 * @remarks
 * L'affichage a déjà été mis à jour quand cette fonction s'exécute : on
 * enregistre derrière, sans faire attendre. Pour un compte, le serveur fait
 * foi — il écarte ce qui est déjà possédé — et sa réponse corrige l'affichage
 * si elle diffère.
 *
 * @param items - Panier à conserver.
 * @returns Rien.
 */
function persist(items: CartItem[]): void {
  if (owner === null) {
    writeStoredCart(items);
    return;
  }

  const pour = owner;
  void saveUserCartAction(serializeCart(items))
    .then((resultat) => {
      // Un changement de compte pendant l'aller-retour rend la réponse caduque.
      if (owner !== pour) return;
      if (resultat.removedOwned > 0 || resultat.items.length !== items.length) {
        publish(resultat.items, resultat.removedOwned);
      }
    })
    .catch(() => {});
}

/**
 * Recopie le panier écrit par un autre onglet.
 *
 * @param event - Évènement de modification du stockage.
 * @returns Rien.
 */
function handleStorage(event: StorageEvent): void {
  // Un panier de compte vit en base : ce que fait un autre onglet au stockage
  // du navigateur ne le concerne pas.
  if (owner !== null) return;
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
  publish(next);
  persist(next);
}

/**
 * Libellés des articles ajoutés pendant la session.
 */
const labels = new Map<string, string>();

/**
 * Mode d'ouverture du panneau du panier.
 *
 * Un seul mode peut valoir à la fois, ce qui rend leur exclusivité
 * structurelle plutôt que conventionnelle.
 */
export type CartPanelMode = "hover" | "add" | null;

/**
 * Un produit à ajouter, avec le libellé affiché en attendant le serveur.
 */
export type AddInput = CartItemInput & { name?: string };

/**
 * Ce que le fournisseur met à disposition des composants.
 */
export type CartContextValue = {
  /** Lignes du panier, dans leur ordre d'ajout. */
  items: CartItem[];
  /** Nombre de lignes du panier. */
  count: number;
  /** Faux tant que le panier conservé n'a pas été relu. */
  isHydrated: boolean;
  /** Articles retirés au dernier enregistrement, faute d'être encore à acheter. */
  ownedRemoved: number;
  /** Acquitte l'avis de retrait. */
  dismissOwnedNotice: () => void;
  /** Ajoute un produit au panier, ou demande confirmation s'il en couvre d'autres. */
  add: (input: CartItemInput, label?: string) => void;
  /** Ajoute plusieurs produits en une seule fois. */
  addMany: (inputs: AddInput[]) => void;
  /** Retire un produit du panier. */
  remove: (sku: string) => void;
  /** Vide le panier. */
  clear: () => void;
  /** Indique si une référence figure déjà dans le panier. */
  has: (sku: string) => boolean;
  /** Indique si un article du panier couvre déjà ce produit. */
  isCovered: (input: CartItemInput) => boolean;
  /** Rend les articles du panier que ce produit remplacerait. */
  itemsCoveredBy: (input: CartItemInput) => CartItem[];
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
  /** Références du dernier lot ajouté, vide si aucun ajout depuis l'ouverture. */
  lastAddedSkus: string[];
  /** Mode du panneau, ou null lorsqu'aucun n'est ouvert. */
  panelMode: CartPanelMode;
  /** Demande ou retire l'ouverture au survol, qui reprend la main sur l'ajout. */
  requestHoverPanel: (open: boolean) => void;
  /** Ferme le panneau ouvert par un ajout. */
  closeAddPanel: () => void;
  /** Retire la demande d'ouverture au survol. */
  closeHoverPanel: () => void;
  /** Articles que l'ajout en attente remplacerait, vide hors confirmation. */
  replacedItems: CartItem[];
  /** Vrai lorsque la confirmation de remplacement est ouverte. */
  isReplaceOpen: boolean;
  /** Confirme le remplacement, retire les couverts et ajoute le produit. */
  confirmReplacement: () => void;
  /** Abandonne le remplacement sans rien changer au panier. */
  cancelReplacement: () => void;
  /** Élément à refocaliser à la fermeture des dialogues. */
  triggerRef: React.RefObject<HTMLElement | null>;
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
function CartProvider({
  children,
  userId,
  initialCart,
}: {
  children: React.ReactNode;
  /** Compte connecté, nul pour un visiteur. */
  userId: string | null;
  /**
   * Panier déjà enregistré du compte, SÉRIALISÉ.
   *
   * @remarks
   * Une chaîne et non un tableau : le gabarit en produit un neuf à chaque
   * rendu, dont l'identité changeante relancerait la bascule en boucle. Une
   * chaîne se compare par valeur.
   */
  initialCart: string;
}) {
  const { items, hydrated, ownedRemoved } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Bascule d'identité : connexion, déconnexion, changement de compte.
  useEffect(() => {
    let annule = false;

    async function basculer() {
      if (userId === null) {
        // Déconnexion : on repasse sur le panier du visiteur, qui est vide
        // depuis qu'il a été versé au compte. Le panier du compte reste en
        // base, intact, prêt pour la prochaine connexion.
        owner = null;
        publish(readStoredCart());
        return;
      }

      const invite = readStoredCart();
      owner = userId;

      if (invite.length === 0) {
        publish(parseCart(initialCart));
        return;
      }

      const resultat = await mergeGuestCartAction(serializeCart(invite));
      if (annule || owner !== userId) return;
      clearStoredCart();
      publish(resultat.items, resultat.removedOwned);
    }

    void basculer();
    return () => {
      annule = true;
    };
  }, [userId, initialCart]);

  const [lastAddedSkus, setLastAddedSkus] = useState<string[]>([]);
  const [isAddOpen, setAddOpen] = useState(false);
  const [isHoverRequested, setHoverRequested] = useState(false);
  const [pending, setPending] = useState<{
    inputs: AddInput[];
    covered: CartItem[];
  } | null>(null);
  const [replacedItems, setReplacedItems] = useState<CartItem[]>([]);
  const triggerRef = useRef<HTMLElement | null>(null);
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

  const resolved =
    resolution && resolution.key === skuKey
      ? resolution.cart
      : EMPTY_RESOLVED_CART;
  const isResolving = skuKey.length > 0 && resolution?.key !== skuKey;

  /**
   * Ajoute les produits en une seule fois et ouvre le panneau.
   *
   * @param inputs - Produits à ajouter.
   * @returns Rien.
   */
  const commitAdd = useCallback((inputs: AddInput[]) => {
    if (inputs.length === 0) return;

    for (const input of inputs) {
      if (input.name) labels.set(input.sku, input.name);
    }
    const addedAt = Date.now();
    // Un seul mutate, donc une seule écriture et une seule ouverture.
    mutate((current) =>
      inputs.reduce(
        (items, input) => replaceInCart(items, input, addedAt),
        current,
      ),
    );
    setLastAddedSkus(inputs.map((input) => input.sku));
    setHoverRequested(false);
    setAddOpen(true);
  }, []);

  const addMany = useCallback(
    (inputs: AddInput[]) => {
      // On réunit tout ce qui serait remplacé pour n'ouvrir qu'une modale.
      const covered = new Map<string, CartItem>();
      for (const input of inputs) {
        for (const item of findCoveredItems(snapshot.items, input)) {
          covered.set(item.sku, item);
        }
      }
      const remplaces = [...covered.values()].filter(
        (item) => !inputs.some((input) => input.sku === item.sku),
      );

      if (remplaces.length === 0) {
        commitAdd(inputs);
        return;
      }
      for (const input of inputs) {
        if (input.name) labels.set(input.sku, input.name);
      }
      setHoverRequested(false);
      setReplacedItems(remplaces);
      setPending({ inputs, covered: remplaces });
    },
    [commitAdd],
  );

  const add = useCallback(
    (input: CartItemInput, label?: string) => {
      addMany([{ ...input, name: label }]);
    },
    [addMany],
  );

  const confirmReplacement = useCallback(() => {
    setPending((current) => {
      if (current) commitAdd(current.inputs);
      return null;
    });
  }, [commitAdd]);

  const cancelReplacement = useCallback(() => {
    setPending(null);
  }, []);

  const closeAddPanel = useCallback(() => {
    setAddOpen(false);
  }, []);

  // Le survol de l'icône ferme le panneau d'ajout et prend sa place. Base UI
  // interrompt de toute façon le dialogue dès que l'interaction de survol
  // démarre, on rend donc la reprise explicite plutôt que subie.
  const requestHoverPanel = useCallback((open: boolean) => {
    setHoverRequested(open);
    if (open) setAddOpen(false);
  }, []);

  const closeHoverPanel = useCallback(() => {
    setHoverRequested(false);
  }, []);

  // Un seul mode peut valoir à la fois, les deux panneaux ne peuvent donc
  // jamais être ouverts ensemble.
  const panelMode: CartPanelMode = isAddOpen
    ? "add"
    : isHoverRequested && items.length > 0 && pending === null
      ? "hover"
      : null;

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
      count: items.length,
      isHydrated: hydrated,
      ownedRemoved,
      dismissOwnedNotice: () => publish(snapshot.items),
      add,
      addMany,
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
      itemsCoveredBy: (input: CartItemInput) => findCoveredItems(items, input),
      labelOf: (sku: string) =>
        resolvedBySku.get(sku)?.name ?? labels.get(sku) ?? null,
      resolved,
      isResolving,
      lineOf: (sku: string) => resolvedBySku.get(sku) ?? null,
      resolvedBySku,
      lastAddedSkus,
      panelMode,
      requestHoverPanel,
      closeAddPanel,
      closeHoverPanel,
      replacedItems,
      isReplaceOpen: pending !== null && panelMode !== "add",
      confirmReplacement,
      cancelReplacement,
      triggerRef,
    }),
    [
      items,
      hydrated,
      ownedRemoved,
      add,
      addMany,
      remove,
      clear,
      lastAddedSkus,
      panelMode,
      requestHoverPanel,
      closeAddPanel,
      closeHoverPanel,
      resolved,
      resolvedBySku,
      isResolving,
      pending,
      replacedItems,
      confirmReplacement,
      cancelReplacement,
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
