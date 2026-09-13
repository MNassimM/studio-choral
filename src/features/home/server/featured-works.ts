import "server-only";

import { MOST_POPULAR_COUNT } from "@/features/catalog/domain/work-badge";
import {
  buildWorkCardInclude,
  deriveWorkCardData,
  type WorkCardData,
} from "@/features/catalog/server/work-card-view-model";
import { findMostPopularWorks } from "@/features/work/server/work-popularity";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/server/db/prisma";

/**
 * Œuvres mises en avant sur l'accueil.
 */
type FeaturedWorks = {
  works: WorkCardData[];
  /** Œuvres les plus vues, pour le badge. */
  popularIds: ReadonlySet<string>;
};

/**
 * Charge les œuvres mises en avant sur l'accueil.
 *
 * @remarks
 * Les trois œuvres les plus anciennes du catalogue publié, et les plus vues
 * pour savoir lesquelles portent le badge.
 *
 * @param locale - Locale d'interface active.
 * @returns Les cartes à afficher et les œuvres populaires.
 */
async function loadFeaturedWorks(locale: AppLocale): Promise<FeaturedWorks> {
  const works = await prisma.work.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    take: 3,
    include: buildWorkCardInclude(locale),
  });
  const featuredWorks = works.map((work) => deriveWorkCardData(work, locale));
  const popularIds = new Set(
    (await findMostPopularWorks(MOST_POPULAR_COUNT)).map(
      (entree) => entree.workId,
    ),
  );

  return { works: featuredWorks, popularIds };
}

export { loadFeaturedWorks };
export type { FeaturedWorks };
