import { getTranslations } from "next-intl/server";
import { Download, LockKeyhole } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatAudioFormatLabel, formatFileSize } from "@/lib/format/file-size";
import type { DownloadFileEntry } from "@/lib/works/work-page-view-model";

async function DownloadFileGrid({ entries }: { entries: DownloadFileEntry[] }) {
  const t = await getTranslations("work.workPage");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("downloadsEmpty")}</p>
    );
  }
  console.log("entries", entries);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {entries.map((entry, index) => (
        <div
          key={`${entry.audioType}-${entry.voiceLabel ?? "all"}-${index}`}
          className={cn(
            "flex flex-col items-center justify-between rounded-xl border px-3 py-4 text-center transition-colors",
            entry.owned
              ? "border-border"
              : "border-border/60 bg-muted/30 opacity-70",
          )}
        >
          {/* Icône en haut */}
          <div className="flex flex-1 items-center justify-center">
            {entry.owned ? (
              <Download
                className="size-6 text-primary"
                aria-hidden="true"
              />
            ) : (
              <LockKeyhole
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Texte principal */}
          <div className="mt-2 w-full min-w-0 space-y-0.5">
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
        </div>
      ))}
    </div>
  );
}

export { DownloadFileGrid };
