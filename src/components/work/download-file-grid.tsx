import { getTranslations } from "next-intl/server";
import { Download, LockKeyhole, FileHeadphone } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAudioFormatLabel, formatFileSize } from "@/lib/format/file-size";
import type { DownloadFileEntry } from "@/lib/works/work-page-view-model";

/**
 * Grille des Fichiers téléchargeable d'un mouvement.
 *
 * @param entries - Pistes du mouvement, avec leur état de possession.
 * @returns La grille rendue, ou un message si aucune piste n'est disponible.
 */
async function DownloadFileGrid({ entries }: { entries: DownloadFileEntry[] }) {
  const t = await getTranslations("work.workPage");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("downloadsEmpty")}</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, index) => (
        <button
          key={`${entry.audioType}-${entry.voiceLabel ?? "all"}-${index}`}
          type="button"
          disabled={!entry.owned}
          className={cn(
            "flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left transition-colors",
            entry.owned
              ? "border-border hover:bg-accent"
              : "cursor-not-allowed border-border/60 bg-muted/30 opacity-70",
          )}
        >
          <FileHeadphone
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {entry.voiceLabel ? `${entry.voiceLabel} - ` : ""}
              {t(`audioType.${entry.audioType}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatAudioFormatLabel(entry.mimeType)}
              {entry.sizeBytes !== null && (
                <> · {formatFileSize(entry.sizeBytes, t)}</>
              )}
            </p>
          </div>

          {entry.owned ? (
            <Download
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
          ) : (
            <LockKeyhole
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </div>
  );
}

export { DownloadFileGrid };
