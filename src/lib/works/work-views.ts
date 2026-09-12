import "server-only";

import { prisma } from "@/lib/db/prisma";
import { startOfUtcDay } from "@/lib/works/view-day";

/**
 * Comptage des vues d'une oeuvre.
 */

/** Une oeuvre et son nombre de vues. */
export type WorkViewCount = { workId: string; views: number };

/**
 * Enregistre une vue sur une oeuvre.
 *
 * @param workId - Oeuvre vue.
 * @param at - Instant de la vue, le présent par défaut.
 */
export async function recordWorkView(
  workId: string,
  at: Date = new Date(),
): Promise<void> {
  const day = startOfUtcDay(at);

  try {
    await prisma.$transaction([
      prisma.workView.upsert({
        where: { workId_day: { workId, day } },
        create: { workId, day, count: 1 },
        update: { count: { increment: 1 } },
      }),
      prisma.work.update({
        where: { id: workId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  } catch (cause) {
    console.error("work-views recordWorkView", cause);
  }
}

/**
 * Rend les oeuvres publiées les plus vues depuis toujours.
 *
 * @param limit - Nombre d'oeuvres voulues.
 * @returns Les identifiants, de la plus vue à la moins vue.
 */
export async function findMostViewedWorks(
  limit: number,
): Promise<WorkViewCount[]> {
  const works = await prisma.work.findMany({
    where: { isPublished: true, viewCount: { gt: 0 } },
    select: { id: true, viewCount: true },
    orderBy: [{ viewCount: "desc" }, { id: "asc" }],
    take: limit,
  });

  return works.map((work) => ({ workId: work.id, views: work.viewCount }));
}

/**
 * Rend les oeuvres publiées les plus vues sur les derniers jours.
 *
 * @param limit - Nombre d'oeuvres voulues.
 * @param days - Profondeur de la fenêtre, en jours.
 * @returns Les identifiants, de la plus vue à la moins vue sur la fenêtre.
 */
export async function findTrendingWorks(
  limit: number,
  days: number,
): Promise<WorkViewCount[]> {
  const since = startOfUtcDay(new Date());
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const groupes = await prisma.workView.groupBy({
    by: ["workId"],
    where: { day: { gte: since }, work: { isPublished: true } },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limit,
  });

  return groupes.map((groupe) => ({
    workId: groupe.workId,
    views: groupe._sum.count ?? 0,
  }));
}
