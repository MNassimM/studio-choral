import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogComposerFilterProps = {
  /** Compositeurs réellement présents au catalogue (triés), pas une liste figée. */
  composers: string[];
  /** Compositeur actif, ou null pour "Tous". */
  active: string | null;
  currentParams: Record<string, string | string[] | undefined>;
};

function buildComposerHref(
  currentParams: Record<string, string | string[] | undefined>,
  composer: string | null,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    if (key === "composer" || value === undefined) continue;
    params.set(key, Array.isArray(value) ? value[0] : value);
  }
  if (composer) {
    params.set("composer", composer);
  }
  const query = params.toString();
  return query ? `/catalogue?${query}` : "/catalogue";
}

/**
 * Pastilles de filtre par compositeur — liens purs, pas d'état client.
 * Générées depuis les compositeurs réellement présents en base (jamais un
 * nom figé en dur) : ajouter une œuvre d'un nouveau compositeur fait
 * apparaître sa pastille automatiquement.
 */
function CatalogComposerFilter({
  composers,
  active,
  currentParams,
}: CatalogComposerFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filtrer par compositeur"
      className="flex flex-wrap items-center gap-2"
    >
      <Link
        href={buildComposerHref(currentParams, null)}
        aria-current={active === null ? "true" : undefined}
        className={cn(
          buttonVariants({
            variant: active === null ? "default" : "outline",
            size: "sm",
          }),
          "rounded-full",
        )}
      >
        Tous
      </Link>
      {composers.map((composer) => (
        <Link
          key={composer}
          href={buildComposerHref(currentParams, composer)}
          aria-current={active === composer ? "true" : undefined}
          className={cn(
            buttonVariants({
              variant: active === composer ? "default" : "outline",
              size: "sm",
            }),
            "rounded-full",
          )}
        >
          {composer}
        </Link>
      ))}
    </div>
  );
}

export { CatalogComposerFilter };
