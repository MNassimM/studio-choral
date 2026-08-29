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
 * @param size - Gabarit du bouton.
 * @returns Le bouton rendu.
 */
function AddToCartButton({
  offer,
  label,
  inCartLabel,
  size = "default",
}: {
  offer: SimpleOfferView;
  label: string;
  inCartLabel: string;
  size?: "sm" | "default";
}) {
  const { add, has, isHydrated } = useCart();
  const alreadyInCart = isHydrated && has(offer.sku);

  return (
    <Button
      type="button"
      size={size}
      aria-disabled={alreadyInCart || undefined}
      onClick={() => {
        if (alreadyInCart) return;
        add(offer, offer.name);
      }}
      className="mt-2 w-full rounded-full aria-disabled:cursor-default aria-disabled:bg-muted aria-disabled:text-muted-foreground aria-disabled:hover:bg-muted"
    >
      {alreadyInCart ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <ShoppingCart className="size-4" aria-hidden="true" />
      )}
      {alreadyInCart ? inCartLabel : label}
    </Button>
  );
}

export { AddToCartButton };
