"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useId, useState } from "react";

import { CartPanelContent } from "@/components/cart/cart-panel-content";
import { useCart } from "@/components/cart/cart-provider";

/**
 * Délai avant la fermeture automatique du panneau, en millisecondes.
 */
const AUTO_CLOSE_DELAY = 7000000;

/**
 * Panneau de confirmation ouvert à chaque ajout au panier.
 *
 * @returns Le panneau rendu.
 */
function CartAddPanel() {
  const { panelMode, closeAddPanel, count, lastAddedSku, triggerRef } =
    useCart();
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
  }, [isOpen, isPaused, closeAddPanel, lastAddedSku, count]);

  useEffect(() => {
    if (isOpen) return;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

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
          className="fixed inset-x-3 bottom-3 z-50 flex flex-col rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl sm:inset-x-auto sm:top-20 sm:bottom-auto sm:left-1/2 sm:w-120 sm:-translate-x-1/2"
        >
          <CartPanelContent
            removable
            showAddedNotice
            titleId={titleId}
            descriptionId={descriptionId}
            onClose={closeAddPanel}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { CartAddPanel };
