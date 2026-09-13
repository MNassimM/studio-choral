import { getTranslations } from "next-intl/server";

import { OfferSelector } from "@/features/work/components/offer-selector";
import type { WorkPageViewModel } from "@/features/work/server/work-details-view-model";

/**
 * « Étendre votre accès » : onglets par mouvement et par oeuvre.
 *
 * @param viewModel - Vues de la page œuvre.
 * @param movementsCount - Nombre de mouvements de l'œuvre.
 * @returns La section rendue.
 */
async function WorkOffersSection({
  viewModel,
  movementsCount,
}: {
  viewModel: WorkPageViewModel;
  movementsCount: number;
}) {
  const tWorkPage = await getTranslations("work.workPage");
  const {
    movementOfferGroups,
    defaultOfferMovementId,
    workSingleVoiceCards,
    workAllVoicesCard,
    hasSingleMovement,
  } = viewModel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4 whitespace-nowrap">
          <h2 className="text-xl font-semibold">
            {tWorkPage("extendAccessHeading")}
          </h2>
          <div className="h-[2px] w-full bg-primary"></div>
        </div>
        {movementsCount > 1 ? (
          <p className="text-sm text-muted-foreground">
            {tWorkPage("extendAccessHeadingLead")}
          </p>
        ) : null}
      </div>
      <OfferSelector
        movementGroups={hasSingleMovement ? [] : movementOfferGroups}
        workOffers={[
          ...workSingleVoiceCards,
          ...(workAllVoicesCard ? [workAllVoicesCard] : []),
        ]}
        defaultMovementId={defaultOfferMovementId}
      />
    </div>
  );
}

export { WorkOffersSection };
