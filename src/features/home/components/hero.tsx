import { getTranslations } from "next-intl/server";
import { Playfair_Display } from "next/font/google";

import { Container } from "@/shared/components/site/container";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

// Police serif locale à cette page, pour les grands titres éditoriaux - le
// reste du site (Header, Footer, composants partagés) reste en Geist.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Bandeau d'accroche de la page d'accueil.
 *
 * @returns Le bandeau rendu, avec ses deux appels à l'action.
 */
async function Hero() {
  const t = await getTranslations("home");
  const tNav = await getTranslations("navigation");

  return (
    <section className="bg-background">
      <Container className="flex flex-col items-center gap-6 pt-20 text-center sm:pt-28">
        <h1
          className={cn(
            "max-w-2xl text-4xl tracking-tight text-balance sm:text-5xl",
            playfairDisplay.className,
          )}
        >
          {t("heroTitle")}
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
          {t("heroDescription")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full px-6",
            )}
          >
            {t("viewCatalogue")}
          </Link>
          <Link
            href="/comment-ca-marche"
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}
          >
            {tNav("links.howItWorks")}
          </Link>
        </div>
      </Container>
    </section>
  );
}

export { Hero };
