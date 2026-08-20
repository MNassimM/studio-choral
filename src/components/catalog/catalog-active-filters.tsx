import Link from "next/link";
import { X } from "lucide-react";

type FilterCategoryKey = "period" | "voicing" | "language";

type ActiveFilterPill = {
  categoryKey: FilterCategoryKey;
  /** Libellé de la catégorie pour l'aria-label, ex. "Période". */
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

function paramAsString(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildRemoveHref(
  currentParams: Record<string, string | string[] | undefined>,
  categoryKey: FilterCategoryKey,
  valueToRemove: string,
): string {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(currentParams)) {
    const value = paramAsString(rawValue);
    if (value === undefined) continue;
    if (key === categoryKey) {
      const remaining = value.split(",").filter((v) => v !== valueToRemove);
      if (remaining.length > 0) params.set(key, remaining.join(","));
      continue;
    }
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

function buildResetHref(
  currentParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(currentParams)) {
    const value = paramAsString(rawValue);
    if (value === undefined) continue;
    if (key === "period" || key === "voicing" || key === "language") continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

/**
 * Barre des filtres actifs — rien n'est affiché si `pills` est vide (pas de
 * barre vide, pas de libellé orphelin). Pastilles et lien de réinitialisation
 * sont des <Link> réels (jamais des boutons JS) : fonctionnels sans JS,
 * ouvrables dans un nouvel onglet, indexables.
 */
function CatalogActiveFilters({
  pills,
  currentParams,
}: CatalogActiveFiltersProps) {
  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Filtres actifs :</span>
      {pills.map((pill) => (
        <span
          key={`${pill.categoryKey}:${pill.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 py-1 pr-1.5 pl-3"
        >
          {pill.label}
          <Link
            href={buildRemoveHref(currentParams, pill.categoryKey, pill.value)}
            aria-label={`Retirer le filtre ${pill.categoryLabel} : ${pill.label}`}
            className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </Link>
        </span>
      ))}
      <Link
        href={buildResetHref(currentParams)}
        className="font-medium text-primary hover:underline"
      >
        Tout réinitialiser
      </Link>
    </div>
  );
}

export { CatalogActiveFilters };
export type { ActiveFilterPill };
