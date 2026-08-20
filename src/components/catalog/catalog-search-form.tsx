import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type CatalogSearchFormProps = {
  q: string;
  sort: string;
  periods: string[];
  voicings: string[];
  languages: string[];
  view: string;
  locale: (typeof routing.locales)[number];
};

/**
 * Recherche réelle (contrairement à celle de la page d'accueil) : un simple
 * formulaire GET, sans JavaScript. Les autres filtres actifs sont reportés
 * en champs cachés (format virgule, cohérent avec le panneau de filtres) pour
 * ne pas être perdus lors d'une recherche. `action` doit pointer vers le
 * chemin /catalogue déjà traduit de la locale active (getPathname), pas vers
 * la clé canonique "/catalogue" telle quelle.
 */
async function CatalogSearchForm({
  q,
  sort,
  periods,
  voicings,
  languages,
  view,
  locale,
}: CatalogSearchFormProps) {
  const t = await getTranslations("catalogue");
  const tCommon = await getTranslations("common");
  const action = getPathname({ href: "/catalogue", locale });

  return (
    <form action={action} method="GET" className="relative flex-1 sm:max-w-sm">
      <button
        type="submit"
        aria-label={tCommon("searchAriaLabel")}
        className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
      >
        <Search className="size-4" aria-hidden="true" />
      </button>
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={t("searchPlaceholder")}
        className="h-10 rounded-full border-border pl-10"
      />
      {sort !== "featured" ? (
        <input type="hidden" name="sort" value={sort} />
      ) : null}
      {periods.length > 0 ? (
        <input type="hidden" name="period" value={periods.join(",")} />
      ) : null}
      {voicings.length > 0 ? (
        <input type="hidden" name="voicing" value={voicings.join(",")} />
      ) : null}
      {languages.length > 0 ? (
        <input type="hidden" name="language" value={languages.join(",")} />
      ) : null}
      {view !== "grid" ? (
        <input type="hidden" name="view" value={view} />
      ) : null}
    </form>
  );
}

export { CatalogSearchForm };
