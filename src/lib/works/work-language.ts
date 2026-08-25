import frWork from "../../../messages/fr/work.json";

/**
 * Codes de langue CHANTÉE pour lesquels un libellé traduit existe.
 *
 * @remarks
 * Il s'agit de Work.language, au format ISO 639-1, qui n'a aucun rapport avec
 * la langue d'interface du site. Une messe en latin reste en latin qu'on
 * navigue en français ou en anglais.
 *
 * Dérivé directement de fr/work.json plutôt que recopié, pour la même raison
 * que dans voice-label.ts.
 */
const KNOWN_WORK_LANGUAGE_CODES = new Set(Object.keys(frWork.language));

/**
 * Indique si un code de langue chantée dispose d'un libellé traduit.
 *
 * @remarks
 * Garde de type avant appel à next-intl. Une langue présente en base mais pas
 * encore documentée dans les messages doit retomber sur son code brut plutôt
 * que de casser le typage des clés.
 *
 * @param code - Code ISO 639-1 de la langue chantée.
 * @returns Vrai si une traduction existe pour ce code.
 */
export function isKnownWorkLanguageCode(
  code: string,
): code is keyof typeof frWork.language {
  return KNOWN_WORK_LANGUAGE_CODES.has(code);
}
