import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type CatalogSearchFormProps = {
  q: string;
  sort: string;
  period: string;
  view: string;
  composer: string | null;
};

/**
 * Recherche réelle (contrairement à celle de la page d'accueil) : un simple
 * formulaire GET, sans JavaScript. Les autres filtres actifs sont reportés
 * en champs cachés pour ne pas être perdus lors d'une recherche.
 */
function CatalogSearchForm({
  q,
  sort,
  period,
  view,
  composer,
}: CatalogSearchFormProps) {
  return (
    <form
      action="/catalogue"
      method="GET"
      className="relative flex-1 sm:max-w-sm"
    >
      <button
        type="submit"
        aria-label="Rechercher"
        className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Rechercher une œuvre ou un compositeur"
        className="h-10 rounded-full border-border pl-10"
      />
      {sort !== "featured" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      {period !== "all" ? (
        <input type="hidden" name="period" value={period} />
      ) : null}
      {view !== "grid" ? (
        <input type="hidden" name="view" value={view} />
      ) : null}
      {composer ? (
        <input type="hidden" name="composer" value={composer} />
      ) : null}
    </form>
  );
}

export { CatalogSearchForm };
