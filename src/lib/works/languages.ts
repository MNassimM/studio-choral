/**
 * Langue du texte CHANTÉ d'une œuvre (`Work.language`, code ISO 639-1),
 * sans AUCUN rapport avec la langue d'interface du site. Cette table associe
 * chaque code au libellé français affiché dans l'UI (filtre du catalogue,
 * badges éventuels).
 */
export const LANGUAGE_LABELS: Record<string, string> = {
  la: "Latin",
  fr: "Français",
  de: "Allemand",
  en: "Anglais",
  it: "Italien",
};

/** Libellé français d'un code langue, ou le code lui-même si non répertorié. */
export function getLanguageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code;
}
