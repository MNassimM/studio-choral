"use client";

import { useLayoutEffect } from "react";

/**
 * Applique le thème du système quand l'utilisateur le lui délègue.
 *
 * @remarks
 * Le script du gabarit suffit au premier affichage, pas au reste. Choisir
 * « Système » depuis le menu passe par une action serveur, qui rafraîchit la
 * page sans recharger le document : un script inséré par mise à jour du DOM ne
 * s'exécute pas, et la classe resterait celle du thème précédent jusqu'au
 * prochain rechargement.
 *
 * L'effet n'a volontairement pas de tableau de dépendances : chaque rendu du
 * gabarit réécrit la classe de la racine depuis le rendu serveur, qui ne la
 * contient pas en « Système ». Il faut donc la reposer après chaque rendu.
 * useLayoutEffect plutôt que useEffect, pour le faire avant la peinture.
 *
 * @returns Rien, le composant n'affiche pas.
 */
export function ThemeSystemSync() {
  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function appliquer() {
      const racine = document.documentElement;
      racine.classList.toggle("dark", media.matches);
      racine.style.colorScheme = media.matches ? "dark" : "light";
    }

    appliquer();
    media.addEventListener("change", appliquer);
    return () => media.removeEventListener("change", appliquer);
  });

  return null;
}
