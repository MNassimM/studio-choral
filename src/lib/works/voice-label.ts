import frWork from "../../../messages/fr/work.json";

/**
 * Codes de pupitre pour lesquels un libellé traduit existe, soit les quatre
 * voix SATB non divisées.
 *
 * @remarks
 * Dérivé directement de fr/work.json, qui fait autorité sur les clés
 * disponibles, plutôt que recopié à la main. Recopier créerait une seconde
 * liste à maintenir, qui finirait par diverger.
 */
const KNOWN_VOICE_CODES = new Set(Object.keys(frWork.voice));

/**
 * Indique si un code de pupitre dispose d'un libellé traduit.
 *
 * @remarks
 * Sert de garde de type avant d'appeler next-intl : un code inconnu doit
 * retomber sur sa valeur brute, jamais faire échouer le typage des clés de
 * traduction.
 *
 * Le champ Voice.label en base est en français et saisi pour l'administration.
 * Il sert de repli pour un pupitre divisé (SOPRANO_1, BARITONE) qui n'est pas
 * encore documenté ici, et n'est jamais affiché tel quel autrement.
 *
 * @param code - Code du pupitre, tel que stocké en base.
 * @returns Vrai si une traduction existe pour ce code.
 */
export function isKnownVoiceCode(code: string): code is keyof typeof frWork.voice {
  return KNOWN_VOICE_CODES.has(code);
}
