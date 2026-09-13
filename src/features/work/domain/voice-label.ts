import frWork from "../../../../messages/fr/work.json";

/**
 * Codes de pupitre pour lesquels un libellé traduit existe
 */
const KNOWN_VOICE_CODES = new Set(Object.keys(frWork.voice));

/**
 * Indique si un code de pupitre dispose d'un libellé traduit.
 *
 * @param code - Code du pupitre, tel que stocké en base.
 * @returns Vrai si une traduction existe pour ce code.
 */
export function isKnownVoiceCode(
  code: string,
): code is keyof typeof frWork.voice {
  return KNOWN_VOICE_CODES.has(code);
}

/**
 * Libellé affiché d'un pupitre : sa traduction si elle existe, sinon le
 * code brut, pour qu'un pupitre pas encore traduit ne casse pas l'écran.
 *
 * @param code - Code du pupitre, tel que stocké en base.
 * @param translate - Traduit un code connu.
 * @returns Le libellé à afficher.
 */
export function translateVoiceCode(
  code: string,
  translate: (knownCode: keyof typeof frWork.voice) => string,
): string {
  return isKnownVoiceCode(code) ? translate(code) : code;
}
