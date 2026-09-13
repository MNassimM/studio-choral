import { getTranslations } from "next-intl/server";

import { Container } from "@/shared/components/site/container";
import { WorkCard } from "@/features/catalog/components/work-card";
import { buttonVariants } from "@/shared/components/ui/button";
import { resolveWorkBadge } from "@/features/catalog/domain/work-badge";
import type { WorkCardData } from "@/features/catalog/server/work-card-view-model";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Grille des œuvres mises en avant.
 *
 * @param works - Œuvres à présenter.
 * @param popularIds - Œuvres les plus vues, qui portent le badge.
 * @returns La section rendue, ou null si aucune œuvre n'est publiée.
 */
async function FeaturedWorksSection({
  works,
  popularIds,
}: {
  works: WorkCardData[];
  popularIds: ReadonlySet<string>;
}) {
  if (works.length === 0) {
    return null;
  }

  const t = await getTranslations("home");
  const maintenant = new Date();

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-12 pb-20 sm:pb-28">
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => (
            <WorkCard
              key={work.slug}
              work={work}
              variant="compact"
              badge={resolveWorkBadge({
                mostPopular: popularIds.has(work.workId),
                publishedAt: work.publishedAt,
                now: maintenant,
              })}
            />
          ))}
        </div>
        <Link
          href="/catalogue"
          className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
        >
          {t("viewFullCatalogue")}
        </Link>
      </Container>
    </section>
  );
}

export { FeaturedWorksSection };
