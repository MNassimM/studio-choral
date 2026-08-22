"use client";

import { Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { FranceFlag, UnitedKingdomFlag } from "@/components/layout/flags";
import { cn } from "@/lib/utils";

import { useDynamicRouteAlternates } from "@/components/layout/dynamic-route-alternates";

const FLAGS: Record<AppLocale, typeof FranceFlag> = {
  fr: FranceFlag,
  en: UnitedKingdomFlag,
};

/**
 * Bascule de langue - Client Component isolé (même catégorie d'exception au
 * minimum de JS que mobile-nav.tsx : la locale active et le pathname complet
 * de la page courante ne sont connus qu'au runtime, et ce composant est rendu
 * depuis le layout racine, au-dessus de toute page).
 *
 * Préserve la query string courante (?q=&sort=&period=...) : next-intl ne le
 * fait pas automatiquement en changeant de locale. usePathname() renvoie ici
 * la clé canonique de routing.pathnames (ex. "/catalogue"), pas le segment
 * déjà traduit affiché à l'écran - Link recalcule la version localisée pour
 * chaque langue à partir de cette même clé. Comportement inchangé par rapport
 * à la version précédente : seul l'habillage (Menu Base UI + drapeaux) change.
 *
 * LIMITE CONNUE : pour un futur segment dynamique (/works/[slug]), le SLUG
 * lui-même n'est PAS retraduit ici - next-intl retraduit les segments
 * statiques d'un chemin, jamais la valeur d'un paramètre. La future page
 * œuvre devra composer son propre lien de bascule à partir du slug résolu de
 * chaque locale (WorkTranslation.slug) plutôt que d'utiliser ce composant.
 */
function LanguageSwitcher() {
  const dynamicAlternates = useDynamicRouteAlternates();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = useLocale() as AppLocale;
  const t = useTranslations("navigation");
  const query = Object.fromEntries(searchParams.entries());

  const ActiveFlag = FLAGS[activeLocale];

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("languageSwitcher.triggerAriaLabel", {
          language: t(`languageSwitcher.${activeLocale}`),
        })}
        className="group/lang-trigger inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 text-xs font-medium transition-colors outline-none hover:bg-secondary/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-secondary/60"
      >
        <ActiveFlag />
        <span className="uppercase">{activeLocale}</span>
        <ChevronDown
          className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[popup-open]/lang-trigger:rotate-180"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-48 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {routing.locales.map((loc, index) => {
              const Flag = FLAGS[loc];
              const isActive = loc === activeLocale;

              return (
                <Fragment key={loc}>
                  {index > 0 ? (
                    <div aria-hidden="true" className="my-1 h-px bg-border" />
                  ) : null}
                  <Menu.LinkItem
                    closeOnClick
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent",
                      isActive ? "font-medium text-primary" : "text-foreground",
                    )}
                    render={
                      <Link
                        href={
                          pathname === "/works/[slug]" &&
                          dynamicAlternates?.[loc]
                            ? {
                                pathname,
                                params: {
                                  slug: dynamicAlternates[loc],
                                },
                                query,
                              }
                            : ({
                                pathname,
                                query,
                              } as React.ComponentProps<typeof Link>["href"])
                        }
                        locale={loc}
                      />
                    }
                  >
                    <Flag />
                    {t(`languageSwitcher.${loc}`)}
                  </Menu.LinkItem>
                </Fragment>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { LanguageSwitcher };
