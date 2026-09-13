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
