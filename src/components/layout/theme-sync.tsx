"use client";

import { useLayoutEffect } from "react";

import type { ThemePreference } from "@/lib/theme/theme-preference";

/**
 * Applique le thème sur la racine du document, quel qu'il soit.
 *
 * @remarks
 * Ce composant est le SEUL propriétaire de la classe `dark`. Le laisser au
 * rendu serveur ne suffit pas : `themeClass` rend la même chaîne vide pour
 * « clair » et pour « système », si bien qu'en passant de l'un à l'autre React
 * ne voit aucune différence sur `className` et ne réécrit pas l'attribut — la
 * classe posée à la main en mode système survivait alors au changement.
 *
 * L'effet n'a volontairement pas de tableau de dépendances : chaque rendu du
 * gabarit réécrit la racine depuis la sortie serveur, il faut donc reposer la
 * classe après chacun. useLayoutEffect plutôt que useEffect, pour le faire
 * avant la peinture.
 *
 * @param theme - Thème enregistré, « système » compris.
 * @returns Rien, le composant n'affiche pas.
 */
export function ThemeSync({ theme }: { theme: ThemePreference }) {
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function appliquer() {
      const sombre = theme === "system" ? media.matches : theme === "dark";
      const racine = document.documentElement;
      racine.classList.toggle("dark", sombre);
      racine.style.colorScheme = sombre ? "dark" : "light";
    }

    appliquer();

    // Seul le mode système dépend du réglage de l'appareil, qui peut changer
    // pendant la visite.
    if (theme !== "system") return;
    media.addEventListener("change", appliquer);
    return () => media.removeEventListener("change", appliquer);
  });

  return null;
}
