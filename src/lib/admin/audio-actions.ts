"use server";

import { requireAdmin } from "@/lib/admin/authorization";
import {
  newUploadId,
  validateUpload,
  type UploadCandidate,
} from "@/lib/admin/audio-upload";
import { syncProductActivation } from "@/lib/admin/product-activation";
import { prisma } from "@/lib/db/prisma";
import {
  buildDownloadFilename,
  buildPendingKey,
  storage,
} from "@/lib/storage/storage";

/**
 * Actions de téléversement audio, le pont entre le navigateur et lib/storage.
 */

/** Ce que renvoie une demande d'URL d'écriture. */
export type UploadTicketResult =
  | {
      ok: true;
      /** À conserver dans le brouillon, il recompose la clé au moment voulu. */
      uploadId: string;
      url: string;
      expiresAt: Date;
    }
  | { ok: false; error: string };

/** Ce que renvoie une demande d'URL de lecture. */
export type PlaybackResult =
  { ok: true; url: string; expiresAt: Date } | { ok: false; error: string };

/** Ce que renvoie le retrait d'une piste. */
export type RemoveTrackResult =
  { ok: true; objectDeleted: boolean } | { ok: false; error: string };

/**
 * Signe un téléversement vers le préfixe pending.
 *
 * @param candidate - Nom, type, taille et durée annoncés par le navigateur.
 * @returns L'identifiant du téléversement et l'URL où envoyer le fichier.
 */
export async function requestAudioUpload(
  candidate: UploadCandidate,
): Promise<UploadTicketResult> {
  await requireAdmin();

  const verdict = validateUpload(candidate);
  if (!verdict.ok) return { ok: false, error: verdict.error };

  const uploadId = newUploadId();
  const key = buildPendingKey(uploadId, candidate.filename);

  const signed = await storage.signUpload({
    key,
    contentType: candidate.contentType,
    contentLength: candidate.sizeBytes,
  });

  if (!signed.ok) {
    // Le message du SDK peut recopier l'URL signée, on ne le relaie pas.
    console.error("audio-actions signUpload", signed.error);
    return { ok: false, error: "Le téléversement n'a pas pu être préparé." };
  }

  return {
    ok: true,
    uploadId,
    url: signed.url,
    expiresAt: signed.expiresAt,
  };
}

/**
 * Signe la lecture d'une piste déjà enregistrée.
 *
 * @param audioFileId - Identifiant de la piste à écouter.
 * @param asDownload - Vrai pour forcer un téléchargement plutôt qu'une écoute.
 * @returns L'URL de lecture.
 */
export async function requestAudioPlayback(
  audioFileId: string,
  asDownload = false,
): Promise<PlaybackResult> {
  await requireAdmin();

  const piste = await prisma.audioFile.findUnique({
    where: { id: audioFileId },
    select: {
      storageKey: true,
      type: true,
      voice: { select: { label: true } },
      movement: {
        select: { title: true, work: { select: { title: true } } },
      },
    },
  });

  if (!piste) return { ok: false, error: "Piste introuvable." };

  const extension = piste.storageKey.split(".").pop() ?? "wav";
  const downloadAs = asDownload
    ? buildDownloadFilename(
        piste.movement.work.title,
        piste.movement.title,
        piste.voice?.label ?? null,
        extension,
      )
    : undefined;

  const signed = await storage.signDownload({
    key: piste.storageKey,
    ...(downloadAs ? { downloadAs } : {}),
  });

  if (!signed.ok) {
    console.error("audio-actions signDownload", signed.error);
    return { ok: false, error: "La lecture n'a pas pu être préparée." };
  }

  return { ok: true, url: signed.url, expiresAt: signed.expiresAt };
}

/**
 * Retire une piste, ligne et objet.
 *
 * @param audioFileId - Identifiant de la piste à retirer.
 * @returns Le résultat, avec la trace d'un objet resté en place.
 */
export async function removeAudioTrack(
  audioFileId: string,
): Promise<RemoveTrackResult> {
  await requireAdmin();

  const piste = await prisma.audioFile.findUnique({
    where: { id: audioFileId },
    select: { storageKey: true, movement: { select: { workId: true } } },
  });

  if (!piste) return { ok: false, error: "Piste introuvable." };

  await prisma.audioFile.delete({ where: { id: audioFileId } });

  // Une piste en moins peut rendre des offres invendables, on réaligne.
  await syncProductActivation(piste.movement.workId);

  const efface = await storage.deleteObject(piste.storageKey);
  if (!efface.ok) {
    console.error("audio-actions deleteObject", efface.error);
  }

  return { ok: true, objectDeleted: efface.ok };
}
