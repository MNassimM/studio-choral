"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { ShoppingCart } from "lucide-react";

import {
  CartCountBadge,
  useCartLinkLabel,
} from "@/components/cart/cart-count-badge";
import { CartPanelContent } from "@/components/cart/cart-panel-content";
import { useCart } from "@/components/cart/cart-provider";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Délai avant l'ouverture de l'aperçu, en millisecondes.
 */
const PREVIEW_OPEN_DELAY = 250;

/**
 * Délai avant la fermeture de l'aperçu, en millisecondes.
 */
const PREVIEW_CLOSE_DELAY = 100000;

/**
 * Lien vers le panier, avec son compteur, pour l'en tête du header.
 *
 * @returns Le lien rendu, accompagné de son aperçu.
 */
function CartIconLink() {
  const label = useCartLinkLabel();
  const { panelMode, requestHoverPanel, closeHoverPanel } = useCart();

  return (
    <PreviewCard.Root
      open={panelMode === "hover"}
      onOpenChange={requestHoverPanel}
    >
      <PreviewCard.Trigger
        delay={PREVIEW_OPEN_DELAY}
        closeDelay={PREVIEW_CLOSE_DELAY}
        render={
          <Link
            href="/panier"
            aria-label={label}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "relative",
            )}
          />
        }
      >
        <ShoppingCart className="size-5" />
        <CartCountBadge />
      </PreviewCard.Trigger>

      <PreviewCard.Portal>
        <PreviewCard.Positioner side="bottom" align="end" sideOffset={8} className="z-100">
          <PreviewCard.Popup className="z-50 flex w-96 flex-col rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-opacity duration-150 data-closed:opacity-0 data-open:opacity-100">
            <CartPanelContent onClose={closeHoverPanel} />
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export { CartIconLink };
