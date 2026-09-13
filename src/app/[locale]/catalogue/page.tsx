import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { cookies } from "next/headers";

import { CatalogPage } from "@/features/catalog/components/catalog-page";
import {
  PAGE_PARAM,
  catalogHref,
  catalogQueryForPage,
  parsePage,
  type RawSearchParams,
} from "@/features/catalog/domain/catalog-params";
import {
  CATALOG_VIEW_COOKIE,
  DEFAULT_CATALOG_VIEW,
  parseCatalogView,
  type CatalogView,
} from "@/features/catalog/domain/view-preference";
import { loadCatalogPageData } from "@/features/catalog/server/catalog-page-data";
import { getPathname, redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

// Rendue à chaque requête : ses résultats viennent des paramètres d'URL, et sa
// vue du cookie de préférence, une API liée à la requête qui interdit tout
// rendu statique. L'ancien revalidate = 3600 ne mettait donc rien en cache ;
// la déclaration explicite évite de laisser croire le contraire.
export const dynamic = "force-dynamic";

/**
 * Construit les métadonnées du catalogue.
 *
 * @remarks
 * Chaque page de la pagination est un contenu distinct, elle se déclare donc
 * canonique. Tri, filtres et recherche ne sont que des variantes d'une même
 * liste, ils restent hors de l'URL canonique.
 *
 * @param props - Paramètres de route et paramètres de recherche.
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/catalogue">,
): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("catalogue");

  const page = parsePage((await props.searchParams)[PAGE_PARAM]);
  const href = catalogHref(catalogQueryForPage({}, page));

  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, getPathname({ href, locale: l })]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ href, locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

/**
 * Page catalogue.
 *
 * @remarks
 * Lit l'URL et le cookie de vue, charge les données, redirige si la page
 * demandée n'existe pas, puis délègue la mise en page à CatalogPage.
 *
 * @param props - Paramètres de route et paramètres de recherche.
 * @returns La page rendue.
 */
export default async function CataloguePage(
  props: PageProps<"/[locale]/catalogue">,
) {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;

  const rawSearchParams: RawSearchParams = await props.searchParams;
  // Le mode d'affichage ne vient pas de l'URL mais du cookie posé par la
  // bascule. C'est une préférence de la personne et non une propriété du
  // document, deux visiteurs ouvrant le même lien voient donc chacun le
  // catalogue comme ils ont l'habitude de le voir.
  const cookieStore = await cookies();
  const view: CatalogView =
    parseCatalogView(cookieStore.get(CATALOG_VIEW_COOKIE)?.value) ??
    DEFAULT_CATALOG_VIEW;

  const data = await loadCatalogPageData(locale, rawSearchParams);
  if (data.kind === "outOfRange") {
    // Une page vide servie en 200 serait une fausse page pour les moteurs :
    // on ramène à la dernière page qui existe, recherche et filtres conservés.
    // return : redirect vient d'une déstructuration, TypeScript ne sait donc
    // pas qu'il interrompt le rendu et ne restreindrait pas data.
    return redirect({
      href: catalogHref(catalogQueryForPage(rawSearchParams, data.lastPage)),
      locale,
    });
  }

  return (
    <CatalogPage
      locale={locale}
      view={view}
      rawSearchParams={rawSearchParams}
      data={data}
    />
  );
}
