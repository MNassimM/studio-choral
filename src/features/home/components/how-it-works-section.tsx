import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Compass, Music2, Repeat } from "lucide-react";

import { Container } from "@/shared/components/site/container";
import { Separator } from "@/shared/components/ui/separator";
import { buttonVariants } from "@/shared/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/utils/cn";

const steps = [
  { icon: Compass, key: "stepBrowse" },
  { icon: Repeat, key: "stepListen" },
  { icon: Music2, key: "stepSing" },
] as const;

/**
 * Résumé du parcours en trois étapes.
 *
 * @returns La section rendue, avec son lien vers la page détaillée.
 */
async function HowItWorksSection() {
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  return (
    <section className="bg-background max-w-7xl mx-auto">
      <Container className="pb-20 sm:pb-28">
        <div className="rounded-2xl border border-border bg-secondary/40 p-8 sm:p-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-semibold tracking-[0.3em] text-primary uppercase">
              {t("howItWorksEyebrow")}
            </span>
            <Separator className="w-12" />
          </div>

          <div className="mt-10 grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {steps.map(({ icon: Icon, key }, index) => (
              <Fragment key={key}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full border border-border bg-background text-primary">
                    <Icon className="size-6" />
                  </div>
                  <p className="font-medium">{t(`${key}Label`)}</p>
                  <p className="max-w-56 text-sm text-muted-foreground">
                    {t(`${key}Description`)}
                  </p>
                </div>
                {index < steps.length - 1 ? (
                  <ChevronRight
                    className="mt-5 hidden size-5 shrink-0 text-muted-foreground md:block"
                    aria-hidden="true"
                  />
                ) : null}
              </Fragment>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/comment-ca-marche"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full",
              )}
            >
              {tCommon("learnMore")}
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

export { HowItWorksSection };
