"use server";

import { getTranslations } from "next-intl/server";

import { resolveWorkAccess } from "@/domain/access/work-access";
import { getCurrentUser } from "@/features/auth/server/current-user";
import { getUserGrants } from "@/features/catalog/server/access-grants";
import { buildWorkAccessInput } from "@/features/catalog/server/work-access-input";
import { prisma } from "@/server/db/prisma";
import {
  formatAudioFormatLabel,
  formatFileSize,
} from "@/shared/utils/file-size";
import {
  buildDownloadGroups,
  toDownloadRow,
  type DownloadRowView,
} from "@/features/work/domain/download-groups";
import { isKnownVoiceCode } from "@/features/work/domain/voice-label";

/**
 * Chargement à la demande des fichiers d'une oeuvre de la bibliothèque.
 *
 * @remarks
 * C'est ce qui rend le repliement utile : une oeuvre repliée n'est pas
 * seulement masquée, ses pistes ne sont ni lues en base ni envoyées au
 * navigateur. Sans ça, replier n'allègerait que l'affichage.
 */

/** Les fichiers d'un mouvement, prêts à rendre. */
export type LibraryMovementFiles = {
  movementId: string;
  movementTitle: string;
  rows: DownloadRowView[];
};

/** Ce que rend une demande de fichiers. */
export type LibraryDownloadsResult =
  | { ok: true; movements: LibraryMovementFiles[] }
  | { ok: false; reason: "unauthenticated" | "notFound" };

/**
 * Rend les fichiers qu'un utilisateur peut télécharger sur une oeuvre.
 *
 * @param workId - Oeuvre demandée.
 * @returns Les fichiers possédés, mouvement par mouvement.
 */
export async function loadLibraryDownloads(
  workId: string,
): Promise<LibraryDownloadsResult> {
  // Une action serveur est un point d'entrée public : le type déclaré n'est
  // qu'une promesse du client.
  if (typeof workId !== "string" || workId.length === 0 || workId.length > 64) {
    return { ok: false, reason: "notFound" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      isPublished: true,
      movements: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          audioFiles: {
            select: {
              id: true,
              type: true,
              voiceId: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
        },
      },
    },
  });
  if (!work || !work.isPublished) return { ok: false, reason: "notFound" };

  const [voices, grants, t, tWork] = await Promise.all([
    prisma.voice.findMany({
      orderBy: { position: "asc" },
      select: { id: true, code: true },
    }),
    getUserGrants(user.id),
    getTranslations("work.workPage"),
    getTranslations("work"),
  ]);

  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  const getVoiceLabel = (code: string) =>
    isKnownVoiceCode(code) ? tWork(`voice.${code}`) : code;

  // Les droits sont relus ici, jamais repris de la page : elle a pu être
  // rendue avant une révocation.
  const access = resolveWorkAccess(
    buildWorkAccessInput(work.id, work.movements, voiceCodeById),
    grants,
  );

  const groups = buildDownloadGroups({
    access,
    movements: work.movements,
    voiceCodeById,
    voiceLabelByCode: new Map(
      voices.map((voice) => [voice.code, getVoiceLabel(voice.code)]),
    ),
    voiceOrderByCode: new Map(
      voices.map((voice, index) => [voice.code, index]),
    ),
  });

  const movements = groups
    .map((group) => ({
      movementId: group.movementId,
      movementTitle: group.movementTitle,
      // La bibliothèque ne montre que le possédé : proposer un cadenas ici
      // reviendrait à remettre la boutique dans les affaires de l'acheteur.
      // Pas de préfixe de mouvement ici, contrairement à la page oeuvre : la
      // bibliothèque range déjà chaque groupe sous le titre du mouvement, le
      // préfixe ne ferait que le répéter à chaque ligne.
      rows: group.entries
        .filter((entry) => entry.owned)
        .map((entry) =>
          toDownloadRow(entry, {
            audioTypeLabel: (type) => t(`audioType.${type}`),
            formatSize: (bytes) => formatFileSize(bytes, t),
            formatLabel: formatAudioFormatLabel,
          }),
        ),
    }))
    .filter((movement) => movement.rows.length > 0);

  return { ok: true, movements };
}
