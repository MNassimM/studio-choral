import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";

import { Container } from "@/shared/components/site/container";
import { Input } from "@/shared/components/ui/input";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

/**
 * Champ de recherche de la page d'accueil.
 *
 * @remarks
 * Formulaire en GET vers le catalogue, sans JavaScript.
 *
 * @param locale - Locale active, qui détermine le chemin d'action.
 * @returns Le champ rendu.
 */
async function SearchBar({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const action = getPathname({ href: "/catalogue", locale });

  return (
    <section className="bg-background">
      <Container className="pb-16 sm:pb-20 pt-8 sm:pt-10">
        <form
          action={action}
          method="GET"
          className="relative mx-auto w-full max-w-2xl"
        >
          <button
            type="submit"
            aria-label={tCommon("searchAriaLabel")}
            className="absolute top-1/2 left-5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <Input
            type="search"
            name="q"
            placeholder={t("searchPlaceholder")}
            className="h-14 rounded-full border-border pl-12 text-base"
          />
        </form>
      </Container>
    </section>
  );
}

export { SearchBar };
