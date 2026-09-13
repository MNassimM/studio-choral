import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Download, Headphones, Music2 } from "lucide-react";

import library from "@/assets/library.png";
import type {
  FeatureItem,
  HowItWorksTranslator,
} from "@/features/how-it-works/components/feature-item";
import { SectionHeading } from "@/features/how-it-works/components/section-heading";
import { Container } from "@/shared/components/site/container";

const LIBRARY_FEATURES: FeatureItem[] = [
  { icon: Music2, messageKey: "findWorks" },
  { icon: Download, messageKey: "downloadFiles" },
  { icon: Headphones, messageKey: "listenOnline" },
];

/**
 * Ligne décrivant une possibilité de la bibliothèque.
 *
 * @param icon - Icône de la possibilité.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns La ligne rendue.
 */
function LibraryFeatureRow({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{t(`${messageKey}Title`)}</h3>
        <p className="text-sm text-muted-foreground">
          {t(`${messageKey}Description`)}
        </p>
      </div>
    </div>
  );
}

/**
 * Section présentant la bibliothèque personnelle.
 *
 * @returns La section rendue.
 */
async function LibrarySection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="bg-secondary/30">
      <Container className="py-16 sm:py-20">
        <SectionHeading>{t("section2Heading")}</SectionHeading>
        <div className="mt-10 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          {/* Importée depuis src/ et non servie depuis public/ : Next lit
              alors ses dimensions à la compilation, réserve la place avant le
              chargement, et fabrique lui même le flou d'attente. */}
          <Image
            src={library}
            alt={t("libraryImageAlt")}
            placeholder="blur"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full rounded-xl border-2 border-primary/50"
          />
          <div className="flex flex-col gap-8">
            {LIBRARY_FEATURES.map((feature) => (
              <LibraryFeatureRow key={feature.messageKey} {...feature} t={t} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export { LibrarySection };
