import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { HowItWorksPage } from "@/features/how-it-works/components/how-it-works-page";
import { getPathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Construit les métadonnées de la page de présentation.
 *
 * @returns Le titre, la description et les liens alternatifs par locale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const t = await getTranslations("howItWorks");

  const languages = Object.fromEntries(
    routing.locales.map((l) => [
      l,
      getPathname({ href: "/comment-ca-marche", locale: l }),
    ]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ href: "/comment-ca-marche", locale }),
      languages: {
        ...languages,
        "x-default": languages[routing.defaultLocale],
      },
    },
  };
}

/**
 * Page expliquant le fonctionnement du service.
 *
 * @returns La page rendue, entièrement déléguée à HowItWorksPage.
 */
export default function HowItWorksRoute() {
  return <HowItWorksPage />;
}
