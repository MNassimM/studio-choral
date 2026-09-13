/**
 * Compose le nom affiché d'un produit à partir de sa voix et de sa cible.
 *
 * @param voiceLabel - Libellé du pupitre déjà résolu, ou null pour un produit couvrant toutes les voix.
 * @param targetTitle - Titre du mouvement, ou titre résolu de l'œuvre.
 * @param t - Fonction de traduction limitée aux deux clés du namespace product.
 * @returns Le nom prêt à afficher.
 */
export function composeProductDisplayName({
  voiceLabel,
  targetTitle,
  t,
}: {
  voiceLabel: string | null;
  targetTitle: string;
  t: (
    key: "allVoices" | "nameTemplate",
    values?: Record<string, string | number>,
  ) => string;
}): string {
  const voice = voiceLabel ?? t("allVoices");
  return t("nameTemplate", { voice, target: targetTitle });
}
