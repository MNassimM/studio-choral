"use client";

import { useFormatter } from "next-intl";

import { toMajorUnits } from "@/domain/pricing/format-price";

/**
 * Rend une fonction de mise en forme monétaire dans la locale courante.
 *
 * @returns La fonction formatant un montant en centimes.
 */
function usePriceFormatter(): (cents: number, currency: string) => string {
  const format = useFormatter();
  return (cents, currency) =>
    format.number(toMajorUnits(cents), { style: "currency", currency });
}

export { usePriceFormatter };
