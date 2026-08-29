"use client";

import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";

import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CartLine } from "@/lib/cart/types";

/**
 * Densité d'affichage des lignes du panier.
 */
type CartLineDensity = "comfortable" | "compact";

/**
 * Une ligne du panier.
 *
 * @param line - Ligne à afficher, état d'absorption compris.
 * @param density - Densité d'affichage.
 * @param removable - Vrai pour proposer le retrait de la ligne.
 * @returns La ligne rendue.
 */
function CartLineItem({
  line,
  density = "comfortable",
  removable = true,
}: {
  line: CartLine;
  density?: CartLineDensity;
  removable?: boolean;
}) {
  const t = useTranslations("cart.line");
  const { labelOf, remove } = useCart();
  const absorbed = line.absorbedBy !== null;
  const label = labelOf(line.sku) ?? t("unknownItem");
  const compact = density === "compact";

  return (
    <li
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border last:border-b-0",
        compact ? "py-2" : "py-3",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={cn(
            "font-medium",
            compact ? "text-xs" : "text-sm",
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
      {removable ? (
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
      ) : null}
    </li>
  );
}

/**
 * Liste des lignes du panier, partagée par toutes les surfaces qui l'affichent.
 *
 * @param lines - Lignes à afficher, dans leur ordre d'ajout.
 * @param density - Densité d'affichage.
 * @param removable - Vrai pour proposer le retrait de chaque ligne.
 * @param emptyMessage - Message affiché lorsque le panier est vide.
 * @returns La liste rendue, ou le message de panier vide.
 */
function CartLineList({
  lines,
  density = "comfortable",
  removable = true,
  emptyMessage,
}: {
  lines: CartLine[];
  density?: CartLineDensity;
  removable?: boolean;
  emptyMessage?: string;
}) {
  const t = useTranslations("cart.line");

  if (lines.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t("empty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {lines.map((line) => (
        <CartLineItem
          key={line.sku}
          line={line}
          density={density}
          removable={removable}
        />
      ))}
    </ul>
  );
}

export { CartLineItem, CartLineList };
export type { CartLineDensity };
