"use client";

import { PreviewCard } from "@base-ui/react/preview-card";
import { useTranslations } from "next-intl";
import { ShoppingCart, X } from "lucide-react";

import {
  CartCountBadge,
  useCartLinkLabel,
} from "@/components/cart/cart-count-badge";
import { CartLineList } from "@/components/cart/cart-line-list";
import { useCart } from "@/components/cart/cart-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Délai avant l'ouverture de l'aperçu, en millisecondes.
 */
const PREVIEW_OPEN_DELAY = 250;

/**
 * Délai avant la fermeture de l'aperçu, en millisecondes.
 */
const PREVIEW_CLOSE_DELAY = 200;

/**
 * Lien vers le panier, avec son compteur, pour l'en tête du header.
 *
 * Le lien est aussi le déclencheur de l'aperçu du panier, ouvert au survol à la
 * souris et au focus au clavier. Le clic navigue toujours vers le panier.
 *
 * @returns Le lien rendu, accompagné de son aperçu.
 */
function CartIconLink() {
  const t = useTranslations("cart.panel");
  const label = useCartLinkLabel();
  const { lines, count, isPreviewOpen, setPreviewOpen } = useCart();

  return (
    <PreviewCard.Root open={isPreviewOpen} onOpenChange={setPreviewOpen}>
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
        <PreviewCard.Positioner side="bottom" align="end" sideOffset={8}>
          <PreviewCard.Popup className="z-50 flex w-72 flex-col rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-opacity duration-150 data-closed:opacity-0 data-open:opacity-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t("title")}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("closeAriaLabel")}
                onClick={() => setPreviewOpen(false)}
                className="-mr-1 shrink-0 rounded-full text-muted-foreground"
              >
                <X className="size-4" />
              </Button>
            </div>

            <p className="sr-only">{t("summaryDescription", { count })}</p>

            <div className="max-h-64 overflow-y-auto">
              <CartLineList lines={lines} density="compact" removable={false} />
            </div>

            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {t("totalNotice")}
            </p>
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}

export { CartIconLink };
