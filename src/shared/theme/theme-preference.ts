/**
 * Stockage du thème choisi par l'utilisateur.
 *
 * @remarks
 * Même principe que le mode d'affichage du catalogue : une préférence de
 * personne, gardée dans un cookie et non dans l'URL, pour qu'un lien partagé
 * ne force pas le thème de celui qui l'ouvre.
 */

/**
 * Thèmes proposés.
 *
 * @remarks
 * « system » n'est pas un thème mais une délégation : c'est le réglage du
 * système d'exploitation qui tranche, et il peut changer pendant la visite.
 */
export type ThemePreference = "light" | "dark" | "system";

/** Nom du cookie du thème. */
export const THEME_COOKIE = "bsc-theme";

/** Durée de conservation du cookie. */
export const THEME_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/**
 * Thème appliqué tant que rien n'a été choisi.
 *
 * @remarks
 * Sombre, qui était jusqu'ici écrit en dur sur le gabarit : un visiteur qui
 * n'a jamais rien réglé retrouve exactement le site qu'il connaissait.
 */
export const DEFAULT_THEME: ThemePreference = "dark";

/**
 * Valide une valeur venant d'un cookie ou d'un formulaire.
 *
 * @param value - Valeur à valider.
 * @returns Le thème reconnu, ou null si la valeur n'en désigne aucun.
 */
export function parseThemePreference(
  value: string | string[] | undefined | null,
): ThemePreference | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === "light" || candidate === "dark" || candidate === "system") {
    return candidate;
  }
  return null;
}

/**
 * Donne la classe à poser sur la racine du document.
 *
 * @param theme - Thème choisi.
 * @returns La classe, ou une chaîne vide quand le client décide.
 */
export function themeClass(theme: ThemePreference): string {
  return theme === "dark" ? "dark" : "";
}

/**
 * Donne la valeur de color-scheme à poser sur la racine.
 *
 * @param theme - Thème choisi.
 * @returns La valeur CSS, ou undefined quand le client décide.
 */
export function themeColorScheme(
  theme: ThemePreference,
): "light" | "dark" | undefined {
  return theme === "system" ? undefined : theme;
}
