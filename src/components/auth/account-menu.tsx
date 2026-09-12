"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { signOut } from "next-auth/react";
import { ChevronDown, Loader2, LogOut, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { ThemeMenu } from "@/components/layout/theme-menu";
import { buttonVariants } from "@/components/ui/button";
import type { ThemePreference } from "@/lib/theme/theme-preference";
import { cn } from "@/lib/utils";

/**
 * Menu du compte d'un utilisateur connecté.
 *
 * @remarks
 * Composant client, il ne lit jamais la session lui même, transmis par le composant serveur au dessus.
 *
 * @param email - Adresse du compte connecté, affichée en tête du menu.
 * @param name - Nom du compte connecté, affiché dans le menu.
 * @param admin - Indique si l'utilisateur est administrateur.
 * @param theme - Thème enregistré, coché dans le sous menu Apparence.
 * @returns Le menu rendu.
 */
function AccountMenu({
  name,
  admin,
  theme,
}: {
  name: string;
  admin: boolean;
  theme: ThemePreference;
}) {
  const t = useTranslations("auth.account");
  const tLinks = useTranslations("navigation");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await signOut({ redirectTo: "/" });
  }

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={t("menuAriaLabel")}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-1.5 rounded-full",
        )}
      >
        <UserRound className="size-4" aria-hidden="true" />
        <span className="hidden max-w-32 truncate sm:inline">
          {t("mySpace")}
        </span>
        <ChevronDown
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 outline-none"
        >
          <Menu.Popup className="min-w-56 overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md">
            <div className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="text-xs text-muted-foreground">
                {t("signedInAs")}
              </span>
              <span className="truncate text-sm font-medium">{name}</span>
            </div>
            <div aria-hidden="true" className="my-1 h-px bg-border" />
            <Menu.Item
              render={<Link href="/compte" />}
              className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent"
            >
              {tLinks("myAccount")}
            </Menu.Item>

            <Menu.Item
              render={<Link href="/bibliotheque" />}
              className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent"
            >
              {tLinks("footer.linkLibrary")}
            </Menu.Item>

            {admin && (
              <Menu.Item
                render={<Link href="/admin/works" />}
                className="flex w-full items-center rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent"
              >
                Administration
              </Menu.Item>
            )}

            <div aria-hidden="true" className="my-1 h-px bg-border" />
            <ThemeMenu current={theme} />

            <div aria-hidden="true" className="my-1 h-px bg-border" />
            <Menu.Item
              closeOnClick={false}
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="text-destructive flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:opacity-50 cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("signingOut")}
                </>
              ) : (
                <>
                  <LogOut
                    className="size-4 text-destructive"
                    aria-hidden="true"
                  />
                  {t("signOut")}
                </>
              )}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { AccountMenu };
