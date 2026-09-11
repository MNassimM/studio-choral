import { getTranslations } from "next-intl/server";

import { formatAudioFormatLabel, formatFileSize } from "@/lib/format/file-size";
import { DownloadButton } from "@/components/work/download-button";
import {
  toDownloadRow,
  type DownloadFileEntry,
} from "@/lib/works/download-groups";

/**
 * Grille des Fichiers téléchargeable d'un mouvement.
 *
 * @param entries - Pistes du mouvement, avec leur état de possession.
 * @param returnTo - Chemin de retour après connexion.
 * @param movementTitle - Mouvement préfixé au nom de chaque piste.
 * @returns La grille rendue, ou un message si aucune piste n'est disponible.
 */
async function DownloadFileGrid({
  entries,
  returnTo,
  movementTitle,
}: {
  entries: DownloadFileEntry[];
  returnTo: string;
  movementTitle: string | null;
}) {
  const t = await getTranslations("work.workPage");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("downloadsEmpty")}</p>
    );
  }

  // La ligne est construite ici et rendue par DownloadButton, le même composant
  // que dans la bibliothèque : une seule carte de fichier dans tout le site.
  const rows = entries.map((entry) =>
    toDownloadRow(
      entry,
      {
        audioTypeLabel: (type) => t(`audioType.${type}`),
        formatSize: (bytes) => formatFileSize(bytes, t),
        formatLabel: formatAudioFormatLabel,
      },
      movementTitle,
    ),
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <DownloadButton key={row.audioFileId} row={row} returnTo={returnTo} />
      ))}
    </div>
  );
}

export { DownloadFileGrid };
