import { getTranslations } from "next-intl/server";
import { ShoppingCart, UserRound } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

async function Header() {
  const t = await getTranslations("navigation");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-4 justify-self-start">
          <MobileNav />
          <Logo variant="large" />
        </div>

        <MainNav />

        <div className="flex items-center gap-2 col-start-3 justify-self-end">
          {/* En dessous de md, MobileNav affiche son propre LanguageSwitcher
              dans le menu ouvert - l'afficher aussi ici le dupliquerait. */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <Link
            href="/compte"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 rounded-full sm:inline-flex",
            )}
          >
            <UserRound className="size-4" />
            {t("myAccount")}
          </Link>
          <Link
            href="/compte"
            aria-label={t("myAccount")}
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-full sm:hidden",
            )}
          >
            <UserRound className="size-4" />
          </Link>
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
