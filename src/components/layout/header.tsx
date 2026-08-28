import { getTranslations } from "next-intl/server";
import { ShoppingCart } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AccountSlot } from "@/components/auth/account-slot";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * En tête du site, fixé en haut de page.
 *
 * @returns L'en tête rendu.
 */
async function Header() {
  const t = await getTranslations("navigation");
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-4 justify-self-start">
          <MobileNav isSignedIn={Boolean(user)} />
          <Logo variant="large" />
        </div>

        <MainNav />

        <div className="flex items-center gap-2 col-start-3 justify-self-end">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <div className="hidden sm:block">
            <AccountSlot />
          </div>
          <div className="sm:hidden">
            <AccountSlot compact />
          </div>
          <Link
            href="/panier"
            aria-label={t("header.cartAriaLabel")}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ShoppingCart className="size-5" />
          </Link>
        </div>
      </Container>
    </header>
  );
}

export { Header };
