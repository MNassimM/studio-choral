"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, Music2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";

import { usePriceFormatter } from "@/features/cart/components/cart-price";
import { useCart } from "@/features/cart/components/cart-provider";
import { Button } from "@/shared/components/ui/button";
import { groupCartLines } from "@/features/cart/domain/cart-grouping";
import { cn } from "@/shared/utils/cn";
import type { ResolvedCartLine } from "@/features/cart/domain/resolved-cart";
import type { CartItem } from "@/features/cart/domain/types";

/**
 * Densité d'affichage des lignes du panier.
 */
type CartLineDensity = "comfortable" | "compact";

/**
 * Emplacement réservé à la pochette d'une oeuvre.
 *
 * @param small - Vrai pour la vignette resserrée des panneaux.
 * @returns Le visuel rendu.
 */
function CartWorkCover({
  src = null,
  small = false,
}: {
  src?: string | null;
  small?: boolean;
}) {
  const taille = small ? "w-14" : "w-20 sm:w-24";

  if (src) {
    return (
      <div
        className={cn(
          "relative aspect-square shrink-0 overflow-hidden rounded-xl border border-border bg-secondary",
          taille,
        )}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes={small ? "3.5rem" : "6rem"}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex aspect-square shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-primary",
        taille,
      )}
    >
      <Music2 className={small ? "size-5" : "size-7 sm:size-9"} />
    </div>
  );
}

/**
 * Additionne les montants dus des lignes d'une oeuvre.
 *
 * @param lines - Lignes de l'oeuvre.
 * @param resolvedBySku - Lignes résolues, indexées par référence.
 * @returns Le total et sa devise, ou null si une ligne n'est pas résolue.
 */
function sumWorkLines(
  lines: CartItem[],
  resolvedBySku: Map<string, ResolvedCartLine>,
): { cents: number; currency: string } | null {
  let cents = 0;
  let currency: string | null = null;
  for (const line of lines) {
    const resolved = resolvedBySku.get(line.sku);
    if (!resolved || resolved.currency === null) return null;
    cents += resolved.payableCents;
    currency ??= resolved.currency;
  }
  return currency === null ? null : { cents, currency };
}

/**
 * Prix d'une ligne, remisé ou non.
 *
 * @param resolved - Ligne résolue par le serveur, ou null si elle ne l'est pas encore.
 * @param compact - Vrai pour la variante resserrée.
 * @returns Le prix rendu, ou null en l'absence de résolution.
 */
function CartLinePrice({
  resolved,
  compact,
}: {
  resolved: ResolvedCartLine | null;
  compact: boolean;
}) {
  const t = useTranslations("cart.line");
  const formatPrice = usePriceFormatter();

  if (!resolved || resolved.priceCents === null || resolved.currency === null) {
    return null;
  }

  const currency = resolved.currency;
  const size = compact ? "text-xs" : "text-sm";

  if (resolved.discount) {
    const { percentOff, originalCents, discountedCents } = resolved.discount;
    return (
      <span className={cn(size, "flex shrink-0 flex-col items-end gap-0.5")}>
        <div className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="text-muted-foreground line-through"
          >
            {formatPrice(originalCents, currency)}
          </span>
          <span aria-hidden="true" className="font-semibold text-primary">
            {formatPrice(discountedCents, currency)}
          </span>
        </div>
        <span className="sr-only">
          {t("discountAnnouncement", {
            percent: percentOff,
            original: formatPrice(originalCents, currency),
            discounted: formatPrice(discountedCents, currency),
          })}
        </span>
        <span
          aria-hidden="true"
          className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary"
        >
          {t("discountBadge", { percent: percentOff })}
        </span>
      </span>
    );
  }

  return (
    <span className={cn(size, "shrink-0 font-medium")}>
      {formatPrice(resolved.priceCents, currency)}
    </span>
  );
}

/**
 * Une ligne du panier, soit un pupitre acheté.
 *
 * Le mouvement n'est pas répété ici, il titre le groupe auquel la ligne
 * appartient.
 *
 * @param line - Ligne à afficher.
 * @param density - Densité d'affichage.
 * @param removable - Vrai pour proposer le retrait de la ligne.
 * @param showPrices - Vrai pour afficher les prix résolus par le serveur.
 * @returns La ligne rendue.
 */
function CartLineItem({
  line,
  density = "comfortable",
  removable = true,
  showPrices = false,
}: {
  line: CartItem;
  density?: CartLineDensity;
  removable?: boolean;
  showPrices?: boolean;
}) {
  const t = useTranslations("cart.line");
  const { labelOf, lineOf, remove } = useCart();
  const resolved = lineOf(line.sku);
  const unavailable = resolved?.unavailable ?? false;
  const label = labelOf(line.sku) ?? t("unknownItem");
  const compact = density === "compact";

  const title = unavailable
    ? t("unavailableItem")
    : (resolved?.voiceLabel ?? label);

  return (
    <li
      className={cn(
        "flex",
        resolved?.discount ? "items-start" : "items-center",
        "justify-between gap-3",
      )}
    >
      <div className="flex min-w-0 flex-col">
        <span
          className={cn(
            compact ? "text-xs" : "text-sm",
            "text-muted-foreground",
          )}
        >
          {title}
        </span>
        {unavailable ? (
          <span className="text-xs text-muted-foreground pb-2">
            {t("unavailableNotice")}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showPrices ? (
          <CartLinePrice resolved={resolved} compact={compact} />
        ) : null}
        {removable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("removeAriaLabel", { item: label })}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              remove(line.sku);
            }}
            className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Liste de pupitres appartenant à un même mouvement.
 *
 * @param lines - Lignes à afficher, dans leur ordre d'ajout.
 * @param density - Densité d'affichage.
 * @param removable - Vrai pour proposer le retrait de chaque ligne.
 * @param showPrices - Vrai pour afficher les prix résolus par le serveur.
 * @param emptyMessage - Message affiché lorsque la liste est vide.
 * @returns La liste rendue, ou le message de liste vide.
 */
function CartLineList({
  lines,
  density = "comfortable",
  removable = true,
  showPrices = false,
  emptyMessage,
}: {
  lines: CartItem[];
  density?: CartLineDensity;
  removable?: boolean;
  showPrices?: boolean;
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
    <ul className="flex flex-col pl-3">
      {lines.map((line) => (
        <CartLineItem
          key={line.sku}
          line={line}
          density={density}
          removable={removable}
          showPrices={showPrices}
        />
      ))}
    </ul>
  );
}

/**
 * Lignes du panier regroupées par oeuvre puis par mouvement.
 *
 * Le titre du mouvement n'est écrit qu'une fois, les pupitres achetés venant
 * dessous. Une oeuvre à mouvement unique n'affiche aucun titre de mouvement.
 *
 * @param lines - Lignes à afficher, dans leur ordre d'ajout.
 * @param density - Densité d'affichage.
 * @param removable - Vrai pour proposer le retrait de chaque ligne.
 * @param showPrices - Vrai pour afficher les prix résolus par le serveur.
 * @param showWorkTitle - Vrai pour titrer aussi chaque oeuvre.
 * @param emptyMessage - Message affiché lorsque le panier est vide.
 * @param pageCart - Vrai si le rendu est pour la page du panier, faux pour les panneaux.
 * @param workCards - Vrai pour afficher les lignes sous forme de cartes d'oeuvre.
 * @returns Les groupes rendus, ou le message de panier vide.
 */
function CartLineGroups({
  lines,
  density = "comfortable",
  removable = true,
  showPrices = false,
  showWorkTitle = false,
  emptyMessage,
  pageCart = false,
  workCards = false,
}: {
  lines: CartItem[];
  density?: CartLineDensity;
  removable?: boolean;
  showPrices?: boolean;
  showWorkTitle?: boolean;
  emptyMessage?: string;
  pageCart?: boolean;
  workCards?: boolean;
}) {
  const t = useTranslations("cart.line");
  const tCard = useTranslations("work.card");
  const tPanel = useTranslations("cart.panel");
  const formatPrice = usePriceFormatter();
  const { resolvedBySku } = useCart();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const baseId = useId();
  const compact = density === "compact";

  if (lines.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t("empty")}
      </p>
    );
  }

  const groups = groupCartLines(lines, resolvedBySku);
  const headingClass = cn(
    "font-medium",
    "pb-1",
    compact ? "text-xs" : "text-sm",
  );

  return (
    <div className="flex flex-col gap-3">
      {groups.map((work) => {
        const workLines = work.groups.flatMap((movement) => movement.lines);
        const resolved = resolvedBySku.get(workLines[0]?.sku ?? "");
        const isCollapsed = collapsed.includes(work.workId);
        const bodyId = `${baseId}-${work.workId}`;
        const total = workCards ? sumWorkLines(workLines, resolvedBySku) : null;

        return (
          <div
            key={work.workId}
            className={cn(
              "flex flex-col",
              pageCart ||
                "rounded-2xl border border-border bg-card/40 p-2 sm:p-3",
            )}
          >
            {workCards ? (
              <button
                type="button"
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                onClick={() =>
                  setCollapsed((current) =>
                    current.includes(work.workId)
                      ? current.filter((id) => id !== work.workId)
                      : [...current, work.workId],
                  )
                }
                className="flex w-full cursor-pointer items-center gap-3 text-left"
              >
                <CartWorkCover src={work.workCoverUrl} small />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">
                    {work.workTitle ?? t("unknownItem")}
                  </span>
                  {resolved?.workComposer ? (
                    <span className="truncate text-xs text-primary">
                      {resolved.workComposer}
                    </span>
                  ) : null}
                  {work.splitByMovement ? (
                    <span className="mt-0.5 w-fit rounded-full border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                      {tCard("movementsCount", {
                        count: resolved?.workMovementCount ?? 0,
                      })}
                    </span>
                  ) : null}
                </span>
                {isCollapsed && total ? (
                  <span className="shrink-0 text-sm font-medium">
                    {formatPrice(total.cents, total.currency)}
                  </span>
                ) : null}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isCollapsed || "rotate-180",
                  )}
                />
              </button>
            ) : null}

            {workCards && !isCollapsed ? (
              <span className="sr-only">
                {tPanel("summaryDescription", { count: workLines.length })}
              </span>
            ) : null}

            {showWorkTitle && !workCards && work.workTitle ? (
              <p className={cn(headingClass, "mb-1")}>{work.workTitle}</p>
            ) : null}

            <div id={bodyId} hidden={workCards && isCollapsed}>
              {work.groups.map((movement, index) => (
                <div
                  key={movement.movementId ?? "work"}
                  className={cn(
                    index > 0 && "mt-2 border-t border-border pt-2",
                    (showWorkTitle || workCards) &&
                      work.splitByMovement &&
                      "pl-3",
                    workCards && index === 0 && "mt-2",
                  )}
                >
                  {work.splitByMovement ? (
                    <p className={headingClass}>
                      {movement.movementTitle ?? t("wholeWork")}
                    </p>
                  ) : null}
                  <CartLineList
                    lines={movement.lines}
                    density={density}
                    removable={removable}
                    showPrices={showPrices}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export {
  CartLineGroups,
  CartLineItem,
  CartLineList,
  CartLinePrice,
  CartWorkCover,
};
export type { CartLineDensity };
