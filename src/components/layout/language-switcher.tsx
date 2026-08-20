"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Bascule de langue — Client Component isolé (même catégorie d'exception au
 * minimum de JS que mobile-nav.tsx : la locale active et le pathname complet
 * de la page courante ne sont connus qu'au runtime, et ce composant est rendu
 * depuis le layout racine, au-dessus de toute page).
 *
 * Préserve la query string courante (?q=&sort=&period=...) : next-intl ne le
 * fait pas automatiquement en changeant de locale. usePathname() renvoie ici
 * la clé canonique de routing.pathnames (ex. "/catalogue"), pas le segment
 * déjà traduit affiché à l'écran — Link recalcule la version localisée pour
 * chaque langue à partir de cette même clé.
 *
 * LIMITE CONNUE : pour un futur segment dynamique (/works/[slug]), le SLUG
 * lui-même n'est PAS retraduit ici — next-intl retraduit les segments
 * statiques d'un chemin, jamais la valeur d'un paramètre. La future page
 * œuvre devra composer son propre lien de bascule à partir du slug résolu de
 * chaque locale (WorkTranslation.slug) plutôt que d'utiliser ce composant.
 */
function LanguageSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = useLocale();
  const t = useTranslations("navigation");
  const query = Object.fromEntries(searchParams.entries());

  return (
    <div
      role="group"
      aria-label={t("languageSwitcher.ariaLabel")}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
    >
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          // usePathname() renvoie une des clés de routing.pathnames, mais
          // typée comme leur UNION (ex. "/" | "/catalogue" | ...) — pas la
          // forme discriminée { pathname: "/" } | { pathname: "/catalogue" }
          // | ... qu'attend href. La valeur runtime est toujours l'une de
          // ces clés (par construction de usePathname), l'assertion ne fait
          // que combler cet écart de représentation entre les deux types.
          href={
            { pathname, query } as React.ComponentProps<typeof Link>["href"]
          }
          locale={loc}
          aria-current={loc === activeLocale ? "true" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            loc === activeLocale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`languageSwitcher.${loc}`)}
        </Link>
      ))}
    </div>
  );
}

export { LanguageSwitcher };
