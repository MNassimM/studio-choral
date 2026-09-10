import "server-only";

import {
  computeActivationPlan,
  computeMissingTracks,
  type ActivationPlan,
  type MissingTracks,
} from "@/lib/admin/activation-plan";
import { prisma } from "@/lib/db/prisma";

/**
 * Aligne l'activation des offres sur les pistes réellement présentes.
 *
 * @remarks
 * Ce module lit, appelle le calcul, puis écrit. La règle elle même vit dans
 * activation-plan, en fonctions pures, où elle est testée sans base.
 */

/** Ce que le calcul a changé. */
export type ActivationOutcome = {
  activated: number;
  deactivated: number;
  /** Offres restées inactives faute de pistes. */
  inactive: number;
  total: number;
};

/**
 * Lit l'état d'une oeuvre sous la forme qu'attend le calcul.
 *
 * @remarks
 * Les offres retirées sont écartées ici, une fois pour toutes : leur pupitre
 * n'est plus vendu, exiger ses pistes bloquerait l'oeuvre entière.
 *
 * @param workId - Oeuvre à lire.
 * @returns L'état, ou null si l'oeuvre n'existe pas.
 */
async function readActivationState(workId: string) {
  return prisma.work.findUnique({
    where: { id: workId },
    select: {
      hasAccompaniment: true,
      movements: {
        select: {
          id: true,
          audioFiles: { select: { voiceId: true, type: true } },
        },
      },
      products: {
        where: { isRetired: false },
        select: {
          id: true,
          movementId: true,
          voiceId: true,
          isActive: true,
        },
      },
    },
  });
}

/**
 * Recalcule isActive pour toutes les offres d'une oeuvre.
 *
 * @param workId - Oeuvre à recalculer.
 * @returns Le décompte des changements.
 */
export async function syncProductActivation(
  workId: string,
): Promise<ActivationOutcome> {
  const work = await readActivationState(workId);
  if (!work) return { activated: 0, deactivated: 0, inactive: 0, total: 0 };

  const plan: ActivationPlan = computeActivationPlan(work);

  if (plan.activate.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: plan.activate } },
      data: { isActive: true },
    });
  }
  if (plan.deactivate.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: plan.deactivate } },
      data: { isActive: false },
    });
  }

  return {
    activated: plan.activate.length,
    deactivated: plan.deactivate.length,
    inactive: plan.inactive,
    total: plan.total,
  };
}

/**
 * Dépublie une oeuvre devenue incomplète, au moment d'un enregistrement.
 *
 * @param workId - Oeuvre à examiner.
 * @returns Vrai si l'oeuvre vient d'être dépubliée.
 */
export async function unpublishIfIncomplete(workId: string): Promise<boolean> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { isPublished: true },
  });
  if (!work?.isPublished) return false;

  const manquantes = await summarizeMissingTracks(workId);
  const actives = await prisma.product.count({
    where: { workId, isActive: true, isRetired: false },
  });
  if (manquantes.incompleteProducts === 0 && actives > 0) return false;

  await prisma.work.update({
    where: { id: workId },
    data: { isPublished: false },
  });
  return true;
}

/**
 * Résume ce qui manque à une oeuvre, pour le message de publication.
 *
 * @param workId - Oeuvre à examiner.
 * @returns Le nombre d'offres incomplètes et de cases manquantes.
 */
export async function summarizeMissingTracks(
  workId: string,
): Promise<MissingTracks> {
  const work = await readActivationState(workId);
  if (!work) return { incompleteProducts: 0, missingCells: 0 };

  return computeMissingTracks(work);
}
