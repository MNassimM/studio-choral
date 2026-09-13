import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  catalogHref,
  catalogQueryForPage,
  type RawSearchParams,
} from "@/lib/catalog/catalog-params";
import { pageWindow } from "@/lib/catalog/pagination";
import { cn } from "@/lib/utils";

type CatalogPaginationProps = {
  page: number;
  pageCount: number;
  currentParams: RawSearchParams;
};

/**
 * Navigation entre les pages du catalogue.
 *
 * @remarks
 * De vrais liens et non des boutons : la navigation fonctionne sans
 * JavaScript, se partage et se laisse explorer. Seul le paramètre de page
 * change, recherche, filtres et tri sont conservés. Rien n'est rendu quand le
 * catalogue tient sur une page.
 *
 * @param page - Page courante.
 * @param pageCount - Nombre de pages.
 * @param currentParams - Paramètres d'URL courants.
 * @returns La navigation rendue, ou null.
 */
async function CatalogPagination({
  page,
  pageCount,
  currentParams,
}: CatalogPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  const t = await getTranslations("catalogue");

  const pageHref = (cible: number) =>
    catalogHref(catalogQueryForPage(currentParams, cible));
  const pastille = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "rounded-full",
  );
  // Une flèche sans destination n'annonce rien : masquée aux lecteurs
  // d'écran, elle ne reste que pour garder la mise en page stable.
  const fleche = cn(pastille, "pointer-events-none opacity-50");

  return (
    <nav
      aria-label={t("paginationAriaLabel")}
      className="flex flex-wrap items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={pageHref(page - 1)}
          rel="prev"
          aria-label={t("paginationPreviousAriaLabel")}
          className={pastille}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={fleche}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(page, pageCount).map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="px-1 text-muted-foreground"
          >
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className={cn(
              buttonVariants({ size: "icon" }),
              "pointer-events-none rounded-full",
            )}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(item)}
            aria-label={t("paginationPageAriaLabel", { page: item })}
            className={pastille}
          >
            {item}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={pageHref(page + 1)}
          rel="next"
          aria-label={t("paginationNextAriaLabel")}
          className={pastille}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span aria-hidden="true" className={fleche}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export { CatalogPagination };
