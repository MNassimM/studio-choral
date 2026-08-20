import frWork from "../../../messages/fr/work.json";

/**
 * Codes de langue CHANTÉE (Work.language, ISO 639-1) pour lesquels un
 * libellé existe dans messages/*.json ("work.language.*"). Dérivé directement
 * de fr/work.json (source de vérité des clés) plutôt que dupliqué à la main.
 * Un code présent en base mais absent d'ici (langue pas encore documentée)
 * doit retomber sur le code brut, jamais planter le typage next-intl.
 */
const KNOWN_WORK_LANGUAGE_CODES = new Set(Object.keys(frWork.language));

export function isKnownWorkLanguageCode(
  code: string,
): code is keyof typeof frWork.language {
  return KNOWN_WORK_LANGUAGE_CODES.has(code);
}
