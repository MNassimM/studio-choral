"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, CheckCircle2, X } from "lucide-react";

import { CartLineGroups } from "@/components/cart/cart-line-list";
import { useCart } from "@/components/cart/cart-provider";
import { CartSummary } from "@/components/cart/cart-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Contenu du panneau du panier, les memes au mode survol et au mode ajout.
 *
 * @param density - Densité d'affichage des lignes.
 * @param removable - Vrai pour proposer le retrait de chaque ligne.
 * @param showAddedNotice - Vrai pour annoncer le dernier article ajouté.
 * @param titleId - Identifiant du titre, pour l'étiquetage du dialogue.
 * @param descriptionId - Identifiant du résumé, pour la description du dialogue.
 * @param onClose - Ferme le panneau.
 * @returns Le contenu rendu.
 */
function CartPanelContent({
  density = "comfortable",
  removable = false,
  showAddedNotice = false,
  titleId,
  descriptionId,
  onClose,
}: {
  density?: "comfortable" | "compact";
  removable?: boolean;
  showAddedNotice?: boolean;
  titleId?: string;
  descriptionId?: string;
  onClose: () => void;
}) {
  const t = useTranslations("cart");
  const { items, count, lastAddedSku, labelOf } = useCart();

  const lastAddedLabel =
    showAddedNotice && lastAddedSku ? labelOf(lastAddedSku) : null;

  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <p id={titleId} className="text-base font-semibold">
            {t("panel.title")}
          </p>
          <p id={descriptionId} className="text-xs text-muted-foreground">
            {t("page.itemCount", { count })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("panel.closeAriaLabel")}
          onClick={onClose}
          className="-mr-1 shrink-0 cursor-pointer rounded-full text-muted-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div aria-live="polite">
        {lastAddedLabel ? (
          <p className="mt-2 flex items-start gap-2 rounded-lg border border-primary/30 bg-secondary/50 p-2.5 text-xs">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{t("drawer.addedNotice", { item: lastAddedLabel })}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-2 max-h-80 overflow-auto pr-1 scrollbar-thumb-primary scrollbar-track-background">
        <CartLineGroups
          lines={items}
          density={density}
          removable={removable}
          showPrices
          workCards
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
        <CartSummary size="sm" />
        <Link
          href="/panier"
          onClick={onClose}
          className={cn(buttonVariants({ size: "sm" }), "w-full rounded-full")}
        >
          {t("panel.viewCart")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

export { CartPanelContent };
