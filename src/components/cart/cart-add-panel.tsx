"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useId, useState } from "react";

import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { CartAddedList } from "@/components/cart/cart-added-list";
import { useCart } from "@/components/cart/cart-provider";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Délai avant la fermeture automatique du panneau, en millisecondes.
 */
const AUTO_CLOSE_DELAY = 7000;

/**
 * Panneau de confirmation ouvert à chaque ajout au panier.
 *
 * @returns Le panneau rendu.
 */
function CartAddPanel() {
  const t = useTranslations("cart");
  const {
    panelMode,
    closeAddPanel,
    count,
    lastAddedSkus,
    lineOf,
    labelOf,
    triggerRef,
  } = useCart();
  const [isPaused, setPaused] = useState(false);

  const titleId = useId();
  const descriptionId = useId();
  const isOpen = panelMode === "add";

  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen && isPaused) setPaused(false);
  }

  useEffect(() => {
    if (!isOpen || isPaused) return;

    const timer = window.setTimeout(closeAddPanel, AUTO_CLOSE_DELAY);
    return () => window.clearTimeout(timer);
  }, [isOpen, isPaused, closeAddPanel, lastAddedSkus, count]);

  useEffect(() => {
    if (isOpen) return;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  const detail = lastAddedSkus
    .map((sku) => {
      const ligne = lineOf(sku);
      if (!ligne) return labelOf(sku);
      const situation = ligne.movementTitle ?? ligne.workTitle;
      return [situation, ligne.voiceLabel].filter(Boolean).join(" - ");
    })
    .filter((texte): texte is string => Boolean(texte))
    .join("\n");

  return (
    <Dialog.Root
      modal={false}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeAddPanel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Popup
          finalFocus={triggerRef}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={(event) => {
            if (event.target !== event.currentTarget) setPaused(true);
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setPaused(false);
            }
          }}
          className="fixed inset-x-3 bottom-3 z-50 flex flex-col rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl sm:inset-x-auto sm:top-20 sm:bottom-auto sm:left-1/2 sm:w-80 sm:-translate-x-1/2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <p
                id={titleId}
                className="flex items-center gap-2 text-sm font-semibold"
              >
                <CheckCircle2
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {t("panel.addedTitle", { count: lastAddedSkus.length })}
              </p>
              {detail ? (
                <p
                  id={descriptionId}
                  className="pl-6 text-[0.7rem] text-muted-foreground whitespace-pre-line"
                >
                  {detail}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("panel.closeAriaLabel")}
              onClick={closeAddPanel}
              className="-mr-1 shrink-0 cursor-pointer rounded-full text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-2 max-h-80 overflow-auto scrollbar-thumb-primary scrollbar-track-background">
            <CartAddedList highlightSkus={lastAddedSkus} />
          </div>

          <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
            <CartSummary size="sm" />
            <Link
              href="/panier"
              onClick={closeAddPanel}
              className={cn(
                buttonVariants({ size: "sm" }),
                "w-full rounded-full",
              )}
            >
              {t("panel.viewCart")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CartAddPanel };
