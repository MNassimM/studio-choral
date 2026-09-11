import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { cookies } from "next/headers";
import { Playfair_Display } from "next/font/google";
import { BookOpen, Headphones, Info, Music2, Users2 } from "lucide-react";

// Import de composants partagés
import { Container } from "@/components/layout/container";
import { WorkCard } from "@/components/catalog/work-card";
import { WorkTableRow } from "@/components/catalog/work-table-row";
import { CatalogSearchForm } from "@/components/catalog/catalog-search-form";
import {
  CatalogActiveFilters,
  type ActiveFilterPill,
} from "@/components/catalog/catalog-active-filters";
import {
  CatalogFiltersButton,
  CatalogFiltersPanel,
  type FilterCategory,
} from "@/components/catalog/catalog-filters";
import { SortSelect } from "@/components/catalog/catalog-controls";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import {
  CATALOG_VIEW_COOKIE,
  DEFAULT_CATALOG_VIEW,
  parseCatalogView,
  type CatalogView,
} from "@/lib/catalog/view-preference";
import { PERIOD_OPTIONS } from "@/components/catalog/catalog-options";
import { CatalogViewToggle } from "@/components/catalog/catalog-view-toggle";
import { buttonVariants } from "@/components/ui/button";

// Import de fonctions utilitaires
import { prisma } from "@/lib/db/prisma";
import {
  PAGE_PARAM,
  catalogHref,
  catalogQueryForPage,
  parseCatalogParams,
  parsePage,
  type RawSearchParams,
} from "@/lib/catalog/catalog-params";
import { findCatalogPage } from "@/lib/catalog/catalog-query";
import { Link, getPathname, redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { isKnownWorkLanguageCode } from "@/lib/works/work-language";
import { cn } from "@/lib/utils";

// Rendue à chaque requête : ses résultats viennent des paramètres d'URL, et sa
// vue du cookie de préférence, une API liée à la requête qui interdit tout
// rendu statique. L'ancien revalidate = 3600 ne mettait donc rien en cache ;
// la déclaration explicite évite de laisser croire le contraire.
export const dynamic = "force-dynamic";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

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
 * Encart d'une statistique du catalogue.
 *
 * @param icon - Icône illustrant la statistique.
 * @param value - Valeur affichée.
 * @param label - Intitulé de la statistique.
 * @returns L'encart rendu.
 */
function StatBox({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

/**
 * Page catalogue, filtrable, triable et paginée.
 *
 * @remarks
 * Couche de composition : les paramètres sont lus par catalog-params, la
 * sélection, le tri et le découpage sont faits par catalog-query. Tout l'état
 * des résultats vit dans l'URL ; seule la vue grille ou tableau vient d'un
 * cookie.
 *
 * @param props - Paramètres de route et paramètres de recherche.
 * @returns La page rendue.
 */
export default async function CataloguePage(
  props: PageProps<"/[locale]/catalogue">,
) {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;

  const t = await getTranslations("catalogue");
  const tPeriod = await getTranslations("work.period");
  const tCommon = await getTranslations("common");
  const tWorkLanguage = await getTranslations("work.language");

  const rawSearchParams: RawSearchParams = await props.searchParams;
  // Le mode d'affichage ne vient pas de l'URL mais du cookie posé par la
  // bascule. C'est une préférence de la personne et non une propriété du
  // document, deux visiteurs ouvrant le même lien voient donc chacun le
  // catalogue comme ils ont l'habitude de le voir.
  const cookieStore = await cookies();
  const view: CatalogView =
    parseCatalogView(cookieStore.get(CATALOG_VIEW_COOKIE)?.value) ??
    DEFAULT_CATALOG_VIEW;

  // Statistiques et valeurs distinctes de period/voicing/language (options du
  // panneau de filtres), toujours calculées depuis la base, jamais écrites en
  // dur. Tout se limite aux œuvres publiées : ces chiffres sont publics, ils
  // ne doivent pas compter ce que le catalogue ne montre pas.
  const [
    worksCount,
    audioFilesCount,
    distinctComposerRows,
    distinctPeriodRows,
    distinctVoicingRows,
    distinctLanguageRows,
  ] = await Promise.all([
    prisma.work.count({ where: { isPublished: true } }),
    prisma.audioFile.count({
      where: { movement: { work: { isPublished: true } } },
    }),
    prisma.work.findMany({
      where: { isPublished: true },
      distinct: ["composer"],
      select: { composer: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, period: { not: null } },
      distinct: ["period"],
      select: { period: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, voicing: { not: null } },
      distinct: ["voicing"],
      select: { voicing: true },
    }),
    prisma.work.findMany({
      where: { isPublished: true, language: { not: null } },
      distinct: ["language"],
      select: { language: true },
    }),
  ]);

  const composers = distinctComposerRows
    .map((row) => row.composer)
    .sort((a, b) => a.localeCompare(b, locale));

  const availablePeriodValues = new Set(
    distinctPeriodRows.map((row) => row.period),
  );
  // Ordre chronologique (celui de PERIOD_OPTIONS), pas l'ordre d'arrivée en base.
  const availablePeriods = PERIOD_OPTIONS.filter((option) =>
    availablePeriodValues.has(option),
  );
  const availableVoicings = distinctVoicingRows
    .map((row) => row.voicing!)
    .sort((a, b) => a.localeCompare(b, locale));
  // Repli sur le code brut si non répertorié dans messages/*.json (langue pas
  // encore documentée) - jamais d'erreur de type ni d'écran cassé.
  function translateWorkLanguage(code: string): string {
    return isKnownWorkLanguageCode(code) ? tWorkLanguage(code) : code;
  }
  const availableLanguages = distinctLanguageRows
    .map((row) => row.language!)
    .sort((a, b) =>
      translateWorkLanguage(a).localeCompare(translateWorkLanguage(b), locale),
    );

  // Une catégorie sans valeur disponible n'est pas affichée dans le panneau.
  const filterCategories: FilterCategory[] = [];
  if (availablePeriods.length > 0) {
    filterCategories.push({
      key: "period",
      label: "period",
      options: availablePeriods.map((option) => ({
        value: option,
        label: tPeriod(option),
      })),
    });
  }
  if (availableVoicings.length > 0) {
    filterCategories.push({
      key: "voicing",
      label: "voicing",
      options: availableVoicings.map((voicing) => ({
        value: voicing,
        label: voicing,
      })),
    });
  }
  if (availableLanguages.length > 0) {
    filterCategories.push({
      key: "language",
      label: "language",
      options: availableLanguages.map((language) => ({
        value: language,
        label: translateWorkLanguage(language),
      })),
    });
  }

  // period : validé contre l'enum MusicalPeriod. voicing/language : validés
  // contre les valeurs réellement présentes en base - dans les deux cas, un
  // token inconnu est ignoré silencieusement.
  const params = parseCatalogParams(rawSearchParams, {
    voicings: availableVoicings,
    languages: availableLanguages,
  });
  const { q, sort, periods, voicings, languages } = params;

  const catalogue = await findCatalogPage({ locale, ...params });
  if (catalogue.kind === "outOfRange") {
    // Une page vide servie en 200 serait une fausse page pour les moteurs :
    // on ramène à la dernière page qui existe, recherche et filtres conservés.
    // return : redirect vient d'une déstructuration, TypeScript ne sait donc
    // pas qu'il interrompt le rendu et ne restreindrait pas catalogue.
    return redirect({
      href: catalogHref(
        catalogQueryForPage(rawSearchParams, catalogue.lastPage),
      ),
      locale,
    });
  }
  const works = catalogue.works;
  const firstRank = (catalogue.page - 1) * catalogue.pageSize + 1;

  const activeFilterPills: ActiveFilterPill[] = [
    ...periods.map((value) => ({
      categoryKey: "period" as const,
      categoryLabel: "period",
      value,
      label: tPeriod(value),
    })),
    ...voicings.map((value) => ({
      categoryKey: "voicing" as const,
      categoryLabel: "voicing",
      value,
      label: value,
    })),
    ...languages.map((value) => ({
      categoryKey: "language" as const,
      categoryLabel: "language",
      value,
      label: translateWorkLanguage(value),
    })),
  ];

  return (
    <>
      <section className="max-w-7xl mx-auto bg-background">
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

          {/* Statistiques globales du catalogue, avant filtrage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox
              icon={BookOpen}
              value={String(worksCount)}
              label={t("statWorksAvailable")}
            />
            <StatBox
              icon={Users2}
              value={String(composers.length)}
              label={t("statComposers")}
            />
            <StatBox
              icon={Music2}
              value={String(audioFilesCount)}
              label={t("statAudioFiles")}
            />
            {/*
            <StatBox
              icon={Music2}
              value={t("statVoicingValue")}
              label={t("statVoicingLabel")}
            />*/}
            <StatBox
              icon={Headphones}
              value={t("statAudioValue")}
              label={t("statAudioLabel")}
            />
          </div>

          {/* Recherche, filtres (panneau) et bascule grille/tableau */}
          <div className="flex flex-col gap-4">
            <CatalogFiltersPanel
              key={[...periods, ...voicings, ...languages].join("|")}
              categories={filterCategories}
              activePeriods={periods}
              activeVoicings={voicings}
              activeLanguages={languages}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CatalogSearchForm
                  q={q}
                  sort={sort}
                  periods={periods}
                  voicings={voicings}
                  languages={languages}
                  locale={locale}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <SortSelect value={sort} />
                  {filterCategories.length > 0 ? (
                    <CatalogFiltersButton />
                  ) : null}
                  <CatalogViewToggle view={view} />
                </div>
              </div>
            </CatalogFiltersPanel>

            <CatalogActiveFilters
              pills={activeFilterPills}
              currentParams={rawSearchParams}
            />
          </div>

          {works.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">
              {t("emptyState")}
            </p>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {works.map((work) => (
                <WorkCard key={work.slug} work={work} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/40 text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 pr-4 pl-4 font-medium">
                      {t("tableVisual")}
                    </th>
                    <th className="py-3 pr-4 font-medium">{t("tableTitle")}</th>
                    <th className="py-3 pr-4 font-medium">
                      {t("tableComposer")}
                    </th>
                    <th className="py-3 pr-4 font-medium">
                      {t("tableVoicing")}
                    </th>
                    <th className="py-3 pr-4 font-medium">
                      {t("tableMovements")}
                    </th>
                    <th className="py-3 pr-4 font-medium">{t("tablePrice")}</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map((work) => (
                    <WorkTableRow key={work.slug} work={work} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {catalogue.pageCount > 1
                ? t("resultsRange", {
                    from: firstRank,
                    to: firstRank + works.length - 1,
                    total: catalogue.total,
                  })
                : t("resultsCount", { count: catalogue.total })}
            </p>
            <CatalogPagination
              page={catalogue.page}
              pageCount={catalogue.pageCount}
              currentParams={rawSearchParams}
            />
          </div>
        </Container>
      </section>

      <section className="border-t border-border bg-secondary/30">
        <Container className="py-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <Info
                className="size-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                {t("infoBannerText")}
              </p>
            </div>
            <Link
              href="/comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 rounded-full",
              )}
            >
              {tCommon("learnMore")}
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
