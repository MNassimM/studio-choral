import { getTranslations, getFormatter } from "next-intl/server";
import { Music2 } from "lucide-react";

import type { WorkCardData } from "@/lib/catalog/work-card-data";
import { Link } from "@/i18n/navigation";

/**
 * Ligne d'une œuvre dans la vue tableau du catalogue.
 *
 * @param work - Données d'affichage de l'œuvre.
 * @returns La ligne rendue.
 */
async function WorkTableRow({ work }: { work: WorkCardData }) {
  const t = await getTranslations("work.card");
  const format = await getFormatter();

  return (
    <tr className="relative border-b border-border transition-colors last:border-b-0 hover:bg-secondary/40 focus-within:bg-secondary/40">
      <td className="py-3 pr-4 pl-4">
        <div
          className="flex size-12 items-center justify-center rounded-md bg-secondary text-primary"
          aria-hidden="true"
        >
          <Music2 className="size-5" />
        </div>
      </td>
      <td className="py-3 pr-4 font-medium">
        {/* Pour faire un lien étirer sur toute la ligne */}
        <Link
          href={{ pathname: "/works/[slug]", params: { slug: work.slug } }}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          aria-label={`${t("viewWork")} ${work.title}`}
        />
        {work.title}
      </td>
      <td className="py-3 pr-4 text-muted-foreground">{work.composer}</td>
      <td className="py-3 pr-4 text-muted-foreground">{work.voicing ?? "-"}</td>
      <td className="py-3 pr-4 text-muted-foreground">
        {t("movementsCount", { count: work.movementsCount })}
      </td>
      <td className="py-3 pr-4 font-medium">
        {work.fromPriceCents !== null
          ? `${t("fromPrice")} ${format.number(work.fromPriceCents / 100, { style: "currency", currency: work.currency })}`
          : "-"}
      </td>
    </tr>
  );
}

export { WorkTableRow };
