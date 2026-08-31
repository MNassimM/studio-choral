"use client";

import { useTranslations } from "next-intl";

import { usePriceFormatter } from "@/components/cart/cart-price";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/**
 * Récapitulatif du panier, total et lignes exclues.
 *
 * @param size - Gabarit du récapitulatif.
 * @returns Le récapitulatif rendu.
 */
function CartSummary({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const t = useTranslations("cart.panel");
  const formatPrice = usePriceFormatter();
  const { resolved, isResolving } = useCart();

  const total =
    isResolving || resolved.currency === null
      ? null
      : formatPrice(resolved.totalCents, resolved.currency);

  return (
    <div className="flex flex-col gap-1">
      <div
        className={cn(
          "flex items-baseline justify-between gap-3 font-semibold",
          size === "sm" && "text-sm",
          size === "default" && "text-base",
          size === "lg" && "text-xl sm:text-2xl",
        )}
      >
        <span>{t("totalLabel")}</span>
        <span aria-live="polite">{total ?? t("totalPending")}</span>
      </div>
      {resolved.unavailableCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("unavailableExcluded", { count: resolved.unavailableCount })}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("totalNotice")}</p>
    </div>
  );
}

export { CartSummary };
