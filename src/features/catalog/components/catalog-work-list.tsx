import { getTranslations } from "next-intl/server";

import { WorkCard } from "@/features/catalog/components/work-card";
import { WorkTableRow } from "@/features/catalog/components/work-table-row";
import { resolveWorkBadge } from "@/features/catalog/domain/work-badge";
import type { CatalogView } from "@/features/catalog/domain/view-preference";
import type { WorkCardData } from "@/features/catalog/server/work-card-view-model";

/**
 * Œuvres de la page, en grille ou en tableau.
 *
 * @param works - Œuvres de la page courante.
 * @param view - Vue grille ou tableau.
 * @param popularIds - Œuvres les plus vues, qui portent le badge.
 * @returns La liste rendue, ou le message d'absence de résultat.
 */
async function CatalogWorkList({
  works,
  view,
  popularIds,
}: {
  works: WorkCardData[];
  view: CatalogView;
  popularIds: ReadonlySet<string>;
}) {
  const t = await getTranslations("catalogue");

  const maintenant = new Date();
  const badgeFor = (work: WorkCardData) =>
    resolveWorkBadge({
      mostPopular: popularIds.has(work.workId),
      publishedAt: work.publishedAt,
      now: maintenant,
    });

  if (works.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {t("emptyState")}
      </p>
    );
  }

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {works.map((work) => (
          <WorkCard key={work.slug} work={work} badge={badgeFor(work)} />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-secondary/40 text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th className="py-3 pr-4 pl-4 font-medium">{t("tableVisual")}</th>
            <th className="py-3 pr-4 font-medium">{t("tableTitle")}</th>
            <th className="py-3 pr-4 font-medium">{t("tableComposer")}</th>
            <th className="py-3 pr-4 font-medium">{t("tableVoicing")}</th>
            <th className="py-3 pr-4 font-medium">{t("tableMovements")}</th>
            <th className="py-3 pr-4 font-medium">{t("tablePrice")}</th>
          </tr>
        </thead>
        <tbody>
          {works.map((work) => (
            <WorkTableRow key={work.slug} work={work} badge={badgeFor(work)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { CatalogWorkList };
