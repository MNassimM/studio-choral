import "server-only";

import { prisma } from "@/server/db/prisma";
import { startOfUtcDay } from "@/features/work/domain/view-day";

/**
 * Comptage des vues, sur une fenêtre glissante.
 */

/** Nombre de jours conservés. Au delà, les lignes sont effacées. */
export const VIEW_RETENTION_DAYS = 30;

/** Une oeuvre et ses vues sur la fenêtre. */
export type WorkViewCount = { workId: string; views: number };

/**
 * Premier jour encore compté.
 *
 * @param now - Instant de référence.
 * @param days - Profondeur de la fenêtre.
 * @returns Minuit UTC du plus ancien jour retenu.
 */
function oldestCountedDay(now: Date, days: number): Date {
  const debut = startOfUtcDay(now);
  debut.setUTCDate(debut.getUTCDate() - (days - 1));
  return debut;
}

/**
 * Efface les jours sortis de la fenêtre.
 *
 * @remarks
 * Opportuniste, faute d'ordonnanceur dans le projet : même principe que la
 * purge des tentatives de connexion.
 *
 * @param now - Instant de référence.
 */
async function purgeExpiredViews(now: Date): Promise<void> {
  try {
    await prisma.workView.deleteMany({
      where: { day: { lt: oldestCountedDay(now, VIEW_RETENTION_DAYS) } },
    });
  } catch (cause) {
    const raison = cause instanceof Error ? cause.message : String(cause);
    console.warn(`[views] Purge des vues échouée : ${raison}`);
  }
}

/**
 * Enregistre une vue sur une oeuvre.
 *
 * @remarks
 * Ne lève jamais : une vue perdue ne doit pas casser une page.
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
    const ligne = await prisma.workView.upsert({
      where: { workId_day: { workId, day } },
      create: { workId, day, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });

    // Un compteur à 1 signale la première vue de cette oeuvre aujourd'hui :
    // le moment idéal pour purger, une fois par oeuvre et par jour au plus.
    if (ligne.count === 1) {
      await purgeExpiredViews(at);
    }
  } catch (cause) {
    console.error("work-views recordWorkView", cause);
  }
}

/**
 * Rend les oeuvres publiées les plus vues sur la fenêtre.
 *
 * @param limit - Nombre d'oeuvres voulues.
 * @param days - Profondeur de la fenêtre, la rétention par défaut.
 * @returns Les identifiants, de la plus vue à la moins vue.
 */
export async function findMostPopularWorks(
  limit: number,
  days: number = VIEW_RETENTION_DAYS,
): Promise<WorkViewCount[]> {
  const groupes = await prisma.workView.groupBy({
    by: ["workId"],
    where: {
      day: { gte: oldestCountedDay(new Date(), days) },
      work: { isPublished: true },
    },
    _sum: { count: true },
    orderBy: { _sum: { count: "desc" } },
    take: limit,
  });

  return groupes.map((groupe) => ({
    workId: groupe.workId,
    views: groupe._sum.count ?? 0,
  }));
}
