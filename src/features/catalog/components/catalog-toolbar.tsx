import {
  CatalogActiveFilters,
  type ActiveFilterPill,
} from "@/features/catalog/components/active-filters";
import {
  CatalogFiltersButton,
  CatalogFiltersPanel,
  type FilterCategory,
} from "@/features/catalog/components/catalog-filter-panel";
import { SortSelect } from "@/features/catalog/components/catalog-controls";
import { CatalogSearchForm } from "@/features/catalog/components/catalog-search-form";
import { CatalogViewToggle } from "@/features/catalog/components/catalog-view-toggle";
import type {
  CatalogParams,
  RawSearchParams,
} from "@/features/catalog/domain/catalog-params";
import type { CatalogView } from "@/features/catalog/domain/view-preference";
import type { AppLocale } from "@/i18n/routing";

/**
 * Recherche, filtres (panneau) et bascule grille/tableau.
 *
 * @param locale - Locale active, transmise au formulaire de recherche.
 * @param params - Paramètres d'URL validés.
 * @param view - Vue grille ou tableau.
 * @param filterCategories - Catégories proposées dans le panneau.
 * @param activeFilterPills - Filtres actifs, en pastilles retirables.
 * @param currentParams - Paramètres d'URL bruts, conservés par les liens.
 * @returns La barre d'outils rendue.
 */
function CatalogToolbar({
  locale,
  params,
  view,
  filterCategories,
  activeFilterPills,
  currentParams,
}: {
  locale: AppLocale;
  params: CatalogParams;
  view: CatalogView;
  filterCategories: FilterCategory[];
  activeFilterPills: ActiveFilterPill[];
  currentParams: RawSearchParams;
}) {
  const { q, sort, periods, voicings, languages } = params;

  return (
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
            {filterCategories.length > 0 ? <CatalogFiltersButton /> : null}
            <CatalogViewToggle view={view} />
          </div>
        </div>
      </CatalogFiltersPanel>

      <CatalogActiveFilters
        pills={activeFilterPills}
        currentParams={currentParams}
      />
    </div>
  );
}

export { CatalogToolbar };
