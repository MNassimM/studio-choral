import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import {
  BookOpen,
  ChevronRight,
  CreditCard,
  Headphones,
  ShoppingCart,
} from "lucide-react";

import type {
  FeatureItem,
  HowItWorksTranslator,
} from "@/features/how-it-works/components/feature-item";
import { SectionHeading } from "@/features/how-it-works/components/section-heading";
import { Container } from "@/shared/components/site/container";

const CHOOSE_WORK_STEPS: FeatureItem[] = [
  { icon: BookOpen, messageKey: "browseCatalog" },
  { icon: Headphones, messageKey: "listenExtracts" },
  { icon: ShoppingCart, messageKey: "chooseOffer" },
  { icon: CreditCard, messageKey: "checkout" },
];

/**
 * Étape du parcours d'achat, avec son icône en pastille ronde.
 *
 * @param icon - Icône de l'étape.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'étape rendue.
 */
function StepCircleItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">
        {t(`${messageKey}Description`)}
      </p>
    </div>
  );
}

/**
 * Section du parcours d'achat, en quatre étapes chaînées.
 *
 * @returns La section rendue.
 */
async function ChooseWorkSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>{t("section1Heading")}</SectionHeading>
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          {CHOOSE_WORK_STEPS.map((step, index) => (
            <Fragment key={step.messageKey}>
              <StepCircleItem {...step} t={t} />
              {index < CHOOSE_WORK_STEPS.length - 1 ? (
                <ChevronRight
                  className="mt-5 hidden size-5 shrink-0 text-muted-foreground md:block"
                  aria-hidden="true"
                />
              ) : null}
            </Fragment>
          ))}
        </div>
      </Container>
    </section>
  );
}

export { ChooseWorkSection };
