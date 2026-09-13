import { locale as rootLocale } from "next/root-params";

import { HomePage } from "@/features/home/components/home-page";
import { loadFeaturedWorks } from "@/features/home/server/featured-works";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Page d'accueil du site.
 *
 * @remarks
 * Charge les œuvres mises en avant, puis délègue la mise en page à HomePage.
 *
 * @returns La page rendue.
 */
export default async function Home() {
  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const featured = await loadFeaturedWorks(locale);

  return <HomePage locale={locale} featured={featured} />;
}
