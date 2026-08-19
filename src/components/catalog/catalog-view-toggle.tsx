import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogViewToggleProps = {
  view: "grid" | "list";
  /** searchParams courants (q, sort, year...), préservés dans les deux liens. */
  currentParams: Record<string, string | string[] | undefined>;
};

function buildViewHref(
  currentParams: Record<string, string | string[] | undefined>,
  view: "grid" | "list",
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    if (key === "view" || value === undefined) continue;
    params.set(key, Array.isArray(value) ? value[0] : value);
  }
  if (view === "list") {
    params.set("view", "list");
  }
  const query = params.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

/**
 * Bascule grille/tableau implémentée en liens purs (searchParams `?view=`),
 * pas en état client : le choix est partageable/marque-page-able et ne
 * demande aucun JavaScript, cohérent avec le reste de la page (recherche,
 * tri, filtre reposent déjà tous sur l'URL).
 */
function CatalogViewToggle({ view, currentParams }: CatalogViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Mode d'affichage"
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
    >
      <Link
        href={buildViewHref(currentParams, "grid")}
        aria-label="Affichage en grille"
        aria-current={view === "grid" ? "true" : undefined}
        className={cn(
          buttonVariants({
            variant: view === "grid" ? "default" : "ghost",
            size: "icon",
          }),
          "rounded-full",
        )}
      >
        <LayoutGrid className="size-4" />
      </Link>
      <Link
        href={buildViewHref(currentParams, "list")}
        aria-label="Affichage en tableau"
        aria-current={view === "list" ? "true" : undefined}
        className={cn(
          buttonVariants({
            variant: view === "list" ? "default" : "ghost",
            size: "icon",
          }),
          "rounded-full",
        )}
      >
        <List className="size-4" />
      </Link>
    </div>
  );
}

export { CatalogViewToggle };
