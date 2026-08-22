import type { getTranslations } from "next-intl/server";

function formatFileSize(
  bytes: number,
  t: Awaited<ReturnType<typeof getTranslations<"work.workPage">>>,
): string {
  const kb = bytes / 1024;
  if (kb < 1024) return t("fileSizeKB", { size: Math.round(kb) });
  return t("fileSizeMB", { size: Math.round((kb / 1024) * 10) / 10 });
}

function formatAudioFormatLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

export { formatFileSize, formatAudioFormatLabel };
