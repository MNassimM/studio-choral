"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { CartLinePrice } from "@/components/cart/cart-line-list";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { groupCartLines } from "@/lib/cart/cart-grouping";
import { cn } from "@/lib/utils";

/**
 * La liste resserrée du panneau d'ajout.
 *
 * @param highlightSkus - Références à mettre en évidence.
 * @returns La liste rendue.
 */
function CartAddedList({
  highlightSkus,
}: {
  highlightSkus: readonly string[];
}) {
  const t = useTranslations("cart.line");
  const { items, resolvedBySku, labelOf, remove } = useCart();

  const groups = groupCartLines(items, resolvedBySku);
  const enVedette = new Set(highlightSkus);

  return (
    <div className="flex flex-col gap-2.5 pt-3">
      {groups.map((work) => (
        <div
          key={work.workId}
          className="flex flex-col gap-1 border-b border-border pb-2 last:border-b-0"
        >
          <p className="px-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {work.workTitle ?? t("unknownItem")}
          </p>

          <ul className="flex flex-col gap-0.5">
            {work.groups.flatMap((movement) =>
              movement.lines.map((line, index) => {
                const resolved = resolvedBySku.get(line.sku) ?? null;
                const label = labelOf(line.sku) ?? t("unknownItem");
                const vedette = enVedette.has(line.sku);

                return (
                  <li
                    key={line.sku}
                    className={cn(
                      "flex items-center gap-2 rounded-md py-0.5 pr-0.5 pl-1.5",
                      vedette && "bg-primary/30 text-primary",
                    )}
                  >
                    {work.splitByMovement ? (
                      <span className="w-[4.5rem] shrink-0 truncate text-[0.7rem] text-primary">
                        {index === 0
                          ? (movement.movementTitle ?? t("wholeWork"))
                          : ""}
                      </span>
                    ) : null}

                    <span className="min-w-0 flex-1 truncate text-[0.8rem] font-medium">
                      {resolved?.unavailable
                        ? t("unavailableItem")
                        : (resolved?.voiceLabel ?? label)}
                    </span>

                    <CartLinePrice resolved={resolved} compact />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("removeAriaLabel", { item: label })}
                      onClick={() => remove(line.sku)}
                      className="size-6 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                );
              }),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

export { CartAddedList };
