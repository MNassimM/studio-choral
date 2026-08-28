"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "@base-ui/react/menu";
import { signOut } from "next-auth/react";
import { ChevronDown, Loader2, LogOut, UserRound } from "lucide-react";
import {Link} from "@/i18n/navigation";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Menu du compte d'un utilisateur connecté.
 *
 * @remarks
 * Composant client parce que la déconnexion et l'ouverture du menu sont des
 * interactions navigateur. Il ne lit jamais la session lui même, celle ci lui
 * étant transmise par le composant serveur qui le monte, ce qui évite
 * d'ajouter un fournisseur de session au gabarit racine.
 *
 * La déconnexion repose sur une redirection vers l'accueil plutôt que sur un
 * rafraîchissement en place, afin de ne pas laisser l'utilisateur sur une page
 * dont le contenu dépendait de droits qu'il vient de perdre.
 *
 * @param email - Adresse du compte connecté, affichée en tête du menu.
 * @param name - Nom du compte connecté, affiché dans le menu.
 * @returns Le menu rendu.
 */
function AccountMenu({ name, email }: { name: string; email: string }) {
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
        <span className="hidden max-w-32 truncate sm:inline">{t("mySpace")}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
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

            <div aria-hidden="true" className="my-1 h-px bg-border" />
            <Menu.Item
              closeOnClick={false}
              disabled={isSigningOut}
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-disabled:opacity-50 cursor-pointer"
            >
              {isSigningOut ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("signingOut")}
                </>
              ) : (
                <>
                  <LogOut className="size-4" aria-hidden="true" />
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
