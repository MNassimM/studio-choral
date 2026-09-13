import "server-only";

import { getTranslations } from "next-intl/server";

import type { ActiveFilterPill } from "@/features/catalog/components/active-filters";
import type { FilterCategory } from "@/features/catalog/components/catalog-filter-panel";
import { PERIOD_OPTIONS } from "@/features/catalog/domain/catalog-options";
import {
  parseCatalogParams,
  type CatalogParams,
  type RawSearchParams,
} from "@/features/catalog/domain/catalog-params";
import { MOST_POPULAR_COUNT } from "@/features/catalog/domain/work-badge";
import {
  findCatalogPage,
  type CatalogPage,
} from "@/features/catalog/server/catalog-query";
import { isKnownWorkLanguageCode } from "@/features/work/domain/work-language";
import { findMostPopularWorks } from "@/features/work/server/work-popularity";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/server/db/prisma";

/** Une page de résultats, par opposition à une page hors limites. */
type CatalogResultsPage = Extract<CatalogPage, { kind: "page" }>;

/**
 * Tout ce que la page catalogue affiche.
 */
type CatalogPageContent = {
  kind: "page";
  /** Paramètres d'URL validés. */
  params: CatalogParams;
  results: CatalogResultsPage;
  /** Statistiques globales, avant filtrage. */
  stats: {
    worksCount: number;
    composersCount: number;
    audioFilesCount: number;
  };
  filterCategories: FilterCategory[];
  activeFilterPills: ActiveFilterPill[];
  /** Œuvres les plus vues, pour le badge. */
  popularIds: ReadonlySet<string>;
};

/**
 * Données de la page catalogue, ou la dernière page valide si la page
 * demandée n'existe pas.
 */
type CatalogPageData =
  CatalogPageContent | { kind: "outOfRange"; lastPage: number };

/**
 * Charge les données de la page catalogue.
 *
 * @remarks
 * Les paramètres sont lus par catalog-params, la sélection, le tri et le
 * découpage sont faits par catalog-query. Ce module réunit les statistiques,
 * les options des filtres et les pastilles des filtres actifs.
 *
 * @param locale - Locale d'interface active.
 * @param rawSearchParams - Paramètres d'URL bruts.
 * @returns Les données de la page, ou la dernière page valide si hors limites.
 */
async function loadCatalogPageData(
  locale: AppLocale,
  rawSearchParams: RawSearchParams,
): Promise<CatalogPageData> {
  const tPeriod = await getTranslations("work.period");
  const tWorkLanguage = await getTranslations("work.language");

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
  const { periods, voicings, languages } = params;

  const catalogue = await findCatalogPage({ locale, ...params });
  if (catalogue.kind === "outOfRange") {
    return catalogue;
  }

  // Les oeuvres les plus vues sur la fenêtre glissante, pour le badge.
  const populaires = new Set(
    (await findMostPopularWorks(MOST_POPULAR_COUNT)).map(
      (entree) => entree.workId,
    ),
  );

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

  return {
    kind: "page",
    params,
    results: catalogue,
    stats: {
      worksCount,
      composersCount: composers.length,
      audioFilesCount,
    },
    filterCategories,
    activeFilterPills,
    popularIds: populaires,
  };
}

export { loadCatalogPageData };
export type { CatalogPageContent, CatalogPageData };
