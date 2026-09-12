import "server-only";

import { getUserGrants } from "@/lib/catalog/access-grants";
import { prisma } from "@/lib/db/prisma";
import {
  buildLibraryRows,
  summarizeLibrary,
  type LibraryWorkRow,
} from "@/lib/library/library-rows";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Chargement de la bibliothèque d'un utilisateur.
 *
 * @remarks
 * Les pistes ne sont lues que par leur type et leur pupitre : de quoi compter
 * les fichiers et dresser la grille des pupitres, sans transporter le détail
 * de chaque piste. Ce détail n'est chargé qu'au dépliage d'une oeuvre, par
 * loadLibraryDownloads.
 */

/**
 * Rend les oeuvres auxquelles un utilisateur a accès.
 *
 * @param userId - Utilisateur connecté.
 * @param locale - Locale d'interface active.
 * @param getVoiceLabel - Rend le libellé traduit d'un pupitre.
 * @returns Les lignes, de l'accès le plus récent au plus ancien, et le résumé.
 */
export async function findLibraryWorks(
  userId: string,
  locale: AppLocale,
  getVoiceLabel: (code: string) => string,
): Promise<{
  rows: LibraryWorkRow[];
  summary: ReturnType<typeof summarizeLibrary>;
}> {
  const items = await prisma.libraryItem.findMany({
    where: { userId, revokedAt: null },
    select: { workId: true, grantedAt: true, source: true },
  });

  const workIds = [...new Set(items.map((item) => item.workId))];
  if (workIds.length === 0) {
    return { rows: [], summary: { works: 0, movements: 0, files: 0 } };
  }

  const [works, voices, grants] = await Promise.all([
    prisma.work.findMany({
      // Une oeuvre dépubliée disparaît de la bibliothèque : le téléchargement
      // la refuserait de toute façon, mieux vaut ne rien promettre.
      where: { id: { in: workIds }, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        composer: true,
        catalogueRef: true,
        coverImageKey: true,
        period: true,
        voicing: true,
        language: true,
        shortDescription: true,
        description: true,
        translations: {
          where: { locale },
          select: {
            slug: true,
            title: true,
            shortDescription: true,
            description: true,
          },
        },
        movements: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            title: true,
            audioFiles: { select: { type: true, voiceId: true } },
          },
        },
      },
    }),
    prisma.voice.findMany({
      orderBy: { position: "asc" },
      select: { id: true, code: true },
    }),
    getUserGrants(userId),
  ]);

  const rows = buildLibraryRows({
    works: works.map((work) => {
      const resolved = resolveWorkTranslation(work, locale);
      return { ...work, slug: resolved.slug, title: resolved.title };
    }),
    grants,
    items,
    voices,
    getVoiceLabel,
  });

  return { rows, summary: summarizeLibrary(rows) };
}
