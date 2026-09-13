import frWork from "../../../../messages/fr/work.json";

/**
 * Codes de langue chantée pour lesquels un libellé traduit existe.
 */
const KNOWN_WORK_LANGUAGE_CODES = new Set(Object.keys(frWork.language));

/**
 * Indique si un code de langue chantée dispose d'un libellé traduit.
 *
 * @param code - Code ISO 639-1 de la langue chantée.
 * @returns Vrai si une traduction existe pour ce code.
 */
export function isKnownWorkLanguageCode(
  code: string,
): code is keyof typeof frWork.language {
  return KNOWN_WORK_LANGUAGE_CODES.has(code);
}

/**
 * Libellé affiché d'une langue chantée : sa traduction si elle existe,
 * sinon le code brut, pour qu'une langue pas encore traduite ne casse pas
 * l'écran.
 *
 * @param code - Code ISO 639-1 de la langue chantée.
 * @param translate - Traduit un code connu.
 * @returns Le libellé à afficher.
 */
export function translateWorkLanguageCode(
  code: string,
  translate: (knownCode: keyof typeof frWork.language) => string,
): string {
  return isKnownWorkLanguageCode(code) ? translate(code) : code;
}
