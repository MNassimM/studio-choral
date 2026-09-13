import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";

import { playfairDisplay } from "@/features/how-it-works/components/playfair-display";
import { Container } from "@/shared/components/site/container";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Encart d'appel à l'action vers le catalogue.
 *
 * @returns La section rendue.
 */
async function CtaSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="py-16 sm:py-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col gap-2">
            <h2
              className={cn(
                "text-2xl tracking-tight",
                playfairDisplay.className,
              )}
            >
              {t("ctaTitle")}
            </h2>
            <p className="text-muted-foreground">{t("ctaDescription")}</p>
          </div>
          <Link
            href="/catalogue"
            className={cn(
              buttonVariants({ size: "lg" }),
              "shrink-0 gap-1.5 rounded-full px-6",
            )}
          >
            {t("ctaButton")}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}

export { CtaSection };
