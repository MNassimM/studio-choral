"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LogIn, Menu, ShoppingBag,Library, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CartCountPill } from "@/components/cart/cart-count-pill";
import { Link } from "@/i18n/navigation";
import { mainNavItems } from "@/components/layout/main-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/**
 * Css commun à toutes les entrées du panneau..
 */
const ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-primary";

/**
 * Menu de navigation mobile, affiché en dessous de md.
 *
 * @param isSignedIn - Vrai lorsqu'une session est ouverte.
 * @returns Le menu mobile rendu.
 */
function MobileNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");
  const tAccount = useTranslations("auth.account");

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={open ? t("mobileNav.closeMenu") : t("mobileNav.openMenu")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      {open ? (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-border bg-background shadow-sm">
          <nav className="flex flex-col gap-1 px-4 py-4">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={ITEM_CLASS}
              >
                {t(`links.${item.key}`)}
              </Link>
            ))}

            <Link
              href="/panier"
              onClick={close}
              className={`${ITEM_CLASS} justify-between`}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="size-4" aria-hidden="true" />
                {t("mobileNav.cart")}
              </span>
              <CartCountPill />
            </Link>

            <Separator className="my-2" />

            {isSignedIn ? (
              <>
                <Link href="/compte" onClick={close} className={ITEM_CLASS}>
                  <UserRound className="size-4" aria-hidden="true" />
                  {t("myAccount")}
                </Link>
                
                <Link href="/bibliotheque" onClick={close} className={ITEM_CLASS}>
                  <Library className="size-4" aria-hidden="true" />
                  {t("footer.linkLibrary")}
                </Link>
                <SignOutButton onSignOutStart={close} />
              </>
            ) : (
              <Link href="/connexion" onClick={close} className={ITEM_CLASS}>
                <LogIn className="size-4" aria-hidden="true" />
                {tAccount("signIn")}
              </Link>
            )}

            <Separator className="my-2" />
            <LanguageSwitcher
              showLanguageName
              onSelect={close}
              triggerClassName={`group/lang-trigger ${ITEM_CLASS} outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:bg-muted`}
            />
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export { MobileNav };
