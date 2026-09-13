import { getTranslations } from "next-intl/server";
import { Playfair_Display } from "next/font/google";

import { Container } from "@/shared/components/site/container";
import { CatalogInfoBanner } from "@/features/catalog/components/catalog-info-banner";
import { CatalogPagination } from "@/features/catalog/components/catalog-pagination";
import {
  CatalogPendingProvider,
  CatalogResults,
} from "@/features/catalog/components/catalog-pending-results";
import { CatalogStats } from "@/features/catalog/components/catalog-stats";
import { CatalogToolbar } from "@/features/catalog/components/catalog-toolbar";
import { CatalogWorkList } from "@/features/catalog/components/catalog-work-list";
import type { RawSearchParams } from "@/features/catalog/domain/catalog-params";
import type { CatalogView } from "@/features/catalog/domain/view-preference";
import type { CatalogPageContent } from "@/features/catalog/server/catalog-page-data";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/shared/utils/cn";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Contenu de la page catalogue, filtrable, triable et paginée.
 *
 * @remarks
 * Tout l'état des résultats vit dans l'URL ; seule la vue grille ou tableau
 * vient d'un cookie.
 *
 * @param locale - Locale active.
 * @param view - Vue grille ou tableau.
 * @param rawSearchParams - Paramètres d'URL bruts, conservés par les liens.
 * @param data - Données chargées par loadCatalogPageData.
 * @returns La page rendue.
 */
async function CatalogPage({
  locale,
  view,
  rawSearchParams,
  data,
}: {
  locale: AppLocale;
  view: CatalogView;
  rawSearchParams: RawSearchParams;
  data: CatalogPageContent;
}) {
  const t = await getTranslations("catalogue");
  const tCommon = await getTranslations("common");

  const { results } = data;
  const works = results.works;
  const firstRank = (results.page - 1) * results.pageSize + 1;

  return (
    <>
      <section className="max-w-7xl mx-auto bg-background">
        <CatalogPendingProvider>
          <Container className="flex flex-col gap-8 pb-12 sm:pb-16 pt-2 sm:pt-6">
            <nav
              aria-label={tCommon("breadcrumbAriaLabel")}
              className="text-sm text-muted-foreground"
            >
              <Link href="/" className="hover:text-primary !underline">
                {tCommon("breadcrumbHome")}
              </Link>
              <span className="mx-2">-{">"}</span>
              <span aria-current="page" className="text-foreground">
                {t("title")}
              </span>
            </nav>

            <div className="flex flex-col gap-3">
              <h1
                className={cn(
                  "text-3xl tracking-tight sm:text-4xl",
                  playfairDisplay.className,
                )}
              >
                {t("title")}
              </h1>
              <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
            </div>

            <CatalogStats stats={data.stats} />

            <CatalogToolbar
              locale={locale}
              params={data.params}
              view={view}
              filterCategories={data.filterCategories}
              activeFilterPills={data.activeFilterPills}
              currentParams={rawSearchParams}
            />

            <CatalogResults>
              <CatalogWorkList
                works={works}
                view={view}
                popularIds={data.popularIds}
              />

              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {results.pageCount > 1
                    ? t("resultsRange", {
                        from: firstRank,
                        to: firstRank + works.length - 1,
                        total: results.total,
                      })
                    : t("resultsCount", { count: results.total })}
                </p>
                <CatalogPagination
                  page={results.page}
                  pageCount={results.pageCount}
                  currentParams={rawSearchParams}
                />
              </div>
            </CatalogResults>
          </Container>
        </CatalogPendingProvider>
      </section>

      <CatalogInfoBanner />
    </>
  );
}

export { CatalogPage };
