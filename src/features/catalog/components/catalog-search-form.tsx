import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type CatalogSearchFormProps = {
  q: string;
  sort: string;
  periods: string[];
  voicings: string[];
  languages: string[];
  locale: (typeof routing.locales)[number];
};

/**
 * Formulaire de recherche du catalogue, en GET simple.
 *
 * @remarks
 * Les filtres actifs sont reportés en champs cachés pour ne pas être perdus lors d'une recherche.
 *
 * @param q - Terme recherché, prérempli dans le champ.
 * @param sort - Tri actif, reporté en champ caché s'il n'est pas celui par défaut.
 * @param periods - Périodes filtrées, reportées en champ caché.
 * @param voicings - Formations filtrées, reportées en champ caché.
 * @param languages - Langues filtrées, reportées en champ caché.
 * @param locale - Locale active, qui détermine le chemin d'action du formulaire.
 * @returns Le formulaire rendu.
 */
async function CatalogSearchForm({
  q,
  sort,
  periods,
  voicings,
  languages,
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
    </form>
  );
}

export { CatalogSearchForm };
