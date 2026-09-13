"use client";

import { Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { FranceFlag, UnitedKingdomFlag } from "@/shared/components/site/flags";
import { cn } from "@/shared/utils/cn";

import { useDynamicRouteAlternates } from "@/shared/i18n/route-alternates-context";

const FLAGS: Record<AppLocale, typeof FranceFlag> = {
  fr: FranceFlag,
  en: UnitedKingdomFlag,
};

/**
 * Sélecteur de langue du site.
 *
 * @param showLanguageName - Affiche le nom complet de la langue plutôt que son code à deux lettres.
 * @param onSelect - Appelé lorsqu'une langue est choisie.
 * @param triggerClassName - Remplace l'habillage du déclencheur. (surtout pour menu Mobile)
 * @returns Le sélecteur rendu.
 */
function LanguageSwitcher({
  showLanguageName = false,
  onSelect,
  triggerClassName,
}: {
  showLanguageName?: boolean;
  onSelect?: () => void;
  triggerClassName?: string;
} = {}) {
  const dynamicAlternates = useDynamicRouteAlternates();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = useLocale() as AppLocale;
  const t = useTranslations("navigation");
  const query = Object.fromEntries(searchParams.entries());

  const ActiveFlag = FLAGS[activeLocale];

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={t("languageSwitcher.triggerAriaLabel", {
          language: t(`languageSwitcher.${activeLocale}`),
        })}
        className={
          triggerClassName ??
          "group/lang-trigger inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 text-xs font-medium transition-colors outline-none hover:bg-secondary/60 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-secondary/60"
        }
      >
        <ActiveFlag />
        <span className={showLanguageName ? undefined : "uppercase"}>
          {showLanguageName
            ? t(`languageSwitcher.${activeLocale}`)
            : activeLocale}
        </span>
        <ChevronDown
          className="size-3.5 text-muted-foreground transition-transform duration-200 group-data-[popup-open]/lang-trigger:rotate-180 ms-auto"
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
                        onClick={onSelect}
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
