"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShoppingCart, X } from "lucide-react";

import { CartLineList } from "@/components/cart/cart-line-list";
import { useCart } from "@/components/cart/cart-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Tiroir latéral du panier, ouvert à chaque ajout.
 *
 * @returns Le tiroir rendu.
 */
function CartDrawer() {
  const t = useTranslations("cart");
  const { lines, count, lastAddedSku, labelOf, isDrawerOpen, setDrawerOpen } =
    useCart();

  const lastAddedLabel = lastAddedSku ? labelOf(lastAddedSku) : null;

  return (
    <Dialog.Root modal open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-200 data-closed:opacity-0 data-open:opacity-100" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-background shadow-xl transition-transform duration-200 data-closed:translate-x-full data-open:translate-x-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
              <ShoppingCart
                className="size-4 text-primary"
                aria-hidden="true"
              />
              {t("panel.title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("panel.closeAriaLabel")}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "rounded-full",
              )}
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <div aria-live="polite" className="px-5">
            {lastAddedLabel ? (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-secondary/50 p-3 text-sm">
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span>{t("drawer.addedNotice", { item: lastAddedLabel })}</span>
              </p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2">
            {count > 0 ? (
              <Dialog.Description className="sr-only">
                {t("panel.summaryDescription", { count })}
              </Dialog.Description>
            ) : null}
            <CartLineList lines={lines} />
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              {t("panel.totalNotice")}
            </p>
            <Link
              href="/panier"
              onClick={() => setDrawerOpen(false)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full rounded-full",
              )}
            >
              {t("panel.viewCart")}
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDrawerOpen(false)}
              className="w-full rounded-full"
            >
              {t("drawer.continueShopping")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CartDrawer };
