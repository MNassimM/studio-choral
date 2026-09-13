import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";

import { Container } from "@/shared/components/site/container";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

/**
 * Bandeau d'information en pied de catalogue, vers la page explicative.
 *
 * @returns Le bandeau rendu.
 */
async function CatalogInfoBanner() {
  const t = await getTranslations("catalogue");
  const tCommon = await getTranslations("common");

  return (
    <section className="border-t border-border bg-secondary/30">
      <Container className="py-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-3">
            <Info className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              {t("infoBannerText")}
            </p>
          </div>
          <Link
            href="/comment-ca-marche"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0 rounded-full",
            )}
          >
            {tCommon("learnMore")}
          </Link>
        </div>
      </Container>
    </section>
  );
}

export { CatalogInfoBanner };
