/**
 * Compose le nom affiché d'un produit à partir de sa voix et de sa cible.
 *
 * @remarks
 * Product.name n'est PAS traduit en base : il n'existe pas de table de
 * traductions pour la cinquantaine de produits, par langue. Le nom stocké ne
 * sert donc plus que de libellé de secours et de trace figée dans
 * l'historique de commande, une valeur qui ne doit pas changer
 * rétroactivement si les traductions évoluent.
 *
 * Le nom réellement montré à l'utilisateur est composé au moment de
 * l'affichage, à partir du pupitre (ou de la mention toutes les voix) et de
 * la cible, mouvement ou œuvre.
 *
 * La fonction de traduction est injectée plutôt qu'importée, pour que ce
 * module reste pur et ne tire pas next-intl.
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
