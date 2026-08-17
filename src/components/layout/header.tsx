import Link from "next/link";
import { ShoppingBag, UserRound } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <MobileNav />
          <Logo />
        </div>

        <MainNav />

        <div className="flex items-center gap-2">
          <Link
            href="/panier"
            aria-label="Voir le panier"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ShoppingBag className="size-5" />
          </Link>
          <Link
            href="/compte"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 rounded-full sm:inline-flex",
            )}
          >
            <UserRound className="size-4" />
            Mon espace
          </Link>
          <Link
            href="/compte"
            aria-label="Mon espace"
            className={cn(
              buttonVariants({ variant: "outline", size: "icon" }),
              "rounded-full sm:hidden",
            )}
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </Container>
    </header>
  );
}

export { Header };
