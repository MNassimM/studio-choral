import "server-only";

import {
  isProductCovered,
  productCoverageGap,
  type CoverageContext,
  type TrackCell,
} from "@/lib/admin/track-coverage";
import { prisma } from "@/lib/db/prisma";

/**
 * Aligne l'activation des offres sur les pistes réellement présentes.
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
 * Recalcule isActive pour toutes les offres d'une oeuvre.
 *
 * @param workId - Oeuvre à recalculer.
 * @returns Le décompte des changements.
 */
export async function syncProductActivation(
  workId: string,
): Promise<ActivationOutcome> {
  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      hasAccompaniment: true,
      movements: {
        select: {
          id: true,
          audioFiles: { select: { voiceId: true, type: true } },
        },
      },
      // Les offres retirées sortent de tous les calculs : leur pupitre n'est
      // plus vendu, exiger ses pistes bloquerait l'oeuvre entière.
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

  if (!work) return { activated: 0, deactivated: 0, inactive: 0, total: 0 };

  const cells: TrackCell[] = work.movements.flatMap((movement) =>
    movement.audioFiles.map((piste) => ({
      movementId: movement.id,
      voiceId: piste.voiceId,
      type: piste.type,
    })),
  );

  // Les pupitres du contexte sont ceux que les offres NON RETIREES désignent.
  // Y laisser un pupitre retiré ferait exiger ses pistes à l'offre toutes
  // voix, qui ne redeviendrait alors jamais vendable.
  const voiceIds = [
    ...new Set(
      work.products
        .map((product) => product.voiceId)
        .filter((id): id is string => id !== null),
    ),
  ];

  const context: CoverageContext = {
    movementIds: work.movements.map((movement) => movement.id),
    voiceIds,
    hasAccompaniment: work.hasAccompaniment,
  };

  const aActiver: string[] = [];
  const aDesactiver: string[] = [];

  for (const product of work.products) {
    const couvert = isProductCovered(
      { movementId: product.movementId, voiceId: product.voiceId },
      context,
      cells,
    );
    if (couvert && !product.isActive) aActiver.push(product.id);
    if (!couvert && product.isActive) aDesactiver.push(product.id);
  }

  if (aActiver.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: aActiver } },
      data: { isActive: true },
    });
  }
  if (aDesactiver.length > 0) {
    await prisma.product.updateMany({
      where: { id: { in: aDesactiver } },
      data: { isActive: false },
    });
  }

  const inactive = work.products.filter(
    (product) =>
      !isProductCovered(
        { movementId: product.movementId, voiceId: product.voiceId },
        context,
        cells,
      ),
  ).length;

  return {
    activated: aActiver.length,
    deactivated: aDesactiver.length,
    inactive,
    total: work.products.length,
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
): Promise<{ incompleteProducts: number; missingCells: number }> {
  const work = await prisma.work.findUnique({
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
        select: { movementId: true, voiceId: true },
      },
    },
  });

  if (!work) return { incompleteProducts: 0, missingCells: 0 };

  const cells: TrackCell[] = work.movements.flatMap((movement) =>
    movement.audioFiles.map((piste) => ({
      movementId: movement.id,
      voiceId: piste.voiceId,
      type: piste.type,
    })),
  );
  const context: CoverageContext = {
    movementIds: work.movements.map((movement) => movement.id),
    voiceIds: [
      ...new Set(
        work.products
          .map((product) => product.voiceId)
          .filter((id): id is string => id !== null),
      ),
    ],
    hasAccompaniment: work.hasAccompaniment,
  };

  let incompleteProducts = 0;
  let missingCells = 0;
  for (const product of work.products) {
    const ecart = productCoverageGap(product, context, cells);
    if (ecart.missing > 0) {
      incompleteProducts += 1;
      missingCells = Math.max(missingCells, ecart.missing);
    }
  }

  return { incompleteProducts, missingCells };
}
