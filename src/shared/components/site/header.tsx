import { CartIconLink } from "@/features/cart/components/cart-icon-link";
import { Container } from "@/shared/components/site/container";
import { Logo } from "@/shared/components/site/logo";
import { MainNav } from "@/shared/components/site/main-nav";
import { MobileNav } from "@/shared/components/site/mobile-nav";
import { LanguageSwitcher } from "@/shared/components/site/language-switcher";
import { AccountSlot } from "@/features/auth/components/account-slot";
import { getCurrentUser } from "@/features/auth/server/current-user";

/**
 * En tête du site, fixé en haut de page.
 *
 * @returns L'en tête rendu.
 */
async function Header() {
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
          <CartIconLink />
        </div>
      </Container>
    </header>
  );
}

export { Header };
