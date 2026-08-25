import { getTranslations } from "next-intl/server";
import { X } from "lucide-react";

import { Link } from "@/i18n/navigation";

type FilterCategoryKey = "period" | "voicing" | "language";

type ActiveFilterPill = {
  categoryKey: FilterCategoryKey;
  /** Clé de message pour le libellé de catégorie dans l'aria-label, ex. "period" -> catalogue.filters.period. */
  categoryLabel: string;
  /** Valeur brute telle qu'elle apparaît dans l'URL, ex. "RENAISSANCE". */
  value: string;
  /** Libellé affiché sur la pastille, ex. "Renaissance". */
  label: string;
};

type CatalogActiveFiltersProps = {
  pills: ActiveFilterPill[];
  currentParams: Record<string, string | string[] | undefined>;
};

/**
 * Ramène un paramètre d'URL à une chaîne simple.
 *
 * @param value - Valeur brute, éventuellement répétée dans l'URL.
 * @returns La première valeur, ou undefined si le paramètre est absent.
 */
function paramAsString(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Construit la query string obtenue en retirant une valeur de filtre.
 *
 * @param currentParams - Paramètres d'URL courants.
 * @param categoryKey - Catégorie du filtre à alléger.
 * @param valueToRemove - Valeur à retirer de cette catégorie.
 * @returns La query string sans cette valeur.
 */
function buildRemoveQuery(
  currentParams: Record<string, string | string[] | undefined>,
  categoryKey: FilterCategoryKey,
  valueToRemove: string,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(currentParams)) {
    const value = paramAsString(rawValue);
    if (value === undefined) continue;
    if (key === categoryKey) {
      const remaining = value.split(",").filter((v) => v !== valueToRemove);
      if (remaining.length > 0) query[key] = remaining.join(",");
      continue;
    }
    query[key] = value;
  }
  return query;
}

/**
 * Construit la query string obtenue en retirant tous les filtres.
 *
 * @param currentParams - Paramètres d'URL courants.
 * @returns La query string sans aucune catégorie de filtre.
 */
function buildResetQuery(
  currentParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, rawValue] of Object.entries(currentParams)) {
    const value = paramAsString(rawValue);
    if (value === undefined) continue;
    if (key === "period" || key === "voicing" || key === "language") continue;
    query[key] = value;
  }
  return query;
}

/**
 * Pastilles des filtres actifs, chacune retirable.
 *
 * @remarks
 * Ne rend rien quand aucun filtre n'est actif. Les pastilles et la
 * réinitialisation sont des liens réels, pas des boutons.
 *
 * @param pills - Filtres actifs à afficher.
 * @param currentParams - Paramètres d'URL courants, préservés dans les liens.
 * @returns La barre rendue, ou null si aucun filtre n'est actif.
 */
async function CatalogActiveFilters({
  pills,
  currentParams,
}: CatalogActiveFiltersProps) {
  if (pills.length === 0) {
    return null;
  }

  const t = await getTranslations("catalogue.filters");

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("activeLabel")}</span>
      {pills.map((pill) => (
        <span
          key={`${pill.categoryKey}:${pill.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 py-1 pr-1.5 pl-3"
        >
          {pill.label}
          <Link
            href={{
              pathname: "/catalogue",
              query: buildRemoveQuery(
                currentParams,
                pill.categoryKey,
                pill.value,
              ),
            }}
            aria-label={t("removeAriaLabel", {
              category: t(
                pill.categoryLabel as "period" | "voicing" | "language",
              ),
              value: pill.label,
            })}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Link>
        </span>
      ))}
      <Link
        href={{ pathname: "/catalogue", query: buildResetQuery(currentParams) }}
        className="font-medium text-primary hover:underline"
      >
        {t("resetAll")}
      </Link>
    </div>
  );
}

export { CatalogActiveFilters };
export type { ActiveFilterPill };
