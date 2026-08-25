"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, ShoppingBag, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";
import { mainNavItems } from "@/components/layout/main-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

/**
 * Menu de navigation mobile, affiché en dessous du point de rupture md.
 *
 * @remarks
 * Le bouton bascule un panneau déroulant contenant les liens principaux, le
 * panier, le compte et le sélecteur de langue. Chaque lien referme le panneau.
 *
 * @returns Le menu mobile rendu.
 */
function MobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("navigation");

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
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-primary"
              >
                {t(`links.${item.key}`)}
              </Link>
            ))}
            <Separator className="my-2" />
            <Link
              href="/panier"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-primary"
            >
              <ShoppingBag className="size-4" />
              {t("mobileNav.cart")}
            </Link>
            <Link
              href="/compte"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted hover:text-primary"
            >
              <UserRound className="size-4" />
              {t("myAccount")}
            </Link>
            <Separator className="my-2" />
            <div className="px-3 py-2">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

export { MobileNav };
