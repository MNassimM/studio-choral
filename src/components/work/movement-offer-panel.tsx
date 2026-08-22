import { getTranslations } from "next-intl/server";

import { PackCard } from "@/components/work/pack-card";
import type { OwnedOfferView } from "@/lib/works/work-page-view-model";

async function MovementOfferPanel({ offers }: { offers: OwnedOfferView[] }) {
  const t = await getTranslations("work.workPage");
  const tCard = await getTranslations("work.card");

  if (offers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("extendAccessMovementFullyOwnedNotice")}
      </p>
    );
  }

  const bullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-5">
      {offers.map((offer) => (
        <PackCard
          key={offer.sku}
          offer={offer}
          bullets={bullets}
          addToCartLabel={tCard("addToCart")}
          alreadyOwned={offer.alreadyOwned}
          alreadyOwnedBadge={t("extendAccessAlreadyOwnedBadge")}
          size="sm"
        /> 
      ))}
    </div>
  );
}

export { MovementOfferPanel };
