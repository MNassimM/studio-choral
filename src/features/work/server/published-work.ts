import "server-only";

import { cache } from "react";

import { resolveWorkTranslation } from "@/features/work/domain/resolve-translation";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/server/db/prisma";

/**
 * Résout un slug d'URL vers une œuvre publiée.
 *
 * @remarks
 * Cherche d'abord une traduction pour la locale courante, puis retombe sur le
 * slug de référence. La clé de stockage des fichiers audio n'est jamais
 * sélectionnée, elle ne peut donc pas fuiter plus loin.
 *
 * L'appel est mémoïsé pour la durée de la requête, les métadonnées et la page
 * partageant ainsi un seul aller retour vers la base.
 *
 * @param slug - Slug demandé dans l'URL.
 * @param locale - Locale d'interface active.
 * @returns L'œuvre et ses relations, ou null si elle est introuvable ou non publiée.
 */
const findPublishedWorkBySlug = cache(
  async (slug: string, locale: AppLocale) => {
    const translation = await prisma.workTranslation.findFirst({
      where: { locale, slug },
      select: { workId: true },
    });

    const work = await prisma.work.findUnique({
      where: translation ? { id: translation.workId } : { slug },
      include: {
        movements: {
          orderBy: { position: "asc" },
          include: {
            audioFiles: {
              select: {
                id: true,
                type: true,
                voiceId: true,
                durationSeconds: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
          },
        },
        products: {
          where: { isActive: true },
          orderBy: { position: "asc" },
          include: {
            movement: { select: { id: true, title: true } },
            voice: { select: { code: true, label: true } },
          },
        },
        translations: true,
      },
    });

    if (!work || !work.isPublished) return null;
    return work;
  },
);

type WorkWithDetail = NonNullable<
  Awaited<ReturnType<typeof findPublishedWorkBySlug>>
>;

/**
 * Titre et textes d'une œuvre dans la locale active.
 *
 * @remarks
 * Partagé par les métadonnées et la page, qui composaient chacune le même
 * appel à resolveWorkTranslation.
 *
 * @param work - Œuvre chargée par findPublishedWorkBySlug.
 * @param locale - Locale d'interface active.
 * @returns Slug, titre, résumé et description résolus.
 */
function resolvePublishedWorkTranslation(
  work: WorkWithDetail,
  locale: AppLocale,
) {
  return resolveWorkTranslation(
    {
      slug: work.slug,
      title: work.title,
      shortDescription: work.shortDescription,
      description: work.description,
      translations: work.translations
        .filter((translation) => translation.locale === locale)
        .map((translation) => ({
          slug: translation.slug,
          title: translation.title,
          shortDescription: translation.shortDescription,
          description: translation.description,
        })),
    },
    locale,
  );
}

export { findPublishedWorkBySlug, resolvePublishedWorkTranslation };
export type { WorkWithDetail };
