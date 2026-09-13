import { getTranslations } from "next-intl/server";

import { ChooseWorkSection } from "@/features/how-it-works/components/choose-work-section";
import { CtaSection } from "@/features/how-it-works/components/cta-section";
import { LibrarySection } from "@/features/how-it-works/components/library-section";
import { playfairDisplay } from "@/features/how-it-works/components/playfair-display";
import { PracticeSection } from "@/features/how-it-works/components/practice-section";
import { OrnamentalRule } from "@/features/how-it-works/components/section-heading";
import { TrustSection } from "@/features/how-it-works/components/trust-section";
import { Container } from "@/shared/components/site/container";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Contenu de la page expliquant le fonctionnement du service.
 *
 * @remarks
 * Page éditoriale sans accès à la base. Tout son contenu vient du namespace
 * de traduction howItWorks.
 *
 * @returns La page rendue.
 */
async function HowItWorksPage() {
  const t = await getTranslations("howItWorks");
  const tCommon = await getTranslations("common");

  return (
    <>
      <section className="max-w-7xl mx-auto bg-background">
        <Container className="flex flex-col gap-8 pt-2 sm:pt-6">
          <nav
            aria-label={tCommon("breadcrumbAriaLabel")}
            className="text-sm text-muted-foreground"
          >
            <Link href="/" className="hover:text-primary !underline">
              {tCommon("breadcrumbHome")}
            </Link>
            <span className="mx-2">-{">"}</span>
            <span aria-current="page" className="text-foreground">
              {t("breadcrumbCurrent")}
            </span>
          </nav>
        </Container>
      </section>
      <section className="bg-background">
        <Container className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
          <h1
            className={cn(
              "text-4xl tracking-tight sm:text-5xl",
              playfairDisplay.className,
            )}
          >
            {t("heroTitle")}
          </h1>
          <OrnamentalRule />
          <p className="max-w-2xl text-muted-foreground sm:text-lg">
            {t("heroDescription")}
          </p>
        </Container>
      </section>
      <div className="max-w-7xl mx-auto">
        <ChooseWorkSection />
        <LibrarySection />
        <PracticeSection />
        <TrustSection />
        <CtaSection />
      </div>
    </>
  );
}

export { HowItWorksPage };
