"use client";

import { useTranslations } from "next-intl";

import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

/**
 * Compteur d'articles affiché en fin de ligne, pour le menu mobile.
 *
 * @param className - Classes supplémentaires, fusionnées avec celles par défaut.
 * @returns Le compteur rendu, ou rien.
 */
function CartCountPill({ className }: { className?: string }) {
  const t = useTranslations("navigation.header");
  const { count, isHydrated } = useCart();

  if (!isHydrated || count === 0) return null;

  return (
    <span
      className={cn(
        "flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums",
        className,
      )}
    >
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{t("cartCountLabel", { count })}</span>
    </span>
  );
}

export { CartCountPill };
