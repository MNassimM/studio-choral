import { getTranslations } from "next-intl/server";

import { PackCard } from "@/components/work/pack-card";
import type {
  OwnedOfferView,
  WorkAllVoicesOfferView,
} from "@/lib/works/work-page-view-model";

/**
 * Offres de l'oeuvre entiere.
 *
 * @param singleVoiceCards - Offres portant sur un seul pupitre.
 * @param allVoicesCard - Offre toutes voix, ou null si le produit n'existe pas.
 * @param ownsAnything - Vrai si l'utilisateur possède déjà quelque chose sur l'œuvre.
 * @param unlocksVoices - Pupitres encore verrouillés, listés sur la carte toutes voix.
 * @returns La grille rendue.
 */
async function WholeWorkOffers({
  singleVoiceCards,
  allVoicesCard,
  ownsAnything,
  unlocksVoices,
}: {
  singleVoiceCards: OwnedOfferView[];
  allVoicesCard: WorkAllVoicesOfferView | null;
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
          inCartLabel={tCard("inCart")}
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
          inCartLabel={tCard("inCart")}
          byItNowLabel={tCard("byItNow")}
          featured
          featuredBadge={t("extendAccessFeaturedBadge")}
          unlocksLabel={
            ownsAnything ? t("extendAccessUnlocksLabel") : undefined
          }
          unlocksVoices={ownsAnything ? unlocksVoices : undefined}
          discount={allVoicesCard.discount}
          discountBadgeLabel={
            allVoicesCard.discount
              ? tCard("discountBadge", {
                  percent: allVoicesCard.discount.percentOff,
                })
              : undefined
          }
          discountOriginalPriceSrLabel={
            allVoicesCard.discount
              ? t("extendAccessDiscountOriginalPriceSr", {
                  price: allVoicesCard.discount.originalPriceLabel,
                })
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

export { WholeWorkOffers };
