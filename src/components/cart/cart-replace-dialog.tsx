"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { Replace, X } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Confirmation demandée avant un ajout qui en remplace d'autres.
 *
 * @returns La confirmation rendue.
 */
function CartReplaceDialog() {
  const t = useTranslations("cart.replace");
  const {
    replacedItems,
    isReplaceOpen,
    confirmReplacement,
    cancelReplacement,
    labelOf,
    triggerRef,
  } = useCart();

  const count = replacedItems.length;

  return (
    <Dialog.Root
      modal
      open={isReplaceOpen}
      onOpenChange={(open) => {
        if (!open) cancelReplacement();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[1px] transition-opacity duration-200 data-closed:opacity-0 data-open:opacity-100" />
        <Dialog.Popup
          finalFocus={triggerRef}
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl border border-border bg-background p-5 shadow-xl transition-opacity duration-200 data-closed:opacity-0 data-open:opacity-100"
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="flex items-center gap-2 text-base font-semibold">
              <Replace className="size-4 text-primary" aria-hidden="true" />
              {t("title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("closeAriaLabel")}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "shrink-0 rounded-full",
              )}
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-muted-foreground">
            {t("body", { count })}
          </Dialog.Description>

          <ul className="flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-3">
            {replacedItems.map((item) => (
              <li key={item.sku} className="text-sm">
                {labelOf(item.sku)}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">{t("notice")}</p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={cancelReplacement}
              className="rounded-full"
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={confirmReplacement}
              className="rounded-full"
            >
              {t("confirm", { count })}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CartReplaceDialog };
