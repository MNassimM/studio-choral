import type { getTranslations } from "next-intl/server";

/**
 * Met en forme une taille de fichier pour l'affichage.
 *
 * @param bytes - Taille du fichier en octets.
 * @param t - Fonction de traduction du namespace work.workPage.
 * @returns La taille formatée avec son unité traduite.
 */
function formatFileSize(
  bytes: number,
  t: Awaited<ReturnType<typeof getTranslations<"work.workPage">>>,
): string {
  const kb = bytes / 1024;
  if (kb < 1024) return t("fileSizeKB", { size: Math.round(kb) });
  return t("fileSizeMB", { size: Math.round((kb / 1024) * 10) / 10 });
}

/**
 * Donne le nom de format audio à partir d'un type MIME.
 *
 * @remarks
 * audio/wav devient WAV.
 *
 * @param mimeType - Type MIME de la piste, par exemple audio/wav.
 * @returns Le format en majuscules, prêt à afficher.
 */
function formatAudioFormatLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

export { formatFileSize, formatAudioFormatLabel };
