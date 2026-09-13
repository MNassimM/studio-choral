import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { cn } from "@/shared/utils/cn";

import { CartPageContent } from "@/features/cart/components/cart-page-content";
import { Container } from "@/shared/components/site/container";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Playfair_Display } from "next/font/google";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
});

/**
 * Construit les métadonnées de la page panier.
 *
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("cart.page");

  const languages = Object.fromEntries(
    routing.locales.map((l) => [
      l,
      getPathname({ href: "/panier", locale: l }),
    ]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: getPathname({ href: "/panier", locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

/**
 * Page panier.
 *
 * @returns La page rendue.
 */
export default async function CartPage() {
  const t = await getTranslations("cart.page");
  const tCommon = await getTranslations("common");

  return (
    <section className="max-w-7xl mx-auto bg-background">
      <Container className="flex flex-col gap-8 pb-12 sm:pb-16 pt-2 sm:pt-6">
        <nav
          aria-label={tCommon("breadcrumbAriaLabel")}
          className="text-sm text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary !underline">
            {tCommon("breadcrumbHome")}
          </Link>
          <span className="mx-2">-{">"}</span>
          <span aria-current="page" className="text-foreground">
            {t("title")}
          </span>
        </nav>

        <div className="flex flex-col gap-3">
          <h1
            className={cn(
              "text-3xl tracking-tight sm:text-4xl",
              playfairDisplay.className,
            )}
          >
            {t("title")}
          </h1>
        </div>
        <CartPageContent titleClassName={playfairDisplay.className} />
      </Container>
    </section>
  );
}
