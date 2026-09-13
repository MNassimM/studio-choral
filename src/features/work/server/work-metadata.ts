import "server-only";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  resolvePublishedWorkTranslation,
  type WorkWithDetail,
} from "@/features/work/server/published-work";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { coverUrl } from "@/server/storage/cover-url";

/**
 * Construit les métadonnées de la page œuvre.
 *
 * @remarks
 * Les liens alternatifs utilisent le slug traduit de chaque locale. La
 * description reprend le résumé de l'œuvre, ou un texte de repli composé à
 * partir du titre et du compositeur.
 *
 * @param work - Œuvre publiée, déjà résolue depuis le slug.
 * @param locale - Locale d'interface active.
 * @returns Les métadonnées de la page.
 */
async function buildWorkMetadata(
  work: WorkWithDetail,
  locale: AppLocale,
): Promise<Metadata> {
  const resolved = resolvePublishedWorkTranslation(work, locale);

  const t = await getTranslations("work.workPage");

  const languages = Object.fromEntries(
    routing.locales.map((targetLocale) => {
      const localizedSlug =
        targetLocale === routing.defaultLocale
          ? work.slug
          : (work.translations.find((tr) => tr.locale === targetLocale)?.slug ??
            work.slug);
      return [
        targetLocale,
        getPathname({
          href: { pathname: "/works/[slug]", params: { slug: localizedSlug } },
          locale: targetLocale,
        }),
      ];
    }),
  );

  return {
    title: t("metaTitleTemplate", { title: resolved.title }),
    description:
      resolved.shortDescription ??
      t("metaDescriptionFallback", {
        title: resolved.title,
        composer: work.composer,
      }),
    alternates: {
      canonical: languages[locale],
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
    // L'aperçu de partage n'est posé que si une pochette existe : une URL
    // vers un objet absent vaut moins qu'une absence d'aperçu.
    ...(work.coverImageKey
      ? { openGraph: { images: [coverUrl(work.coverImageKey)] } }
      : {}),
  };
}

export { buildWorkMetadata };
