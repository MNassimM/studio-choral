"use client";

import { ShoppingCart } from "lucide-react";

import {
  CartCountBadge,
  useCartLinkLabel,
} from "@/components/cart/cart-count-badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Lien vers le panier, avec son compteur, pour l'en tête du header.
 *
 * @returns Le lien rendu.
 */
function CartIconLink() {
  const label = useCartLinkLabel();

  return (
    <Link
      href="/panier"
      aria-label={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "relative",
      )}
    >
      <ShoppingCart className="size-5" />
      <CartCountBadge />
    </Link>
  );
}

export { CartIconLink };
