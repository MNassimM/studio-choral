import frWork from "../../../messages/fr/work.json";

/**
 * Codes de pupitre (Voice.code) pour lesquels un libellé traduit existe dans
 * messages/*.json ("work.voice.*") — les quatre voix SATB non divisées.
 * Dérivé directement de fr/work.json (source de vérité des clés) plutôt que
 * dupliqué à la main. Voice.label (en base) est en français et sert de repli
 * pour un pupitre divisé (SOPRANO_1, BARITONE...) pas encore documenté ici —
 * jamais planter le typage next-intl pour un code inconnu.
 */
const KNOWN_VOICE_CODES = new Set(Object.keys(frWork.voice));

export function isKnownVoiceCode(code: string): code is keyof typeof frWork.voice {
  return KNOWN_VOICE_CODES.has(code);
}
