"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/**
 * Nombre au delà duquel le compteur est abrégé.
 */
const MAX_DISPLAYED_COUNT = 99;

/**
 * Pastille indiquant le nombre d'articles du panier.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns La pastille rendue, ou rien.
 */
function CartCountBadge({ className }: { className?: string }) {
  const { count, isHydrated } = useCart();

  if (!isHydrated || count === 0) return null;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums",
        className,
      )}
    >
      {count > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : count}
    </span>
  );
}

/**
 * Compose le libellé accessible du lien menant au panier.
 *
 * @returns Le libellé annonçant le panier et son nombre d'articles.
 */
function useCartLinkLabel(): string {
  const t = useTranslations("navigation.header");
  const { count, isHydrated } = useCart();

  if (!isHydrated || count === 0) {
    return t("cartAriaLabel");
  }
  return t("cartWithCountAriaLabel", { count });
}

export { CartCountBadge, useCartLinkLabel };
