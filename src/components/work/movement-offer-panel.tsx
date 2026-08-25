import { getTranslations } from "next-intl/server";

import { PackCard } from "@/components/work/pack-card";
import type { OwnedOfferView } from "@/lib/works/work-page-view-model";

/**
 * Grille des offres d'un mouvement.
 *
 * @param offers - Offres du mouvement, remise éventuelle comprise.
 * @returns La grille rendue, ou un message si le mouvement est déjà possédé.
 */
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
          byItNowLabel={tCard("byItNow")}
          alreadyOwned={offer.alreadyOwned}
          alreadyOwnedBadge={t("extendAccessAlreadyOwnedBadge")}
          size="sm"
          discount={offer.discount}
          discountBadgeLabel={
            offer.discount
              ? tCard("discountBadge", { percent: offer.discount.percentOff })
              : undefined
          }
          discountOriginalPriceSrLabel={
            offer.discount
              ? t("extendAccessDiscountOriginalPriceSr", {
                  price: offer.discount.originalPriceLabel,
                })
              : undefined
          }
        />
      ))}
    </div>
  );
}

export { MovementOfferPanel };
