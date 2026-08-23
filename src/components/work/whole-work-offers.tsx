import { getTranslations } from "next-intl/server";

import { PackCard } from "@/components/work/pack-card";
import type {
  OwnedOfferView,
  SimpleOfferView,
} from "@/lib/works/work-page-view-model";

async function WholeWorkOffers({
  singleVoiceCards,
  allVoicesCard,
  ownsAnything,
  unlocksVoices,
}: {
  singleVoiceCards: OwnedOfferView[];
  allVoicesCard: SimpleOfferView | null;
  ownsAnything: boolean;
  unlocksVoices: string[];
}) {
  const t = await getTranslations("work.workPage");
  const tCard = await getTranslations("work.card");

  const singleVoiceBullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];
  const allVoicesBullets = [
    t("extendAccessBulletPredominant"),
    t("extendAccessBulletTuttiDownload"),
    t("extendAccessBulletMix"),
    t("extendAccessBulletTempo"),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 lg:grid-cols-5">
      {singleVoiceCards.map((offer) => (
        <PackCard
          key={offer.sku}
          offer={offer}
          bullets={singleVoiceBullets}
          addToCartLabel={tCard("addToCart")}
          byItNowLabel={tCard("byItNow")}
          alreadyOwned={offer.alreadyOwned}
          alreadyOwnedBadge={t("extendAccessAlreadyOwnedBadge")}
        />
      ))}
      {allVoicesCard ? (
        <PackCard
          offer={allVoicesCard}
          bullets={allVoicesBullets}
          addToCartLabel={tCard("addToCart")}
          byItNowLabel={tCard("byItNow")}
          featured
          featuredBadge={t("extendAccessFeaturedBadge")}
          unlocksLabel={
            ownsAnything ? t("extendAccessUnlocksLabel") : undefined
          }
          unlocksVoices={ownsAnything ? unlocksVoices : undefined}
        />
      ) : null}
    </div>
  );
}

export { WholeWorkOffers };
