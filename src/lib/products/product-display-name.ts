/**
 * Product.name n'est PAS traduit en base (pas de WorkTranslation-like table
 * pour les ~50 produits par langue) : il ne sert plus que de libellé de
 * secours et de trace figée dans l'historique de commande (un nom qui ne
 * change pas rétroactivement si les traductions évoluent). Le nom affiché à
 * l'utilisateur est COMPOSÉ à l'affichage à partir de la voix (ou "toutes les
 * voix") et de la cible (mouvement ou œuvre), via messages/*.json
 * ("product.allVoices", "product.nameTemplate").
 *
 * Pas encore appelée par une page (aucune page œuvre n'existe encore) —
 * préparée à l'avance comme la route /works/[slug], pour ne pas avoir à
 * reprendre le modèle de nommage plus tard.
 */
export function composeProductDisplayName({
  voiceLabel,
  targetTitle,
  t,
}: {
  /** Libellé de voix déjà résolu (ex. via messages "voiceLabels.SOPRANO"), ou null pour un produit couvrant toutes les voix. */
  voiceLabel: string | null;
  /** Titre du mouvement (jamais traduit) ou titre résolu de l'œuvre (voir resolve-translation.ts). */
  targetTitle: string;
  t: (
    key: "allVoices" | "nameTemplate",
    values?: Record<string, string | number>,
  ) => string;
}): string {
  const voice = voiceLabel ?? t("allVoices");
  return t("nameTemplate", { voice, target: targetTitle });
}
