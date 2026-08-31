"use client";

import { Check, ShoppingCart } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import type { SimpleOfferView } from "@/lib/works/work-page-view-model";

/**
 * Bouton ajoutant une offre au panier.
 *
 * @param offer - Offre à ajouter, coordonnées d'accès comprises.
 * @param label - Libellé du bouton dans son état normal.
 * @param inCartLabel - Libellé du bouton lorsque l'offre est déjà au panier.
 * @param coveredLabel - Libellé du bouton lorsqu'un article du panier couvre déjà l'offre.
 * @param size - Gabarit du bouton.
 * @returns Le bouton rendu.
 */
function AddToCartButton({
  offer,
  label,
  inCartLabel,
  coveredLabel,
  size = "default",
}: {
  offer: SimpleOfferView;
  label: string;
  inCartLabel: string;
  coveredLabel: string;
  size?: "sm" | "default";
}) {
  const {
    add,
    has,
    isCovered,
    itemsCoveredBy,
    labelOf,
    isHydrated,
    triggerRef,
  } = useCart();

  const alreadyInCart = isHydrated && has(offer.sku);
  const alreadyCovered = isHydrated && isCovered(offer);
  const blocked = alreadyInCart || alreadyCovered;

  const waiting =
    !blocked &&
    isHydrated &&
    itemsCoveredBy(offer).some((item) => labelOf(item.sku) === null);

  const inert = blocked || waiting;

  return (
    <Button
      type="button"
      size={size}
      aria-disabled={inert || undefined}
      onClick={(event) => {
        if (inert) return;
        triggerRef.current = event.currentTarget;
        add(offer, offer.name);
      }}
      className="mt-2 w-full rounded-full aria-disabled:cursor-default aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:hover:bg-muted"
    >
      {blocked ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <ShoppingCart className="size-4" aria-hidden="true" />
      )}
      {alreadyCovered && !alreadyInCart ? coveredLabel : null}
      {alreadyInCart ? inCartLabel : null}
      {blocked ? null : label}
    </Button>
  );
}

export { AddToCartButton };
