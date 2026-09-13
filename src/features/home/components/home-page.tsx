import { FeaturedWorksSection } from "@/features/home/components/featured-works-section";
import { Hero } from "@/features/home/components/hero";
import { HowItWorksSection } from "@/features/home/components/how-it-works-section";
import { SearchBar } from "@/features/home/components/search-bar";
import type { FeaturedWorks } from "@/features/home/server/featured-works";
import type { AppLocale } from "@/i18n/routing";

/**
 * Contenu de la page d'accueil.
 *
 * @remarks
 * Empile accroche, recherche, parcours et sélection.
 *
 * @param locale - Locale active.
 * @param featured - Œuvres mises en avant et œuvres populaires.
 * @returns La page rendue.
 */
function HomePage({
  locale,
  featured,
}: {
  locale: AppLocale;
  featured: FeaturedWorks;
}) {
  return (
    <>
      <Hero />
      <SearchBar locale={locale} />
      <HowItWorksSection />
      <FeaturedWorksSection
        works={featured.works}
        popularIds={featured.popularIds}
      />
    </>
  );
}

export { HomePage };
