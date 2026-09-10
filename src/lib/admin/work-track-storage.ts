import type { WorkFormValues } from "@/lib/admin/work-form-schema";
import {
  buildPendingKey,
  buildTrackKey,
  extensionOf,
  storage,
} from "@/lib/storage/storage";
import { prisma } from "@/lib/db/prisma";

/**
 * Les échanges avec le stockage, au service des actions d'oeuvre.
 */

/** Ce qu'a donné le rangement d'un lot de pistes. */
export type StoreOutcome = { stored: number; failed: string[] };

/**
 * Range les pistes fraîchement déposées, après le commit de l'oeuvre.
 *
 * @remarks
 * Hors transaction volontairement : déplacer quatre-vingts objets dépasserait
 * de loin le délai de cinq secondes d'une transaction interactive. La clé
 * source se reconstruit ici, jamais reçue du client, et la clé définitive
 * étant déterministe, un objet resté en rade sera écrasé au prochain
 * enregistrement de la même case.
 *
 * @param workId - Oeuvre concernée.
 * @param tracks - Les cases du brouillon.
 * @param movementIdByKey - Correspondance entre clé de mouvement et id.
 * @param voiceIdByCode - Correspondance entre code de pupitre et id.
 * @returns Le nombre de pistes rangées et celles qui ont échoué.
 */
export async function storePendingTracks(
  workId: string,
  tracks: WorkFormValues["tracks"],
  movementIdByKey: Map<string, string>,
  voiceIdByCode: Map<string, string>,
): Promise<StoreOutcome> {
  const attente = tracks.filter((track) => track.state.kind === "pending");
  const failed: string[] = [];
  let stored = 0;

  for (const track of attente) {
    if (track.state.kind !== "pending") continue;
    const movementId = movementIdByKey.get(track.movementKey);
    // undefined et non null : il faut distinguer « cette piste n'a pas de
    // pupitre », qui est normal pour un tutti, de « son pupitre n'est plus
    // retenu ». Retomber sur null écrirait une piste commune dont la clé de
    // stockage porterait pourtant un code de pupitre.
    const voiceId = track.voiceCode ? voiceIdByCode.get(track.voiceCode) : null;
    const extension = extensionOf(track.state.filename);

    if (!movementId || voiceId === undefined || extension === null) {
      failed.push(track.state.filename);
      continue;
    }

    const source = buildPendingKey(track.state.uploadId, track.state.filename);
    const cible = buildTrackKey({
      workId,
      movementId,
      type: track.type,
      voiceCode: track.voiceCode,
      extension,
    });

    const deplace = await storage.moveObject(source, cible);
    if (!deplace.ok) {
      console.error("work-track-storage moveObject", deplace.error);
      failed.push(track.state.filename);
      continue;
    }

    // Prisma refuse un nul dans une clé unique composée, et voiceId l'est
    // pour un tutti. On retrouve donc la case par ses coordonnées.
    const existante = await prisma.audioFile.findFirst({
      where: { movementId, voiceId, type: track.type },
      select: { id: true },
    });

    const valeurs = {
      storageKey: cible,
      // La clé définitive ne porte que le pupitre, on garde donc le nom
      // d'origine pour pouvoir le réafficher dans la matrice.
      originalFilename: track.state.filename,
      durationSeconds: track.state.durationSeconds,
      mimeType: track.state.mimeType,
      sizeBytes: track.state.sizeBytes,
    };

    if (existante) {
      await prisma.audioFile.update({
        where: { id: existante.id },
        data: valeurs,
      });
    } else {
      await prisma.audioFile.create({
        data: { movementId, voiceId, type: track.type, ...valeurs },
      });
    }
    stored += 1;
  }

  return { stored, failed };
}

/**
 * Efface des objets du stockage, une fois la base commitée.
 *
 * @remarks
 * Appelée APRÈS la transaction, jamais pendant : effacer pendant reviendrait,
 * sur un retour arrière, à détruire des fichiers dont la ligne survit. Un
 * objet resté en trop se rattrape, un fichier détruit à tort non.
 *
 * @param keys - Clés relevées tant que les lignes existaient encore.
 * @returns Le nombre d'objets restés en place malgré la demande.
 */
export async function deleteStoredObjects(
  keys: readonly string[],
): Promise<number> {
  let restes = 0;

  for (const key of keys) {
    const efface = await storage.deleteObject(key);
    if (!efface.ok) {
      // Un échec ne rattrape rien : la ligne est partie, l'objet reste
      // orphelin. On le compte pour le dire à l'administrateur.
      console.error("work-track-storage deleteObject", efface.error);
      restes += 1;
    }
  }

  return restes;
}
