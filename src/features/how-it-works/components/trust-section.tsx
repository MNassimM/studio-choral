import { getTranslations } from "next-intl/server";
import {
  Headset,
  Infinity as InfinityIcon,
  Lock,
  RefreshCw,
} from "lucide-react";

import type {
  FeatureItem,
  HowItWorksTranslator,
} from "@/features/how-it-works/components/feature-item";
import { Container } from "@/shared/components/site/container";

const TRUST_ITEMS: FeatureItem[] = [
  { icon: Lock, messageKey: "secureAccess" },
  { icon: InfinityIcon, messageKey: "unlimitedDownloads" },
  { icon: RefreshCw, messageKey: "updatesIncluded" },
  { icon: Headset, messageKey: "needHelp" },
];

/**
 * Élément de réassurance, en format compact.
 *
 * @param icon - Icône de l'élément.
 * @param messageKey - Clé de traduction du titre et de la description.
 * @param t - Fonction de traduction du namespace howItWorks.
 * @returns L'élément rendu.
 */
function TrustItem({
  icon: Icon,
  messageKey,
  t,
}: FeatureItem & { t: HowItWorksTranslator }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-medium">{t(`${messageKey}Title`)}</h3>
        <p className="text-xs text-muted-foreground">
          {t(`${messageKey}Description`)}
        </p>
      </div>
    </div>
  );
}

/**
 * Bandeau des garanties offertes aux acheteurs.
 *
 * @returns La section rendue.
 */
async function TrustSection() {
  const t = await getTranslations("howItWorks");

  return (
    <section className="border border-border bg-secondary/30">
      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item) => (
            <TrustItem key={item.messageKey} {...item} t={t} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export { TrustSection };
