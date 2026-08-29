"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { CheckCircle2, ShoppingCart, Trash2, X } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/lib/cart/types";

/**
 * Une ligne du récapitulatif.
 *
 * @param line - Ligne à afficher, état d'absorption compris.
 * @returns La ligne rendue.
 */
function CartDrawerLine({ line }: { line: CartLine }) {
  const t = useTranslations("cart.drawer");
  const { labelOf, remove } = useCart();
  const absorbed = line.absorbedBy !== null;
  const label = labelOf(line.sku) ?? t("unknownItem");

  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "text-sm font-medium",
            absorbed && "text-muted-foreground line-through",
          )}
        >
          {label}
        </span>
        {absorbed ? (
          <span className="text-xs text-muted-foreground">
            {t("absorbedNotice")}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("removeAriaLabel", { item: label })}
        onClick={() => remove(line.sku)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

/**
 * Tiroir latéral du panier, ouvert à chaque ajout.
 *
 * @returns Le tiroir rendu.
 */
function CartDrawer() {
  const t = useTranslations("cart.drawer");
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
              <ShoppingCart className="size-4 text-primary" aria-hidden="true" />
              {t("title")}
            </Dialog.Title>
            <Dialog.Close
              aria-label={t("closeAriaLabel")}
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
                <span>{t("addedNotice", { item: lastAddedLabel })}</span>
              </p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2">
            {count === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("empty")}
              </p>
            ) : (
              <>
                <Dialog.Description className="sr-only">
                  {t("summaryDescription", { count })}
                </Dialog.Description>
                <ul className="flex flex-col">
                  {lines.map((line) => (
                    <CartDrawerLine key={line.sku} line={line} />
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">{t("totalNotice")}</p>
            <Link
              href="/panier"
              onClick={() => setDrawerOpen(false)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full rounded-full",
              )}
            >
              {t("viewCart")}
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDrawerOpen(false)}
              className="w-full rounded-full"
            >
              {t("continueShopping")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CartDrawer };
