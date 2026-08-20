import { getTranslations } from "next-intl/server";
import { LayoutGrid, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type CatalogViewToggleProps = {
  view: "grid" | "list";
  /** searchParams courants (q, sort, period...), préservés dans les deux liens. */
  currentParams: Record<string, string | string[] | undefined>;
};

function buildViewQuery(
  currentParams: Record<string, string | string[] | undefined>,
  view: "grid" | "list",
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(currentParams)) {
    if (key === "view" || value === undefined) continue;
    query[key] = Array.isArray(value) ? value[0] : value;
  }
  if (view === "list") {
    query.view = "list";
  }
  return query;
}

/**
 * Bascule grille/tableau implémentée en liens purs (searchParams `?view=`),
 * pas en état client : le choix est partageable/marque-page-able et ne
 * demande aucun JavaScript, cohérent avec le reste de la page (recherche,
 * tri, filtre reposent déjà tous sur l'URL).
 */
async function CatalogViewToggle({
  view,
  currentParams,
}: CatalogViewToggleProps) {
  const t = await getTranslations("catalogue.viewToggle");

  return (
    <div
      role="group"
      aria-label={t("groupAriaLabel")}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
    >
      <Link
        href={{
          pathname: "/catalogue",
          query: buildViewQuery(currentParams, "grid"),
        }}
        aria-label={t("gridAriaLabel")}
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
        href={{
          pathname: "/catalogue",
          query: buildViewQuery(currentParams, "list"),
        }}
        aria-label={t("listAriaLabel")}
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
