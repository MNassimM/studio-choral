import Link from "next/link";
import { ShoppingCart, UserRound } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Logo } from "@/components/layout/logo";
import { MainNav } from "@/components/layout/main-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <Container className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-4 justify-self-start">
          <MobileNav />
          <Logo variant="large" />
        </div>

        <MainNav />

        <div className="flex items-center col-start-3 justify-self-end">
          <Link
            href="/panier"
            aria-label="Voir le panier"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ShoppingCart className="size-5" />
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
