import type { getTranslations } from "next-intl/server";

/**
 * Met en forme une taille de fichier pour l'affichage.
 *
 * @remarks
 * Bascule en mégaoctets au delà de 1024 Ko, avec une décimale à ce moment là.
 * En dessous, l'arrondi au kilooctet entier suffit : personne ne lit
 * « 347,2 Ko » différemment de « 347 Ko ».
 *
 * L'unité passe par next-intl plutôt que d'être écrite en dur, parce que
 * l'abréviation change d'une langue à l'autre (Ko en français, KB en
 * anglais).
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
 * Dérive un libellé de format audio lisible à partir d'un type MIME.
 *
 * @remarks
 * On garde seulement le sous type, en majuscules : audio/wav devient WAV.
 * Si le type MIME est malformé et n'a pas de sous type, on retourne la chaîne
 * d'origine plutôt que d'afficher du vide.
 *
 * @param mimeType - Type MIME de la piste, par exemple audio/wav.
 * @returns Le format en majuscules, prêt à afficher.
 */
function formatAudioFormatLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1];
  return subtype ? subtype.toUpperCase() : mimeType;
}

export { formatFileSize, formatAudioFormatLabel };
