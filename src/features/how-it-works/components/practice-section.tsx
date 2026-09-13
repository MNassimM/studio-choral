import { getTranslations } from "next-intl/server";
import { AudioWaveform, BarChart3, Heart, SlidersVertical } from "lucide-react";

import type {
  FeatureItem,
  HowItWorksTranslator,
} from "@/features/how-it-works/components/feature-item";
import { SectionHeading } from "@/features/how-it-works/components/section-heading";
import { Container } from "@/shared/components/site/container";

const PRACTICE_FEATURES: FeatureItem[] = [
  { icon: SlidersVertical, messageKey: "customize" },
  { icon: AudioWaveform, messageKey: "workEfficiently" },
  { icon: BarChart3, messageKey: "progress" },
  { icon: Heart, messageKey: "pleasure" },
];

/**
 * Élément décrivant un usage du studio de répétition.
 *
 * @param icon - Icône de l'usage.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'élément rendu.
 */
function PracticeFeatureItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Icon className="size-6 text-primary" aria-hidden="true" />
      <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
      <p className="max-w-56 text-sm text-muted-foreground">
        {t(`${messageKey}Description`)}
      </p>
    </div>
  );
}

/**
 * Section présentant le travail au studio.
 *
 * @returns La section rendue.
 */
async function PracticeSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-background">
      <Container className="flex flex-col gap-10 py-16 sm:py-20">
        <SectionHeading>{t("section3Heading")}</SectionHeading>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTICE_FEATURES.map((feature) => (
            <PracticeFeatureItem key={feature.messageKey} {...feature} t={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export { PracticeSection };
