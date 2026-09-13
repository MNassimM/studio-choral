import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { after } from "next/server";

import { WorkDetailsPage } from "@/features/work/components/work-details-page";
import { findPublishedWorkBySlug } from "@/features/work/server/published-work";
import {
  buildWorkDetailsData,
  loadWorkViewer,
} from "@/features/work/server/work-details-data";
import { buildWorkMetadata } from "@/features/work/server/work-metadata";
import { recordWorkView } from "@/features/work/server/work-popularity";
import { SyncDynamicRouteAlternates } from "@/shared/i18n/route-alternates-context";
import { routing, type AppLocale } from "@/i18n/routing";

// Page centrale du produit : son contenu dépend de l'utilisateur courant
// (droits résolus à chaque requête). Jamais de rendu statique ni d'ISR ici.
export const dynamic = "force-dynamic";

/**
 * Construit les métadonnées de la page œuvre.
 *
 * @param props - Paramètres de route, dont le slug demandé.
 * @returns Les métadonnées, ou un objet vide si l'œuvre est introuvable.
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/works/[slug]">,
): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const { slug } = await props.params;

  const work = await findPublishedWorkBySlug(slug, locale);
  if (!work) return {};

  return buildWorkMetadata(work, locale);
}

/**
 * Page d'une œuvre.
 *
 * @remarks
 * Résout l'œuvre depuis son slug, charge le visiteur et ses droits, compte la
 * vue, puis délègue la mise en page à WorkDetailsPage. Bascule en 404 si
 * l'œuvre est introuvable ou non publiée.
 *
 * @param props - Paramètres de route, dont le slug demandé.
 * @returns La page rendue.
 */
export default async function WorkPage(
  props: PageProps<"/[locale]/works/[slug]">,
) {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const { slug } = await props.params;

  const work = await findPublishedWorkBySlug(slug, locale);
  if (!work) {
    notFound();
  }

  const dynamicRouteAlternates = {
    fr: work.slug,
    en:
      work.translations.find((translation) => translation.locale === "en")
        ?.slug ?? work.slug,
  };

  const viewer = await loadWorkViewer();

  // Comptage après l'envoi de la réponse
  if (viewer.currentUser?.role !== "ADMIN") {
    after(() => recordWorkView(work.id));
  }

  const data = await buildWorkDetailsData({ work, viewer, locale, slug });

  return (
    <>
      <SyncDynamicRouteAlternates alternates={dynamicRouteAlternates} />
      <WorkDetailsPage work={work} data={data} />
    </>
  );
}
