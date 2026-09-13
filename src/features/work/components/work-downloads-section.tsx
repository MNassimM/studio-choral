import { getTranslations } from "next-intl/server";

import { DownloadFileGrid } from "@/features/work/components/download-file-grid";
import { MovementPanelSwitcher } from "@/features/work/components/movement-panel-switcher";
import type { WorkPageViewModel } from "@/features/work/server/work-details-view-model";

/**
 * Téléchargements de l'œuvre, par mouvement si elle en compte plusieurs.
 *
 * @param viewModel - Vues de la page œuvre.
 * @param returnTo - Où revenir si la session a expiré avant le clic.
 * @returns La section rendue.
 */
async function WorkDownloadsSection({
  viewModel,
  returnTo,
}: {
  viewModel: WorkPageViewModel;
  returnTo: string;
}) {
  const tWorkPage = await getTranslations("work.workPage");
  const { downloadGroups, defaultDownloadMovementId, hasSingleMovement } =
    viewModel;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">
          {tWorkPage("downloadsHeading")}
        </h2>
        <div className="h-[2px] w-full bg-primary"></div>
      </div>
      {hasSingleMovement ? (
        <DownloadFileGrid
          entries={downloadGroups[0]?.entries ?? []}
          returnTo={returnTo}
          movementTitle={null}
        />
      ) : (
        <MovementPanelSwitcher
          selectorLabel={tWorkPage("movementSelectorLabel")}
          defaultMovementId={defaultDownloadMovementId}
          movements={downloadGroups.map((group) => ({
            id: group.movementId,
            label: group.movementTitle,
            panel: (
              <DownloadFileGrid
                entries={group.entries}
                returnTo={returnTo}
                movementTitle={group.movementTitle}
              />
            ),
          }))}
        />
      )}
    </div>
  );
}

export { WorkDownloadsSection };
