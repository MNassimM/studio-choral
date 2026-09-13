import { getTranslations } from "next-intl/server";

import type { WorkBadge } from "@/features/catalog/domain/work-badge";
import { cn } from "@/shared/utils/cn";

/**
 * L'étiquette d'un badge d'oeuvre.
 */

const CLES: Record<WorkBadge, "badgeMostPopular" | "badgeNew"> = {
  MOST_POPULAR: "badgeMostPopular",
  NEW: "badgeNew",
};

/**
 * Rend le badge d'une oeuvre.
 *
 * @param badge - Badge à afficher.
 * @param withRule - Pose le trait qui précède le libellé.
 * @param className - Classes supplémentaires.
 * @returns L'étiquette rendue.
 */
export async function WorkBadgeLabel({
  badge,
  withRule = true,
  className,
}: {
  badge: WorkBadge;
  withRule?: boolean;
  className?: string;
}) {
  const t = await getTranslations("work.card");

  return (
    <span
      className={cn(
        "flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase",
        className,
      )}
    >
      {withRule ? (
        <span aria-hidden="true" className="h-px w-4 shrink-0 bg-primary" />
      ) : null}
      {t(CLES[badge])}
    </span>
  );
}
