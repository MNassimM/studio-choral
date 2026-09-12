"use client";

import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight, Laptop, Moon, Sun } from "lucide-react";

import { rememberTheme } from "@/lib/theme/theme-actions";
import type { ThemePreference } from "@/lib/theme/theme-preference";
import { cn } from "@/lib/utils";

const ITEM_CLASS =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent";

/**
 * Sous menu de choix du thème, dans le menu du compte.
 *
 * @param current - Thème actuellement enregistré.
 * @returns Le sous menu rendu.
 */
export function ThemeMenu({ current }: { current: ThemePreference }) {
  const t = useTranslations("auth.account");

  const choix: {
    valeur: ThemePreference;
    libelle: string;
    icone: typeof Sun;
  }[] = [
    { valeur: "light", libelle: t("themeLight"), icone: Sun },
    { valeur: "dark", libelle: t("themeDark"), icone: Moon },
    { valeur: "system", libelle: t("themeSystem"), icone: Laptop },
  ];

  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={ITEM_CLASS}>
        <Sun className="size-4 text-muted-foreground" aria-hidden="true" />
        {t("appearance")}
        <ChevronRight
          className="ml-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </Menu.SubmenuTrigger>

      <Menu.Portal>
        <Menu.Positioner
          side="left"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-44 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md">
            <form action={rememberTheme}>
              {choix.map(({ valeur, libelle, icone: Icone }) => (
                <Menu.Item
                  key={valeur}
                  render={<button type="submit" name="theme" value={valeur} />}
                  className={cn(
                    ITEM_CLASS,
                    valeur === current && "text-foreground",
                  )}
                >
                  <Icone
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {libelle}
                  {valeur === current ? (
                    <>
                      <Check
                        className="ml-auto size-4 text-primary"
                        aria-hidden="true"
                      />
                      <span className="sr-only">{t("themeCurrent")}</span>
                    </>
                  ) : null}
                </Menu.Item>
              ))}
            </form>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
