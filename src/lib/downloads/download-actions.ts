"use server";

import { canDownload, resolveWorkAccess } from "@/lib/access/rules";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getUserGrants } from "@/lib/catalog/access-grants";
import { buildWorkAccessInput } from "@/lib/catalog/work-access-input";
import { prisma } from "@/lib/db/prisma";
import {
  buildDownloadFilename,
  extensionOf,
  storage,
} from "@/lib/storage/storage";

/**
 * Délivrance des URL de téléchargement aux acheteurs.
 */

/** Motif d'un refus, clos et sans détail. */
export type DownloadRefusal =
  "unauthenticated" | "notFound" | "forbidden" | "unavailable";

/**
 * Ce que rend une demande de téléchargement.
 *
 * @remarks
 * L'échec porte un motif et non un message : l'appelant décide quoi en faire
 * - la connexion redirige, un refus s'affiche - et surtout aucune erreur du
 * SDK ne remonte au navigateur, celles-ci recopiant l'URL signée.
 */
export type DownloadTicket =
  | { ok: true; url: string; filename: string; expiresAt: Date }
  | { ok: false; reason: DownloadRefusal };

/**
 * Signe le téléchargement d'une piste, si l'utilisateur y a droit.
 *
 * @param audioFileId - Identifiant de la piste demandée.
 * @returns L'URL signée, ou le motif du refus.
 */
export async function requestTrackDownload(
  audioFileId: string,
): Promise<DownloadTicket> {
  // Une action serveur est un point d'entrée public : le type déclaré n'est
  // qu'une promesse du client. Sans ce garde, une valeur non textuelle ferait
  // lever Prisma, et l'exception remonterait au lieu d'un refus propre.
  if (
    typeof audioFileId !== "string" ||
    audioFileId.length === 0 ||
    audioFileId.length > 64
  ) {
    return { ok: false, reason: "notFound" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const track = await prisma.audioFile.findUnique({
    where: { id: audioFileId },
    select: {
      type: true,
      storageKey: true,
      originalFilename: true,
      voice: { select: { code: true } },
      movement: {
        select: {
          id: true,
          title: true,
          work: {
            select: {
              id: true,
              title: true,
              isPublished: true,
              movements: {
                select: { id: true, audioFiles: { select: { voiceId: true } } },
              },
            },
          },
        },
      },
    },
  });

  // Une œuvre dépubliée se comporte comme une piste absente : répondre
  // « interdit » confirmerait son existence à qui essaie des identifiants.
  if (!track || !track.movement.work.isPublished) {
    return { ok: false, reason: "notFound" };
  }

  const work = track.movement.work;
  const voices = await prisma.voice.findMany({
    select: { id: true, code: true },
  });

  // Les droits sont relus à chaque demande, jamais repris de la page : celle-ci
  // a pu être rendue avant une révocation.
  const access = resolveWorkAccess(
    buildWorkAccessInput(
      work.id,
      work.movements,
      new Map(voices.map((voice) => [voice.id, voice.code])),
    ),
    await getUserGrants(user.id),
  );

  const autorise = canDownload(access, {
    movementId: track.movement.id,
    type: track.type,
    voiceCode: track.voice?.code ?? null,
  });
  if (!autorise) return { ok: false, reason: "forbidden" };

  // L'extension vient de la clé de stockage : c'est l'objet réellement déposé,
  // là où originalFilename n'est qu'un souvenir du nom d'origine.
  const extension =
    extensionOf(track.storageKey) ?? extensionOf(track.originalFilename ?? "");
  if (extension === null) {
    console.error("download-actions extension inconnue", track.storageKey);
    return { ok: false, reason: "unavailable" };
  }

  const filename = buildDownloadFilename(
    work.title,
    track.movement.title,
    track.voice?.code ?? null,
    extension,
  );

  const signed = await storage.signDownload({
    key: track.storageKey,
    downloadAs: filename,
  });
  if (!signed.ok) {
    // Le message du SDK peut recopier l'URL signée, on ne le relaie pas.
    console.error("download-actions signDownload", signed.error);
    return { ok: false, reason: "unavailable" };
  }

  return { ok: true, url: signed.url, filename, expiresAt: signed.expiresAt };
}
