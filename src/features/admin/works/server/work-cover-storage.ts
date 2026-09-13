import type { WorkFormValues } from "@/features/admin/works/form/work-form-schema";
import { prisma } from "@/server/db/prisma";
import {
  buildCoverKey,
  buildPendingKey,
  coverExtensionOf,
  coverStorage,
} from "@/server/storage/storage";

/**
 * Le rangement de l'image de couverture, au service des actions d'oeuvre.
 *
 * @remarks
 * Jumeau de work-track-storage.ts, mais sur le bucket PUBLIC. Comme pour les
 * pistes, tout se passe APRÈS le commit : un retour arrière ne doit jamais
 * pouvoir détruire un fichier dont la ligne survit.
 */

/** Ce qu'a donné le rangement d'une couverture. */
export type CoverOutcome = {
  /** Vrai quand la colonne coverImageKey a changé. */
  updated: boolean;
  /** Nom du fichier qui n'a pas pu être rangé, le cas échéant. */
  failed: string | null;
  /** Vrai quand l'ancienne image est restée sur le stockage. */
  leftBehind: boolean;
};

const RIEN: CoverOutcome = { updated: false, failed: null, leftBehind: false };

/**
 * Efface une image du bucket public, sans jamais lever.
 *
 * @param key - Clé de l'image à effacer.
 * @returns Vrai quand l'objet est resté en place malgré la demande.
 */
async function removeObject(key: string): Promise<boolean> {
  const efface = await coverStorage.deleteObject(key);
  if (!efface.ok) {
    console.error("work-cover-storage deleteObject", efface.error);
    return true;
  }
  return false;
}

/**
 * Range la couverture fraîchement déposée, après le commit de l'oeuvre.
 *
 * @remarks
 * La clé précédente est relue en base plutôt que reçue en paramètre : la
 * transaction d'enregistrement ne touche pas cette colonne, sa valeur après
 * commit est donc encore l'ancienne.
 *
 * L'état « stored » est traité comme un non-événement, et la clé qu'il porte
 * est **délibérément ignorée** : elle vient du navigateur, et la seule clé qui
 * fait foi est celle de la base.
 *
 * @param workId - Oeuvre concernée.
 * @param cover - L'état de l'image dans le brouillon soumis.
 * @returns Ce qui a changé, et ce qui a échoué.
 */
export async function storePendingCover(
  workId: string,
  cover: WorkFormValues["cover"],
): Promise<CoverOutcome> {
  if (cover.kind === "stored") return RIEN;

  const existante = await prisma.work.findUnique({
    where: { id: workId },
    select: { coverImageKey: true },
  });
  const precedente = existante?.coverImageKey ?? null;

  // L'administrateur a retiré l'image.
  if (cover.kind === "none") {
    if (precedente === null) return RIEN;
    await prisma.work.update({
      where: { id: workId },
      data: { coverImageKey: null },
    });
    return {
      updated: true,
      failed: null,
      leftBehind: await removeObject(precedente),
    };
  }

  const extension = coverExtensionOf(cover.filename);
  if (extension === null) {
    return { updated: false, failed: cover.filename, leftBehind: false };
  }

  // La version rend l'URL immuable : une nouvelle image, une nouvelle adresse.
  const cible = buildCoverKey({
    workId,
    version: cover.uploadId,
    extension,
  });
  const source = buildPendingKey(cover.uploadId, cover.filename);

  const deplace = await coverStorage.moveObject(source, cible);
  if (!deplace.ok) {
    console.error("work-cover-storage moveObject", deplace.error);
    return { updated: false, failed: cover.filename, leftBehind: false };
  }

  await prisma.work.update({
    where: { id: workId },
    data: { coverImageKey: cible },
  });

  const leftBehind =
    precedente !== null && precedente !== cible
      ? await removeObject(precedente)
      : false;

  return { updated: true, failed: null, leftBehind };
}

/**
 * Efface la couverture d'une oeuvre supprimée.
 *
 * @param key - Clé relevée tant que la ligne existait encore, ou null.
 * @returns Vrai quand l'objet est resté en place.
 */
export async function deleteCoverObject(key: string | null): Promise<boolean> {
  if (key === null) return false;
  return removeObject(key);
}
